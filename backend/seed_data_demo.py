"""
demo seed script loads the official sample data from IPOS_SampleData_2026_v1.1.pdf
wipes everything first backs up the db before it does so

cd backend
uv run python seed_data_demo.py

to rollback copy the backup file printed below back to ipos_sa.db and restart
old dev data is still in seed_data.py if needed
"""

import shutil
import sys
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from sqlmodel import Session, select

from audit.models import AuditLog
from auth.models import User, UserRole
from auth.service import hash_password
from catalogue.models import Product, StockReceipt
from commercial_applications.models import CommercialApplication
from core.config import settings
from core.database import engine, create_db_and_tables
from merchants.models import (
    Merchant,
    AccountStatus,
    DiscountPlanType,
    DiscountTier,
    Payment,
    ReminderStatus,
)
from orders.models import Order, OrderItem, Invoice, OrderStatus


def backup_db():
    # copy the db file to a timestamped backup so we can rollback if needed
    db_url = settings.DATABASE_URL

    if not db_url.startswith("sqlite"):
        print("  non-sqlite db — skip file backup, do a pg_dump manually\n")
        return None

    db_path = Path(db_url.replace("sqlite:///", ""))

    if not db_path.exists():
        print("  no existing db file found, nothing to back up\n")
        return None

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = db_path.parent / f"ipos_sa_backup_{ts}.db"
    shutil.copy2(db_path, backup_path)

    print(f"  backup saved → {backup_path.resolve()}")
    print(f"  to rollback copy that file back to {db_path.resolve()}\n")
    return backup_path


def wipe_db(session: Session):
    # delete everything in fk safe order
    print("Wiping all tables...")

    session.query(AuditLog).delete()
    session.query(StockReceipt).delete()
    session.query(OrderItem).delete()
    session.query(Invoice).delete()
    session.query(Order).delete()
    session.query(Payment).delete()
    session.query(DiscountTier).delete()
    session.query(Product).delete()
    session.query(Merchant).delete()
    session.query(CommercialApplication).delete()
    session.query(User).delete()

    session.commit()
    print("  done\n")


def add_staff_users(session: Session):
    # 7 staff accounts from pdf page 5
    # accountant/clerk/warehouse/delivery all get MANAGER since that role
    # covers what they need pdf says only 3 roles are mandatory anyway
    print("Adding staff users...")

    staff = [
        # username     email                            password           role
        ("Sysdba", "sysdba@infopharma.com", "London_weighting", UserRole.ADMIN),
        ("manager", "manager@infopharma.com", "Get_it_done", UserRole.DIRECTOR),
        ("accountant", "accountant@infopharma.com", "Count_money", UserRole.MANAGER),
        ("clerk", "clerk@infopharma.com", "Paperwork", UserRole.MANAGER),
        ("warehouse1", "warehouse1@infopharma.com", "Get_a_beer", UserRole.MANAGER),
        ("warehouse2", "warehouse2@infopharma.com", "Lot_smell", UserRole.MANAGER),
        ("delivery", "delivery@infopharma.com", "Too_dark", UserRole.MANAGER),
    ]

    users = {}
    for username, email, password, role in staff:
        user = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            role=role,
            is_active=True,
        )
        session.add(user)
        users[username] = user
        print(f"  {username:<12} ({role.value})")

    session.commit()
    print(f"  {len(staff)} staff users created\n")
    return users


