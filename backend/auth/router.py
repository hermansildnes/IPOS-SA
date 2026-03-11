from fastapi import APIRouter, Depends

from auth.models import LoginRequest, LoginResponse, UserRead
from auth.service import get_current_user

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    return LoginResponse(access_token="stub-token")


@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    return {"success": True}


@router.get("/me", response_model=UserRead)
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
