import enum
from datetime import datetime, timezone
from uuid import UUID, uuid4

from pydantic import BaseModel
from sqlmodel import Field, SQLModel


class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class CommercialApplication(SQLModel, table=True):
    __tablename__ = "commercial_application"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    reg_number: str = Field(index=True)
    type: str
    address: str
    email: str
    details: str  # company name, director name/email, and any other details
    status: ApplicationStatus = Field(default=ApplicationStatus.PENDING)
    decided_by: UUID | None = Field(default=None, foreign_key="user.id")
    decision_date: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ApplicationCreate(BaseModel):
    reg_number: str
    type: str
    address: str
    email: str
    details: str


class ApplicationRead(BaseModel):
    id: UUID
    reg_number: str
    type: str
    address: str
    email: str
    details: str
    status: ApplicationStatus
    decided_by: UUID | None
    decision_date: datetime | None
    created_at: datetime
    updated_at: datetime


class ApplicationDecision(BaseModel):
    status: ApplicationStatus


class ApplicationStatusCheck(BaseModel):
    """Response for checkCommercialApplication (ISAMemberAPI interface)."""

    reg_number: str
    status: ApplicationStatus
    found: bool
