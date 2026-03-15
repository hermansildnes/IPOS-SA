import enum
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from pydantic import BaseModel, EmailStr
from sqlmodel import Field, SQLModel


class AccountStatus(str, enum.Enum):
    NORMAL = "normal"
    SUSPENDED = "suspended"
    IN_DEFAULT = "in_default"


class DiscountPlanType(str, enum.Enum):
    FIXED = "fixed"
    FLEXIBLE = "flexible"


class ReminderStatus(str, enum.Enum):
    NO_NEED = "no_need"
    DUE = "due"
    SENT = "sent"


class Merchant(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", unique=True)
    account_number: str = Field(unique=True)
    company_name: str
    contact_name: str
    contact_email: str
    contact_phone: str | None = None
    address: str
    credit_limit: Decimal = Field(max_digits=12, decimal_places=2)
    discount_plan_type: DiscountPlanType
    fixed_discount_rate: Decimal | None = Field(
        default=None, max_digits=5, decimal_places=2
    )
    account_status: AccountStatus = Field(default=AccountStatus.NORMAL)

    status_1st_reminder: ReminderStatus = Field(default=ReminderStatus.NO_NEED)
    status_2nd_reminder: ReminderStatus = Field(default=ReminderStatus.NO_NEED)
    date_1st_reminder: date | None = None
    date_2nd_reminder: date | None = None

    # Audit trail for account status changes
    reinstated_by: UUID | None = Field(default=None, foreign_key="user.id")
    reinstated_at: datetime | None = None
    reinstatement_reason: str | None = None
    default_reason: str | None = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DiscountTier(SQLModel, table=True):
    __tablename__ = "discount_tier"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    merchant_id: UUID = Field(foreign_key="merchant.id")
    min_value: Decimal = Field(max_digits=12, decimal_places=2)
    max_value: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    discount_rate: Decimal = Field(max_digits=5, decimal_places=2)


class Payment(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    merchant_id: UUID = Field(foreign_key="merchant.id")
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    payment_date: date
    payment_method: str
    reference_number: str | None = None
    recorded_by: UUID = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MerchantCreate(BaseModel):
    user_id: UUID
    account_number: str
    company_name: str
    contact_name: str
    contact_email: EmailStr
    contact_phone: str | None = None
    address: str
    credit_limit: Decimal
    discount_plan_type: DiscountPlanType
    fixed_discount_rate: Decimal | None = None


class MerchantUpdate(BaseModel):
    company_name: str | None = None
    contact_name: str | None = None
    contact_email: EmailStr | None = None
    contact_phone: str | None = None
    address: str | None = None
    credit_limit: Decimal | None = None
    discount_plan_type: DiscountPlanType | None = None
    fixed_discount_rate: Decimal | None = None
    account_status: AccountStatus | None = None


class MerchantRead(BaseModel):
    id: UUID
    user_id: UUID
    account_number: str
    company_name: str
    contact_name: str
    contact_email: EmailStr
    contact_phone: str | None
    address: str
    credit_limit: Decimal
    discount_plan_type: DiscountPlanType
    fixed_discount_rate: Decimal | None
    account_status: AccountStatus
    created_at: datetime
    updated_at: datetime


class MerchantBalanceRead(BaseModel):
    merchant_id: UUID
    credit_limit: Decimal
    outstanding_balance: Decimal
    available_credit: Decimal


class InvoiceCreate(BaseModel):
    order_id: UUID
    invoice_date: date
    total_amount: Decimal
    discount_amount: Decimal = Decimal("0.00")
    amount_due: Decimal


class InvoiceRead(BaseModel):
    id: UUID
    order_id: UUID
    merchant_id: UUID
    invoice_date: date
    total_amount: Decimal
    discount_amount: Decimal
    amount_due: Decimal