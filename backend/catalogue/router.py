from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session

from audit.models import AuditAction
from audit.service import log_action
from auth.models import User, UserRole
from auth.service import get_current_user
from catalogue import service
from catalogue.models import (
    AddStockRequest,
    ProductCreate,
    ProductUpdate,
    ReduceStockRequest,
)
from core.database import get_session

router = APIRouter()


@router.get("")
def list_catalogue(session: Session = Depends(get_session)):
    return service.list_catalogue(session)


@router.get("/low-stock")
def low_stock(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager access required",
        )
    return service.get_low_stock_products(session)


@router.get("/search")
def search(query: str, session: Session = Depends(get_session)):
    return service.search_products(query, session)


@router.get("/{product_id}")
def get_product(product_id: UUID, session: Session = Depends(get_session)):
    return service.get_product(product_id, session)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_product(
    body: ProductCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager access required",
        )

    product = service.create_product(body, session)

    log_action(
        session,
        action=AuditAction.PRODUCT_CREATED,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        target_type="product",
        target_id=str(product.id),
        target_label=product.name,
        detail={"product_code": product.product_code},
        ip_address=request.client.host,
    )

    return product


@router.put("/{product_id}")
def update_product(
    product_id: UUID,
    body: ProductUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager access required",
        )

    old_product = service.get_product(product_id, session)
    old_min_stock = old_product.min_stock_level

    product = service.update_product(product_id, body, session)

    action = AuditAction.PRODUCT_UPDATED
    detail: dict = {"product_code": product.product_code}
    if body.min_stock_level != old_min_stock:
        action = AuditAction.MIN_STOCK_UPDATED
        detail["old_min_stock"] = old_min_stock
        detail["new_min_stock"] = body.min_stock_level

    log_action(
        session,
        action=action,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        target_type="product",
        target_id=str(product_id),
        target_label=product.name,
        detail=detail,
        ip_address=request.client.host,
    )

    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager access required",
        )

    product = service.get_product(product_id, session)
    service.delete_product(product_id, session)

    log_action(
        session,
        action=AuditAction.PRODUCT_DELETED,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        target_type="product",
        target_id=str(product_id),
        target_label=product.name,
        detail={"product_code": product.product_code},
        ip_address=request.client.host,
    )


@router.post("/{product_id}/stock", status_code=status.HTTP_201_CREATED)
def add_stock(
    product_id: UUID,
    body: AddStockRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager access required",
        )

    product = service.add_stock(product_id, body.quantity, current_user.id, session)

    log_action(
        session,
        action=AuditAction.STOCK_ADDED,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        target_type="product",
        target_id=str(product_id),
        target_label=product.name,
        detail={"quantity_added": body.quantity, "new_total": product.stock_quantity},
        ip_address=request.client.host,
    )

    return product


@router.post("/{product_id}/stock/reduce", status_code=status.HTTP_200_OK)
def reduce_stock(
    product_id: UUID,
    body: ReduceStockRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager access required",
        )

    product = service.reduce_stock(product_id, body.quantity, current_user.id, session)

    log_action(
        session,
        action=AuditAction.STOCK_REDUCED,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        target_type="product",
        target_id=str(product_id),
        target_label=product.name,
        detail={"quantity_removed": body.quantity, "new_total": product.stock_quantity},
        ip_address=request.client.host,
    )

    return product