def add_merchants(session: Session):
    # 3 merchants from pdf pages 5 and 6
    # emails arent in the pdf so we made up sensible ones
    print("Adding merchants...")

    # citypharmacy fixed 3% discount
    city_user = User(
        username="city",
        email="david.rhind@citypharmacy.com",
        password_hash=hash_password("northampton"),
        role=UserRole.MERCHANT,
        is_active=True,
    )
    session.add(city_user)
    session.flush()

    city = Merchant(
        user_id=city_user.id,
        account_number="ACC0001",
        company_name="CityPharmacy",
        contact_name="Prof David Rhind",
        contact_email="david.rhind@citypharmacy.com",
        contact_phone="0207 040 8000",
        address="Northampton Square, London EC1V 0HB",
        credit_limit=Decimal("10000.00"),
        discount_plan_type=DiscountPlanType.FIXED,
        fixed_discount_rate=Decimal("3.00"),
        account_status=AccountStatus.NORMAL,
        status_1st_reminder=ReminderStatus.NO_NEED,
        status_2nd_reminder=ReminderStatus.NO_NEED,
    )
    session.add(city)
    session.flush()
    print("  ACC0001  CityPharmacy     — fixed 3%")

    # cosymed flexible <£1000=0% £1000 to £2000=1% £2000+=2%
    cosymed_user = User(
        username="cosymed",
        email="alex.wright@cosymed.com",
        password_hash=hash_password("bondstreet"),
        role=UserRole.MERCHANT,
        is_active=True,
    )
    session.add(cosymed_user)
    session.flush()

    cosymed = Merchant(
        user_id=cosymed_user.id,
        account_number="ACC0002",
        company_name="Cosymed Ltd",
        contact_name="Mr Alex Wright",
        contact_email="alex.wright@cosymed.com",
        contact_phone="0207 321 8001",
        address="25, Bond Street, London WC1V 8LS",
        credit_limit=Decimal("5000.00"),
        discount_plan_type=DiscountPlanType.FLEXIBLE,
        fixed_discount_rate=None,
        account_status=AccountStatus.NORMAL,
        status_1st_reminder=ReminderStatus.NO_NEED,
        status_2nd_reminder=ReminderStatus.NO_NEED,
    )
    session.add(cosymed)
    session.flush()

    for min_v, max_v, rate in [
        (Decimal("0"), Decimal("999.99"), Decimal("0")),
        (Decimal("1000.00"), Decimal("1999.99"), Decimal("1")),
        (Decimal("2000.00"), None, Decimal("2")),
    ]:
        session.add(
            DiscountTier(
                merchant_id=cosymed.id,
                min_value=min_v,
                max_value=max_v,
                discount_rate=rate,
            )
        )
    print("  ACC0002  Cosymed Ltd      — flexible (0% / 1% / 2%)")

    # hellopharmacy flexible <£1000=0% £1000 to £2000=1% £2000+=3%
    hello_user = User(
        username="hello",
        email="bruno.wright@hellopharmacy.com",
        password_hash=hash_password("there"),
        role=UserRole.MERCHANT,
        is_active=True,
    )
    session.add(hello_user)
    session.flush()

    hello = Merchant(
        user_id=hello_user.id,
        account_number="ACC0003",
        company_name="HelloPharmacy",
        contact_name="Mr Bruno Wright",
        contact_email="bruno.wright@hellopharmacy.com",
        contact_phone="0207 321 8002",
        address="12, Bond Street, London WC1V 9NS",
        credit_limit=Decimal("5000.00"),
        discount_plan_type=DiscountPlanType.FLEXIBLE,
        fixed_discount_rate=None,
        account_status=AccountStatus.NORMAL,
        status_1st_reminder=ReminderStatus.NO_NEED,
        status_2nd_reminder=ReminderStatus.NO_NEED,
    )
    session.add(hello)
    session.flush()

    for min_v, max_v, rate in [
        (Decimal("0"), Decimal("999.99"), Decimal("0")),
        (Decimal("1000.00"), Decimal("1999.99"), Decimal("1")),
        (Decimal("2000.00"), None, Decimal("3")),
    ]:
        session.add(
            DiscountTier(
                merchant_id=hello.id,
                min_value=min_v,
                max_value=max_v,
                discount_rate=rate,
            )
        )
    print("  ACC0003  HelloPharmacy    — flexible (0% / 1% / 3%)")

    session.commit()
    print("  3 merchants created\n")
    return {"city": city, "cosymed": cosymed, "hello": hello}


