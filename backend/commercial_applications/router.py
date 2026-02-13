from fastapi import APIRouter

router = APIRouter()


@router.post("")
def submit_application():
    return {"message": "Submit commercial application"}


@router.get("/{application_id}")
def get_application(application_id: str):
    return {"message": f"Get application {application_id}"}


@router.get("")
def list_applications():
    return {"message": "List all applications"}


@router.patch("/{application_id}")
def update_application_status(application_id: str):
    return {"message": f"Update application {application_id} status"}
