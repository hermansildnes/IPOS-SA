from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session

from audit.models import AuditAction
from audit.service import log_action
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
def submit(
    body: ApplicationCreate,
    request: Request,
    session: Session = Depends(get_session),
):
    application = submit_application(body, session)

    log_action(
        session,
        action=AuditAction.APPLICATION_RECEIVED,
        performed_by_username=body.email,
        target_type="application",
        target_id=str(application.id),
        target_label=body.reg_number,
        detail={"reg_number": body.reg_number, "type": body.type},
        ip_address=request.client.host,
    )

    return application


@router.get("", response_model=list[ApplicationRead])
def list_all(
    reg_number: str | None = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
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
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )

    application = decide_application(
        application_id, body.status, current_user.id, session
    )

    action = (
        AuditAction.APPLICATION_APPROVED
        if body.status == ApplicationStatus.APPROVED
        else AuditAction.APPLICATION_REJECTED
    )

    log_action(
        session,
        action=action,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        target_type="application",
        target_id=str(application_id),
        target_label=application.reg_number,
        detail={"decision": body.status, "applicant_email": application.email},
        ip_address=request.client.host,
    )

    return application
