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


class Merchant(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", unique=True)
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
