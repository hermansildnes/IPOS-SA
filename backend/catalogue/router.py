from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session

from auth.service import get_current_user
from auth.models import User, UserRole
from core.database import get_session
from catalogue import service
from catalogue.models import Product

router = APIRouter()


# Request/Response Models

class ProductCreate(BaseModel):
    product_code: str
    name: str
    description: str
    package_type: str
    unit: str
    units_per_pack: int
    package_cost: float
    min_stock_level: int = 0
    restock_percentage: float = 10.00


class ProductUpdate(BaseModel):
    product_code: str
    name: str
    description: str
    package_type: str
    unit: str
    units_per_pack: int
    package_cost: float


class AddStockRequest(BaseModel):
    quantity: int


# Endpoints

@router.get("")
def list_catalogue(
    session: Session = Depends(get_session)
):
    return service.list_catalogue(session)


@router.get("/low-stock")
def low_stock(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager access required"
        )
    return service.get_low_stock_products(session)


@router.get("/search")
def search(
    query: str,
    session: Session = Depends(get_session)
):
    return service.search_products(query, session)


@router.get("/{product_id}")
def get_product(
    product_id: UUID,
    session: Session = Depends(get_session)
):
    return service.get_product(product_id, session)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_product(
    body: ProductCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return service.create_product(body, session)


@router.put("/{product_id}")
def update_product(
    product_id: UUID,
    body: ProductUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return service.update_product(product_id, body, session)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    service.delete_product(product_id, session)


@router.post("/{product_id}/stock", status_code=status.HTTP_201_CREATED)
def add_stock(
    product_id: UUID,
    body: AddStockRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager access required"
        )
    return service.add_stock(product_id, body.quantity, current_user.id, session)