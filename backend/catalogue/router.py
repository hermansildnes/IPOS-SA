from fastapi import APIRouter

router = APIRouter()


@router.get("")
def list_catalogue():
    return {"message": "List catalogue"}


@router.get("/{product_id}")
def get_product(product_id: str):
    return {"message": f"Get product {product_id}"}


@router.post("")
def create_product():
    return {"message": "Create product"}


@router.put("/{product_id}")
def update_product(product_id: str):
    return {"message": f"Update product {product_id}"}


@router.delete("/{product_id}")
def delete_product(product_id: str):
    return {"message": f"Delete product {product_id}"}


@router.post("/{product_id}/stock")
def add_stock(product_id: str):
    return {"message": f"Add stock for product {product_id}"}
