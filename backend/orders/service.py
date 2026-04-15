from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlmodel import Session, select

from catalogue.models import Product
from merchants.models import (
    Merchant,
    AccountStatus,
    DiscountPlanType,
    DiscountTier,
    Payment,
)
from orders.models import Order, OrderItem, Invoice, OrderStatus


def _serialise_order(session: Session, order: Order):
    merchant = session.get(Merchant, order.merchant_id)
    items = session.exec(select(OrderItem).where(OrderItem.order_id == order.id)).all()
    product_ids = [item.product_id for item in items]
    product_map = {}
    if product_ids:
        products = session.exec(
            select(Product).where(Product.id.in_(product_ids))
        ).all()
        product_map = {product.id: product for product in products}

    return {
        "id": str(order.id),
        "merchant_id": str(order.merchant_id),
        "merchant_name": merchant.company_name if merchant else None,
        "order_date": order.order_date.isoformat(),
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


def _calculate_discount(
    session: Session, merchant: Merchant, subtotal: Decimal
) -> Decimal:
    if merchant.discount_plan_type == DiscountPlanType.FIXED:
        if merchant.fixed_discount_rate is None:
            return Decimal("0.00")
        return subtotal * (merchant.fixed_discount_rate / Decimal("100"))

    tiers = session.exec(
        select(DiscountTier).where(DiscountTier.merchant_id == merchant.id)
    ).all()
    if not tiers:
        return Decimal("0.00")

    applicable_rate = Decimal("0.00")
    for tier in tiers:
        min_ok = subtotal >= tier.min_value
        max_ok = tier.max_value is None or subtotal <= tier.max_value
        if min_ok and max_ok:
            applicable_rate = tier.discount_rate
            break

    return subtotal * (applicable_rate / Decimal("100"))


def create_order(session: Session, merchant_id: UUID, items: list[dict]) -> Order:
    merchant = session.get(Merchant, merchant_id)
    if not merchant:
        raise ValueError("Merchant not found")

    if merchant.account_status == AccountStatus.SUSPENDED:
        raise ValueError(
            "Your account is currently suspended due to an outstanding balance. "
            "Orders are blocked until payment is received. You have 15 days to pay before your account enters default."
        )
    if merchant.account_status == AccountStatus.IN_DEFAULT:
        raise ValueError(
            "Your account is in default. New orders cannot be placed. "
            "Please contact InfoPharma directly to resolve this."
        )

    if not items:
        raise ValueError("Order must contain at least one item")

    subtotal = Decimal("0.00")
    order_items_to_create = []

    for item in items:
        product = session.get(Product, item["product_id"])
        quantity = int(item["quantity"])

        if not product:
            raise ValueError("Product not found")
        if quantity <= 0:
            raise ValueError("Quantity must be greater than 0")
        if product.stock_quantity < quantity:
            raise ValueError(f"Insufficient stock for {product.name}")

        cost = product.package_cost * quantity
        subtotal += cost
        order_items_to_create.append(
            {
                "product": product,
                "quantity": quantity,
                "unit_price": product.package_cost,
                "cost": cost,
            }
        )

    discount_amount = _calculate_discount(session, merchant, subtotal)
    amount_due = subtotal - discount_amount

    existing_orders = session.exec(
        select(Order).where(Order.merchant_id == merchant_id)
    ).all()
    total_owed = sum((o.amount_due for o in existing_orders), Decimal("0.00"))

    existing_payments = session.exec(
        select(Payment).where(Payment.merchant_id == merchant_id)
    ).all()
    total_paid = sum((p.amount for p in existing_payments), Decimal("0.00"))

    outstanding = total_owed - total_paid

    # hard block at 10% overdraft - orders are rejected if they would push past this ceiling
    # the 5% threshold triggers suspension separately but does not block the order itself
    hard_cap = merchant.credit_limit * Decimal("1.10")

    if outstanding + amount_due > hard_cap:
        available_credit = merchant.credit_limit - outstanding
        raise ValueError(
            f"Order total of £{float(amount_due):.2f} would exceed the maximum credit allowance "
            f"(available: £{float(max(available_credit, Decimal('0'))):.2f}, hard cap: 10% overdraft)"
        )

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
    session.flush()

    for item_data in order_items_to_create:
        item = OrderItem(
            order_id=order.id,
            product_id=item_data["product"].id,
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            cost=item_data["cost"],
        )
        session.add(item)
        item_data["product"].stock_quantity -= item_data["quantity"]
        session.add(item_data["product"])

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


def get_order(session: Session, order_id: UUID):
    order = session.get(Order, order_id)
    if not order:
        return None
    return _serialise_order(session, order)


def get_all_orders(session: Session, status_filter: OrderStatus | None = None):
    statement = select(Order).order_by(Order.order_date.desc(), Order.created_at.desc())
    if status_filter:
        statement = statement.where(Order.status == status_filter)
    orders = session.exec(statement).all()
    return [_serialise_order(session, order) for order in orders]


def get_orders_by_merchant(
    session: Session, merchant_id: UUID, status_filter: OrderStatus | None = None
):
    statement = (
        select(Order)
        .where(Order.merchant_id == merchant_id)
        .order_by(Order.order_date.desc(), Order.created_at.desc())
    )
    if status_filter:
        statement = statement.where(Order.status == status_filter)
    orders = session.exec(statement).all()
    return [_serialise_order(session, order) for order in orders]


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

    valid_transitions = {
        OrderStatus.ACCEPTED: [OrderStatus.READY_TO_DISPATCH],
        OrderStatus.READY_TO_DISPATCH: [OrderStatus.DISPATCHED],
        OrderStatus.DISPATCHED: [OrderStatus.DELIVERED],
        OrderStatus.DELIVERED: [],
    }

    if new_status not in valid_transitions[current_status]:
        raise ValueError(
            f"Cannot change order from {current_status.value} to {new_status.value}"
        )

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


def delete_order(session: Session, order_id: UUID) -> None:
    order = session.get(Order, order_id)
    if not order:
        raise ValueError("Order not found")

    invoice = session.exec(select(Invoice).where(Invoice.order_id == order_id)).first()
    if invoice:
        session.delete(invoice)

    items = session.exec(select(OrderItem).where(OrderItem.order_id == order_id)).all()
    for item in items:
        session.delete(item)

    session.delete(order)
    session.commit()
