from fastapi import HTTPException, status
from sqlmodel import Session, select
from uuid import UUID
from datetime import datetime, timezone

from catalogue.models import Product, StockReceipt


def list_catalogue(session: Session) -> list[Product]:
    return list(session.exec(select(Product)).all())

def get_product(product_id: UUID, session: Session) -> Product:
    product = session.get(Product, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )
    return product

def create_product(data, session: Session) -> Product:

    product = Product(
        product_code=data.product_code,
        name=data.name,
        description=data.description,
        package_type=data.package_type,
        unit=data.unit,
        units_per_pack=data.units_per_pack,
        package_cost=data.package_cost,
    )

    session.add(product)
    session.commit()
    session.refresh(product)
    return product

def update_product(data, session: Session) -> Product:
    
    product = Product(
        product_code=data.product_code,
        name=data.name,
        description=data.description,
        package_type=data.package_type,
        unit=data.unit,
        units_per_pack=data.units_per_pack,
        package_cost=data.package_cost,
    )

    session.add(product)
    session.commit()
    session.refresh(product)
    return product

def update_product(product_id: UUID, data, session: Session) -> Product:
    product = get_product(product_id, session)

    product.product_code = data.product_code
    product.name = data.name
    product.description = data.description
    product.package_type = data.package_type
    product.unit = data.unit
    product.units_per_pack = data.units_per_pack
    product.package_cost = data.package_cost
    product.updated_at = datetime.now(timezone.utc)

    session.add(product)
    session.commit()
    session.refresh(product)
    return product



  # Leon: This wasn't fully complete so just added this so i could test some things in the backend,
  # but feel free to replace with your code if it was already done but not committed. 

def search_products(query: str, session: Session) -> list[Product]:

    return list(session.exec(select(Product)).all())


def add_stock(product_id: UUID, quantity: int, user_id: UUID, session: Session):

    # get product
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # add the quantity
    product.stock_quantity += quantity
    session.add(product)
    session.commit()
    session.refresh(product)
    
    return product


def get_low_stock_products(session: Session) -> list[Product]:
    """Get products below minimum stock level"""
    return list(session.exec(select(Product).where(Product.stock_quantity < Product.min_stock_level)).all())