from sqlmodel import Session, SQLModel, create_engine

from catalogue.models import Product, StockReceipt
from merchants.models import Merchant, DiscountTier, Payment
from orders.models import Order, OrderItem, Invoice

from core.config import settings

engine = create_engine(settings.DATABASE_URL)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
