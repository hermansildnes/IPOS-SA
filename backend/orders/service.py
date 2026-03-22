from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlmodel import Session, select

from catalogue.models import Product
from merchants.models import AccountStatus, Merchant, DiscountPlanType
from orders.models import Order, OrderItem, Invoice, OrderStatus


def calculate_discount(merchant: Merchant, order_total: Decimal) -> Decimal:
    """Calculate discount amount based on merchant's discount plan.
    (Currently simplified - full implementation would query all orders this month)
    """
    if merchant.discount_plan_type == DiscountPlanType.FIXED:
        # fixed discount: apply the rate to rder total.
        if merchant.fixed_discount_rate:
            discount_percentage = merchant.fixed_discount_rate / 100
            return order_total * discount_percentage
        return Decimal("0.00")

    # flex discount: would need to calculate month to date order value
    # fornow, return 0% discount as placeholder, but later implement proper monthly order val calc.
    return Decimal("0.00")


def create_order(
    session: Session,
    merchant_id: UUID,
    items: list[dict],  # Format: [{"product_id": UUID, "quantity": int}, ...]
) -> Order:

    # step1: get merchant and validate account status
    merchant = session.get(Merchant, merchant_id)
    if not merchant:
        raise ValueError("Merchant not found")

    if merchant.account_status == AccountStatus.SUSPENDED:
        raise ValueError("Cannot place order - account is suspended")

    if merchant.account_status == AccountStatus.IN_DEFAULT:
        raise ValueError("Cannot place order - account is in default")

    # Step 2: Validate products and calculate total
    order_total = Decimal("0.00")
    validated_items = []

    for item in items:
        # Get product from database
        product = session.get(Product, item["product_id"])
        if not product:
            raise ValueError(f"Product {item['product_id']} not found")

        # Check if enough stock available
        if product.stock_quantity < item["quantity"]:
            raise ValueError(
                f"Insufficient stock for {product.name}. "
                f"Available: {product.stock_quantity}, Requested: {item['quantity']}"
            )

        # Calculate cost for this item
        item_cost = product.package_cost * item["quantity"]
        order_total += item_cost

        # Store validated item data for later
        validated_items.append(
            {
                "product": product,
                "quantity": item["quantity"],
                "unit_price": product.package_cost,
                "cost": item_cost,
            }
        )

    # Step 3: Calculate discount
    discount_amount = calculate_discount(merchant, order_total)
    amount_due = order_total - discount_amount

    # Step 4: Check credit limit
    # For now using simplified version, later sum up unpaid invoices
    current_debt = Decimal("0.00")

    if current_debt + amount_due > merchant.credit_limit:
        raise ValueError(
            f"Order would exceed credit limit. "
            f"Current debt: £{current_debt}, Order amount: £{amount_due}, "
            f"Credit limit: £{merchant.credit_limit}"
        )

    # Step 5: Create the Order record
    order = Order(
        merchant_id=merchant_id,
        total=order_total,
        discount_amount=discount_amount,
        amount_due=amount_due,
        status=OrderStatus.ACCEPTED,  # new orders start as ACCEPTED
    )
    session.add(order)
    session.flush()  # flush to get the order.id without commiting

    # Step 6: Create OrderItem records and reduce stock
    for item in validated_items:
        # Create order item linking this product to the order
        order_item = OrderItem(
            order_id=order.id,
            product_id=item["product"].id,
            quantity=item["quantity"],
            unit_price=item["unit_price"],  # Snapshot price at time of order
            cost=item["cost"],
        )
        session.add(order_item)

        # Reduce product stock quantity
        item["product"].stock_quantity -= item["quantity"]
        session.add(item["product"])

    # Step 7: Create Invoice for this order
    invoice = Invoice(
        order_id=order.id,
        merchant_id=merchant_id,
        total_amount=order_total,
        discount_amount=discount_amount,
        amount_due=amount_due,
    )
    session.add(invoice)

    # Commit all changes to database
    session.commit()
    session.refresh(order)  # Refresh to get updated timestamps

    return order


def get_order(session: Session, order_id: UUID) -> dict | None:
    """
    Retrieve a single order by its ID with all details including items
    """
    from merchants.models import Merchant
    
    # Get the order
    order = session.get(Order, order_id)
    if not order:
        return None
    
    # Get merchant name
    merchant = session.get(Merchant, order.merchant_id)
    
    # Get order items with product details
    items = session.exec(select(OrderItem).where(OrderItem.order_id == order_id)).all()
    
    items_data = []
    for item in items:
        product = session.get(Product, item.product_id)
        items_data.append({
            "id": str(item.id),
            "product_id": str(item.product_id),
            "product_name": product.name if product else "Unknown",
            "quantity": item.quantity,
            "unit_price": float(item.unit_price),
            "cost": float(item.cost),
        })
    
    return {
        "id": str(order.id),
        "merchant_id": str(order.merchant_id),
        "merchant_name": merchant.company_name if merchant else "Unknown",
        "order_date": order.order_date.isoformat(),
        "status": order.status.value,
        "total": float(order.total),
        "discount_amount": float(order.discount_amount),
        "amount_due": float(order.amount_due),
        "dispatched_date": order.dispatched_date.isoformat() if order.dispatched_date else None,
        "expected_delivery": order.expected_delivery.isoformat() if order.expected_delivery else None,
        "courier": order.courier,
        "courier_ref": order.courier_ref,
        "items": items_data,
    }

def get_orders_by_merchant(
    session: Session, merchant_id: UUID, status: OrderStatus | None = None
) -> list[Order]:
    # GET all orders for a specific merchant, can filter by order status

    # Build SQL query
    statement = select(Order).where(Order.merchant_id == merchant_id)

    # Add status filter if provided
    if status:
        statement = statement.where(Order.status == status)

    # Sort by newest first
    statement = statement.order_by(Order.order_date.desc())

    # Execute and return results
    return list(session.exec(statement).all())


def update_order_status(
    session: Session,
    order_id: UUID,
    status: OrderStatus,
    dispatched_by: UUID | None = None,
    courier: str | None = None,
    courier_ref: str | None = None,
    expected_delivery: date | None = None,
) -> Order:


    # get the order
    order = session.get(Order, order_id)
    if not order:
        raise ValueError("Order not found")

    # define valid status transtions
    valid_transitions = {
        OrderStatus.ACCEPTED: [OrderStatus.PROCESSING],
        OrderStatus.PROCESSING: [OrderStatus.DISPATCHED],
        OrderStatus.DISPATCHED: [OrderStatus.DELIVERED],
    }

    # check if current status can transition to a new status
    if order.status not in valid_transitions:
        raise ValueError(f"Cannot update order in {order.status} status")

    if status not in valid_transitions[order.status]:
        raise ValueError(f"Invalid status transition from {order.status} to {status}")

    # If dispatching, require all dispatch details
    if status == OrderStatus.DISPATCHED:
        if not all([dispatched_by, courier, courier_ref, expected_delivery]):
            raise ValueError(
                "Dispatch details required: dispatched_by, courier, "
                "courier_ref, expected_delivery"
            )

        # Set dispatch information
        order.dispatched_by = dispatched_by
        order.dispatched_date = date.today()
        order.courier = courier
        order.courier_ref = courier_ref
        order.expected_delivery = expected_delivery

    # Update status
    order.status = status

    # Save changes
    session.add(order)
    session.commit()
    session.refresh(order)

    return order
