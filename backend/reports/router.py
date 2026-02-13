from fastapi import APIRouter

router = APIRouter()


@router.get("/turnover")
def get_turnover_report():
    return {"message": "Turnover report"}


@router.get("/merchant-orders-summary")
def get_merchant_orders_summary():
    return {"message": "Merchant orders summary report"}


@router.get("/merchant-orders-detailed")
def get_merchant_orders_detailed():
    return {"message": "Merchant orders detailed report"}


@router.get("/low-stock")
def get_low_stock_report():
    return {"message": "Low stock report"}


@router.get("/stock-turnover")
def get_stock_turnover_report():
    return {"message": "Stock turnover report"}
