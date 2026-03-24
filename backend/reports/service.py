from datetime import date, datetime, timezone
from decimal import Decimal
from math import ceil
from uuid import UUID

from sqlmodel import Session, select

from catalogue.models import Product, StockReceipt
from merchants.models import Merchant, Payment
from orders.models import Order, OrderItem, Invoice, OrderStatus

from reports.models import (
    TurnoverItem,
    TurnoverReport,
    OrderSummaryRow,
    MerchantOrdersSummaryReport,
    DetailedOrderItem,
    DetailedOrder,
    MerchantOrdersDetailedReport,
    LowStockItem,
    LowStockReport,
    StockTurnoverItem,
    StockTurnoverReport,
)


def _get_payment_date(session: Session, merchant_id: UUID) -> date | None:
    """Return date of earliest payment by this merchant, or None."""
    payment = session.exec(
        select(Payment)
        .where(Payment.merchant_id == merchant_id)
        .order_by(Payment.payment_date)
    ).first()
    return payment.payment_date if payment else None


def get_turnover_report(
    session: Session, start_date: date, end_date: date
) -> TurnoverReport:
    """Report i: Turnover for a given period — quantities sold and revenue."""
    orders = session.exec(
        select(Order).where(
            Order.order_date >= start_date,
            Order.order_date <= end_date,
        )
    ).all()

    product_stats: dict[UUID, dict] = {}
    for order in orders:
        items = session.exec(
            select(OrderItem).where(OrderItem.order_id == order.id)
        ).all()
        for item in items:
            if item.product_id not in product_stats:
                product = session.get(Product, item.product_id)
                product_stats[item.product_id] = {
                    "product": product,
                    "total_qty": 0,
                    "total_revenue": Decimal("0.00"),
                }
            product_stats[item.product_id]["total_qty"] += item.quantity
            product_stats[item.product_id]["total_revenue"] += item.cost

    items_out = []
    grand_total = Decimal("0.00")
    for product_id, stats in product_stats.items():
        p = stats["product"]
        items_out.append(
            TurnoverItem(
                product_id=product_id,
                product_code=p.product_code if p else "N/A",
                product_name=p.name if p else "Unknown",
                total_quantity_sold=stats["total_qty"],
                total_revenue=stats["total_revenue"],
            )
        )
        grand_total += stats["total_revenue"]

    items_out.sort(key=lambda x: x.total_revenue, reverse=True)
    return TurnoverReport(
        start_date=start_date,
        end_date=end_date,
        items=items_out,
        grand_total_revenue=grand_total,
    )


def get_merchant_orders_summary(
    session: Session,
    merchant_id: UUID,
    start_date: date,
    end_date: date,
) -> MerchantOrdersSummaryReport:
    """
    Report ii — Appendix 4 layout:
    Order ID | Ordered | Amount | Dispatched | Delivered | Paid
    with a Totals line at the bottom.
    """
    merchant = session.get(Merchant, merchant_id)
    if not merchant:
        raise ValueError("Merchant not found")

    orders = session.exec(
        select(Order).where(
            Order.merchant_id == merchant_id,
            Order.order_date >= start_date,
            Order.order_date <= end_date,
        ).order_by(Order.order_date)
    ).all()

    rows = []
    total_value = Decimal("0.00")
    total_discount = Decimal("0.00")
    total_due = Decimal("0.00")
    dispatched_count = 0
    paid_count = 0

    payment_date = _get_payment_date(session, merchant_id)

    for order in orders:
        delivered_date = None
        if order.status == OrderStatus.DELIVERED:
            delivered_date = order.expected_delivery

        if order.dispatched_date:
            dispatched_count += 1
        if payment_date:
            paid_count += 1

        rows.append(
            OrderSummaryRow(
                order_id=order.id,
                order_date=order.order_date,
                order_value=order.total,
                discount=order.discount_amount,
                amount_due=order.amount_due,
                dispatched_date=order.dispatched_date,
                delivered_date=delivered_date,
                payment_date=payment_date,
            )
        )
        total_value += order.total
        total_discount += order.discount_amount
        total_due += order.amount_due

    return MerchantOrdersSummaryReport(
        merchant_id=merchant_id,
        company_name=merchant.company_name,
        contact_name=merchant.contact_name,
        contact_email=merchant.contact_email,
        contact_phone=merchant.contact_phone,
        address=merchant.address,
        account_number=merchant.account_number,
        start_date=start_date,
        end_date=end_date,
        orders=rows,
        total_order_value=total_value,
        total_discount=total_discount,
        total_amount_due=total_due,
        total_orders=len(orders),
        paid_orders=paid_count,
        dispatched_orders=dispatched_count,
    )


