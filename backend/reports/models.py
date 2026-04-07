from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


# ── Turnover Report ────────────────────────────────────────────────────────


class TurnoverItem(BaseModel):
    product_id: UUID
    product_code: str
    product_name: str
    total_quantity_sold: int
    total_revenue: Decimal


class TurnoverReport(BaseModel):
    start_date: date
    end_date: date
    items: list[TurnoverItem]
    grand_total_revenue: Decimal


# ── Merchant Orders Summary ────────────────────────────────────────────────


class OrderSummaryRow(BaseModel):
    order_id: UUID
    order_date: date
    order_value: Decimal
    discount: Decimal
    amount_due: Decimal
    dispatched_date: date | None
    delivered_date: date | None


class MerchantOrdersSummaryReport(BaseModel):
    merchant_id: UUID
    company_name: str
    contact_name: str
    contact_email: str
    contact_phone: str | None
    address: str
    account_number: str
    start_date: date
    end_date: date
    orders: list[OrderSummaryRow]
    total_order_value: Decimal
    total_discount: Decimal
    total_amount_due: Decimal
    total_orders: int
    dispatched_orders: int


# ── Merchant Orders Detailed ───────────────────────────────────────────────


class DetailedOrderItem(BaseModel):
    product_id: UUID
    product_code: str
    product_name: str
    quantity: int
    unit_price: Decimal
    cost: Decimal


class DetailedOrder(BaseModel):
    order_id: UUID
    order_date: date
    status: str
    items: list[DetailedOrderItem]
    total: Decimal
    discount: Decimal
    amount_due: Decimal


class MerchantOrdersDetailedReport(BaseModel):
    merchant_id: UUID
    company_name: str
    contact_name: str
    contact_email: str
    contact_phone: str | None
    address: str
    start_date: date
    end_date: date
    orders: list[DetailedOrder]


# ── Low Stock Report ───────────────────────────────────────────────────────


class LowStockItem(BaseModel):
    product_id: UUID
    product_code: str
    product_name: str
    current_stock: int
    min_stock_level: int
    shortfall: int
    recommended_min_order: int


class LowStockReport(BaseModel):
    generated_at: datetime
    items: list[LowStockItem]
    total_items_below_minimum: int


# ── Merchant Invoices Report ───────────────────────────────────────────────


class MerchantInvoiceRow(BaseModel):
    invoice_id: UUID
    order_id: UUID
    invoice_date: date
    total_amount: Decimal
    discount_amount: Decimal
    amount_due: Decimal


class MerchantInvoicesReport(BaseModel):
    merchant_id: UUID
    company_name: str
    contact_name: str
    contact_email: str
    contact_phone: str | None
    address: str
    account_number: str
    start_date: date
    end_date: date
    invoices: list[MerchantInvoiceRow]
    total_amount_due: Decimal
    total_invoices: int


# ── All Invoices Report ────────────────────────────────────────────────────


class AllInvoiceRow(BaseModel):
    invoice_id: UUID
    order_id: UUID
    merchant_id: UUID
    company_name: str
    account_number: str
    invoice_date: date
    total_amount: Decimal
    discount_amount: Decimal
    amount_due: Decimal


class AllInvoicesReport(BaseModel):
    start_date: date
    end_date: date
    invoices: list[AllInvoiceRow]
    grand_total_amount_due: Decimal
    total_invoices: int


# ── Stock Turnover Report ──────────────────────────────────────────────────


class StockTurnoverItem(BaseModel):
    product_id: UUID
    product_code: str
    product_name: str
    opening_stock: int
    quantity_sold: int
    quantity_received: int
    closing_stock: int


class StockTurnoverReport(BaseModel):
    start_date: date
    end_date: date
    items: list[StockTurnoverItem]
