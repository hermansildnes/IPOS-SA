from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

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
    current_user: User = Depends(require_manager_or_admin),
    session: Session = Depends(get_session),
):
    """
    Report i: Turnover for a given period — quantities sold and revenue.
    """
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date must be before or equal to end_date",
        )
    return service.get_turnover_report(session, start_date, end_date)


@router.get("/merchant-orders-summary", response_model=MerchantOrdersSummaryReport)
def get_merchant_orders_summary(
    merchant_id: UUID,
    start_date: date,
    end_date: date,
    current_user: User = Depends(require_manager_or_admin),
    session: Session = Depends(get_session),
):
    """
    Report ii: Orders from a merchant for a period — order ID, date, value,
    dispatch date, payment status, with totals line.
    """
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date must be before or equal to end_date",
        )
    try:
        return service.get_merchant_orders_summary(session, merchant_id, start_date, end_date)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/merchant-orders-detailed", response_model=MerchantOrdersDetailedReport)
def get_merchant_orders_detailed(
    merchant_id: UUID,
    start_date: date,
    end_date: date,
    current_user: User = Depends(require_manager_or_admin),
    session: Session = Depends(get_session),
):
    """
    Report iii: Detailed merchant activity — contact header, all orders with
    individual items, quantities, costs, discounts, payment status.
    """
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date must be before or equal to end_date",
        )
    try:
        return service.get_merchant_orders_detailed(session, merchant_id, start_date, end_date)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/low-stock", response_model=LowStockReport)
def get_low_stock_report(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Report: All catalogue items currently below their minimum stock level.
    Accessible to admins and managers.
    """
    if current_user.role not in MANAGER_ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to managers and administrators",
        )
    return service.get_low_stock_report(session)


@router.get("/stock-turnover", response_model=StockTurnoverReport)
def get_stock_turnover_report(
    start_date: date,
    end_date: date,
    current_user: User = Depends(require_manager_or_admin),
    session: Session = Depends(get_session),
):
    """
    Report vi: Stock turnover — goods sold and newly received within a period.
    """
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date must be before or equal to end_date",
        )
    return service.get_stock_turnover_report(session, start_date, end_date)
