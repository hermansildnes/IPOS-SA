"""
Orders router - defines HTTP endpoints for order operations.
each endpoint is a thin wrapper that:
1. validates request data
2. calls the appropriate service function
3. returns the response
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from auth.models import User, UserRole
from auth.service import get_current_user
from core.database import get_session
from orders import service
from orders.models import CreateOrderRequest, UpdateOrderStatusRequest

router = APIRouter()


# Endpoints


@router.post("", status_code=status.HTTP_201_CREATED)
def create_order(
    body: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):

    # only merchants can place orders
    if current_user.role != UserRole.MERCHANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only merchants can place orders",
        )

    # Leon: Get the actual merchant ID from the user's linked merchant account
    # Experienced some issues here
    from merchants.models import Merchant
    merchant = session.exec(
        select(Merchant).where(Merchant.user_id == current_user.id)
    ).first()
    
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merchant account not found for this user"
        )
    
    merchant_id = merchant.id  

    try:
        # convert request items to service format
        items = [
            {"product_id": item.product_id, "quantity": item.quantity}
            for item in body.items
        ]

        # call service to create order
        order = service.create_order(session, merchant_id, items)

        return {
            "order_id": str(order.id),
            "message": "Order created successfully",
            "total": float(order.total),
            "discount": float(order.discount_amount),
            "amount_due": float(order.amount_due),
        }
    except ValueError as e:
        # validation error from service (e.g. insufficient stock, over credit limit)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))



@router.get("/{order_id}")
def get_order(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):

    order = service.get_order(session, order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )

    return order


@router.patch("/{order_id}/status")
def update_order_status(
    order_id: UUID,
    body: UpdateOrderStatusRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):

    # only admin/manager can update order status
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin or manager can update order status",
        )

    try:
        # call service to update status
        order = service.update_order_status(
            session,
            order_id,
            body.status,
            body.dispatched_by,
            body.courier,
            body.courier_ref,
            body.expected_delivery,
        )

        return {
            "message": "Order status updated successfully",
            "order_id": str(order.id),
            "new_status": order.status,
        }
    except ValueError as e:
        # validation error (invalid transition, missing dispatch details, etc.)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
