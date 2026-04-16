import calendar
from datetime import date as date_type, datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import Session, select

from merchants.models import (
    AccountStatus,
    Merchant,
    MerchantCreate,
    MerchantRead,
    MerchantUpdate,
    MerchantBalanceRead,
    Payment,
    ReminderStatus,
    DiscountPlanType,
    DiscountTier,
    TierRead,
    InvoiceCreate,
    BalanceAdjustmentRequest,
)
from orders.models import Order, Invoice


def _sync_account_status(session: Session, merchant: Merchant) -> None:
    # recalculates account status and reminder flags based on balance and how overdue they are
    from audit.models import AuditAction
    from audit.service import log_action

    orders = session.exec(select(Order).where(Order.merchant_id == merchant.id)).all()
    total_orders = sum((o.amount_due for o in orders), Decimal("0.00"))

    payments = session.exec(
        select(Payment).where(Payment.merchant_id == merchant.id)
    ).all()
    total_payments = sum((p.amount for p in payments), Decimal("0.00"))

    outstanding = total_orders - total_payments
    hard_limit = merchant.credit_limit * Decimal("1.05")
    today = date_type.today()

    # find the oldest month that still has unpaid balance
    days_overdue = 0
    if outstanding > Decimal("0.00") and orders:
        sorted_orders = sorted(orders, key=lambda o: o.order_date)
        remaining = total_payments
        oldest_unpaid_date = None
        for order in sorted_orders:
            if remaining >= order.amount_due:
                remaining -= order.amount_due
            else:
                oldest_unpaid_date = order.order_date
                break

        if oldest_unpaid_date:
            last_day = calendar.monthrange(
                oldest_unpaid_date.year, oldest_unpaid_date.month
            )[1]
            billing_month_end = date_type(
                oldest_unpaid_date.year, oldest_unpaid_date.month, last_day
            )
            days_overdue = max(0, (today - billing_month_end).days)

    # suspend if over credit limit or overdue long enough
    should_be_suspended = outstanding >= hard_limit or (
        days_overdue > 15 and outstanding > Decimal("0.00")
    )

    # cant touch in_default accounts here, director has to do that manually
    if merchant.account_status == AccountStatus.IN_DEFAULT:
        return

    needs_save = False

    # check restoration before escalation otherwise clearing the balance would still hit default
    if merchant.account_status == AccountStatus.SUSPENDED and not should_be_suspended:
        merchant.account_status = AccountStatus.NORMAL
        merchant.updated_at = datetime.now(timezone.utc)
        needs_save = True

    # escalate to default if still suspended after 30 days
    if merchant.account_status == AccountStatus.SUSPENDED and days_overdue > 30:
        merchant.account_status = AccountStatus.IN_DEFAULT
        merchant.default_reason = (
            f"automatically escalated after {days_overdue} days overdue"
        )
        merchant.updated_at = datetime.now(timezone.utc)
        session.add(merchant)
        session.commit()
        session.refresh(merchant)
        log_action(
            session,
            action=AuditAction.MERCHANT_ACCOUNT_DEFAULTED,
            performed_by_username="system",
            target_type="merchant",
            target_id=str(merchant.id),
            target_label=merchant.company_name,
            detail={
                "reason": "automatically escalated after 30+ days overdue",
                "days_overdue": days_overdue,
            },
        )
        return

    # suspend if conditions are met
    if merchant.account_status == AccountStatus.NORMAL and should_be_suspended:
        merchant.account_status = AccountStatus.SUSPENDED
        merchant.updated_at = datetime.now(timezone.utc)
        needs_save = True

    if outstanding > Decimal("0.00") and days_overdue > 0:
        if merchant.status_1st_reminder != ReminderStatus.DUE:
            merchant.status_1st_reminder = ReminderStatus.DUE
            if merchant.date_1st_reminder is None:
                merchant.date_1st_reminder = today
            needs_save = True

        # second reminder kicks in after 15 days
        if days_overdue > 15 and merchant.status_2nd_reminder != ReminderStatus.DUE:
            merchant.status_2nd_reminder = ReminderStatus.DUE
            if merchant.date_2nd_reminder is None:
                merchant.date_2nd_reminder = today
            needs_save = True
    else:
        # balance cleared, remove reminders
        if merchant.status_1st_reminder != ReminderStatus.NO_NEED:
            merchant.status_1st_reminder = ReminderStatus.NO_NEED
            merchant.date_1st_reminder = None
            needs_save = True
        if merchant.status_2nd_reminder != ReminderStatus.NO_NEED:
            merchant.status_2nd_reminder = ReminderStatus.NO_NEED
            merchant.date_2nd_reminder = None
            needs_save = True

    if needs_save:
        session.add(merchant)
        session.commit()
        session.refresh(merchant)


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

    user = User(
        username=merchant_in.username,
        email=merchant_in.email,
        password_hash=hash_password(merchant_in.password),
        role=UserRole.MERCHANT,
        is_active=True,
    )
    session.add(user)
    session.flush()

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
    session.flush()

    if (
        merchant_in.discount_plan_type == DiscountPlanType.FLEXIBLE
        and merchant_in.flexible_thresholds
    ):
        _upsert_discount_tiers(session, merchant.id, merchant_in.flexible_thresholds)

    session.commit()
    session.refresh(merchant)
    return merchant


