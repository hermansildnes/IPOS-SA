"""
Seed Data Script - test data for development and demo purposes.

Populates the database with:
- Test users 
- Merchant accounts 
- Products 
- Sample orders

cd backend
python seed_data.py
OR
uv run python seed_data.py
"""
import sys
from datetime import date
from decimal import Decimal

from sqlmodel import Session, select

from auth.models import User, UserRole
from auth.service import hash_password
from catalogue.models import Product
from core.database import engine, create_db_and_tables
from merchants.models import (
    Merchant,
    AccountStatus,
    DiscountPlanType,
    ReminderStatus,
)
from orders.models import Order, OrderItem, Invoice, OrderStatus


def clear_db(session: Session):
    """Delete everything - use this to start fresh"""
    print("WARNING: This deletes all data!")
    confirm = input("Type 'yes' to continue: ")
    
    if confirm.lower() != 'yes':
        print("Cancelled")
        sys.exit(0)
    
    print("Deleting old data...")
    
    # delete in right order because of foreign keys
    session.query(OrderItem).delete()
    session.query(Invoice).delete()
    session.query(Order).delete()
    session.query(Product).delete()
    session.query(Merchant).delete()
    session.query(User).delete()
    
    session.commit()
    print("Done\n")


def add_users(session: Session):
    """Add test users for each role"""
    print("Adding users...")
    
    # just basic test users
    users_list = [
        ("admin", "admin@infopharma.com", "admin123", UserRole.ADMIN),
        ("manager", "manager@infopharma.com", "manager123", UserRole.MANAGER),
        ("director", "director@infopharma.com", "director123", UserRole.DIRECTOR),
        ("merchant1", "john@boots.com", "merchant123", UserRole.MERCHANT),
        ("merchant2", "sarah@superdrug.co.uk", "merchant456", UserRole.MERCHANT),
        ("merchant3", "mike@lloyds.com", "merchant789", UserRole.MERCHANT),
    ]
    
    created = {}
    
    for username, email, password, role in users_list:
        # check if exists first
        existing = session.exec(
            select(User).where(User.username == username)
        ).first()
        
        if existing:
            print(f"  {username} already exists, skipping")
            created[username] = existing
            continue
        
        # make new user
        user = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            role=role,
            is_active=True,
        )
        
        session.add(user)
        created[username] = user
        print(f"  Added {username} ({role})")
    
    session.commit()
    print(f"Created {len(created)} users\n")
    
    return created


def add_merchants(session: Session, users):
    """Add some test merchant accounts"""
    print("Adding merchants...")
    
    # made up some pharmacy names
    merchants_list = [
        {
            "user": users["merchant1"],
            "account_number": "M001",
            "company_name": "Boots City Centre",
            "contact_name": "John Davies",
            "contact_email": "john@boots.com",
            "contact_phone": "020 7946 0958",
            "address": "45 Oxford St, London W1D 2DZ",
            "credit_limit": Decimal("50000"),
            "discount_plan_type": DiscountPlanType.FIXED,
            "fixed_discount_rate": Decimal("5"),
        },
        {
            "user": users["merchant2"],
            "account_number": "M002",
            "company_name": "Superdrug Manchester",
            "contact_name": "Sarah Thompson",
            "contact_email": "sarah@superdrug.co.uk",
            "contact_phone": "0161 496 0183",
            "address": "Market St, Manchester M1 1WA",
            "credit_limit": Decimal("75000"),
            "discount_plan_type": DiscountPlanType.FLEXIBLE,
            "fixed_discount_rate": None,
        },
        {
            "user": users["merchant3"],
            "account_number": "M003",
            "company_name": "Lloyds Pharmacy Birmingham",
            "contact_name": "Mike Roberts",
            "contact_email": "mike@lloyds.com",
            "contact_phone": "0121 496 0274",
            "address": "Bull St, Birmingham B4 6AF",
            "credit_limit": Decimal("30000"),
            "discount_plan_type": DiscountPlanType.FIXED,
            "fixed_discount_rate": Decimal("3"),
        },
    ]
    
    created = {}
    
    for data in merchants_list:
        # check exists
        existing = session.exec(
            select(Merchant).where(
                Merchant.account_number == data["account_number"]
            )
        ).first()
        
        if existing:
            print(f"  {data['company_name']} exists, skipping")
            created[data["company_name"]] = existing
            continue
        
        # create merchant
        merchant = Merchant(
            user_id=data["user"].id,
            account_number=data["account_number"],
            company_name=data["company_name"],
            contact_name=data["contact_name"],
            contact_email=data["contact_email"],
            contact_phone=data["contact_phone"],
            address=data["address"],
            credit_limit=data["credit_limit"],
            discount_plan_type=data["discount_plan_type"],
            fixed_discount_rate=data["fixed_discount_rate"],
            account_status=AccountStatus.NORMAL,
            status_1st_reminder=ReminderStatus.NO_NEED,
            status_2nd_reminder=ReminderStatus.NO_NEED,
        )
        
        session.add(merchant)
        created[data["company_name"]] = merchant
        
        discount = f"{data['fixed_discount_rate']}%" if data['fixed_discount_rate'] else "flexible"
        print(f"  Added {data['company_name']} - {discount} discount")
    
    session.commit()
    print(f"Created {len(created)} merchants\n")
    
    return created


