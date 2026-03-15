from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from auth.models import User, UserRole
from auth.service import get_current_user
from commercial_applications.models import (
    ApplicationCreate,
    ApplicationDecision,
    ApplicationRead,
    ApplicationStatus,
    ApplicationStatusCheck,
)
from commercial_applications.service import (
    check_application_by_reg_no,
    decide_application,
    get_application,
    list_applications,
    submit_application,
)
from core.database import get_session

router = APIRouter()


@router.post("", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
def submit(body: ApplicationCreate, session: Session = Depends(get_session)):
    """Submit a commercial application (called by IPOS-PU, no auth required)."""
    return submit_application(body, session)


@router.get("", response_model=list[ApplicationRead])
def list_all(
    reg_number: str | None = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    List all applications (admin only).
    If reg_number is provided, checks status of that application (ISAMemberAPI.checkCommercialApplication).
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )

    if reg_number is not None:
        application = check_application_by_reg_no(reg_number, session)
        return [application] if application else []

    return list_applications(session)


@router.get("/check", response_model=ApplicationStatusCheck)
def check_by_reg_number(reg_number: str, session: Session = Depends(get_session)):
    """
    Public endpoint: check status of a commercial application by registration number.
    Implements ISAMemberAPI.checkCommercialApplication(regNumber).
    """
    app = check_application_by_reg_no(reg_number, session)
    if app is None:
        return ApplicationStatusCheck(
            reg_number=reg_number, status=ApplicationStatus.PENDING, found=False
        )
    return ApplicationStatusCheck(reg_number=reg_number, status=app.status, found=True)


@router.get("/{application_id}", response_model=ApplicationRead)
def get_one(
    application_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )
    return get_application(application_id, session)


@router.patch("/{application_id}", response_model=ApplicationRead)
def decide(
    application_id: UUID,
    body: ApplicationDecision,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )
    return decide_application(application_id, body.status, current_user.id, session)
