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


@router.get("")
def list_orders(
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List all orders for admin/manager, or own orders for merchant."""
    from merchants.models import Merchant
    from orders.models import OrderStatus

    # if a status filter was provided, try converting it into the enum first
    # this keeps the router responsible for basic input validation
    status_enum = None
    if status:
        try:
            status_enum = OrderStatus(status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid order status",
            )

    # admin and manager can see the full order history across all merchants
    if current_user.role in [UserRole.ADMIN, UserRole.MANAGER]:
        return service.get_all_orders(session, status_enum)

    # merchants can only see their own orders
    if current_user.role == UserRole.MERCHANT:
        # look up the merchant account linked to this logged in user
        merchant = session.exec(
            select(Merchant).where(Merchant.user_id == current_user.id)
        ).first()

        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Merchant account not found for this user",
            )

        # call the merchant-specific service function
        return service.get_orders_by_merchant(session, merchant.id, status_enum)

    # any other role should not be able to access this endpoint
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied",
    )


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
    # because orders reference Merchant.id, not User.id
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
        # convert request items to the simple service-layer format
        items = [
            {"product_id": item.product_id, "quantity": item.quantity}
            for item in body.items
        ]

        # call service to create the order, reduce stock, and generate invoice
        order = service.create_order(session, merchant_id, items)

        return {
            "order_id": str(order.id),
            "message": "Order created successfully",
            "total": float(order.total),
            "discount": float(order.discount_amount),
            "amount_due": float(order.amount_due),
        }
    except ValueError as e:
        # validation error from service
        # e.g. insufficient stock, over credit limit, empty order, etc.
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{order_id}")
def get_order_by_id(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get order details by ID."""
    from merchants.models import Merchant

    # fetch the richer serialised order response from the service layer
    order = service.get_order(session, order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # merchants can only view their own orders
    if current_user.role == UserRole.MERCHANT:
        # get the merchant account linked to this user
        merchant = session.exec(
            select(Merchant).where(Merchant.user_id == current_user.id)
        ).first()

        if not merchant or order["merchant_id"] != str(merchant.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own orders"
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
        # if the caller did not explicitly provide dispatched_by,
        # default to the current logged in admin/manager
        dispatched_by = body.dispatched_by or current_user.id

        # call service to validate the transition and apply the update
        order = service.update_order_status(
            session,
            order_id,
            body.status,
            dispatched_by,
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
        # validation error
        # e.g. invalid transition or missing dispatch details
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))