def add_products(session: Session):
    """Add medicine products from the brief"""
    print("Adding products...")
    
    # got these from the project brief mostly
    products_list = [
        ("PAR500", "Paracetamol 500mg", "Box of 100 tablets", "Box", "tablets", 100, "12.50", 150, 20),
        ("ASP300", "Aspirin 300mg", "Bottle of 50 tablets", "Bottle", "tablets", 50, "8.75", 80, 15),
        ("IBU400", "Ibuprofen 400mg", "Box of 200 tablets", "Box", "tablets", 200, "15.99", 120, 25),
        ("AMX250", "Amoxicillin 250mg", "21 capsules blister pack", "Blister", "capsules", 21, "22.50", 60, 10),
        ("OME20", "Omeprazole 20mg", "28 capsules", "Blister", "capsules", 28, "18.99", 95, 20),
        ("SIM20", "Simvastatin 20mg", "28 tablets", "Blister", "tablets", 28, "16.75", 110, 20),
        ("MET500", "Metformin 500mg", "84 tablets box", "Box", "tablets", 84, "24.50", 75, 15),
        ("RAM5", "Ramipril 5mg", "28 capsules", "Blister", "capsules", 28, "19.99", 88, 20),
        ("SAL100", "Salbutamol Inhaler", "200 dose inhaler", "Inhaler", "doses", 200, "32.50", 45, 10),
        ("CET10", "Cetirizine 10mg", "30 tablets", "Blister", "tablets", 30, "11.25", 130, 25),
        ("DIC50", "Diclofenac 50mg", "84 tablets", "Box", "tablets", 84, "21.99", 65, 15),
        ("LAN30", "Lansoprazole 30mg", "28 capsules", "Blister", "capsules", 28, "20.50", 92, 20),
    ]
    
    created = []
    
    for code, name, desc, pkg_type, unit, units, cost, stock, min_stock in products_list:
        # check exists
        existing = session.exec(
            select(Product).where(Product.product_code == code)
        ).first()
        
        if existing:
            print(f"  {name} exists, skipping")
            created.append(existing)
            continue
        
        # add product
        product = Product(
            product_code=code,
            name=name,
            description=desc,
            package_type=pkg_type,
            unit=unit,
            units_per_pack=units,
            package_cost=Decimal(cost),
            stock_quantity=stock,
            min_stock_level=min_stock,
        )
        
        session.add(product)
        created.append(product)
        print(f"  Added {name} - £{cost}")
    
    session.commit()
    print(f"Created {len(created)} products\n")
    
    return created