def add_products(session: Session):
    # 14 items from pdf page 7
    # stock values here are the net totals after all 6 orders have been delivered
    # we insert the final state directly since orders go in as already delivered
    # note pdf shows 2,2134 for iodine tincture treated as 2213 typo
    # note iodine tincture qty=12 used in orders 1 and 3 the pdf says qty=20
    # but the line total shows £3.60 which is 12x£0.30 so 12 is correct
    print("Adding catalogue products (14 items)...")

    # code          name                     pkg_type  unit  up  cost   stock  min
    products_data = [
        ("100 00001", "Paracetamol", "box", "Caps", 20, "0.10", 10325, 300),
        ("100 00002", "Aspirin", "box", "Caps", 20, "0.50", 12453, 500),
        ("100 00003", "Analgin", "box", "Caps", 10, "1.20", 4135, 200),
        ("100 00004", "Celebrex, caps 100 mg", "box", "Caps", 10, "10.00", 3410, 200),
        ("100 00005", "Celebrex, caps 200 mg", "box", "caps", 10, "18.50", 1440, 150),
        ("100 00006", "Retin-A Tretin, 30 g", "box", "caps", 20, "25.00", 2003, 200),
        ("100 00007", "Lipitor TB, 20 mg", "box", "caps", 30, "15.50", 1542, 200),
        ("100 00008", "Claritin CR, 60g", "box", "caps", 20, "19.50", 2540, 200),
        ("200 00004", "Iodine tincture", "bottle", "ml", 100, "0.30", 2189, 200),
        ("200 00005", "Rhynol", "bottle", "ml", 200, "2.50", 1878, 300),
        ("300 00001", "Ospen", "box", "caps", 20, "10.50", 766, 200),
        ("300 00002", "Amopen", "box", "caps", 30, "15.00", 1250, 300),
        ("400 00001", "Vitamin C", "box", "caps", 30, "1.20", 3218, 300),
        ("400 00002", "Vitamin B12", "box", "caps", 30, "1.30", 2573, 300),
    ]

    product_map = {}
    for (
        code,
        name,
        pkg_type,
        unit,
        units_per_pack,
        cost,
        stock,
        min_stock,
    ) in products_data:
        p = Product(
            product_code=code,
            name=name,
            description=f"{name} — {pkg_type} of {units_per_pack} {unit}",
            package_type=pkg_type,
            unit=unit,
            units_per_pack=units_per_pack,
            package_cost=Decimal(cost),
            stock_quantity=stock,
            min_stock_level=min_stock,
        )
        session.add(p)
        product_map[code] = p
        print(f"  {code}  {name}")

    session.commit()
    print(f"  {len(product_map)} products created\n")
    return product_map


def _make_order(
    session,
    merchant,
    order_date,
    items_data,  # list of (Product, qty, unit_cost_str)
    discount_rate,  # decimal percentage e.g. Decimal("3")
    dispatched_by_id,
    dispatch_date,
    courier,
    courier_ref,
    delivery_date,
):
    # builds an order + items + invoice already in delivered state
    subtotal = sum(Decimal(str(unit_cost)) * qty for _, qty, unit_cost in items_data)
    discount_amount = (subtotal * (discount_rate / Decimal("100"))).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    amount_due = subtotal - discount_amount

    order = Order(
        merchant_id=merchant.id,
        order_date=order_date,
        status=OrderStatus.DELIVERED,
        total=subtotal,
        discount_amount=discount_amount,
        amount_due=amount_due,
        dispatched_by=dispatched_by_id,
        dispatched_date=dispatch_date,
        courier=courier,
        courier_ref=courier_ref,
        expected_delivery=delivery_date,
        created_at=datetime(
            order_date.year, order_date.month, order_date.day, tzinfo=timezone.utc
        ),
        updated_at=datetime(
            delivery_date.year,
            delivery_date.month,
            delivery_date.day,
            tzinfo=timezone.utc,
        ),
    )
    session.add(order)
    session.flush()

    for product, qty, unit_cost in items_data:
        item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=qty,
            unit_price=Decimal(str(unit_cost)),
            cost=Decimal(str(unit_cost)) * qty,
        )
        session.add(item)

    invoice = Invoice(
        order_id=order.id,
        merchant_id=merchant.id,
        invoice_date=order_date,
        total_amount=subtotal,
        discount_amount=discount_amount,
        amount_due=amount_due,
    )
    session.add(invoice)

    return order