def _upsert_discount_tiers(session, merchant_id, tiers):
    existing = session.exec(
        select(DiscountTier).where(DiscountTier.merchant_id == merchant_id)
    ).all()
    for t in existing:
        session.delete(t)
    session.flush()

    prev_max = Decimal("0")
    for tier in tiers:
        if tier.up_to is not None:
            new_tier = DiscountTier(
                merchant_id=merchant_id,
                min_value=prev_max,
                max_value=tier.up_to,
                discount_rate=tier.rate,
            )
            prev_max = tier.up_to
        else:
            lower = tier.above if tier.above is not None else prev_max
            new_tier = DiscountTier(
                merchant_id=merchant_id,
                min_value=lower,
                max_value=None,
                discount_rate=tier.rate,
            )
        session.add(new_tier)


def merchant_to_read(session: Session, merchant: Merchant) -> MerchantRead:
    _sync_account_status(session, merchant)
    tiers = None
    if merchant.discount_plan_type == DiscountPlanType.FLEXIBLE:
        db_tiers = session.exec(
            select(DiscountTier)
            .where(DiscountTier.merchant_id == merchant.id)
            .order_by(DiscountTier.min_value)
        ).all()
        tiers = [TierRead(up_to=t.max_value, rate=t.discount_rate) for t in db_tiers]

    return MerchantRead(
        id=merchant.id,
        user_id=merchant.user_id,
        account_number=merchant.account_number,
        company_name=merchant.company_name,
        contact_name=merchant.contact_name,
        contact_email=merchant.contact_email,
        contact_phone=merchant.contact_phone,
        address=merchant.address,
        credit_limit=merchant.credit_limit,
        discount_plan_type=merchant.discount_plan_type,
        fixed_discount_rate=merchant.fixed_discount_rate,
        account_status=merchant.account_status,
        status_1st_reminder=merchant.status_1st_reminder,
        status_2nd_reminder=merchant.status_2nd_reminder,
        date_1st_reminder=merchant.date_1st_reminder,
        date_2nd_reminder=merchant.date_2nd_reminder,
        flexible_thresholds=tiers,
        created_at=merchant.created_at,
        updated_at=merchant.updated_at,
    )


def convert_user_to_merchant(session: Session, user_id: UUID, data) -> Merchant:
    from auth.models import User, UserRole

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if user.role == UserRole.MERCHANT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a merchant",
        )

    existing = session.exec(select(Merchant).where(Merchant.user_id == user_id)).first()
    if existing:
        user.role = UserRole.MERCHANT
        user.updated_at = datetime.now(timezone.utc)
        session.add(user)
        session.commit()
        session.refresh(existing)
        return existing

    if data.discount_plan_type == DiscountPlanType.FIXED:
        if data.fixed_discount_rate is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fixed discount rate is required",
            )
    else:
        data.fixed_discount_rate = None

    existing_merchants = session.exec(select(Merchant)).all()
    next_number = len(existing_merchants) + 1
    account_number = f"M{next_number:03d}"
    while session.exec(
        select(Merchant).where(Merchant.account_number == account_number)
    ).first():
        next_number += 1
        account_number = f"M{next_number:03d}"

    merchant = Merchant(
        user_id=user_id,
        account_number=account_number,
        company_name=data.company_name,
        contact_name=data.contact_name,
        contact_email=data.contact_email,
        contact_phone=data.contact_phone,
        address=data.address,
        credit_limit=data.credit_limit,
        discount_plan_type=data.discount_plan_type,
        fixed_discount_rate=data.fixed_discount_rate,
    )
    session.add(merchant)
    session.flush()

    if (
        data.discount_plan_type == DiscountPlanType.FLEXIBLE
        and data.flexible_thresholds
    ):
        _upsert_discount_tiers(session, merchant.id, data.flexible_thresholds)

    user.role = UserRole.MERCHANT
    user.updated_at = datetime.now(timezone.utc)
    session.add(user)
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
    from auth.models import User, UserRole

    statement = (
        select(Merchant)
        .join(User, Merchant.user_id == User.id)
        .where(User.role == UserRole.MERCHANT)
    )
    if status:
        statement = statement.where(Merchant.account_status == status)

    merchants = list(session.exec(statement).all())
    result = []
    for m in merchants:
        _sync_account_status(session, m)
        balance = calculate_merchant_balance(session, m.id)
        data = m.model_dump()
        data["outstanding_balance"] = float(balance.outstanding_balance)
        result.append(data)
    return result


