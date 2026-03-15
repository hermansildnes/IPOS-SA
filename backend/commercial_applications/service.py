import logging
from datetime import datetime, timezone
from uuid import UUID

import requests
from fastapi import HTTPException, status
from sqlmodel import Session, select

from commercial_applications.models import ApplicationStatus, CommercialApplication
from core.config import settings

logger = logging.getLogger(__name__)


def submit_application(data, session: Session) -> CommercialApplication:
    existing = session.exec(
        select(CommercialApplication).where(
            CommercialApplication.reg_number == data.reg_number,
            CommercialApplication.status == ApplicationStatus.PENDING,
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A pending application for this registration number already exists",
        )

    application = CommercialApplication(
        reg_number=data.reg_number,
        type=data.type,
        address=data.address,
        email=data.email,
        details=data.details,
    )
    session.add(application)
    session.commit()
    session.refresh(application)
    return application


def get_application(application_id: UUID, session: Session) -> CommercialApplication:
    application = session.get(CommercialApplication, application_id)
    if application is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )
    return application


def list_applications(session: Session) -> list[CommercialApplication]:
    return list(session.exec(select(CommercialApplication)).all())


def check_application_by_reg_no(
    reg_no: str, session: Session
) -> CommercialApplication | None:
    return session.exec(
        select(CommercialApplication)
        .where(CommercialApplication.reg_number == reg_no)
        .order_by(CommercialApplication.created_at.desc())
    ).first()


def decide_application(
    application_id: UUID,
    new_status: ApplicationStatus,
    decided_by: UUID,
    session: Session,
) -> CommercialApplication:
    application = get_application(application_id, session)

    if application.status != ApplicationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Application has already been decided",
        )
    if new_status == ApplicationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Status must be approved or rejected",
        )

    application.status = new_status
    application.decided_by = decided_by
    application.decision_date = datetime.now(timezone.utc)
    application.updated_at = datetime.now(timezone.utc)
    session.add(application)
    session.commit()
    session.refresh(application)

    if new_status == ApplicationStatus.APPROVED:
        _notify_applicant(application)

    return application


def _notify_applicant(application: CommercialApplication) -> None:
    if not settings.IPU_EMAIL_API_URL or not settings.IPU_EMAIL_API_KEY:
        logger.warning(
            "IPU email service not configured — skipping approval notification for %s",
            application.company_reg_no,
        )
        return

    subject = "Your InfoPharma commercial application has been approved"
    body = (
        f"Your commercial application (reg. {application.reg_number}) "
        f"has been approved. Your account team will be in touch shortly with your login credentials.\n\n"
        f"Kind regards,\nInfoPharma Ltd"
    )

    try:
        response = requests.post(
            settings.IPU_EMAIL_API_URL,
            json={"email": application.email, "subject": subject, "body": body},
            headers={"X-API-Key": settings.IPU_EMAIL_API_KEY},
            timeout=10,
        )
        response.raise_for_status()
    except Exception as exc:
        logger.error("Failed to send approval email via IPU: %s", exc)
