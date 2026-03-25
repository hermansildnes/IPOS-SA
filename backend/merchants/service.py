from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import Session, select

from merchants.models import (
    Merchant,
    MerchantCreate,
    MerchantUpdate,
    MerchantBalanceRead,
    Payment,
    DiscountPlanType,
    InvoiceCreate,
)

from orders.models import Order, Invoice


def create_merchant(session: Session, merchant_in: MerchantCreate) -> Merchant:
    from auth.models import User, UserRole
    from auth.service import hash_password

    existing_user = session.exec(
        select(User).where(
            (User.username == merchant_in.username) | (User.email == merchant_in.email)
        )
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists",
        )

    if merchant_in.credit_limit < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credit limit cannot be negative",
        )

    if merchant_in.discount_plan_type == DiscountPlanType.FIXED:
        if merchant_in.fixed_discount_rate is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fixed discount rate is required",
            )
    else:
        merchant_in.fixed_discount_rate = None

    # Create linked merchant user first
    user = User(
        username=merchant_in.username,
        email=merchant_in.email,
        password_hash=hash_password(merchant_in.password),
        role=UserRole.MERCHANT,
        is_active=True,
    )
    session.add(user)
    session.flush()

    # Auto-generate next account number like M004, M005, etc.
    existing_merchants = session.exec(select(Merchant)).all()
    next_number = len(existing_merchants) + 1
    account_number = f"M{next_number:03d}"

    while session.exec(
        select(Merchant).where(Merchant.account_number == account_number)
    ).first():
        next_number += 1
        account_number = f"M{next_number:03d}"

    merchant = Merchant(
        user_id=user.id,
        account_number=account_number,
        company_name=merchant_in.company_name,
        contact_name=merchant_in.contact_name,
        contact_email=merchant_in.contact_email,
        contact_phone=merchant_in.contact_phone,
        address=merchant_in.address,
        credit_limit=merchant_in.credit_limit,
        discount_plan_type=merchant_in.discount_plan_type,
        fixed_discount_rate=merchant_in.fixed_discount_rate,
    )

    session.add(merchant)
    session.commit()
    session.refresh(merchant)
    return merchant


def get_merchant_by_id(session: Session, merchant_id: UUID) -> Merchant:
    merchant = session.get(Merchant, merchant_id)
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Merchant not found"
        )
    return merchant


def get_all_merchants(session: Session, status: str | None = None):
    """Get all merchants."""
    from merchants.models import Merchant
    from sqlmodel import select

    statement = select(Merchant)
    if status:
        statement = statement.where(Merchant.account_status == status)

    return list(session.exec(statement).all())


def update_merchant(
    session: Session, merchant_id: UUID, merchant_in: MerchantUpdate
) -> Merchant:
    merchant = get_merchant_by_id(session, merchant_id)

    update_data = merchant_in.model_dump(exclude_unset=True)

    if "credit_limit" in update_data and update_data["credit_limit"] < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Credit limit cannot be negative",
        )

    if update_data.get("discount_plan_type") == DiscountPlanType.FIXED:
        if update_data.get("fixed_discount_rate") is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fixed discount rate is required",
            )

    if update_data.get("discount_plan_type") == DiscountPlanType.FLEXIBLE:
        update_data["fixed_discount_rate"] = None

    for key, value in update_data.items():
        setattr(merchant, key, value)

    merchant.updated_at = datetime.now(timezone.utc)

    session.add(merchant)
    session.commit()
    session.refresh(merchant)
    return merchant


def calculate_merchant_balance(
    session: Session, merchant_id: UUID
) -> MerchantBalanceRead:
    merchant = get_merchant_by_id(session, merchant_id)

    orders = session.exec(select(Order).where(Order.merchant_id == merchant_id)).all()

    total_orders = sum((order.total for order in orders), Decimal("0.00"))

    payments = session.exec(
        select(Payment).where(Payment.merchant_id == merchant_id)
    ).all()

    total_payments = sum((payment.amount for payment in payments), Decimal("0.00"))

    outstanding_balance = total_orders - total_payments
    available_credit = merchant.credit_limit - outstanding_balance

    return MerchantBalanceRead(
        merchant_id=merchant.id,
        credit_limit=merchant.credit_limit,
        outstanding_balance=outstanding_balance,
        available_credit=available_credit,
    )


def get_merchant_orders(session: Session, merchant_id: UUID):
    get_merchant_by_id(session, merchant_id)

    return session.exec(select(Order).where(Order.merchant_id == merchant_id)).all()


def create_invoice(
    session: Session, merchant_id: UUID, invoice_in: InvoiceCreate
) -> Invoice:
    get_merchant_by_id(session, merchant_id)

    order = session.get(Order, invoice_in.order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
        )

    if order.merchant_id != merchant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order does not belong to this merchant",
        )

    existing_invoice = session.exec(
        select(Invoice).where(Invoice.order_id == invoice_in.order_id)
    ).first()

    if existing_invoice:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice already exists for this order",
        )

    invoice = Invoice(merchant_id=merchant_id, **invoice_in.model_dump())
    session.add(invoice)
    session.commit()
    session.refresh(invoice)
    return invoice


def get_merchant_invoices(session: Session, merchant_id: UUID):
    get_merchant_by_id(session, merchant_id)

    return session.exec(select(Invoice).where(Invoice.merchant_id == merchant_id)).all()
