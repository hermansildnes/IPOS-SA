from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select

from audit.models import AuditAction
from audit.service import log_action
from auth.models import User, UserRole
from auth.service import get_current_user
from core.database import get_session
from merchants.models import (
    AccountStatus,
    Merchant,
    MerchantCreate,
    MerchantFromUserCreate,
    MerchantRead,
    MerchantUpdate,
    MerchantBalanceRead,
    InvoiceCreate,
    InvoiceRead,
)
from merchants.service import (
    create_merchant as create_merchant_service,
    convert_user_to_merchant as convert_user_to_merchant_service,
    get_merchant_by_id as get_merchant_by_id_service,
    update_merchant as update_merchant_service,
    merchant_to_read,
    calculate_merchant_balance as calculate_merchant_balance_service,
    create_invoice as create_invoice_service,
    get_merchant_invoices as get_merchant_invoices_service,
    delete_merchant as delete_merchant_service,
)


class ReinstateRequest(BaseModel):
    reason: str
    director_id: UUID | None = None


class MerchantSelfUpdate(BaseModel):
    contact_email: EmailStr | None = None
    contact_phone: str | None = None


router = APIRouter()


@router.patch("/me")
def update_my_merchant(
    update_in: MerchantSelfUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role != UserRole.MERCHANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only merchants can use this endpoint",
        )

    merchant = session.exec(
        select(Merchant).where(Merchant.user_id == current_user.id)
    ).first()

    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Merchant account not found"
        )

    if update_in.contact_email is not None:
        merchant.contact_email = update_in.contact_email
    if update_in.contact_phone is not None:
        merchant.contact_phone = update_in.contact_phone

    merchant.updated_at = datetime.now(timezone.utc)
    session.add(merchant)
    session.commit()
    session.refresh(merchant)

    log_action(
        session,
        action=AuditAction.MERCHANT_UPDATED,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        target_type="merchant",
        target_id=str(merchant.id),
        target_label=merchant.company_name,
        detail={"updated_fields": list(update_in.model_fields_set)},
        ip_address=request.client.host,
    )

    return merchant_to_read(session, merchant)


@router.get("/me")
def get_my_merchant(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role != UserRole.MERCHANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only merchants have merchant accounts",
        )

    merchant = session.exec(
        select(Merchant).where(Merchant.user_id == current_user.id)
    ).first()

    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Merchant account not found"
        )

    return merchant_to_read(session, merchant)


@router.get("")
def list_merchants(
    account_status: str | None = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER, UserRole.DIRECTOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin, manager or director access required",
        )

    from merchants.service import get_all_merchants
    return get_all_merchants(session, account_status)


@router.post("", response_model=MerchantRead)
def create_merchant(
    merchant_in: MerchantCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )

    merchant = create_merchant_service(session, merchant_in)

    log_action(
        session,
        action=AuditAction.MERCHANT_CREATED,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        target_type="merchant",
        target_id=str(merchant.id),
        target_label=merchant.company_name,
        detail={
            "account_number": merchant.account_number,
            "discount_plan": merchant.discount_plan_type,
        },
        ip_address=request.client.host,
    )

    return merchant_to_read(session, merchant)


@router.post("/convert/{user_id}", response_model=MerchantRead, status_code=status.HTTP_201_CREATED)
def convert_staff_to_merchant(
    user_id: UUID,
    merchant_in: MerchantFromUserCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )

    merchant = convert_user_to_merchant_service(session, user_id, merchant_in)

    log_action(
        session,
        action=AuditAction.MERCHANT_CREATED,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        target_type="merchant",
        target_id=str(merchant.id),
        target_label=merchant.company_name,
        detail={"converted_from_staff": True, "account_number": merchant.account_number},
        ip_address=request.client.host,
    )

    return merchant_to_read(session, merchant)


