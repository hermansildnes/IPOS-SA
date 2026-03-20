from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from auth.models import User, UserRole
from auth.service import get_current_user
from core.database import get_session
from merchants.models import (
    Merchant,
    MerchantCreate,
    MerchantRead,
    MerchantUpdate,
    MerchantBalanceRead,
    InvoiceCreate,
    InvoiceRead,
)
from merchants.service import (
    create_merchant as create_merchant_service,
    get_merchant_by_id as get_merchant_by_id_service,
    update_merchant as update_merchant_service,
    calculate_merchant_balance as calculate_merchant_balance_service,
    get_merchant_orders as get_merchant_orders_service,
    create_invoice as create_invoice_service,
    get_merchant_invoices as get_merchant_invoices_service,
)


router = APIRouter()


# Leon: Added this endpoint so merchant users can get their own merchant ID.
# Frontend needs merchant.id (not user.id) to fetch orders since Order.merchant_id 
# references Merchant.id, not User.id. Without this, Orders page shows 0 orders.
@router.get("/me")
def get_my_merchant(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get merchant account for the current logged in user."""
    if current_user.role != UserRole.MERCHANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only merchants have merchant accounts"
        )
    
    merchant = session.exec(
        select(Merchant).where(Merchant.user_id == current_user.id)
    ).first()
    
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merchant account not found"
        )
    
    return merchant


@router.get("")
def list_merchants(
    account_status: str | None = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager access required"
        )
    
    from merchants.service import get_all_merchants
    return get_all_merchants(session, account_status)


@router.post("", response_model=MerchantRead)
def create_merchant(
    merchant_in: MerchantCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )
    return create_merchant_service(session, merchant_in)


@router.get("/{merchant_id}", response_model=MerchantRead)
def get_merchant(
    merchant_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return get_merchant_by_id_service(session, merchant_id)


@router.patch("/{merchant_id}", response_model=MerchantRead)
def update_merchant(
    merchant_id: UUID,
    merchant_in: MerchantUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager access required",
        )
    return update_merchant_service(session, merchant_id, merchant_in)


@router.get("/{merchant_id}/balance", response_model=MerchantBalanceRead)
def get_merchant_balance(
    merchant_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return calculate_merchant_balance_service(session, merchant_id)


# Leon: Original endpoint returned wrong data leading to bugs when i ran server. 
@router.get("/{merchant_id}/orders")
def get_merchant_orders(
    merchant_id: UUID,
    status: str | None = None,  
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Import orders service
    from orders.service import get_orders_by_merchant
    from orders.models import OrderStatus
    
    # Convert string status to enum if provided
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
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager access required",
        )
    return create_invoice_service(session, merchant_id, invoice_in)


@router.get("/{merchant_id}/invoices")
def get_merchant_invoices(
    merchant_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return get_merchant_invoices_service(session, merchant_id)