def update_merchant(
    session: Session, merchant_id: UUID, merchant_in: MerchantUpdate
) -> Merchant:
    merchant = get_merchant_by_id(session, merchant_id)

    fields_set = merchant_in.model_fields_set
    new_tiers = (
        merchant_in.flexible_thresholds if "flexible_thresholds" in fields_set else None
    )

    update_data = merchant_in.model_dump(exclude_unset=True)
    update_data.pop("flexible_thresholds", None)

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

    current_plan = getattr(merchant, "discount_plan_type", None)
    is_flexible = (
        update_data.get("discount_plan_type") == DiscountPlanType.FLEXIBLE
        or current_plan == DiscountPlanType.FLEXIBLE
    )
    if new_tiers is not None and is_flexible:
        _upsert_discount_tiers(session, merchant.id, new_tiers)

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
    total_orders = sum((order.amount_due for order in orders), Decimal("0.00"))
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


def delete_discount_plan(session: Session, merchant_id: UUID) -> Merchant:
    merchant = get_merchant_by_id(session, merchant_id)

    existing_tiers = session.exec(
        select(DiscountTier).where(DiscountTier.merchant_id == merchant_id)
    ).all()
    for tier in existing_tiers:
        session.delete(tier)

    merchant.discount_plan_type = DiscountPlanType.FIXED
    merchant.fixed_discount_rate = Decimal("0.00")
    merchant.updated_at = datetime.now(timezone.utc)
    session.add(merchant)
    session.commit()
    session.refresh(merchant)
    return merchant


def adjust_balance(
    session: Session,
    merchant_id: UUID,
    adjustment: BalanceAdjustmentRequest,
    recorded_by: UUID,
) -> MerchantBalanceRead:
    merchant = get_merchant_by_id(session, merchant_id)

    payment = Payment(
        merchant_id=merchant_id,
        amount=adjustment.amount,
        payment_date=date_type.today(),
        payment_method="manual_adjustment",
        reference_number=adjustment.reason,
        recorded_by=recorded_by,
    )
    session.add(payment)
    session.commit()
    session.refresh(merchant)
    _sync_account_status(session, merchant)
    return calculate_merchant_balance(session, merchant_id)


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


def delete_merchant(session: Session, merchant_id: UUID) -> None:
    from auth.models import User
    from orders.models import OrderItem

    merchant = session.get(Merchant, merchant_id)
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Merchant not found"
        )

    orders = session.exec(select(Order).where(Order.merchant_id == merchant_id)).all()
    for order in orders:
        items = session.exec(
            select(OrderItem).where(OrderItem.order_id == order.id)
        ).all()
        for item in items:
            session.delete(item)
        invoice = session.exec(
            select(Invoice).where(Invoice.order_id == order.id)
        ).first()
        if invoice:
            session.delete(invoice)
        session.delete(order)

    tiers = session.exec(
        select(DiscountTier).where(DiscountTier.merchant_id == merchant_id)
    ).all()
    for tier in tiers:
        session.delete(tier)

    payments = session.exec(
        select(Payment).where(Payment.merchant_id == merchant_id)
    ).all()
    for payment in payments:
        session.delete(payment)

    user_id = merchant.user_id
    session.delete(merchant)
    session.flush()

    user = session.get(User, user_id)
    if user:
        session.delete(user)

    session.commit()
