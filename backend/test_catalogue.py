"""
Tests for the IPOS-SA Catalogue module.

Setup instructions:
  1. Install test dependencies (if not already installed):
       uv add --dev pytest pytest-fastapi httpx
     OR with pip:
       pip install pytest httpx --break-system-packages

  2. Run from the backend directory:
       pytest test_catalogue.py -v
"""

import pytest
from decimal import Decimal
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from main import app
from core.database import get_session
from auth.service import get_current_user
from auth.models import User, UserRole
from catalogue.models import Product
from catalogue import service
from catalogue.models import ProductCreate, ProductUpdate

# Shared fixtures


@pytest.fixture(name="session")
def session_fixture():
    """In-memory SQLite database, recreated fresh for every test."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def make_user(role: UserRole = UserRole.ADMIN) -> User:
    """Return a dummy User object with the given role."""
    return User(
        id=uuid4(),
        username=f"{role.value}_user",
        email=f"{role.value}@test.com",
        role=role,
        hashed_password="irrelevant",
    )


def make_product_data(**overrides) -> ProductCreate:
    """Return a valid ProductCreate with sensible defaults."""
    defaults = dict(
        product_code="PROD-001",
        name="Paracetamol 500mg",
        description="Pain relief tablets",
        package_type="Box",
        unit="Tablet",
        units_per_pack=16,
        package_cost=Decimal("2.99"),
        min_stock_level=10,
        restock_percentage=Decimal("10.00"),
    )
    defaults.update(overrides)
    return ProductCreate(**defaults)


# Helper: create a product directly via the service


def create_product_in_db(session: Session, **overrides) -> Product:
    data = make_product_data(**overrides)
    return service.create_product(data, session)


# SERVICE-LAYER UNIT TESTS


class TestCreateProduct:
    def test_creates_product_successfully(self, session):
        data = make_product_data()
        product = service.create_product(data, session)

        assert product.id is not None
        assert product.product_code == "PROD-001"
        assert product.name == "Paracetamol 500mg"
        assert product.stock_quantity == 0  # default

    def test_product_appears_in_catalogue(self, session):
        service.create_product(make_product_data(), session)
        catalogue = service.list_catalogue(session)
        assert len(catalogue) == 1

    def test_multiple_products_all_listed(self, session):
        service.create_product(make_product_data(product_code="A"), session)
        service.create_product(make_product_data(product_code="B"), session)
        assert len(service.list_catalogue(session)) == 2


class TestGetProduct:
    def test_get_existing_product(self, session):
        created = create_product_in_db(session)
        fetched = service.get_product(created.id, session)
        assert fetched.id == created.id

    def test_get_nonexistent_product_raises_404(self, session):
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc:
            service.get_product(uuid4(), session)
        assert exc.value.status_code == 404


class TestUpdateProduct:
    def test_update_changes_fields(self, session):
        product = create_product_in_db(session)
        update_data = ProductUpdate(
            product_code="PROD-001",
            name="Ibuprofen 200mg",
            description="Anti-inflammatory",
            package_type="Blister",
            unit="Tablet",
            units_per_pack=24,
            package_cost=Decimal("3.49"),
        )
        updated = service.update_product(product.id, update_data, session)
        assert updated.name == "Ibuprofen 200mg"
        assert updated.package_cost == Decimal("3.49")

    def test_update_nonexistent_product_raises_404(self, session):
        from fastapi import HTTPException

        update_data = ProductUpdate(
            product_code="X",
            name="X",
            description="X",
            package_type="X",
            unit="X",
            units_per_pack=1,
            package_cost=Decimal("1.00"),
        )
        with pytest.raises(HTTPException) as exc:
            service.update_product(uuid4(), update_data, session)
        assert exc.value.status_code == 404


class TestDeleteProduct:
    def test_delete_removes_product(self, session):
        product = create_product_in_db(session)
        service.delete_product(product.id, session)
        assert service.list_catalogue(session) == []

    def test_delete_nonexistent_raises_404(self, session):
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc:
            service.delete_product(uuid4(), session)
        assert exc.value.status_code == 404


class TestSearchProducts:
    def test_search_by_name(self, session):
        create_product_in_db(session, name="Paracetamol 500mg", product_code="A")
        create_product_in_db(session, name="Ibuprofen 200mg", product_code="B")

        results = service.search_products("Paracetamol", session)
        assert len(results) == 1
        assert results[0].name == "Paracetamol 500mg"

    def test_search_by_product_code(self, session):
        create_product_in_db(session, product_code="PARA-001")
        create_product_in_db(session, product_code="IBUP-002")

        results = service.search_products("PARA", session)
        assert len(results) == 1
        assert results[0].product_code == "PARA-001"

    def test_search_case_insensitive(self, session):
        create_product_in_db(session, name="Paracetamol 500mg", product_code="A")
        results = service.search_products("paracetamol", session)
        assert len(results) == 1

    def test_search_no_match_returns_empty(self, session):
        create_product_in_db(session)
        results = service.search_products("XYZNOTFOUND", session)
        assert results == []


class TestAddStock:
    def test_add_stock_increases_quantity(self, session):
        product = create_product_in_db(session)
        assert product.stock_quantity == 0

        user_id = uuid4()
        updated = service.add_stock(product.id, 50, user_id, session)
        assert updated.stock_quantity == 50

    def test_add_stock_multiple_times_accumulates(self, session):
        product = create_product_in_db(session)
        user_id = uuid4()

        service.add_stock(product.id, 30, user_id, session)
        updated = service.add_stock(product.id, 20, user_id, session)
        assert updated.stock_quantity == 50

    def test_add_stock_nonexistent_product_raises_404(self, session):
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc:
            service.add_stock(uuid4(), 10, uuid4(), session)
        assert exc.value.status_code == 404


class TestLowStock:
    def test_low_stock_returns_products_below_minimum(self, session):
        # stock_quantity defaults to 0, min_stock_level = 10 → low stock
        create_product_in_db(session, product_code="A", min_stock_level=10)
        # This one has enough stock
        product_b = create_product_in_db(session, product_code="B", min_stock_level=5)
        service.add_stock(product_b.id, 10, uuid4(), session)

        low = service.get_low_stock_products(session)
        assert len(low) == 1
        assert low[0].product_code == "A"

    def test_no_low_stock_returns_empty(self, session):
        product = create_product_in_db(session, min_stock_level=5)
        service.add_stock(product.id, 10, uuid4(), session)

        assert service.get_low_stock_products(session) == []

    def test_product_at_exactly_minimum_is_not_flagged(self, session):
        product = create_product_in_db(session, min_stock_level=10)
        service.add_stock(product.id, 10, uuid4(), session)

        # stock == min_stock_level → NOT below → should not appear
        assert service.get_low_stock_products(session) == []


# API / INTEGRATION TESTS  (uses FastAPI TestClient)


@pytest.fixture(name="client")
def client_fixture(session):
    """TestClient wired to the in-memory database."""

    def override_session():
        yield session

    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def auth_override(role: UserRole):
    """Return a dependency override that injects a user with the given role."""
    user = make_user(role)

    def _override():
        return user

    return _override


class TestCatalogueAPI:
    def test_list_catalogue_is_public(self, client):
        """GET /catalogue should work without authentication."""
        response = client.get("/catalogue")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_search_is_public(self, client):
        response = client.get("/catalogue/search?query=para")
        assert response.status_code == 200

    def test_create_product_as_admin(self, client, session):
        app.dependency_overrides[get_current_user] = auth_override(UserRole.ADMIN)

        payload = {
            "product_code": "TEST-001",
            "name": "Test Product",
            "description": "A test",
            "package_type": "Box",
            "unit": "Tablet",
            "units_per_pack": 10,
            "package_cost": "1.99",
            "min_stock_level": 5,
            "restock_percentage": "10.00",
        }
        response = client.post("/catalogue", json=payload)
        assert response.status_code == 201
        assert response.json()["product_code"] == "TEST-001"

    def test_create_product_as_merchant_forbidden(self, client):
        app.dependency_overrides[get_current_user] = auth_override(UserRole.MERCHANT)

        payload = {
            "product_code": "TEST-002",
            "name": "Test Product",
            "description": "A test",
            "package_type": "Box",
            "unit": "Tablet",
            "units_per_pack": 10,
            "package_cost": "1.99",
        }
        response = client.post("/catalogue", json=payload)
        assert response.status_code == 403

    def test_get_product_by_id(self, client, session):
        product = create_product_in_db(session)
        response = client.get(f"/catalogue/{product.id}")
        assert response.status_code == 200
        assert response.json()["id"] == str(product.id)

    def test_get_nonexistent_product_returns_404(self, client):
        response = client.get(f"/catalogue/{uuid4()}")
        assert response.status_code == 404

    def test_update_product_as_admin(self, client, session):
        app.dependency_overrides[get_current_user] = auth_override(UserRole.ADMIN)
        product = create_product_in_db(session)

        payload = {
            "product_code": "PROD-001",
            "name": "Updated Name",
            "description": "Updated desc",
            "package_type": "Blister",
            "unit": "Capsule",
            "units_per_pack": 20,
            "package_cost": "4.99",
        }
        response = client.put(f"/catalogue/{product.id}", json=payload)
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"

    def test_delete_product_as_admin(self, client, session):
        app.dependency_overrides[get_current_user] = auth_override(UserRole.ADMIN)
        product = create_product_in_db(session)

        response = client.delete(f"/catalogue/{product.id}")
        assert response.status_code == 204

        # Confirm it's gone
        get_response = client.get(f"/catalogue/{product.id}")
        assert get_response.status_code == 404

    def test_delete_product_as_merchant_forbidden(self, client, session):
        app.dependency_overrides[get_current_user] = auth_override(UserRole.MERCHANT)
        product = create_product_in_db(session)

        response = client.delete(f"/catalogue/{product.id}")
        assert response.status_code == 403

    def test_add_stock_as_admin(self, client, session):
        app.dependency_overrides[get_current_user] = auth_override(UserRole.ADMIN)
        product = create_product_in_db(session)

        response = client.post(f"/catalogue/{product.id}/stock", json={"quantity": 100})
        assert response.status_code == 201
        assert response.json()["stock_quantity"] == 100

    def test_add_stock_as_manager(self, client, session):
        app.dependency_overrides[get_current_user] = auth_override(UserRole.MANAGER)
        product = create_product_in_db(session)

        response = client.post(f"/catalogue/{product.id}/stock", json={"quantity": 50})
        assert response.status_code == 201

    def test_add_stock_as_merchant_forbidden(self, client, session):
        app.dependency_overrides[get_current_user] = auth_override(UserRole.MERCHANT)
        product = create_product_in_db(session)

        response = client.post(f"/catalogue/{product.id}/stock", json={"quantity": 10})
        assert response.status_code == 403

    def test_add_stock_zero_quantity_rejected(self, client, session):
        app.dependency_overrides[get_current_user] = auth_override(UserRole.ADMIN)
        product = create_product_in_db(session)

        response = client.post(f"/catalogue/{product.id}/stock", json={"quantity": 0})
        assert response.status_code == 422  # Pydantic validation error

    def test_low_stock_as_admin(self, client, session):
        app.dependency_overrides[get_current_user] = auth_override(UserRole.ADMIN)
        create_product_in_db(session, min_stock_level=10)  # stock=0, below minimum

        response = client.get("/catalogue/low-stock")
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_low_stock_as_merchant_forbidden(self, client):
        app.dependency_overrides[get_current_user] = auth_override(UserRole.MERCHANT)
        response = client.get("/catalogue/low-stock")
        assert response.status_code == 403
