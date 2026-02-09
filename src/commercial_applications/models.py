import enum
from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class CommercialApplication(SQLModel, table=True):
    __tablename__ = "commercial_application"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    company_name: str
    company_reg_no: str
    director_name: str
    director_email: str
    business_type: str
    address: str
    email: str
    status: ApplicationStatus = Field(default=ApplicationStatus.PENDING)
    decided_by: UUID | None = Field(default=None, foreign_key="user.id")
    decision_date: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
