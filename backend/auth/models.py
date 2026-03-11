import enum
from datetime import datetime, timezone
from uuid import UUID, uuid4

from pydantic import BaseModel
from sqlmodel import Field, SQLModel


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    MERCHANT = "merchant"
    DIRECTOR = "director"


class User(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True)
    password_hash: str
    role: UserRole
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    id: UUID
    username: str
    email: str
    role: UserRole
    is_active: bool
