from uuid import UUID

from fastapi import APIRouter, Depends
from sqlmodel import Session

from core.database import get_session
from merchants.models import (
    MerchantCreate,
    MerchantRead,
    MerchantUpdate,
    MerchantBalanceRead,
    InvoiceCreate,
    InvoiceRead
)
from merchants.service import (
    create_merchant as create_merchant_service,
    get_merchant_by_id as get_merchant_by_id_service,
    update_merchant as update_merchant_service,
    calculate_merchant_balance as calculate_merchant_balance_service,
    get_merchant_orders as get_merchant_orders_service,
    create_invoice as create_invoice_service,
    get_merchant_invoices as get_merchant_invoices_service
)


router = APIRouter()


@router.post("", response_model=MerchantRead)
def create_merchant(
    merchant_in: MerchantCreate,
    session: Session = Depends(get_session)
):
    return create_merchant_service(session, merchant_in)


@router.get("/{merchant_id}", response_model=MerchantRead)
def get_merchant(
    merchant_id: UUID,
    session: Session = Depends(get_session)
):
    return get_merchant_by_id_service(session, merchant_id)


@router.patch("/{merchant_id}", response_model=MerchantRead)
def update_merchant(
    merchant_id: UUID,
    merchant_in: MerchantUpdate,
    session: Session = Depends(get_session)
):
    return update_merchant_service(session, merchant_id, merchant_in)


@router.get("/{merchant_id}/balance", response_model=MerchantBalanceRead)
def get_merchant_balance(
    merchant_id: UUID,
    session: Session = Depends(get_session)
):
    return calculate_merchant_balance_service(session, merchant_id)


@router.get("/{merchant_id}/orders")
def get_merchant_orders(
    merchant_id: UUID,
    session: Session = Depends(get_session)
):
    return get_merchant_orders_service(session, merchant_id)


@router.post("/{merchant_id}/invoices", response_model = InvoiceRead)
def create_invoice(
    merchant_id: UUID,
    invoice_in: InvoiceCreate,
    session: Session = Depends(get_session)
):
    return create_invoice_service(session, merchant_id, invoice_in)


@router.get("/{merchant_id}/invoices")
def get_merchant_invoices(
    merchant_id: UUID,
    session: Session = Depends(get_session)
):
    return get_merchant_invoices_service(session, merchant_id)