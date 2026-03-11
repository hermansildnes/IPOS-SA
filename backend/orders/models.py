import enum
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class OrderStatus(str, enum.Enum):
    ACCEPTED = "accepted"
    PROCESSING = "processing"
    DISPATCHED = "dispatched"
    DELIVERED = "delivered"


class Order(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    merchant_id: UUID = Field(foreign_key="merchant.id")
    order_date: date = Field(default_factory=date.today)
    status: OrderStatus = Field(default=OrderStatus.ACCEPTED)
    total: Decimal = Field(max_digits=12, decimal_places=2)
    discount_amount: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    amount_due: Decimal = Field(max_digits=12, decimal_places=2)
    dispatched_by: UUID | None = Field(default=None, foreign_key="user.id")
    dispatched_date: date | None = None
    courier: str | None = None
    courier_ref: str | None = None
    expected_delivery: date | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))



class OrderItem(SQLModel, table=True):
    __tablename__ = "order_item"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    order_id: UUID = Field(foreign_key="order.id")
    product_id: UUID = Field(foreign_key="product.id")
    quantity: int
    unit_price: Decimal = Field(max_digits=10, decimal_places=2)  # snapshot at order time
    cost: Decimal = Field(max_digits=12, decimal_places=2)


class Invoice(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    order_id: UUID = Field(foreign_key="order.id", unique=True)
    merchant_id: UUID = Field(foreign_key="merchant.id")
    invoice_date: date = Field(default_factory=date.today)
    total_amount: Decimal = Field(max_digits=12, decimal_places=2)
    discount_amount: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
    amount_due: Decimal = Field(max_digits=12, decimal_places=2)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