def get_merchant_orders_detailed(
    session: Session,
    merchant_id: UUID,
    start_date: date,
    end_date: date,
) -> MerchantOrdersDetailedReport:
    """
    Report iii — Appendix 5 layout:
    Contact header, then per order: Order ID | Cost | Ordered date
    then items: Item ID | Quantity | Unit Cost | Amount
    """
    merchant = session.get(Merchant, merchant_id)
    if not merchant:
        raise ValueError("Merchant not found")

    orders = session.exec(
        select(Order).where(
            Order.merchant_id == merchant_id,
            Order.order_date >= start_date,
            Order.order_date <= end_date,
        ).order_by(Order.order_date)
    ).all()

    detailed_orders = []
    for order in orders:
        items = session.exec(
            select(OrderItem).where(OrderItem.order_id == order.id)
        ).all()

        item_rows = []
        for item in items:
            product = session.get(Product, item.product_id)
            item_rows.append(
                DetailedOrderItem(
                    product_id=item.product_id,
                    product_code=product.product_code if product else "N/A",
                    product_name=product.name if product else "Unknown",
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    cost=item.cost,
                )
            )

        payment_date = _get_payment_date(session, merchant_id)
        detailed_orders.append(
            DetailedOrder(
                order_id=order.id,
                order_date=order.order_date,
                status=order.status.value,
                items=item_rows,
                total=order.total,
                discount=order.discount_amount,
                amount_due=order.amount_due,
                payment_status="paid" if payment_date else "pending",
            )
        )

    return MerchantOrdersDetailedReport(
        merchant_id=merchant_id,
        company_name=merchant.company_name,
        contact_name=merchant.contact_name,
        contact_email=merchant.contact_email,
        contact_phone=merchant.contact_phone,
        address=merchant.address,
        start_date=start_date,
        end_date=end_date,
        orders=detailed_orders,
    )


def get_low_stock_report(session: Session) -> LowStockReport:
    """
    Report — Appendix 3 layout:
    Item ID | Description | Availability | Stock Limit | Recommended Min Order
    Recommended Min Order = qty to bring stock to restock_percentage% above min_stock_level.
    """
    products = session.exec(select(Product)).all()

    low_items = []
    for p in products:
        if p.stock_quantity < p.min_stock_level:
            # target = min_stock_level * (1 + restock_percentage/100)
            # e.g. min=300, 10% → target=330 → order = 330 - current_stock
            target = ceil(p.min_stock_level * (1 + float(p.restock_percentage) / 100))
            recommended = max(target - p.stock_quantity, 0)

            low_items.append(
                LowStockItem(
                    product_id=p.id,
                    product_code=p.product_code,
                    product_name=p.name,
                    current_stock=p.stock_quantity,
                    min_stock_level=p.min_stock_level,
                    shortfall=p.min_stock_level - p.stock_quantity,
                    recommended_min_order=recommended,
                )
            )

    low_items.sort(key=lambda x: x.shortfall, reverse=True)

    return LowStockReport(
        generated_at=datetime.now(timezone.utc),
        items=low_items,
        total_items_below_minimum=len(low_items),
    )


def get_stock_turnover_report(
    session: Session, start_date: date, end_date: date
) -> StockTurnoverReport:
    """Report vi: Stock turnover — goods sold and newly received within a period."""
    products = session.exec(select(Product)).all()

    items_out = []
    for p in products:
        orders_in_period = session.exec(
            select(Order).where(
                Order.order_date >= start_date,
                Order.order_date <= end_date,
            )
        ).all()

        qty_sold = 0
        for order in orders_in_period:
            order_item = session.exec(
                select(OrderItem).where(
                    OrderItem.order_id == order.id,
                    OrderItem.product_id == p.id,
                )
            ).first()
            if order_item:
                qty_sold += order_item.quantity

        receipts = session.exec(
            select(StockReceipt).where(
                StockReceipt.product_id == p.id,
                StockReceipt.received_at >= datetime.combine(start_date, datetime.min.time()),
                StockReceipt.received_at <= datetime.combine(end_date, datetime.max.time()),
            )
        ).all()
        qty_received = sum(r.quantity_added for r in receipts)

        if qty_sold > 0 or qty_received > 0:
            opening_stock = p.stock_quantity + qty_sold - qty_received
            items_out.append(
                StockTurnoverItem(
                    product_id=p.id,
                    product_code=p.product_code,
                    product_name=p.name,
                    opening_stock=max(opening_stock, 0),
                    quantity_sold=qty_sold,
                    quantity_received=qty_received,
                    closing_stock=p.stock_quantity,
                )
            )

    items_out.sort(key=lambda x: x.quantity_sold, reverse=True)
    return StockTurnoverReport(
        start_date=start_date,
        end_date=end_date,
        items=items_out,
    )