def add_orders(session: Session, merchants: dict, products: dict, users: dict):
    # 6 orders from pdf scenarios 1 to 6 all set to delivered
    # dispatched_by uses warehouse1 courier refs are made up pdf doesnt give them
    print("Adding orders (scenarios 1-6)...")

    city = merchants["city"]
    cosymed = merchants["cosymed"]
    hello = merchants["hello"]
    wh1_id = users["warehouse1"].id
    p = products

    # order 1 citypharmacy 20 feb delivered 23 feb by infopharma courier
    # iodine tincture qty=12 not 20 see note in add_products
    o1 = _make_order(
        session,
        city,
        order_date=date(2026, 2, 20),
        items_data=[
            (p["100 00001"], 10, "0.10"),  # Paracetamol     £1.00
            (p["100 00003"], 20, "1.20"),  # Analgin        £24.00
            (p["200 00004"], 12, "0.30"),  # Iodine tincture £3.60
            (p["200 00005"], 10, "2.50"),  # Rhynol         £25.00
            (p["300 00001"], 10, "10.50"),  # Ospen         £105.00
            (p["300 00002"], 20, "15.00"),  # Amopen        £300.00
            (p["400 00001"], 20, "1.20"),  # Vitamin C      £24.00
            (p["400 00002"], 20, "1.30"),  # Vitamin B12    £26.00
        ],
        discount_rate=Decimal("3"),
        dispatched_by_id=wh1_id,
        dispatch_date=date(2026, 2, 22),
        courier="InfoPharma Courier",
        courier_ref="INFO-2026-001",
        delivery_date=date(2026, 2, 23),
    )
    print(
        f"  Order 1  CityPharmacy   20 Feb — subtotal £{o1.total}  due £{o1.amount_due}"
    )

    # order 2 cosymed 25 feb delivered 26 feb by dhl
    o2 = _make_order(
        session,
        cosymed,
        order_date=date(2026, 2, 25),
        items_data=[
            (p["100 00001"], 10, "0.10"),  # Paracetamol     £1.00
            (p["100 00003"], 20, "1.20"),  # Analgin        £24.00
            (p["200 00005"], 10, "2.50"),  # Rhynol         £25.00
            (p["300 00002"], 20, "15.00"),  # Amopen        £300.00
            (p["400 00002"], 20, "1.30"),  # Vitamin B12    £26.00
        ],
        discount_rate=Decimal("0"),  # £376 is under the £1000 threshold
        dispatched_by_id=wh1_id,
        dispatch_date=date(2026, 2, 25),
        courier="DHL",
        courier_ref="DHL-2026-4521",
        delivery_date=date(2026, 2, 26),
    )
    print(
        f"  Order 2  Cosymed        25 Feb — subtotal £{o2.total}  due £{o2.amount_due}"
    )

    # order 3 hellopharmacy 25 feb delivered 27 feb by dhl
    # iodine tincture qty=12 again for same reason as order 1
    o3 = _make_order(
        session,
        hello,
        order_date=date(2026, 2, 25),
        items_data=[
            (p["100 00003"], 20, "1.20"),  # Analgin        £24.00
            (p["200 00004"], 12, "0.30"),  # Iodine tincture £3.60
            (p["300 00001"], 3, "10.50"),  # Ospen          £31.50
            (p["300 00002"], 10, "15.00"),  # Amopen        £150.00
            (p["400 00001"], 20, "1.20"),  # Vitamin C      £24.00
            (p["400 00002"], 20, "1.30"),  # Vitamin B12    £26.00
        ],
        discount_rate=Decimal("0"),
        dispatched_by_id=wh1_id,
        dispatch_date=date(2026, 2, 26),
        courier="DHL",
        courier_ref="DHL-2026-4522",
        delivery_date=date(2026, 2, 27),
    )
    print(
        f"  Order 3  HelloPharmacy  25 Feb — subtotal £{o3.total}  due £{o3.amount_due}"
    )

    # order 4 cosymed 10 mar delivered 12 mar by infopharma courier
    o4 = _make_order(
        session,
        cosymed,
        order_date=date(2026, 3, 10),
        items_data=[
            (p["200 00005"], 10, "2.50"),  # Rhynol         £25.00
            (p["300 00001"], 10, "10.50"),  # Ospen         £105.00
            (p["300 00002"], 20, "15.00"),  # Amopen        £300.00
        ],
        discount_rate=Decimal("0"),
        dispatched_by_id=wh1_id,
        dispatch_date=date(2026, 3, 11),
        courier="InfoPharma Courier",
        courier_ref="INFO-2026-004",
        delivery_date=date(2026, 3, 12),
    )
    print(
        f"  Order 4  Cosymed        10 Mar — subtotal £{o4.total}  due £{o4.amount_due}"
    )

    # order 5 hellopharmacy 25 mar delivered 27 mar by infopharma courier
    o5 = _make_order(
        session,
        hello,
        order_date=date(2026, 3, 25),
        items_data=[
            (p["100 00003"], 20, "1.20"),  # Analgin        £24.00
            (p["100 00004"], 5, "10.00"),  # Celebrex 100mg £50.00
            (p["100 00005"], 5, "18.50"),  # Celebrex 200mg £92.50
            (p["100 00006"], 5, "25.00"),  # Retin-A       £125.00
            (p["100 00007"], 10, "15.50"),  # Lipitor       £155.00
            (p["300 00001"], 10, "10.50"),  # Ospen         £105.00
            (p["300 00002"], 20, "15.00"),  # Amopen        £300.00
            (p["400 00002"], 20, "1.30"),  # Vitamin B12    £26.00
        ],
        discount_rate=Decimal("0"),
        dispatched_by_id=wh1_id,
        dispatch_date=date(2026, 3, 26),
        courier="InfoPharma Courier",
        courier_ref="INFO-2026-005",
        delivery_date=date(2026, 3, 27),
    )
    print(
        f"  Order 5  HelloPharmacy  25 Mar — subtotal £{o5.total}  due £{o5.amount_due}"
    )

    # order 6 hellopharmacy 1 apr delivered 3 apr by infopharma courier
    o6 = _make_order(
        session,
        hello,
        order_date=date(2026, 4, 1),
        items_data=[
            (p["100 00003"], 20, "1.20"),  # Analgin        £24.00
            (p["100 00004"], 5, "10.00"),  # Celebrex 100mg £50.00
            (p["100 00005"], 5, "18.50"),  # Celebrex 200mg £92.50
            (p["100 00006"], 5, "25.00"),  # Retin-A       £125.00
            (p["100 00007"], 10, "15.50"),  # Lipitor       £155.00
            (p["300 00001"], 10, "10.50"),  # Ospen         £105.00
            (p["400 00002"], 20, "1.30"),  # Vitamin B12    £26.00
        ],
        discount_rate=Decimal("0"),
        dispatched_by_id=wh1_id,
        dispatch_date=date(2026, 4, 2),
        courier="InfoPharma Courier",
        courier_ref="INFO-2026-006",
        delivery_date=date(2026, 4, 3),
    )
    print(
        f"  Order 6  HelloPharmacy   1 Apr — subtotal £{o6.total}  due £{o6.amount_due}"
    )

    session.commit()
    print("  6 orders created\n")
    return [o1, o2, o3, o4, o5, o6]