@router.get("/{merchant_id}", response_model=MerchantRead)
def get_merchant(
    merchant_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    merchant = get_merchant_by_id_service(session, merchant_id)
    return merchant_to_read(session, merchant)


@router.patch("/{merchant_id}", response_model=MerchantRead)
def update_merchant(
    merchant_id: UUID,
    merchant_in: MerchantUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager access required",
        )

    merchant = update_merchant_service(session, merchant_id, merchant_in)

    changed = merchant_in.model_dump(exclude_unset=True)
    changed.pop("flexible_thresholds", None)

    action = AuditAction.MERCHANT_UPDATED
    if "credit_limit" in changed:
        action = AuditAction.MERCHANT_CREDIT_LIMIT_CHANGED
    elif "discount_plan_type" in changed or "fixed_discount_rate" in changed:
        action = AuditAction.MERCHANT_DISCOUNT_PLAN_CHANGED

    log_action(
        session,
        action=action,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        target_type="merchant",
        target_id=str(merchant_id),
        target_label=merchant.company_name,
        detail={k: str(v) for k, v in changed.items()},
        ip_address=request.client.host,
    )

    return merchant_to_read(session, merchant)


@router.post("/{merchant_id}/reinstate", response_model=MerchantRead)
def reinstate_merchant(
    merchant_id: UUID,
    reinstate_in: ReinstateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role != UserRole.DIRECTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the Director of Operations can reinstate defaulted accounts",
        )

    if not reinstate_in.reason or not reinstate_in.reason.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A reinstatement reason is required",
        )

    merchant = session.get(Merchant, merchant_id)
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Merchant not found"
        )

    if merchant.account_status != AccountStatus.IN_DEFAULT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is not in default - reinstatement not required",
        )

    merchant.account_status = AccountStatus.NORMAL
    merchant.reinstated_by = current_user.id
    merchant.reinstated_at = datetime.now(timezone.utc)
    merchant.reinstatement_reason = reinstate_in.reason.strip()
    merchant.updated_at = datetime.now(timezone.utc)

    session.add(merchant)
    session.commit()
    session.refresh(merchant)

    log_action(
        session,
        action=AuditAction.MERCHANT_ACCOUNT_RESTORED,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        target_type="merchant",
        target_id=str(merchant_id),
        target_label=merchant.company_name,
        detail={"reason": reinstate_in.reason.strip()},
        ip_address=request.client.host,
    )

    return merchant_to_read(session, merchant)


@router.get("/{merchant_id}/balance", response_model=MerchantBalanceRead)
def get_merchant_balance(
    merchant_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return calculate_merchant_balance_service(session, merchant_id)


@router.get("/{merchant_id}/orders")
def get_merchant_orders(
    merchant_id: UUID,
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    from orders.service import get_orders_by_merchant
    from orders.models import OrderStatus

    status_enum = None
    if status:
        try:
            status_enum = OrderStatus(status)
        except ValueError:
            pass

    return get_orders_by_merchant(session, merchant_id, status_enum)


@router.post("/{merchant_id}/invoices", response_model=InvoiceRead)
def create_invoice(
    merchant_id: UUID,
    invoice_in: InvoiceCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager access required",
        )

    invoice = create_invoice_service(session, merchant_id, invoice_in)

    log_action(
        session,
        action=AuditAction.INVOICE_GENERATED,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        target_type="invoice",
        target_id=str(invoice.id),
        target_label=str(invoice.id)[:8].upper(),
        detail={
            "order_id": str(invoice_in.order_id),
            "amount_due": str(invoice_in.amount_due),
        },
        ip_address=request.client.host,
    )

    return invoice


@router.get("/{merchant_id}/invoices")
def get_merchant_invoices(
    merchant_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return get_merchant_invoices_service(session, merchant_id)


@router.delete("/{merchant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_merchant(
    merchant_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete merchants",
        )

    # grab the company name before deletion for the audit log
    merchant = session.get(Merchant, merchant_id)
    if not merchant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Merchant not found")

    company_name = merchant.company_name

    delete_merchant_service(session, merchant_id)

    log_action(
        session,
        action=AuditAction.MERCHANT_DELETED,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        target_type="merchant",
        target_id=str(merchant_id),
        target_label=company_name,
        ip_address=request.client.host,
    )