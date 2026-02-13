from fastapi import APIRouter, Depends

from auth.service import get_current_user

router = APIRouter()


@router.post("/login")
def login():
    return {"message": "Login endpoint"}


@router.post("/logout")
def logout():
    return {"message": "Logout endpoint"}


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