def add_payments(session: Session, merchants: dict, users: dict):
    # payments from pdf scenarios 7 to 9
    # recorded by accountant user since thats their job per the pdf
    #
    # hello paid £259.10 on 5 mar cleared their feb order
    # after that they never paid again so orders 5+6 are still outstanding
    # on demo day apr 16 theyre 16 days past the mar 31 deadline → suspended
    #
    # city paid £493.34 on 15 mar thats the feb order minus 3% discount
    # cosymed paid £806.00 on 15 mar covered both feb £376 and mar £430 orders
    print("Adding payments (scenarios 7-9)...")

    accountant_id = users["accountant"].id

    session.add(
        Payment(
            merchant_id=merchants["hello"].id,
            amount=Decimal("259.10"),
            payment_date=date(2026, 3, 5),
            payment_method="bank_transfer",
            reference_number="HELLO-MAR5-CLR",
            recorded_by=accountant_id,
        )
    )
    print("  HelloPharmacy  £259.10  on 5 Mar  (bank transfer)")

    session.add(
        Payment(
            merchant_id=merchants["city"].id,
            amount=Decimal("493.34"),
            payment_date=date(2026, 3, 15),
            payment_method="bank_transfer",
            reference_number="CITY-MAR15-CLR",
            recorded_by=accountant_id,
        )
    )
    print("  CityPharmacy   £493.34  on 15 Mar (bank transfer)")

    session.add(
        Payment(
            merchant_id=merchants["cosymed"].id,
            amount=Decimal("806.00"),
            payment_date=date(2026, 3, 15),
            payment_method="credit_card",
            reference_number="COSY-MAR15-CLR",
            recorded_by=accountant_id,
        )
    )
    print("  Cosymed        £806.00  on 15 Mar (credit card)")

    session.commit()
    print("  3 payments recorded\n")


