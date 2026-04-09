from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from audit.models import AuditAction
from audit.service import log_action
from auth.models import User, UserRole
from auth.service import get_current_user
from core.database import get_session
from orders import service
from orders.models import (
    CreateOrderRequest,
    Invoice,
    OrderStatus,
    UpdateOrderStatusRequest,
)

router = APIRouter()


@router.get("")
def list_orders(
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    from merchants.models import Merchant

    status_enum = None
    if status:
        try:
            status_enum = OrderStatus(status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid order status",
            )

    if current_user.role in [UserRole.ADMIN, UserRole.MANAGER, UserRole.DIRECTOR]:
        return service.get_all_orders(session, status_enum)

    if current_user.role == UserRole.MERCHANT:
        merchant = session.exec(
            select(Merchant).where(Merchant.user_id == current_user.id)
        ).first()

        if not merchant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Merchant account not found for this user",
            )

        return service.get_orders_by_merchant(session, merchant.id, status_enum)

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


@router.post("", status_code=status.HTTP_201_CREATED)
def create_order(
    body: CreateOrderRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    from merchants.models import Merchant

    if current_user.role != UserRole.MERCHANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only merchants can place orders",
        )

    merchant = session.exec(
        select(Merchant).where(Merchant.user_id == current_user.id)
    ).first()

    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merchant account not found for this user",
        )

    try:
        items = [
            {"product_id": item.product_id, "quantity": item.quantity}
            for item in body.items
        ]

        order = service.create_order(session, merchant.id, items)

        log_action(
            session,
            action=AuditAction.ORDER_PLACED,
            performed_by_id=current_user.id,
            performed_by_username=current_user.username,
            target_type="order",
            target_id=str(order.id),
            target_label=str(order.id)[:8].upper(),
            detail={
                "item_count": len(items),
                "total": str(order.total),
                "discount": str(order.discount_amount),
                "amount_due": str(order.amount_due),
            },
            ip_address=request.client.host,
        )

        # after the order is committed, check if the merchants total debt now
        # exceeds their credit limit - if so, auto suspend the account
        # the 5% overdraft was already validated in the service, so if we're here
        # the order is valid - but it may have pushed them over the base limit
        from decimal import Decimal
        from merchants.models import AccountStatus
        from merchants.service import calculate_merchant_balance as calc_balance
        from datetime import datetime, timezone

        session.refresh(merchant)
        balance = calc_balance(session, merchant.id)

        # track whether this order triggered an auto suspension so we can warn the merchant
        account_suspended_now = False

        # use the same threshold as _sync_account_status - suspend when outstanding hits the
        # 5% overdraft ceiling. this keeps both code paths consistent so a payment that brings
        # outstanding back under 1.05x will correctly restore the account
        hard_limit = merchant.credit_limit * Decimal("1.05")

        if (
            balance.outstanding_balance >= hard_limit
            and merchant.account_status == AccountStatus.NORMAL
        ):
            # order pushed debt to or beyond the overdraft ceiling - suspend immediately
            # merchant has 15 days to pay before the account is escalated to in_default
            merchant.account_status = AccountStatus.SUSPENDED
            merchant.updated_at = datetime.now(timezone.utc)
            session.add(merchant)
            session.commit()
            account_suspended_now = True

            log_action(
                session,
                action=AuditAction.MERCHANT_ACCOUNT_SUSPENDED,
                performed_by_id=current_user.id,
                performed_by_username=current_user.username,
                target_type="merchant",
                target_id=str(merchant.id),
                target_label=merchant.company_name,
                detail={
                    "reason": "outstanding debt reached the 5% overdraft ceiling after order placement",
                    "outstanding": str(balance.outstanding_balance),
                    "credit_limit": str(merchant.credit_limit),
                    "hard_limit": str(hard_limit),
                },
                ip_address=request.client.host,
            )

        return {
            "order_id": str(order.id),
            "message": "Order created successfully",
            "total": float(order.total),
            "discount": float(order.discount_amount),
            "amount_due": float(order.amount_due),
            # tells the frontend the account was auto suspended by this order
            # so it can show a clear warning rather than a generic success message
            "account_suspended": account_suspended_now,
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{order_id}")
def get_order_by_id(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    from merchants.models import Merchant

    order = service.get_order(session, order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )

    if current_user.role == UserRole.MERCHANT:
        merchant = session.exec(
            select(Merchant).where(Merchant.user_id == current_user.id)
        ).first()

        if not merchant or order["merchant_id"] != str(merchant.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own orders",
            )

    return order


@router.get("/{order_id}/invoice")
def get_order_invoice(
    order_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    from merchants.models import Merchant

    # fetch the order so we can check ownership for merchants
    order = service.get_order(session, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )

    # merchants can only view invoices for their own orders
    if current_user.role == UserRole.MERCHANT:
        merchant = session.exec(
            select(Merchant).where(Merchant.user_id == current_user.id)
        ).first()

        if not merchant or order["merchant_id"] != str(merchant.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view invoices for your own orders",
            )

    invoice = session.exec(select(Invoice).where(Invoice.order_id == order_id)).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found for this order",
        )

    return {
        "id": str(invoice.id),
        "order_id": str(invoice.order_id),
        "merchant_id": str(invoice.merchant_id),
        "invoice_date": invoice.invoice_date.isoformat(),
        "total_amount": float(invoice.total_amount),
        "discount_amount": float(invoice.discount_amount),
        "amount_due": float(invoice.amount_due),
        "created_at": invoice.created_at.isoformat(),
    }


@router.patch("/{order_id}/status")
def update_order_status(
    order_id: UUID,
    body: UpdateOrderStatusRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin or manager can update order status",
        )

    try:
        dispatched_by = body.dispatched_by or current_user.id

        order = service.update_order_status(
            session,
            order_id,
            body.status,
            dispatched_by,
            body.courier,
            body.courier_ref,
            body.expected_delivery,
        )

        action = AuditAction.ORDER_STATUS_CHANGED
        if body.status == OrderStatus.DISPATCHED:
            action = AuditAction.ORDER_DISPATCHED
        elif body.status == OrderStatus.DELIVERED:
            action = AuditAction.ORDER_DELIVERED

        detail = {"new_status": body.status.value}
        if body.status == OrderStatus.DISPATCHED:
            detail["courier"] = body.courier
            detail["courier_ref"] = body.courier_ref
            detail["expected_delivery"] = str(body.expected_delivery)

        log_action(
            session,
            action=action,
            performed_by_id=current_user.id,
            performed_by_username=current_user.username,
            target_type="order",
            target_id=str(order_id),
            detail=detail,
            ip_address=request.client.host,
        )

        return {
            "message": "Order status updated successfully",
            "order_id": str(order.id),
            "new_status": order.status,
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin or manager can delete orders",
        )

    try:
        service.delete_order(session, order_id)

        log_action(
            session,
            action=AuditAction.ORDER_STATUS_CHANGED,
            performed_by_id=current_user.id,
            performed_by_username=current_user.username,
            target_type="order",
            target_id=str(order_id),
            detail={"action": "deleted"},
            ip_address=request.client.host,
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
