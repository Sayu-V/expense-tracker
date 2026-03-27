"""
tests/test_expenses.py
----------------------
pytest test suite using an in-memory SQLite database for speed.
Covers all CRUD endpoints and edge cases.

Run with:  pytest tests/ -v
"""

import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import get_session
from app.models import Category


# ---------------------------------------------------------------------------
# Test DB setup — SQLite in-memory, no Docker needed
# ---------------------------------------------------------------------------

@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        # Seed a test category
        cat = Category(name="Food", color="#f97316", is_default=True)
        cat2 = Category(name="Transport", color="#3b82f6", is_default=True)
        session.add(cat)
        session.add(cat2)
        session.commit()
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Category tests
# ---------------------------------------------------------------------------

def test_list_categories(client: TestClient):
    response = client.get("/api/v1/categories")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    names = [c["name"] for c in data]
    assert "Food" in names
    assert "Transport" in names


def test_create_custom_category(client: TestClient):
    response = client.post("/api/v1/categories", json={"name": "Gaming", "color": "#a855f7"})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Gaming"
    assert data["is_default"] is False


def test_create_duplicate_category_fails(client: TestClient):
    response = client.post("/api/v1/categories", json={"name": "Food", "color": "#000000"})
    assert response.status_code == 409


# ---------------------------------------------------------------------------
# Expense CRUD tests
# ---------------------------------------------------------------------------

def test_create_expense(client: TestClient):
    response = client.post("/api/v1/expenses", json={
        "amount": 150.50,
        "category_id": 1,
        "description": "Grocery run",
        "date": str(date.today()),
    })
    assert response.status_code == 201
    data = response.json()
    assert data["amount"] == 150.50
    assert data["description"] == "Grocery run"
    assert data["id"] is not None


def test_create_expense_invalid_amount(client: TestClient):
    response = client.post("/api/v1/expenses", json={
        "amount": -50,
        "category_id": 1,
        "description": "Bad expense",
        "date": str(date.today()),
    })
    assert response.status_code == 422


def test_create_expense_missing_description(client: TestClient):
    response = client.post("/api/v1/expenses", json={
        "amount": 100,
        "category_id": 1,
        "date": str(date.today()),
    })
    assert response.status_code == 422


def test_get_expense_by_id(client: TestClient):
    # Create first
    create_resp = client.post("/api/v1/expenses", json={
        "amount": 200,
        "category_id": 1,
        "description": "Dinner out",
        "date": str(date.today()),
    })
    expense_id = create_resp.json()["id"]

    response = client.get(f"/api/v1/expenses/{expense_id}")
    assert response.status_code == 200
    assert response.json()["id"] == expense_id


def test_get_expense_not_found(client: TestClient):
    response = client.get("/api/v1/expenses/99999")
    assert response.status_code == 404


def test_update_expense(client: TestClient):
    create_resp = client.post("/api/v1/expenses", json={
        "amount": 80,
        "category_id": 1,
        "description": "Coffee",
        "date": str(date.today()),
    })
    expense_id = create_resp.json()["id"]

    update_resp = client.put(f"/api/v1/expenses/{expense_id}", json={"amount": 95.00})
    assert update_resp.status_code == 200
    assert update_resp.json()["amount"] == 95.00
    assert update_resp.json()["description"] == "Coffee"  # unchanged


def test_delete_expense(client: TestClient):
    create_resp = client.post("/api/v1/expenses", json={
        "amount": 50,
        "category_id": 1,
        "description": "Snacks",
        "date": str(date.today()),
    })
    expense_id = create_resp.json()["id"]

    delete_resp = client.delete(f"/api/v1/expenses/{expense_id}")
    assert delete_resp.status_code == 204

    get_resp = client.get(f"/api/v1/expenses/{expense_id}")
    assert get_resp.status_code == 404


def test_list_expenses_filter_by_category(client: TestClient):
    client.post("/api/v1/expenses", json={
        "amount": 300, "category_id": 1,
        "description": "Food item", "date": str(date.today()),
    })
    client.post("/api/v1/expenses", json={
        "amount": 120, "category_id": 2,
        "description": "Bus pass", "date": str(date.today()),
    })

    response = client.get("/api/v1/expenses?category_id=1")
    assert response.status_code == 200
    data = response.json()
    assert all(e["category_id"] == 1 for e in data)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

def test_health_check(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
