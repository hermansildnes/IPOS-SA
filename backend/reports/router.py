from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session

from audit.models import AuditAction
from audit.service import log_action
from auth.models import User, UserRole
from auth.service import get_current_user
from core.database import get_session
from reports import service
from reports.models import (
    TurnoverReport,
    MerchantOrdersSummaryReport,
    MerchantOrdersDetailedReport,
    LowStockReport,
    StockTurnoverReport,
    MerchantInvoicesReport,
    AllInvoicesReport,
)

router = APIRouter()

MANAGER_ADMIN_ROLES = {UserRole.ADMIN, UserRole.MANAGER, UserRole.DIRECTOR}


def require_manager_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in MANAGER_ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to managers and administrators",
        )
    return current_user


@router.get("/turnover", response_model=TurnoverReport)
def get_turnover_report(
    start_date: date,
    end_date: date,
    request: Request,
    current_user: User = Depends(require_manager_or_admin),
    session: Session = Depends(get_session),
):
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date must be before or equal to end_date",
        )

    result = service.get_turnover_report(session, start_date, end_date)

    log_action(
        session,
        action=AuditAction.REPORT_GENERATED,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        target_type="report",
        target_label="Turnover Report",
        detail={"start_date": str(start_date), "end_date": str(end_date)},
        ip_address=request.client.host,
    )

    return result


@router.get("/merchant-orders-summary", response_model=MerchantOrdersSummaryReport)
def get_merchant_orders_summary(
    merchant_id: UUID,
    start_date: date,
    end_date: date,
    request: Request,
    current_user: User = Depends(require_manager_or_admin),
    session: Session = Depends(get_session),
):
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date must be before or equal to end_date",
        )
    try:
        result = service.get_merchant_orders_summary(
            session, merchant_id, start_date, end_date
        )

        log_action(
            session,
            action=AuditAction.REPORT_GENERATED,
            performed_by_id=current_user.id,
            performed_by_username=current_user.username,
            target_type="report",
            target_label="Merchant Orders Summary",
            detail={
                "merchant_id": str(merchant_id),
                "start_date": str(start_date),
                "end_date": str(end_date),
            },
            ip_address=request.client.host,
        )

        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/merchant-orders-detailed", response_model=MerchantOrdersDetailedReport)
def get_merchant_orders_detailed(
    merchant_id: UUID,
    start_date: date,
    end_date: date,
    request: Request,
    current_user: User = Depends(require_manager_or_admin),
    session: Session = Depends(get_session),
):
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date must be before or equal to end_date",
        )
    try:
        result = service.get_merchant_orders_detailed(
            session, merchant_id, start_date, end_date
        )

        log_action(
            session,
            action=AuditAction.REPORT_GENERATED,
            performed_by_id=current_user.id,
            performed_by_username=current_user.username,
            target_type="report",
            target_label="Merchant Orders Detailed",
            detail={
                "merchant_id": str(merchant_id),
                "start_date": str(start_date),
                "end_date": str(end_date),
            },
            ip_address=request.client.host,
        )

        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/low-stock", response_model=LowStockReport)
def get_low_stock_report(
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role not in MANAGER_ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to managers and administrators",
        )

    result = service.get_low_stock_report(session)

    log_action(
        session,
        action=AuditAction.REPORT_GENERATED,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        target_type="report",
        target_label="Low Stock Report",
        ip_address=request.client.host,
    )

    return result


@router.get("/merchant-invoices", response_model=MerchantInvoicesReport)
def get_merchant_invoices_report(
    merchant_id: UUID,
    start_date: date,
    end_date: date,
    request: Request,
    current_user: User = Depends(require_manager_or_admin),
    session: Session = Depends(get_session),
):
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date must be before or equal to end_date",
        )
    try:
        result = service.get_merchant_invoices_report(
            session, merchant_id, start_date, end_date
        )

        log_action(
            session,
            action=AuditAction.REPORT_GENERATED,
            performed_by_id=current_user.id,
            performed_by_username=current_user.username,
            target_type="report",
            target_label="Merchant Invoices Report",
            detail={
                "merchant_id": str(merchant_id),
                "start_date": str(start_date),
                "end_date": str(end_date),
            },
            ip_address=request.client.host,
        )

        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/all-invoices", response_model=AllInvoicesReport)
def get_all_invoices_report(
    start_date: date,
    end_date: date,
    request: Request,
    current_user: User = Depends(require_manager_or_admin),
    session: Session = Depends(get_session),
):
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date must be before or equal to end_date",
        )

    result = service.get_all_invoices_report(session, start_date, end_date)

    log_action(
        session,
        action=AuditAction.REPORT_GENERATED,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        target_type="report",
        target_label="All Invoices Report",
        detail={"start_date": str(start_date), "end_date": str(end_date)},
        ip_address=request.client.host,
    )

    return result


@router.get("/stock-turnover", response_model=StockTurnoverReport)
def get_stock_turnover_report(
    start_date: date,
    end_date: date,
    request: Request,
    current_user: User = Depends(require_manager_or_admin),
    session: Session = Depends(get_session),
):
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date must be before or equal to end_date",
        )

    result = service.get_stock_turnover_report(session, start_date, end_date)

    log_action(
        session,
        action=AuditAction.REPORT_GENERATED,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        target_type="report",
        target_label="Stock Turnover Report",
        detail={"start_date": str(start_date), "end_date": str(end_date)},
        ip_address=request.client.host,
    )

    return result