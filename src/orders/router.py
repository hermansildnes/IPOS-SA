from fastapi import APIRouter

router = APIRouter()


@router.post("")
def create_order():
    return {"message": "Create order"}


@router.get("/{order_id}")
def get_order(order_id: str):
    return {"message": f"Get order {order_id}"}


@router.patch("/{order_id}/status")
def update_order_status(order_id: str):
    return {"message": f"Update status for order {order_id}"}
