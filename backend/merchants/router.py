from fastapi import APIRouter

router = APIRouter()


@router.post("")
def create_merchant():
    return {"message": "Create merchant"}


@router.get("/{merchant_id}")
def get_merchant(merchant_id: str):
    return {"message": f"Get merchant {merchant_id}"}


@router.get("/{merchant_id}/balance")
def get_merchant_balance(merchant_id: str):
    return {"message": f"Get balance for merchant {merchant_id}"}


@router.get("/{merchant_id}/orders")
def get_merchant_orders(merchant_id: str):
    return {"message": f"Get orders for merchant {merchant_id}"}


@router.get("/{merchant_id}/invoices")
def get_merchant_invoices(merchant_id: str):
    return {"message": f"Get invoices for merchant {merchant_id}"}


@router.patch("/{merchant_id}")
def update_merchant(merchant_id: str):
    return {"message": f"Update merchant {merchant_id}"}
