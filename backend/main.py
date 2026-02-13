from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth.router import router as auth_router
from merchants.router import router as merchants_router
from catalogue.router import router as catalogue_router
from orders.router import router as orders_router
from commercial_applications.router import router as commercial_applications_router
from reports.router import router as reports_router

app = FastAPI(
    title="IPOS-SA API",
    description="InfoPharma Ordering System - Server Application",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(merchants_router, prefix="/api/merchants", tags=["Merchants"])
app.include_router(catalogue_router, prefix="/api/catalogue", tags=["Catalogue"])
app.include_router(orders_router, prefix="/api/orders", tags=["Orders"])
app.include_router(
    commercial_applications_router,
    prefix="/api/commercial-applications",
    tags=["Commercial Applications"],
)
app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])


@app.get("/health")
def health_check():
    return {"status": "healthy"}
