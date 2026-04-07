from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from audit.models import AuditAction, AuditCategory, AuditLogPage
from audit import service
from auth.models import User, UserRole
from auth.service import get_current_user
from core.database import get_session

router = APIRouter()


def _require_admin_or_manager(current_user: User) -> None:
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager access required",
        )


@router.get("", response_model=AuditLogPage)
def get_audit_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    category: Optional[AuditCategory] = Query(default=None),
    action: Optional[AuditAction] = Query(default=None),
    username: Optional[str] = Query(default=None),
    target_type: Optional[str] = Query(default=None),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    _require_admin_or_manager(current_user)
    return service.query_logs(
        session,
        page=page,
        page_size=page_size,
        category=category,
        action=action,
        username=username,
        target_type=target_type,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/actions", response_model=list[str])
def list_actions(current_user: User = Depends(get_current_user)):
    _require_admin_or_manager(current_user)
    return [a.value for a in AuditAction]


@router.get("/categories", response_model=list[str])
def list_categories(current_user: User = Depends(get_current_user)):
    _require_admin_or_manager(current_user)
    return [c.value for c in AuditCategory]
