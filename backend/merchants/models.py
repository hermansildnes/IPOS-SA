import enum
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

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
    fixed_discount_rate: Decimal | None = Field(default=None, max_digits=5, decimal_places=2)
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
