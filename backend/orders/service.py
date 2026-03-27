from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlmodel import Session, select

from catalogue.models import Product
from merchants.models import Merchant, DiscountPlanType, DiscountTier, Payment
from orders.models import Order, OrderItem, Invoice, OrderStatus


# helper to convert an Order row into the richer response format
# used by the router/frontend so they get merchant name and item details too
def _serialise_order(session: Session, order: Order):
    # get the merchant linked to this order so we can show the company name
    merchant = session.get(Merchant, order.merchant_id)

    # load all order items belonging to this order
    items = session.exec(select(OrderItem).where(OrderItem.order_id == order.id)).all()

    # collect product ids first so we can fetch product names in one go
    product_ids = [item.product_id for item in items]
    product_map = {}

    # only query products if there are actually items on the order
    if product_ids:
        products = session.exec(
            select(Product).where(Product.id.in_(product_ids))
        ).all()

        # map product id -> product for quick lookup when building the response
        product_map = {product.id: product for product in products}

    return {
        "id": str(order.id),
        "merchant_id": str(order.merchant_id),
        "merchant_name": merchant.company_name if merchant else None,
        "order_date": order.order_date.isoformat(),
        # enum safety: use .value when available, otherwise just cast to string
        "status": order.status.value
        if hasattr(order.status, "value")
        else str(order.status),
        "total": float(order.total),
        "discount_amount": float(order.discount_amount),
        "amount_due": float(order.amount_due),
        "dispatched_date": order.dispatched_date.isoformat()
        if order.dispatched_date
        else None,
        "expected_delivery": order.expected_delivery.isoformat()
        if order.expected_delivery
        else None,
        "courier": order.courier,
        "courier_ref": order.courier_ref,
        "items": [
            {
                "id": str(item.id),
                "product_id": str(item.product_id),
                # include product name if the product still exists
                "product_name": product_map.get(item.product_id).name
                if product_map.get(item.product_id)
                else None,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
                "cost": float(item.cost),
            }
            for item in items
        ],
    }


# helper to work out the discount for this merchant on this subtotal
# handles both fixed discount plans and flexible tiered plans
def _calculate_discount(
    session: Session, merchant: Merchant, subtotal: Decimal
) -> Decimal:
    # fixed plan = same rate every time
    if merchant.discount_plan_type == DiscountPlanType.FIXED:
        if merchant.fixed_discount_rate is None:
            return Decimal("0.00")
        return subtotal * (merchant.fixed_discount_rate / Decimal("100"))

    # flexible plan = look up the merchant's discount tiers
    tiers = session.exec(
        select(DiscountTier).where(DiscountTier.merchant_id == merchant.id)
    ).all()

    # no tiers means no discount
    if not tiers:
        return Decimal("0.00")

    applicable_rate = Decimal("0.00")

    # find the first tier whose min/max range matches the subtotal
    for tier in tiers:
        min_ok = subtotal >= tier.min_value
        max_ok = tier.max_value is None or subtotal <= tier.max_value

        if min_ok and max_ok:
            applicable_rate = tier.discount_rate
            break

    return subtotal * (applicable_rate / Decimal("100"))