def add_sample_orders(session: Session, merchants, products):
    """Add couple of test orders"""
    print("Adding sample orders...")
    
    # order 1 - delivered
    m1 = merchants.get("Boots City Centre")
    if m1 and len(products) >= 3:
        items1 = [
            (products[0], 10),  # paracetamol
            (products[1], 5),   # aspirin
        ]
        
        total1 = sum(p.package_cost * q for p, q in items1)
        discount1 = total1 * Decimal("0.05")  # 5% discount
        due1 = total1 - discount1
        
        order1 = Order(
            merchant_id=m1.id,
            order_date=date(2026, 3, 1),
            total=total1,
            discount_amount=discount1,
            amount_due=due1,
            status=OrderStatus.DELIVERED,
            dispatched_date=date(2026, 3, 3),
            courier="DHL",
            courier_ref="DHL123456",
            expected_delivery=date(2026, 3, 5),
        )
        session.add(order1)
        session.flush()
        
        for product, qty in items1:
            item = OrderItem(
                order_id=order1.id,
                product_id=product.id,
                quantity=qty,
                unit_price=product.package_cost,
                cost=product.package_cost * qty,
            )
            session.add(item)
        
        inv1 = Invoice(
            order_id=order1.id,
            merchant_id=m1.id,
            invoice_date=date(2026, 3, 1),
            total_amount=total1,
            discount_amount=discount1,
            amount_due=due1,
        )
        session.add(inv1)
        
        print(f"  Added order 1 - £{due1} (delivered)")
    
    # order 2 - dispatched
    m2 = merchants.get("Superdrug Manchester")
    if m2 and len(products) >= 5:
        items2 = [
            (products[2], 8),   # ibuprofen
            (products[3], 12),  # amoxicillin
            (products[4], 6),   # omeprazole
        ]
        
        total2 = sum(p.package_cost * q for p, q in items2)
        discount2 = Decimal("0")  # no discount yet (flexible plan)
        due2 = total2 - discount2
        
        order2 = Order(
            merchant_id=m2.id,
            order_date=date(2026, 3, 10),
            total=total2,
            discount_amount=discount2,
            amount_due=due2,
            status=OrderStatus.DISPATCHED,
            dispatched_date=date(2026, 3, 12),
            courier="Royal Mail",
            courier_ref="RM987654",
            expected_delivery=date(2026, 3, 15),
        )
        session.add(order2)
        session.flush()
        
        for product, qty in items2:
            item = OrderItem(
                order_id=order2.id,
                product_id=product.id,
                quantity=qty,
                unit_price=product.package_cost,
                cost=product.package_cost * qty,
            )
            session.add(item)
        
        inv2 = Invoice(
            order_id=order2.id,
            merchant_id=m2.id,
            invoice_date=date(2026, 3, 10),
            total_amount=total2,
            discount_amount=discount2,
            amount_due=due2,
        )
        session.add(inv2)
        
        print(f"  Added order 2 - £{due2} (dispatched)")
    
    session.commit()
    print("Sample orders created\n")


def main():
    print("\n" + "="*50)
    print("IPOS-SA Database Seed Script")
    print("="*50 + "\n")
    
    # setup database
    print("Setting up database...")
    create_db_and_tables()
    print("Database ready\n")
    
    session = Session(engine)
    
    try:
        # uncomment this if you want to clear old data first
        # clear_db(session)
        
        # create all the test data
        users = add_users(session)
        merchants = add_merchants(session, users)
        products = add_products(session)
        add_sample_orders(session, merchants, products)
        
        print("="*50)
        print("Done!")
        print("="*50 + "\n")
        
        print("Summary:")
        print(f"  Users: {len(users)}")
        print(f"  Merchants: {len(merchants)}")
        print(f"  Products: {len(products)}")
        print(f"  Orders: 2\n")
        
        print("Login credentials:")
        print("  admin / admin123")
        print("  manager / manager123")
        print("  director / director123")
        print("  merchant1 / merchant123")
        print("  merchant2 / merchant456")
        print("  merchant3 / merchant789\n")
        
        print("Now run:")
        print("  Backend:  uv run fastapi dev main.py")
        print("  Frontend: npm run dev\n")
        
    except Exception as e:
        print(f"\nError: {e}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()