def main():
    print()
    print("=" * 60)
    print("  IPOS-SA Demo Seed  (IPOS_SampleData_2026_v1.1.pdf)")
    print("=" * 60)
    print()
    print("WARNING: This will wipe ALL data and replace it with")
    print("the official demo sample data.")
    print()

    confirm = input("Type 'yes' to continue: ").strip().lower()
    if confirm != "yes":
        print("Cancelled.")
        sys.exit(0)

    print()

    print("Backing up existing database...")
    backup_db()

    create_db_and_tables()

    with Session(engine) as session:
        try:
            wipe_db(session)
            users = add_staff_users(session)
            merchants = add_merchants(session)
            products = add_products(session)
            orders = add_orders(session, merchants, products, users)
            add_payments(session, merchants, users)

        except Exception as e:
            print(f"\nERROR: {e}")
            session.rollback()
            print("rolled back - backup file is still intact")
            raise

    print("=" * 60)
    print("  Done!")
    print("=" * 60)
    print()
    print("Summary:")
    print(f"  Staff users   : 7")
    print(f"  Merchants     : 3  (ACC0001 / ACC0002 / ACC0003)")
    print(f"  Products      : 14")
    print(f"  Orders        : 6  (all DELIVERED)")
    print(f"  Payments      : 3")
    print()
    print("Staff logins:")
    print("  Sysdba      / London_weighting  (admin)")
    print("  manager     / Get_it_done       (director)")
    print("  accountant  / Count_money       (manager)")
    print("  clerk       / Paperwork         (manager)")
    print("  warehouse1  / Get_a_beer        (manager)")
    print("  warehouse2  / Lot_smell         (manager)")
    print("  delivery    / Too_dark          (manager)")
    print()
    print("Merchant logins:")
    print("  city        / northampton  — CityPharmacy  (ACC0001)")
    print("  cosymed     / bondstreet   — Cosymed Ltd   (ACC0002)")
    print("  hello       / there        — HelloPharmacy (ACC0003)")
    print()
    print("Account status on demo day (Apr 16):")
    print("  CityPharmacy   → NORMAL     (paid in full 15 Mar)")
    print("  Cosymed        → NORMAL     (paid in full 15 Mar)")
    print(
        "  HelloPharmacy  → SUSPENDED  (16 days past Mar deadline, auto-set on first read)"
    )
    print()
    print("Run the server:")
    print("  uv run fastapi dev main.py")
    print()


if __name__ == "__main__":
    main()
