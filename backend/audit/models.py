import enum
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel
from sqlmodel import Field, SQLModel


class AuditAction(str, enum.Enum):
    # Auth
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    PASSWORD_CHANGED = "password_changed"

    # User / account management
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    USER_ROLE_CHANGED = "user_role_changed"

    # Merchant accounts
    MERCHANT_CREATED = "merchant_created"
    MERCHANT_UPDATED = "merchant_updated"
    MERCHANT_DELETED = "merchant_deleted"
    MERCHANT_ACCOUNT_SUSPENDED = "merchant_account_suspended"
    MERCHANT_ACCOUNT_RESTORED = "merchant_account_restored"
    MERCHANT_ACCOUNT_DEFAULTED = "merchant_account_defaulted"
    MERCHANT_CREDIT_LIMIT_CHANGED = "merchant_credit_limit_changed"
    MERCHANT_DISCOUNT_PLAN_CHANGED = "merchant_discount_plan_changed"

    # Catalogue
    PRODUCT_CREATED = "product_created"
    PRODUCT_UPDATED = "product_updated"
    PRODUCT_DELETED = "product_deleted"
    STOCK_ADDED = "stock_added"
    STOCK_REDUCED = "stock_reduced"
    MIN_STOCK_UPDATED = "min_stock_updated"
    DISCOUNT_PLAN_DELETED = "discount_plan_deleted"

    # Orders
    ORDER_PLACED = "order_placed"
    ORDER_STATUS_CHANGED = "order_status_changed"
    ORDER_DISPATCHED = "order_dispatched"
    ORDER_DELIVERED = "order_delivered"
    INVOICE_GENERATED = "invoice_generated"

    # Payments
    PAYMENT_RECORDED = "payment_recorded"
    BALANCE_ADJUSTED = "balance_adjusted"

    # Applications
    APPLICATION_RECEIVED = "application_received"
    APPLICATION_APPROVED = "application_approved"
    APPLICATION_REJECTED = "application_rejected"

    # Reports
    REPORT_GENERATED = "report_generated"


class AuditCategory(str, enum.Enum):
    AUTH = "auth"
    ACCOUNTS = "accounts"
    CATALOGUE = "catalogue"
    ORDERS = "orders"
    PAYMENTS = "payments"
    APPLICATIONS = "applications"
    REPORTS = "reports"


ACTION_CATEGORY: dict[AuditAction, AuditCategory] = {
    AuditAction.LOGIN: AuditCategory.AUTH,
    AuditAction.LOGOUT: AuditCategory.AUTH,
    AuditAction.LOGIN_FAILED: AuditCategory.AUTH,
    AuditAction.PASSWORD_CHANGED: AuditCategory.AUTH,
    AuditAction.USER_CREATED: AuditCategory.ACCOUNTS,
    AuditAction.USER_UPDATED: AuditCategory.ACCOUNTS,
    AuditAction.USER_DELETED: AuditCategory.ACCOUNTS,
    AuditAction.USER_ROLE_CHANGED: AuditCategory.ACCOUNTS,
    AuditAction.MERCHANT_CREATED: AuditCategory.ACCOUNTS,
    AuditAction.MERCHANT_UPDATED: AuditCategory.ACCOUNTS,
    AuditAction.MERCHANT_DELETED: AuditCategory.ACCOUNTS,
    AuditAction.MERCHANT_ACCOUNT_SUSPENDED: AuditCategory.ACCOUNTS,
    AuditAction.MERCHANT_ACCOUNT_RESTORED: AuditCategory.ACCOUNTS,
    AuditAction.MERCHANT_ACCOUNT_DEFAULTED: AuditCategory.ACCOUNTS,
    AuditAction.MERCHANT_CREDIT_LIMIT_CHANGED: AuditCategory.ACCOUNTS,
    AuditAction.MERCHANT_DISCOUNT_PLAN_CHANGED: AuditCategory.ACCOUNTS,
    AuditAction.PRODUCT_CREATED: AuditCategory.CATALOGUE,
    AuditAction.PRODUCT_UPDATED: AuditCategory.CATALOGUE,
    AuditAction.PRODUCT_DELETED: AuditCategory.CATALOGUE,
    AuditAction.STOCK_ADDED: AuditCategory.CATALOGUE,
    AuditAction.STOCK_REDUCED: AuditCategory.CATALOGUE,
    AuditAction.MIN_STOCK_UPDATED: AuditCategory.CATALOGUE,
    AuditAction.DISCOUNT_PLAN_DELETED: AuditCategory.ACCOUNTS,
    AuditAction.ORDER_PLACED: AuditCategory.ORDERS,
    AuditAction.ORDER_STATUS_CHANGED: AuditCategory.ORDERS,
    AuditAction.ORDER_DISPATCHED: AuditCategory.ORDERS,
    AuditAction.ORDER_DELIVERED: AuditCategory.ORDERS,
    AuditAction.INVOICE_GENERATED: AuditCategory.ORDERS,
    AuditAction.PAYMENT_RECORDED: AuditCategory.PAYMENTS,
    AuditAction.BALANCE_ADJUSTED: AuditCategory.PAYMENTS,
    AuditAction.APPLICATION_RECEIVED: AuditCategory.APPLICATIONS,
    AuditAction.APPLICATION_APPROVED: AuditCategory.APPLICATIONS,
    AuditAction.APPLICATION_REJECTED: AuditCategory.APPLICATIONS,
    AuditAction.REPORT_GENERATED: AuditCategory.REPORTS,
}


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_log"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    performed_by_id: Optional[UUID] = Field(default=None, foreign_key="user.id")
    performed_by_username: str
    action: AuditAction
    category: AuditCategory
    target_type: Optional[str] = Field(default=None)
    target_id: Optional[str] = Field(default=None)
    target_label: Optional[str] = Field(default=None)
    detail: Optional[str] = Field(default=None)
    ip_address: Optional[str] = Field(default=None)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AuditLogRead(BaseModel):
    id: UUID
    performed_by_id: Optional[UUID]
    performed_by_username: str
    action: AuditAction
    category: AuditCategory
    target_type: Optional[str]
    target_id: Optional[str]
    target_label: Optional[str]
    detail: Optional[str]
    ip_address: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True


class AuditLogPage(BaseModel):
    items: list[AuditLogRead]
    total: int
    page: int
    page_size: int
    total_pages: int
