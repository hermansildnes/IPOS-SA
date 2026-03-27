from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session

from auth.models import (
    LoginRequest,
    LoginResponse,
    User,
    UserCreate,
    UserRead,
    UserRole,
)
from auth.service import (
    authenticate_user,
    create_access_token,
    create_user,
    get_current_user,
    verify_password,
    hash_password,
)
from core.database import get_session

router = APIRouter()


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Let any logged-in user change their own password.
    Requires current password to be correct before accepting the new one."""
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    if len(body.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters",
        )

    current_user.password_hash = hash_password(body.new_password)
    session.add(current_user)
    session.commit()

    return {"success": True}


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, session: Session = Depends(get_session)):
    user = authenticate_user(body.username, body.password, session)
    token = create_access_token(user.id, user.role)
    return LoginResponse(access_token=token)


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"success": True}


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_new_user(
    body: UserCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can create users"
        )
    return create_user(body.username, body.email, body.password, body.role, session)
