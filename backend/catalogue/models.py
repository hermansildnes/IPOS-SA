from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from pydantic import BaseModel
from sqlmodel import Field, SQLModel


class Product(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    product_code: str = Field(unique=True, index=True)
    name: str
    description: str
    package_type: str
    unit: str
    units_per_pack: int
    package_cost: Decimal = Field(max_digits=10, decimal_places=2)
    stock_quantity: int = Field(default=0)
    min_stock_level: int = Field(default=0)
    restock_percentage: Decimal = Field(
        default=Decimal("10.00"), max_digits=5, decimal_places=2
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StockReceipt(SQLModel, table=True):
    __tablename__ = "stock_receipt"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    product_id: UUID = Field(foreign_key="product.id")
    quantity_added: int
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    received_by: UUID = Field(foreign_key="user.id")


# Request/Response schemas


class ProductCreate(BaseModel):
    product_code: str
    name: str
    description: str
    package_type: str
    unit: str
    units_per_pack: int
    package_cost: Decimal
    min_stock_level: int = 0
    restock_percentage: Decimal = Decimal("10.00")


class ProductUpdate(BaseModel):
    product_code: str
    name: str
    description: str
    package_type: str
    unit: str
    units_per_pack: int
    package_cost: Decimal


class AddStockRequest(BaseModel):
    quantity: int = Field(gt=0)
