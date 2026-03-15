from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from auth.models import LoginRequest, LoginResponse, User, UserCreate, UserRead
from auth.service import (
    authenticate_user,
    create_access_token,
    create_user,
    get_current_user,
)
from core.database import get_session

router = APIRouter()


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
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can create users"
        )
    return create_user(body.username, body.email, body.password, body.role, session)
