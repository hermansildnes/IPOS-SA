from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlmodel import Session, select

from audit.models import AuditAction
from audit.service import log_action
from auth.models import (
    LoginRequest,
    LoginResponse,
    User,
    UserCreate,
    UserRead,
    UserRole,
)
from auth.service import (
    create_access_token,
    create_user,
    get_current_user,
    hash_password,
    verify_password,
)
from core.database import get_session

router = APIRouter()


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
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

    log_action(
        session,
        action=AuditAction.PASSWORD_CHANGED,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        ip_address=request.client.host,
    )

    return {"success": True}


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, request: Request, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == body.username)).first()

    if user is None or not verify_password(body.password, user.password_hash):
        log_action(
            session,
            action=AuditAction.LOGIN_FAILED,
            performed_by_username=body.username,
            ip_address=request.client.host,
            detail={"reason": "invalid credentials"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    token = create_access_token(user.id, user.role)

    log_action(
        session,
        action=AuditAction.LOGIN,
        performed_by_id=user.id,
        performed_by_username=user.username,
        ip_address=request.client.host,
    )

    return LoginResponse(access_token=token)


@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    log_action(
        session,
        action=AuditAction.LOGOUT,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        ip_address=request.client.host,
    )
    return {"success": True}


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_new_user(
    body: UserCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create users",
        )

    new_user = create_user(body.username, body.email, body.password, body.role, session)

    log_action(
        session,
        action=AuditAction.USER_CREATED,
        performed_by_id=current_user.id,
        performed_by_username=current_user.username,
        target_type="user",
        target_id=str(new_user.id),
        target_label=new_user.username,
        detail={"role": new_user.role},
        ip_address=request.client.host,
    )

    return new_user