# creates a new order for a given merchant
# validates stock, calculates totals/discounts, reduces stock nand creates invoice
def create_order(session: Session, merchant_id: UUID, items: list[dict]) -> Order:
    # make sure the merchant exists first
    merchant = session.get(Merchant, merchant_id)
    if not merchant:
        raise ValueError("Merchant not found")

    # an order with no items should not be allowed
    if not items:
        raise ValueError("Order must contain at least one item")

    subtotal = Decimal("0.00")
    order_items_to_create = []

    # validate each requested item and calculate subtotal
    for item in items:
        product = session.get(Product, item["product_id"])
        quantity = int(item["quantity"])

        if not product:
            raise ValueError("Product not found")

        if quantity <= 0:
            raise ValueError("Quantity must be greater than 0")

        if product.stock_quantity < quantity:
            raise ValueError(f"Insufficient stock for {product.name}")

        # snapshot the package cost at order time
        cost = product.package_cost * quantity
        subtotal += cost

        # store validated item data so we can create rows after the order exists
        order_items_to_create.append(
            {
                "product": product,
                "quantity": quantity,
                "unit_price": product.package_cost,
                "cost": cost,
            }
        )

    # work out merchant-specific discount and final amount due
    discount_amount = _calculate_discount(session, merchant, subtotal)
    amount_due = subtotal - discount_amount

    # hard credit limit check - the brief says orders can only go through if the
    # merchant has enough available credit, so we need to factor in existing debt
    # available credit = credit limit minus whatever they already owe from past orders
    existing_orders = session.exec(
        select(Order).where(Order.merchant_id == merchant_id)
    ).all()
    total_owed = sum((o.amount_due for o in existing_orders), Decimal("0.00"))

    existing_payments = session.exec(
        select(Payment).where(Payment.merchant_id == merchant_id)
    ).all()
    total_paid = sum((p.amount for p in existing_payments), Decimal("0.00"))

    outstanding = total_owed - total_paid
    available_credit = merchant.credit_limit - outstanding

    if amount_due > available_credit:
        raise ValueError(
            f"Order total of £{float(amount_due):.2f} exceeds your available credit "
            f"of £{float(available_credit):.2f}"
        )

    # create the main order row first
    order = Order(
        merchant_id=merchant_id,
        order_date=date.today(),
        status=OrderStatus.ACCEPTED,
        total=subtotal,
        discount_amount=discount_amount,
        amount_due=amount_due,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session.add(order)

    # flush so order.id is available for the order items/invoice
    session.flush()

    # create each order item and reduce stock immediately
    for item_data in order_items_to_create:
        item = OrderItem(
            order_id=order.id,
            product_id=item_data["product"].id,
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            cost=item_data["cost"],
        )
        session.add(item)

        # reduce product stock by the ordered quantity
        item_data["product"].stock_quantity -= item_data["quantity"]
        session.add(item_data["product"])

    # automatically create an invoice when the order is placed
    invoice = Invoice(
        order_id=order.id,
        merchant_id=merchant_id,
        invoice_date=date.today(),
        total_amount=subtotal,
        discount_amount=discount_amount,
        amount_due=amount_due,
    )
    session.add(invoice)

    session.commit()
    session.refresh(order)
    return order


# get a single order by id and return the serialised version for the API
def get_order(session: Session, order_id: UUID):
    order = session.get(Order, order_id)
    if not order:
        return None
    return _serialise_order(session, order)


# get all orders in the system
# admin/manager use this for the global order history view
def get_all_orders(session: Session, status_filter: OrderStatus | None = None):
    # newest orders first
    statement = select(Order).order_by(Order.order_date.desc(), Order.created_at.desc())

    # optional filtering by status
    if status_filter:
        statement = statement.where(Order.status == status_filter)

    orders = session.exec(statement).all()
    return [_serialise_order(session, order) for order in orders]


# get all orders for one merchant only
# merchant views and some reports/history views use this
def get_orders_by_merchant(
    session: Session, merchant_id: UUID, status_filter: OrderStatus | None = None
):
    statement = (
        select(Order)
        .where(Order.merchant_id == merchant_id)
        .order_by(Order.order_date.desc(), Order.created_at.desc())
    )

    # optional filtering by status
    if status_filter:
        statement = statement.where(Order.status == status_filter)

    orders = session.exec(statement).all()
    return [_serialise_order(session, order) for order in orders]


# update an order's status, enforcing only valid forward transitions
# also stores dispatch details when the order is dispatched
def update_order_status(
    session: Session,
    order_id: UUID,
    new_status: OrderStatus,
    dispatched_by: UUID | None = None,
    courier: str | None = None,
    courier_ref: str | None = None,
    expected_delivery: date | None = None,
) -> Order:
    order = session.get(Order, order_id)
    if not order:
        raise ValueError("Order not found")

    current_status = order.status

    # only allow sensible forward transitions through the workflow
    # dispatched is the final state staff can set - delivery is confirmed externally
    valid_transitions = {
        OrderStatus.ACCEPTED: [OrderStatus.PROCESSING],
        OrderStatus.PROCESSING: [OrderStatus.DISPATCHED],
        OrderStatus.DISPATCHED: [],
        OrderStatus.DELIVERED: [],
    }

    if new_status not in valid_transitions[current_status]:
        raise ValueError(
            f"Cannot change order from {current_status.value} to {new_status.value}"
        )

    # dispatching needs extra delivery information
    if new_status == OrderStatus.DISPATCHED:
        if not courier or not courier_ref or not expected_delivery:
            raise ValueError(
                "Courier, tracking reference, and expected delivery are required for dispatch"
            )

        order.dispatched_by = dispatched_by
        order.dispatched_date = date.today()
        order.courier = courier
        order.courier_ref = courier_ref
        order.expected_delivery = expected_delivery

    order.status = new_status
    order.updated_at = datetime.now(timezone.utc)

    session.add(order)
    session.commit()
    session.refresh(order)
    return order
