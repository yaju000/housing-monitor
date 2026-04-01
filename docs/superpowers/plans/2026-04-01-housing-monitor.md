# 房價監測系統 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack housing price monitoring system for individual home buyers in Taiwan, with automated government data collection, multi-project comparison, Leaflet map with POI, and email price-change alerts.

**Architecture:** React frontend (Vite + Tailwind) calls a FastAPI backend via REST. PostgreSQL stores all data. Celery + Redis runs scheduled crawls of the 內政部 實價登錄 open-data CSV and triggers Resend email alerts when price changes exceed user thresholds. User watchlists live in browser localStorage; email alert subscriptions are stored in the backend.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2 (async), asyncpg, Alembic, Celery, Redis, httpx, Resend SDK, pytest, pytest-asyncio; React 18, Vite, Tailwind CSS, react-router-dom v6, react-leaflet 4, Recharts, axios; Docker Compose

---

## File Map

```
/home/zoewang/projects/housing-monitor/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI app, CORS, router mounting
│   │   ├── config.py             # pydantic-settings: DB_URL, REDIS_URL, RESEND_API_KEY
│   │   ├── database.py           # async engine, session factory, Base, get_db
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── project.py        # Project ORM model
│   │   │   ├── listing.py        # Listing ORM model
│   │   │   ├── transaction.py    # Transaction ORM model
│   │   │   └── alert.py          # AlertSubscription + AlertLog ORM models
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── project.py        # ProjectCreate, ProjectRead, ProjectSearch
│   │   │   ├── listing.py        # ListingCreate, ListingRead
│   │   │   ├── transaction.py    # TransactionRead
│   │   │   └── alert.py          # AlertSubscriptionCreate, AlertSubscriptionRead
│   │   ├── routers/
│   │   │   ├── projects.py       # GET /api/projects, GET/POST /api/projects/:id
│   │   │   ├── listings.py       # GET/POST /api/projects/:id/listings
│   │   │   ├── transactions.py   # GET /api/projects/:id/transactions
│   │   │   └── alerts.py         # POST /api/alerts, DELETE /api/alerts/:token
│   │   └── services/
│   │       ├── crawler.py        # Download + parse 內政部 實價登錄 CSV
│   │       ├── detection.py      # Compare new vs old avg price, return changed projects
│   │       └── email.py          # Send alert email via Resend
│   ├── tasks/
│   │   ├── celery_app.py         # Celery instance + beat schedule
│   │   └── scheduled.py          # crawl_and_notify task
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/             # migration files
│   ├── tests/
│   │   ├── conftest.py           # async test DB + ASGI client fixtures
│   │   ├── test_projects.py
│   │   ├── test_listings.py
│   │   ├── test_transactions.py
│   │   ├── test_alerts.py
│   │   ├── test_crawler.py
│   │   └── test_detection.py
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx              # React root, BrowserRouter
│       ├── App.jsx               # Route definitions
│       ├── api/
│       │   └── client.js         # axios instance, all API calls
│       ├── hooks/
│       │   ├── useWatchlist.js   # localStorage CRUD for watchlist
│       │   └── useCompare.js     # localStorage list of up to 4 project IDs
│       ├── components/
│       │   ├── SearchBar.jsx     # keyword + district + type inputs
│       │   ├── ProjectCard.jsx   # card with watch/compare buttons
│       │   ├── ProjectMap.jsx    # react-leaflet map + POI markers
│       │   ├── PriceTrendChart.jsx # Recharts LineChart
│       │   └── CompareTable.jsx  # side-by-side table + multi-line chart
│       └── pages/
│           ├── Home.jsx
│           ├── Search.jsx
│           ├── ProjectDetail.jsx
│           ├── Compare.jsx
│           └── Watchlist.jsx
├── docker-compose.yml
├── nginx.conf
└── .env.example
```

---

## Task 1: Backend project scaffold

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Create: `backend/app/main.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Create directory structure**

```bash
cd /home/zoewang/projects/housing-monitor
mkdir -p backend/app/{models,schemas,routers,services}
mkdir -p backend/{tasks,tests,alembic/versions}
touch backend/app/__init__.py backend/app/models/__init__.py
touch backend/app/schemas/__init__.py backend/app/routers/__init__.py
touch backend/app/services/__init__.py backend/tasks/__init__.py
touch backend/tests/__init__.py
```

- [ ] **Step 2: Create `backend/requirements.txt`**

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy[asyncio]==2.0.29
asyncpg==0.29.0
alembic==1.13.2
pydantic==2.7.1
pydantic-settings==2.2.1
celery==5.3.6
redis==5.0.4
httpx==0.27.0
beautifulsoup4==4.12.3
resend==0.7.2
pytest==8.2.0
pytest-asyncio==0.23.7
anyio==4.3.0
```

- [ ] **Step 3: Create `backend/.env.example`**

```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/housing
REDIS_URL=redis://redis:6379/0
RESEND_API_KEY=re_your_key_here
BASE_URL=http://localhost:5173
```

- [ ] **Step 4: Create `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379/0"
    RESEND_API_KEY: str = ""
    BASE_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"

settings = Settings()
```

- [ ] **Step 5: Create `backend/app/database.py`**

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session
```

- [ ] **Step 6: Create `backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import projects, listings, transactions, alerts

app = FastAPI(title="房價監測系統 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:80"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api")
app.include_router(listings.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
```

- [ ] **Step 7: Create `backend/tests/conftest.py`**

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.main import app
from app.database import Base, get_db

TEST_DB_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/housing_test"

@pytest_asyncio.fixture(scope="function")
async def db():
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest_asyncio.fixture(scope="function")
async def client(db):
    async def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c
    app.dependency_overrides.clear()
```

- [ ] **Step 8: Create `backend/pytest.ini`**

```ini
[pytest]
asyncio_mode = auto
```

- [ ] **Step 9: Set up Python venv and install deps**

```bash
cd /home/zoewang/projects/housing-monitor/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install pydantic-settings  # ensure installed
```

- [ ] **Step 10: Commit**

```bash
cd /home/zoewang/projects/housing-monitor
git init
git add backend/
git commit -m "feat: backend project scaffold"
```

---

## Task 2: SQLAlchemy models + Alembic migrations

**Files:**
- Create: `backend/app/models/project.py`
- Create: `backend/app/models/listing.py`
- Create: `backend/app/models/transaction.py`
- Create: `backend/app/models/alert.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic.ini`

- [ ] **Step 1: Create `backend/app/models/project.py`**

```python
from datetime import datetime
from sqlalchemy import String, Text, Numeric, Integer, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    developer: Mapped[str | None] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(Text)
    district: Mapped[str | None] = mapped_column(String(50), index=True)
    city: Mapped[str | None] = mapped_column(String(50), index=True)
    lat: Mapped[float | None] = mapped_column(Numeric(9, 6))
    lng: Mapped[float | None] = mapped_column(Numeric(9, 6))
    total_floors: Mapped[int | None] = mapped_column(Integer)
    total_units: Mapped[int | None] = mapped_column(Integer)
    building_type: Mapped[str | None] = mapped_column(String(20))  # 大樓/透天/公寓
    status: Mapped[str | None] = mapped_column(String(20))          # 預售/新成屋/中古屋
    source_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    listings: Mapped[list["Listing"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    subscriptions: Mapped[list["AlertSubscription"]] = relationship(back_populates="project", cascade="all, delete-orphan")
```

- [ ] **Step 2: Create `backend/app/models/listing.py`**

```python
from sqlalchemy import Integer, String, Numeric, Boolean, ForeignKey, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base

class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    floor: Mapped[int | None] = mapped_column(Integer)
    unit_type: Mapped[str | None] = mapped_column(String(50))     # e.g. "3房2廳"
    size_ping: Mapped[float | None] = mapped_column(Numeric(8, 2))
    interior_ping: Mapped[float | None] = mapped_column(Numeric(8, 2))
    parking_included: Mapped[bool | None] = mapped_column(Boolean)
    asking_price: Mapped[int | None] = mapped_column(Integer)      # 元
    last_seen_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))

    project: Mapped["Project"] = relationship(back_populates="listings")
```

- [ ] **Step 3: Create `backend/app/models/transaction.py`**

```python
from datetime import date, datetime
from sqlalchemy import Integer, String, Numeric, Date, TIMESTAMP, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    transaction_date: Mapped[date | None] = mapped_column(Date, index=True)
    size_ping: Mapped[float | None] = mapped_column(Numeric(8, 2))
    total_price: Mapped[int | None] = mapped_column(Integer)        # 元
    unit_price_per_ping: Mapped[int | None] = mapped_column(Integer) # 元/坪
    floor: Mapped[int | None] = mapped_column(Integer)
    building_type: Mapped[str | None] = mapped_column(String(20))
    source: Mapped[str] = mapped_column(String(20), default="government")  # government / manual
    raw_data: Mapped[dict | None] = mapped_column(JSONB)

    project: Mapped["Project"] = relationship(back_populates="transactions")
```

- [ ] **Step 4: Create `backend/app/models/alert.py`**

```python
from datetime import datetime
from sqlalchemy import Integer, String, Numeric, TIMESTAMP, ForeignKey, func, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
from app.database import Base

class AlertSubscription(Base):
    __tablename__ = "alert_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(200), nullable=False)
    threshold_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=3.0)
    unsubscribe_token: Mapped[str] = mapped_column(
        String(36), default=lambda: str(uuid.uuid4()), unique=True
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )

    project: Mapped["Project"] = relationship(back_populates="subscriptions")
    logs: Mapped[list["AlertLog"]] = relationship(back_populates="subscription", cascade="all, delete-orphan")


class AlertLog(Base):
    __tablename__ = "alert_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    subscription_id: Mapped[int] = mapped_column(ForeignKey("alert_subscriptions.id"), nullable=False)
    alert_type: Mapped[str] = mapped_column(String(30))  # price_drop / new_transaction
    triggered_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    sent_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    old_value: Mapped[float | None] = mapped_column(Numeric(12, 2))
    new_value: Mapped[float | None] = mapped_column(Numeric(12, 2))

    subscription: Mapped["AlertSubscription"] = relationship(back_populates="logs")
```

- [ ] **Step 5: Update `backend/app/models/__init__.py`**

```python
from app.models.project import Project
from app.models.listing import Listing
from app.models.transaction import Transaction
from app.models.alert import AlertSubscription, AlertLog
```

- [ ] **Step 6: Init Alembic**

```bash
cd /home/zoewang/projects/housing-monitor/backend
source .venv/bin/activate
alembic init alembic
```

- [ ] **Step 7: Edit `backend/alembic/env.py`** — replace the `target_metadata` section:

```python
# at top of env.py, after existing imports:
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import Base
from app.models import Project, Listing, Transaction, AlertSubscription, AlertLog  # noqa: F401
from app.config import settings

# replace the config.set_main_option line:
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("+asyncpg", ""))

# set target_metadata:
target_metadata = Base.metadata
```

- [ ] **Step 8: Create initial migration**

```bash
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

Expected: tables `projects`, `listings`, `transactions`, `alert_subscriptions`, `alert_logs` created.

- [ ] **Step 9: Commit**

```bash
cd /home/zoewang/projects/housing-monitor
git add backend/
git commit -m "feat: SQLAlchemy models and initial Alembic migration"
```

---

## Task 3: Projects router + schemas + tests

**Files:**
- Create: `backend/app/schemas/project.py`
- Create: `backend/app/routers/projects.py`
- Create: `backend/tests/test_projects.py`

- [ ] **Step 1: Write failing tests in `backend/tests/test_projects.py`**

```python
import pytest

@pytest.mark.asyncio
async def test_create_project(client):
    resp = await client.post("/api/projects", json={
        "name": "信義新案",
        "city": "台北市",
        "district": "信義區",
        "building_type": "大樓",
        "status": "新成屋",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "信義新案"
    assert data["id"] is not None

@pytest.mark.asyncio
async def test_search_projects(client):
    await client.post("/api/projects", json={"name": "大安好宅", "city": "台北市", "district": "大安區"})
    await client.post("/api/projects", json={"name": "信義豪宅", "city": "台北市", "district": "信義區"})

    resp = await client.get("/api/projects?q=大安")
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) == 1
    assert results[0]["name"] == "大安好宅"

@pytest.mark.asyncio
async def test_search_projects_by_district(client):
    await client.post("/api/projects", json={"name": "A案", "city": "台北市", "district": "信義區"})
    await client.post("/api/projects", json={"name": "B案", "city": "台北市", "district": "大安區"})

    resp = await client.get("/api/projects?district=信義區")
    assert resp.status_code == 200
    results = resp.json()
    assert all(p["district"] == "信義區" for p in results)

@pytest.mark.asyncio
async def test_get_project_by_id(client):
    created = (await client.post("/api/projects", json={"name": "測試案"})).json()
    resp = await client.get(f"/api/projects/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "測試案"

@pytest.mark.asyncio
async def test_get_project_not_found(client):
    resp = await client.get("/api/projects/99999")
    assert resp.status_code == 404
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /home/zoewang/projects/housing-monitor/backend
source .venv/bin/activate
pytest tests/test_projects.py -v
```

Expected: ImportError or 404/422 errors — tests fail.

- [ ] **Step 3: Create `backend/app/schemas/project.py`**

```python
from pydantic import BaseModel
from datetime import datetime

class ProjectCreate(BaseModel):
    name: str
    developer: str | None = None
    address: str | None = None
    district: str | None = None
    city: str | None = None
    lat: float | None = None
    lng: float | None = None
    total_floors: int | None = None
    total_units: int | None = None
    building_type: str | None = None
    status: str | None = None
    source_url: str | None = None

class ProjectRead(BaseModel):
    id: int
    name: str
    developer: str | None
    address: str | None
    district: str | None
    city: str | None
    lat: float | None
    lng: float | None
    total_floors: int | None
    total_units: int | None
    building_type: str | None
    status: str | None
    source_url: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Create `backend/app/routers/projects.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.database import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectRead

router = APIRouter()

@router.post("/projects", response_model=ProjectRead, status_code=201)
async def create_project(payload: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = Project(**payload.model_dump())
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project

@router.get("/projects", response_model=list[ProjectRead])
async def search_projects(
    q: str | None = Query(None),
    district: str | None = Query(None),
    city: str | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Project)
    if q:
        stmt = stmt.where(
            or_(Project.name.ilike(f"%{q}%"), Project.address.ilike(f"%{q}%"))
        )
    if district:
        stmt = stmt.where(Project.district == district)
    if city:
        stmt = stmt.where(Project.city == city)
    if status:
        stmt = stmt.where(Project.status == status)
    result = await db.execute(stmt.order_by(Project.updated_at.desc()).limit(100))
    return result.scalars().all()

@router.get("/projects/{project_id}", response_model=ProjectRead)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
pytest tests/test_projects.py -v
```

Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat: projects router with search and CRUD"
```

---

## Task 4: Transactions router + tests

**Files:**
- Create: `backend/app/schemas/transaction.py`
- Create: `backend/app/routers/transactions.py`
- Create: `backend/tests/test_transactions.py`

- [ ] **Step 1: Write failing tests in `backend/tests/test_transactions.py`**

```python
import pytest
from datetime import date

async def make_project(client, name="測試案"):
    r = await client.post("/api/projects", json={"name": name})
    return r.json()["id"]

@pytest.mark.asyncio
async def test_list_transactions_empty(client):
    pid = await make_project(client)
    resp = await client.get(f"/api/projects/{pid}/transactions")
    assert resp.status_code == 200
    assert resp.json() == []

@pytest.mark.asyncio
async def test_transactions_for_nonexistent_project(client):
    resp = await client.get("/api/projects/99999/transactions")
    assert resp.status_code == 404
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_transactions.py -v
```

Expected: FAIL (router not mounted).

- [ ] **Step 3: Create `backend/app/schemas/transaction.py`**

```python
from pydantic import BaseModel
from datetime import date

class TransactionRead(BaseModel):
    id: int
    project_id: int
    transaction_date: date | None
    size_ping: float | None
    total_price: int | None
    unit_price_per_ping: int | None
    floor: int | None
    building_type: str | None
    source: str

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Create `backend/app/routers/transactions.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.transaction import Transaction
from app.models.project import Project
from app.schemas.transaction import TransactionRead

router = APIRouter()

@router.get("/projects/{project_id}/transactions", response_model=list[TransactionRead])
async def list_transactions(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    stmt = select(Transaction).where(
        Transaction.project_id == project_id
    ).order_by(Transaction.transaction_date.desc())
    result = await db.execute(stmt)
    return result.scalars().all()
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
pytest tests/test_transactions.py -v
```

Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat: transactions router"
```

---

## Task 5: Listings router + tests

**Files:**
- Create: `backend/app/schemas/listing.py`
- Create: `backend/app/routers/listings.py`
- Create: `backend/tests/test_listings.py`

- [ ] **Step 1: Write failing tests in `backend/tests/test_listings.py`**

```python
import pytest

async def make_project(client, name="測試案"):
    r = await client.post("/api/projects", json={"name": name})
    return r.json()["id"]

@pytest.mark.asyncio
async def test_create_listing(client):
    pid = await make_project(client)
    resp = await client.post(f"/api/projects/{pid}/listings", json={
        "floor": 5,
        "unit_type": "3房2廳",
        "size_ping": 35.5,
        "asking_price": 25000000,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["unit_type"] == "3房2廳"
    assert data["project_id"] == pid

@pytest.mark.asyncio
async def test_list_listings(client):
    pid = await make_project(client)
    await client.post(f"/api/projects/{pid}/listings", json={"floor": 3, "size_ping": 28.0})
    await client.post(f"/api/projects/{pid}/listings", json={"floor": 7, "size_ping": 40.0})
    resp = await client.get(f"/api/projects/{pid}/listings")
    assert resp.status_code == 200
    assert len(resp.json()) == 2
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_listings.py -v
```

- [ ] **Step 3: Create `backend/app/schemas/listing.py`**

```python
from pydantic import BaseModel
from datetime import datetime

class ListingCreate(BaseModel):
    floor: int | None = None
    unit_type: str | None = None
    size_ping: float | None = None
    interior_ping: float | None = None
    parking_included: bool | None = None
    asking_price: int | None = None

class ListingRead(BaseModel):
    id: int
    project_id: int
    floor: int | None
    unit_type: str | None
    size_ping: float | None
    interior_ping: float | None
    parking_included: bool | None
    asking_price: int | None

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Create `backend/app/routers/listings.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.listing import Listing
from app.models.project import Project
from app.schemas.listing import ListingCreate, ListingRead

router = APIRouter()

@router.post("/projects/{project_id}/listings", response_model=ListingRead, status_code=201)
async def create_listing(
    project_id: int, payload: ListingCreate, db: AsyncSession = Depends(get_db)
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    listing = Listing(project_id=project_id, **payload.model_dump())
    db.add(listing)
    await db.commit()
    await db.refresh(listing)
    return listing

@router.get("/projects/{project_id}/listings", response_model=list[ListingRead])
async def list_listings(project_id: int, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    stmt = select(Listing).where(Listing.project_id == project_id)
    result = await db.execute(stmt)
    return result.scalars().all()
```

- [ ] **Step 5: Run tests — confirm pass**

```bash
pytest tests/test_listings.py -v
```

Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat: listings router"
```

---

## Task 6: Alert subscriptions router + tests

**Files:**
- Create: `backend/app/schemas/alert.py`
- Create: `backend/app/routers/alerts.py`
- Create: `backend/tests/test_alerts.py`

- [ ] **Step 1: Write failing tests in `backend/tests/test_alerts.py`**

```python
import pytest

async def make_project(client, name="測試案"):
    r = await client.post("/api/projects", json={"name": name})
    return r.json()["id"]

@pytest.mark.asyncio
async def test_create_alert_subscription(client):
    pid = await make_project(client)
    resp = await client.post("/api/alerts", json={
        "project_id": pid,
        "email": "buyer@example.com",
        "threshold_percent": 5.0,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "buyer@example.com"
    assert "unsubscribe_token" in data

@pytest.mark.asyncio
async def test_unsubscribe(client):
    pid = await make_project(client)
    sub = (await client.post("/api/alerts", json={
        "project_id": pid,
        "email": "buyer@example.com",
        "threshold_percent": 3.0,
    })).json()
    token = sub["unsubscribe_token"]
    resp = await client.delete(f"/api/alerts/{token}")
    assert resp.status_code == 200

@pytest.mark.asyncio
async def test_unsubscribe_invalid_token(client):
    resp = await client.delete("/api/alerts/nonexistent-token")
    assert resp.status_code == 404
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_alerts.py -v
```

- [ ] **Step 3: Create `backend/app/schemas/alert.py`**

```python
from pydantic import BaseModel, EmailStr
from datetime import datetime

class AlertSubscriptionCreate(BaseModel):
    project_id: int
    email: str
    threshold_percent: float = 3.0

class AlertSubscriptionRead(BaseModel):
    id: int
    project_id: int
    email: str
    threshold_percent: float
    unsubscribe_token: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Create `backend/app/routers/alerts.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.alert import AlertSubscription
from app.models.project import Project
from app.schemas.alert import AlertSubscriptionCreate, AlertSubscriptionRead

router = APIRouter()

@router.post("/alerts", response_model=AlertSubscriptionRead, status_code=201)
async def create_subscription(
    payload: AlertSubscriptionCreate, db: AsyncSession = Depends(get_db)
):
    project = await db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    sub = AlertSubscription(**payload.model_dump())
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return sub

@router.delete("/alerts/{token}")
async def unsubscribe(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AlertSubscription).where(AlertSubscription.unsubscribe_token == token)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    await db.delete(sub)
    await db.commit()
    return {"message": "Unsubscribed successfully"}
```

- [ ] **Step 5: Run tests — confirm pass**

```bash
pytest tests/test_alerts.py -v
```

Expected: 3 passed.

- [ ] **Step 6: Run full test suite**

```bash
pytest tests/ -v
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat: alert subscriptions router"
```

---

## Task 7: Government 實價登錄 crawler service

**Files:**
- Create: `backend/app/services/crawler.py`
- Create: `backend/tests/test_crawler.py`

The 內政部不動產成交案件實際資訊 open data provides quarterly ZIP files containing CSVs. URL pattern:
`https://plvr.land.moi.gov.tw/DownloadOpenData?type=zip&fileName={CITY_CODE}_lvr_land_A.zip`

City codes: A=台北市, F=新北市, B=台中市, D=台南市, E=高雄市

- [ ] **Step 1: Write failing test in `backend/tests/test_crawler.py`**

```python
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.crawler import parse_lvr_csv_row, normalize_city_code

def test_normalize_city_code():
    assert normalize_city_code("台北市") == "A"
    assert normalize_city_code("新北市") == "F"
    assert normalize_city_code("台中市") == "B"
    assert normalize_city_code("台南市") == "D"
    assert normalize_city_code("高雄市") == "E"

def test_parse_lvr_csv_row_valid():
    row = {
        "鄉鎮市區": "大安區",
        "交易年月日": "1130101",  # 民國113年1月1日
        "建物移轉總面積㎡": "100.00",
        "總價元": "20000000",
        "單價元平方公尺": "200000",
        "總樓層數": "12",
        "移轉層次": "5",
        "建物型態": "住宅大樓(11層含以上有電梯)",
    }
    result = parse_lvr_csv_row(row, project_id=1, city="台北市")
    assert result["total_price"] == 20000000
    # 1 坪 = 3.305785 m²; 100m² ≈ 30.25 坪
    assert result["size_ping"] == pytest.approx(30.25, abs=0.1)
    # unit price per ping: total / size_ping
    assert result["unit_price_per_ping"] > 0

def test_parse_lvr_csv_row_missing_fields():
    row = {"鄉鎮市區": "大安區"}
    result = parse_lvr_csv_row(row, project_id=1, city="台北市")
    assert result["total_price"] is None
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_crawler.py -v
```

- [ ] **Step 3: Create `backend/app/services/crawler.py`**

```python
import io
import zipfile
import csv
from datetime import date
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.transaction import Transaction
from app.models.project import Project

CITY_CODES: dict[str, str] = {
    "台北市": "A",
    "新北市": "F",
    "台中市": "B",
    "台南市": "D",
    "高雄市": "E",
    "基隆市": "C",
    "桃園市": "H",
}

LVR_BASE_URL = "https://plvr.land.moi.gov.tw/DownloadOpenData"

def normalize_city_code(city: str) -> str:
    return CITY_CODES.get(city, "A")

def _roc_date_to_iso(roc_str: str) -> date | None:
    """Convert ROC date string like '1130101' to Python date."""
    try:
        roc_str = roc_str.strip()
        if len(roc_str) != 7:
            return None
        year = int(roc_str[:3]) + 1911
        month = int(roc_str[3:5])
        day = int(roc_str[5:7])
        return date(year, month, day)
    except (ValueError, IndexError):
        return None

def _m2_to_ping(m2_str: str) -> float | None:
    try:
        return round(float(m2_str) / 3.305785, 2)
    except (ValueError, TypeError):
        return None

def parse_lvr_csv_row(row: dict, project_id: int, city: str) -> dict:
    size_ping = _m2_to_ping(row.get("建物移轉總面積㎡", ""))
    try:
        total_price = int(row.get("總價元", "").replace(",", "")) or None
    except (ValueError, AttributeError):
        total_price = None

    unit_price_per_ping = None
    if total_price and size_ping and size_ping > 0:
        unit_price_per_ping = round(total_price / size_ping)

    try:
        floor = int(row.get("移轉層次", "").replace("層", "").strip() or "0") or None
    except ValueError:
        floor = None

    return {
        "project_id": project_id,
        "transaction_date": _roc_date_to_iso(row.get("交易年月日", "")),
        "size_ping": size_ping,
        "total_price": total_price,
        "unit_price_per_ping": unit_price_per_ping,
        "floor": floor,
        "building_type": row.get("建物型態"),
        "source": "government",
        "raw_data": dict(row),
    }

async def fetch_and_store_lvr_data(city: str, db: AsyncSession) -> int:
    """Download 實價登錄 ZIP for a city, parse CSVs, upsert Transactions.
    Returns number of rows processed."""
    code = normalize_city_code(city)
    url = f"{LVR_BASE_URL}?type=zip&fileName={code}_lvr_land_A.zip"

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(url, follow_redirects=True)
        resp.raise_for_status()

    count = 0
    with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
        for name in zf.namelist():
            if not name.lower().endswith(".csv"):
                continue
            with zf.open(name) as f:
                text = f.read().decode("utf-8-sig", errors="replace")
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                address = row.get("土地區段位置建物門牌", "")
                if not address:
                    continue
                # Find matching project by address substring
                stmt = select(Project).where(
                    Project.city == city,
                    Project.address.ilike(f"%{address[:10]}%")
                ).limit(1)
                result = await db.execute(stmt)
                project = result.scalar_one_or_none()
                if not project:
                    continue
                data = parse_lvr_csv_row(row, project.id, city)
                transaction = Transaction(**data)
                db.add(transaction)
                count += 1
        await db.commit()
    return count
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
pytest tests/test_crawler.py -v
```

Expected: 3 passed (unit tests only; integration test skipped — requires live network).

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat: 實價登錄 crawler service"
```

---

## Task 8: Price change detection service

**Files:**
- Create: `backend/app/services/detection.py`
- Create: `backend/tests/test_detection.py`

- [ ] **Step 1: Write failing tests in `backend/tests/test_detection.py`**

```python
import pytest
from app.services.detection import compute_avg_price, has_price_changed

def test_compute_avg_price_empty():
    assert compute_avg_price([]) is None

def test_compute_avg_price():
    prices = [600000, 650000, 700000]
    assert compute_avg_price(prices) == pytest.approx(650000.0)

def test_has_price_changed_below_threshold():
    assert has_price_changed(old=600000, new=615000, threshold_pct=3.0) is False

def test_has_price_changed_above_threshold():
    assert has_price_changed(old=600000, new=640000, threshold_pct=3.0) is True

def test_has_price_changed_drop():
    assert has_price_changed(old=700000, new=650000, threshold_pct=5.0) is True

def test_has_price_changed_none_old():
    # No previous price → always notify (first data point)
    assert has_price_changed(old=None, new=600000, threshold_pct=3.0) is True

def test_has_price_changed_none_new():
    assert has_price_changed(old=600000, new=None, threshold_pct=3.0) is False
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_detection.py -v
```

- [ ] **Step 3: Create `backend/app/services/detection.py`**

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date, timedelta
from app.models.transaction import Transaction
from app.models.alert import AlertSubscription

def compute_avg_price(prices: list[float]) -> float | None:
    if not prices:
        return None
    return sum(prices) / len(prices)

def has_price_changed(old: float | None, new: float | None, threshold_pct: float) -> bool:
    if new is None:
        return False
    if old is None:
        return True  # first data point, notify
    change_pct = abs(new - old) / old * 100
    return change_pct >= threshold_pct

async def get_recent_avg_price(project_id: int, db: AsyncSession, days: int = 90) -> float | None:
    """Compute average unit_price_per_ping from last `days` days of transactions."""
    since = date.today() - timedelta(days=days)
    stmt = select(func.avg(Transaction.unit_price_per_ping)).where(
        Transaction.project_id == project_id,
        Transaction.unit_price_per_ping.isnot(None),
        Transaction.transaction_date >= since,
    )
    result = await db.execute(stmt)
    avg = result.scalar_one_or_none()
    return float(avg) if avg is not None else None

async def find_changed_subscriptions(
    project_id: int,
    new_avg: float | None,
    previous_avg: float | None,
    db: AsyncSession,
) -> list[tuple[AlertSubscription, float | None, float | None]]:
    """Return subscriptions that should be notified given price change."""
    stmt = select(AlertSubscription).where(AlertSubscription.project_id == project_id)
    result = await db.execute(stmt)
    subscriptions = result.scalars().all()
    to_notify = []
    for sub in subscriptions:
        if has_price_changed(previous_avg, new_avg, sub.threshold_percent):
            to_notify.append((sub, previous_avg, new_avg))
    return to_notify
```

- [ ] **Step 4: Run tests — confirm pass**

```bash
pytest tests/test_detection.py -v
```

Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat: price change detection service"
```

---

## Task 9: Email notification service

**Files:**
- Create: `backend/app/services/email.py`

- [ ] **Step 1: Create `backend/app/services/email.py`**

```python
import resend
from app.config import settings
from app.models.alert import AlertSubscription, AlertLog
from app.models.project import Project
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

resend.api_key = settings.RESEND_API_KEY

def _format_price(value: float | None) -> str:
    if value is None:
        return "—"
    wan = value / 10000
    return f"{wan:,.0f} 萬/坪"

def _price_direction(old: float | None, new: float | None) -> str:
    if old is None or new is None:
        return ""
    return "↑" if new > old else "↓"

async def send_price_alert(
    subscription: AlertSubscription,
    project: Project,
    old_avg: float | None,
    new_avg: float | None,
    db: AsyncSession,
) -> None:
    direction = _price_direction(old_avg, new_avg)
    change_pct = ""
    if old_avg and new_avg:
        pct = abs(new_avg - old_avg) / old_avg * 100
        change_pct = f"（{direction}{pct:.1f}%）"

    unsubscribe_url = f"{settings.BASE_URL}/unsubscribe/{subscription.unsubscribe_token}"
    project_url = f"{settings.BASE_URL}/project/{project.id}"

    html = f"""
    <h2>【房價追蹤】{project.city or ""}{project.district or ""} {project.name} 有新成交資料</h2>
    <ul>
      <li>最新成交均價：{_format_price(new_avg)} {change_pct}</li>
      <li>前次均價：{_format_price(old_avg)}</li>
    </ul>
    <p><a href="{project_url}">查看建案詳情</a></p>
    <hr>
    <p style="font-size:12px">
      <a href="{unsubscribe_url}">取消訂閱此通知</a>
    </p>
    """

    resend.Emails.send({
        "from": "房價追蹤 <noreply@housing-monitor.tw>",
        "to": [subscription.email],
        "subject": f"【房價追蹤】{project.name} 有新成交資料",
        "html": html,
    })

    log = AlertLog(
        subscription_id=subscription.id,
        alert_type="price_drop" if (old_avg and new_avg and new_avg < old_avg) else "new_transaction",
        triggered_at=datetime.now(timezone.utc),
        sent_at=datetime.now(timezone.utc),
        old_value=old_avg,
        new_value=new_avg,
    )
    db.add(log)
    await db.commit()
```

- [ ] **Step 2: Commit**

```bash
git add backend/
git commit -m "feat: email notification service via Resend"
```

---

## Task 10: Celery setup + scheduled crawl task

**Files:**
- Create: `backend/tasks/celery_app.py`
- Create: `backend/tasks/scheduled.py`

- [ ] **Step 1: Create `backend/tasks/celery_app.py`**

```python
from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery("housing_monitor", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

celery_app.conf.beat_schedule = {
    "crawl-lvr-daily": {
        "task": "tasks.scheduled.crawl_and_notify",
        "schedule": crontab(hour=3, minute=0),  # 每天凌晨 3 點
        "args": (["台北市", "新北市"],),
    },
}

celery_app.conf.timezone = "Asia/Taipei"
```

- [ ] **Step 2: Create `backend/tasks/scheduled.py`**

```python
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from tasks.celery_app import celery_app
from app.config import settings
from app.services.crawler import fetch_and_store_lvr_data
from app.services.detection import get_recent_avg_price, find_changed_subscriptions
from app.services.email import send_price_alert
from app.models.project import Project
from sqlalchemy import select

engine = create_async_engine(settings.DATABASE_URL)
session_factory = async_sessionmaker(engine, expire_on_commit=False)

@celery_app.task(name="tasks.scheduled.crawl_and_notify")
def crawl_and_notify(cities: list[str]) -> dict:
    return asyncio.get_event_loop().run_until_complete(_crawl_and_notify(cities))

async def _crawl_and_notify(cities: list[str]) -> dict:
    async with session_factory() as db:
        total_processed = 0
        for city in cities:
            count = await fetch_and_store_lvr_data(city, db)
            total_processed += count

        # For each project, compute new avg and notify if changed
        result = await db.execute(select(Project))
        projects = result.scalars().all()
        notifications_sent = 0
        for project in projects:
            new_avg = await get_recent_avg_price(project.id, db, days=30)
            old_avg = await get_recent_avg_price(project.id, db, days=60)
            to_notify = await find_changed_subscriptions(project.id, new_avg, old_avg, db)
            for sub, old_val, new_val in to_notify:
                await send_price_alert(sub, project, old_val, new_val, db)
                notifications_sent += 1

    return {"processed": total_processed, "notifications": notifications_sent}
```

- [ ] **Step 3: Commit**

```bash
git add backend/
git commit -m "feat: Celery beat scheduled crawl and notify task"
```

---

## Task 11: Backend Dockerfile + run all backend tests

**Files:**
- Create: `backend/Dockerfile`

- [ ] **Step 1: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Run full backend test suite**

```bash
cd /home/zoewang/projects/housing-monitor/backend
source .venv/bin/activate
pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/
git commit -m "feat: backend Dockerfile"
```

---

## Task 12: Frontend project scaffold + routing

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/App.jsx`

- [ ] **Step 1: Scaffold frontend**

```bash
cd /home/zoewang/projects/housing-monitor
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install react-router-dom axios react-leaflet leaflet recharts
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: Configure `frontend/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 3: Update `frontend/src/index.css`** — replace contents:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Configure `frontend/vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
```

- [ ] **Step 5: Create `frontend/src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import 'leaflet/dist/leaflet.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

- [ ] **Step 6: Create `frontend/src/App.jsx`**

```jsx
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Search from './pages/Search'
import ProjectDetail from './pages/ProjectDetail'
import Compare from './pages/Compare'
import Watchlist from './pages/Watchlist'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/watchlist" element={<Watchlist />} />
      </Routes>
    </div>
  )
}
```

- [ ] **Step 7: Create stub pages so app boots**

Create `frontend/src/pages/Home.jsx`:
```jsx
export default function Home() { return <div>Home</div> }
```
Create `frontend/src/pages/Search.jsx`:
```jsx
export default function Search() { return <div>Search</div> }
```
Create `frontend/src/pages/ProjectDetail.jsx`:
```jsx
export default function ProjectDetail() { return <div>Detail</div> }
```
Create `frontend/src/pages/Compare.jsx`:
```jsx
export default function Compare() { return <div>Compare</div> }
```
Create `frontend/src/pages/Watchlist.jsx`:
```jsx
export default function Watchlist() { return <div>Watchlist</div> }
```

- [ ] **Step 8: Verify app boots**

```bash
cd /home/zoewang/projects/housing-monitor/frontend
npm run dev
```

Open http://localhost:5173 — should see "Home" text with no console errors.

- [ ] **Step 9: Commit**

```bash
cd /home/zoewang/projects/housing-monitor
git add frontend/
git commit -m "feat: frontend scaffold with Vite + Tailwind + routing"
```

---

## Task 13: API client + useWatchlist + useCompare hooks

**Files:**
- Create: `frontend/src/api/client.js`
- Create: `frontend/src/hooks/useWatchlist.js`
- Create: `frontend/src/hooks/useCompare.js`

- [ ] **Step 1: Create `frontend/src/api/client.js`**

```js
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const searchProjects = (params) => api.get('/projects', { params }).then(r => r.data)
export const getProject = (id) => api.get(`/projects/${id}`).then(r => r.data)
export const createProject = (data) => api.post('/projects', data).then(r => r.data)
export const getTransactions = (id) => api.get(`/projects/${id}/transactions`).then(r => r.data)
export const getListings = (id) => api.get(`/projects/${id}/listings`).then(r => r.data)
export const createListing = (id, data) => api.post(`/projects/${id}/listings`, data).then(r => r.data)
export const subscribeAlert = (data) => api.post('/alerts', data).then(r => r.data)
export const unsubscribeAlert = (token) => api.delete(`/alerts/${token}`).then(r => r.data)
```

- [ ] **Step 2: Create `frontend/src/hooks/useWatchlist.js`**

```js
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'housing_watchlist'

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist))
  }, [watchlist])

  const isWatching = (projectId) => watchlist.some(w => w.project_id === projectId)

  const addToWatchlist = (project) => {
    if (isWatching(project.id)) return
    setWatchlist(prev => [...prev, {
      project_id: project.id,
      name: project.name,
      added_at: new Date().toISOString(),
    }])
  }

  const removeFromWatchlist = (projectId) => {
    setWatchlist(prev => prev.filter(w => w.project_id !== projectId))
  }

  return { watchlist, isWatching, addToWatchlist, removeFromWatchlist }
}
```

- [ ] **Step 3: Create `frontend/src/hooks/useCompare.js`**

```js
import { useState, useEffect } from 'react'

const STORAGE_KEY = 'housing_compare'
const MAX_COMPARE = 4

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function useCompare() {
  const [compareList, setCompareList] = useState(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compareList))
  }, [compareList])

  const isInCompare = (projectId) => compareList.some(p => p.id === projectId)

  const addToCompare = (project) => {
    if (isInCompare(project.id)) return
    if (compareList.length >= MAX_COMPARE) return
    setCompareList(prev => [...prev, { id: project.id, name: project.name }])
  }

  const removeFromCompare = (projectId) => {
    setCompareList(prev => prev.filter(p => p.id !== projectId))
  }

  const clearCompare = () => setCompareList([])

  return { compareList, isInCompare, addToCompare, removeFromCompare, clearCompare }
}
```

- [ ] **Step 4: Commit**

```bash
cd /home/zoewang/projects/housing-monitor
git add frontend/src/api frontend/src/hooks
git commit -m "feat: API client and watchlist/compare hooks"
```

---

## Task 14: SearchBar + ProjectCard components

**Files:**
- Create: `frontend/src/components/SearchBar.jsx`
- Create: `frontend/src/components/ProjectCard.jsx`

- [ ] **Step 1: Create `frontend/src/components/SearchBar.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const DISTRICTS = ['大安區','信義區','中正區','松山區','內湖區','士林區','北投區','中山區','文山區','南港區','萬華區','大同區']
const STATUSES = ['預售', '新成屋', '中古屋']

export default function SearchBar({ defaultValues = {} }) {
  const navigate = useNavigate()
  const [q, setQ] = useState(defaultValues.q || '')
  const [district, setDistrict] = useState(defaultValues.district || '')
  const [status, setStatus] = useState(defaultValues.status || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (district) params.set('district', district)
    if (status) params.set('status', status)
    navigate(`/search?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      <input
        type="text"
        placeholder="搜尋建案名稱或地址..."
        value={q}
        onChange={e => setQ(e.target.value)}
        className="flex-1 min-w-[200px] border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <select
        value={district}
        onChange={e => setDistrict(e.target.value)}
        className="border border-gray-300 rounded px-3 py-2 text-sm"
      >
        <option value="">全部行政區</option>
        {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select
        value={status}
        onChange={e => setStatus(e.target.value)}
        className="border border-gray-300 rounded px-3 py-2 text-sm"
      >
        <option value="">全部類型</option>
        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
      >
        搜尋
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Create `frontend/src/components/ProjectCard.jsx`**

```jsx
import { Link } from 'react-router-dom'
import { useWatchlist } from '../hooks/useWatchlist'
import { useCompare } from '../hooks/useCompare'

export default function ProjectCard({ project }) {
  const { isWatching, addToWatchlist, removeFromWatchlist } = useWatchlist()
  const { isInCompare, addToCompare, removeFromCompare, compareList } = useCompare()
  const watching = isWatching(project.id)
  const inCompare = isInCompare(project.id)

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <Link to={`/project/${project.id}`} className="text-blue-700 font-semibold hover:underline">
          {project.name}
        </Link>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
          {project.status || '—'}
        </span>
      </div>
      <p className="text-sm text-gray-500">{project.city}{project.district} {project.address || ''}</p>
      {project.building_type && (
        <p className="text-xs text-gray-400">{project.building_type}</p>
      )}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => watching ? removeFromWatchlist(project.id) : addToWatchlist(project)}
          className={`text-xs px-3 py-1 rounded border ${watching ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
        >
          {watching ? '★ 追蹤中' : '☆ 追蹤'}
        </button>
        <button
          onClick={() => inCompare ? removeFromCompare(project.id) : addToCompare(project)}
          disabled={!inCompare && compareList.length >= 4}
          className={`text-xs px-3 py-1 rounded border ${inCompare ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40'}`}
        >
          {inCompare ? '✓ 比較中' : '+ 比較'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components
git commit -m "feat: SearchBar and ProjectCard components"
```

---

## Task 15: Home page + Search page

**Files:**
- Modify: `frontend/src/pages/Home.jsx`
- Modify: `frontend/src/pages/Search.jsx`

- [ ] **Step 1: Update `frontend/src/pages/Home.jsx`**

```jsx
import { Link } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import { useCompare } from '../hooks/useCompare'

export default function Home() {
  const { compareList } = useCompare()

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">房價監測系統</h1>
      <p className="text-gray-500 mb-8">搜尋建案、追蹤價格、比較物件</p>
      <SearchBar />
      <div className="flex gap-4 mt-8 text-sm">
        <Link to="/watchlist" className="text-blue-600 hover:underline">我的追蹤清單</Link>
        {compareList.length > 0 && (
          <Link to="/compare" className="text-green-600 hover:underline">
            比較清單（{compareList.length}）
          </Link>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `frontend/src/pages/Search.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import ProjectCard from '../components/ProjectCard'
import { searchProjects } from '../api/client'
import { useCompare } from '../hooks/useCompare'

export default function Search() {
  const [searchParams] = useSearchParams()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { compareList } = useCompare()

  const q = searchParams.get('q') || ''
  const district = searchParams.get('district') || ''
  const status = searchParams.get('status') || ''

  useEffect(() => {
    setLoading(true)
    setError(null)
    searchProjects({ q, district, status })
      .then(setProjects)
      .catch(() => setError('載入失敗，請稍後再試'))
      .finally(() => setLoading(false))
  }, [q, district, status])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/" className="text-sm text-gray-500 hover:underline">← 首頁</Link>
        {compareList.length > 0 && (
          <Link to="/compare" className="ml-4 text-sm text-green-600 hover:underline">
            前往比較（{compareList.length}）
          </Link>
        )}
      </div>
      <div className="mb-6">
        <SearchBar defaultValues={{ q, district, status }} />
      </div>
      {loading && <p className="text-gray-500">搜尋中...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && projects.length === 0 && (
        <p className="text-gray-400">找不到符合條件的建案</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(p => <ProjectCard key={p.id} project={p} />)}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Home.jsx frontend/src/pages/Search.jsx
git commit -m "feat: Home and Search pages"
```

---

## Task 16: ProjectMap component (Leaflet + POI)

**Files:**
- Create: `frontend/src/components/ProjectMap.jsx`

- [ ] **Step 1: Fix Leaflet default icon issue** — create `frontend/src/utils/leafletIcons.js`:

```js
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })
```

- [ ] **Step 2: Create `frontend/src/components/ProjectMap.jsx`**

```jsx
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import '../utils/leafletIcons'

// Recenter map when position changes
function RecenterMap({ lat, lng }) {
  const map = useMap()
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], 15)
  }, [lat, lng, map])
  return null
}

const POI_OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

async function fetchNearbyPOI(lat, lng, radius = 800) {
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"="school"](around:${radius},${lat},${lng});
      node["amenity"="supermarket"](around:${radius},${lat},${lng});
      node["railway"="station"](around:${radius},${lat},${lng});
      node["station"="subway"](around:${radius},${lat},${lng});
    );
    out body;
  `
  const resp = await fetch(POI_OVERPASS_URL, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
  })
  const data = await resp.json()
  return data.elements || []
}

const POI_LABELS = {
  school: '🏫 學校',
  supermarket: '🛒 超市',
  station: '🚉 車站',
}

function getPOILabel(el) {
  if (el.tags?.amenity === 'school') return POI_LABELS.school
  if (el.tags?.amenity === 'supermarket') return POI_LABELS.supermarket
  return POI_LABELS.station
}

import { useState } from 'react'

export default function ProjectMap({ lat, lng, projectName }) {
  const [pois, setPois] = useState([])

  useEffect(() => {
    if (!lat || !lng) return
    fetchNearbyPOI(lat, lng).then(setPois).catch(() => {})
  }, [lat, lng])

  if (!lat || !lng) {
    return <div className="bg-gray-100 rounded h-64 flex items-center justify-center text-gray-400">無地圖資料</div>
  }

  return (
    <MapContainer center={[lat, lng]} zoom={15} className="h-64 w-full rounded">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap lat={lat} lng={lng} />
      <Marker position={[lat, lng]}>
        <Popup>{projectName}</Popup>
      </Marker>
      {pois.map(poi => (
        poi.lat && poi.lon ? (
          <Marker key={poi.id} position={[poi.lat, poi.lon]}>
            <Popup>{getPOILabel(poi)} {poi.tags?.name || ''}</Popup>
          </Marker>
        ) : null
      ))}
    </MapContainer>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ProjectMap.jsx frontend/src/utils/
git commit -m "feat: ProjectMap with Leaflet and OpenStreetMap POI"
```

---

## Task 17: PriceTrendChart component

**Files:**
- Create: `frontend/src/components/PriceTrendChart.jsx`

- [ ] **Step 1: Create `frontend/src/components/PriceTrendChart.jsx`**

```jsx
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatPrice(value) {
  return `${(value / 10000).toFixed(0)} 萬`
}

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706']

export default function PriceTrendChart({ datasets }) {
  // datasets: [{ label, transactions: [{transaction_date, unit_price_per_ping}] }]
  if (!datasets || datasets.length === 0) {
    return <div className="text-gray-400 text-sm py-8 text-center">無成交資料</div>
  }

  // Build unified x-axis from all dates
  const allDates = [...new Set(
    datasets.flatMap(d => d.transactions.map(t => t.transaction_date))
  )].sort()

  const chartData = allDates.map(date => {
    const point = { date: formatDate(date) }
    datasets.forEach(ds => {
      const tx = ds.transactions.find(t => t.transaction_date === date)
      point[ds.label] = tx?.unit_price_per_ping ?? null
    })
    return point
  })

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={formatPrice} tick={{ fontSize: 11 }} width={60} />
        <Tooltip formatter={(v) => v ? `${formatPrice(v)}/坪` : '無資料'} />
        {datasets.length > 1 && <Legend />}
        {datasets.map((ds, i) => (
          <Line
            key={ds.label}
            type="monotone"
            dataKey={ds.label}
            stroke={COLORS[i % COLORS.length]}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/PriceTrendChart.jsx
git commit -m "feat: PriceTrendChart with Recharts multi-line support"
```

---

## Task 18: ProjectDetail page

**Files:**
- Modify: `frontend/src/pages/ProjectDetail.jsx`

- [ ] **Step 1: Update `frontend/src/pages/ProjectDetail.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProject, getTransactions, getListings, subscribeAlert } from '../api/client'
import ProjectMap from '../components/ProjectMap'
import PriceTrendChart from '../components/PriceTrendChart'
import { useWatchlist } from '../hooks/useWatchlist'
import { useCompare } from '../hooks/useCompare'

export default function ProjectDetail() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [listings, setListings] = useState([])
  const [alertEmail, setAlertEmail] = useState('')
  const [alertThreshold, setAlertThreshold] = useState(3)
  const [alertSent, setAlertSent] = useState(false)
  const [loading, setLoading] = useState(true)

  const { isWatching, addToWatchlist, removeFromWatchlist } = useWatchlist()
  const { isInCompare, addToCompare, removeFromCompare, compareList } = useCompare()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getProject(id),
      getTransactions(id),
      getListings(id),
    ]).then(([p, txs, lst]) => {
      setProject(p)
      setTransactions(txs)
      setListings(lst)
    }).finally(() => setLoading(false))
  }, [id])

  const handleSubscribe = async (e) => {
    e.preventDefault()
    await subscribeAlert({ project_id: Number(id), email: alertEmail, threshold_percent: alertThreshold })
    setAlertSent(true)
  }

  if (loading) return <div className="p-8 text-gray-500">載入中...</div>
  if (!project) return <div className="p-8 text-red-500">找不到建案</div>

  const watching = isWatching(project.id)
  const inCompare = isInCompare(project.id)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/search" className="text-sm text-gray-500 hover:underline">← 搜尋結果</Link>

      <div className="mt-4 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
          <p className="text-gray-500">{project.city}{project.district} {project.address}</p>
          <div className="flex gap-2 mt-1 flex-wrap">
            {project.building_type && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{project.building_type}</span>}
            {project.status && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{project.status}</span>}
            {project.total_floors && <span className="text-xs text-gray-400">共 {project.total_floors} 層</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => watching ? removeFromWatchlist(project.id) : addToWatchlist(project)}
            className={`text-sm px-4 py-2 rounded border ${watching ? 'bg-yellow-100 border-yellow-400 text-yellow-700' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            {watching ? '★ 追蹤中' : '☆ 追蹤'}
          </button>
          <button
            onClick={() => inCompare ? removeFromCompare(project.id) : addToCompare(project)}
            disabled={!inCompare && compareList.length >= 4}
            className={`text-sm px-4 py-2 rounded border ${inCompare ? 'bg-blue-100 border-blue-400 text-blue-700' : 'border-gray-300 hover:bg-gray-50 disabled:opacity-40'}`}
          >
            {inCompare ? '✓ 比較中' : '+ 加入比較'}
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">地點與生活機能</h2>
        <ProjectMap lat={project.lat} lng={project.lng} projectName={project.name} />
      </div>

      {/* Price trend */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">成交走勢（時價登錄）</h2>
        <PriceTrendChart datasets={[{ label: project.name, transactions }]} />
      </div>

      {/* Listings */}
      {listings.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-2">物件列表</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left">格局</th>
                  <th className="px-3 py-2 text-right">坪數</th>
                  <th className="px-3 py-2 text-right">樓層</th>
                  <th className="px-3 py-2 text-right">開價</th>
                </tr>
              </thead>
              <tbody>
                {listings.map(l => (
                  <tr key={l.id} className="border-t">
                    <td className="px-3 py-2">{l.unit_type || '—'}</td>
                    <td className="px-3 py-2 text-right">{l.size_ping ? `${l.size_ping} 坪` : '—'}</td>
                    <td className="px-3 py-2 text-right">{l.floor ? `${l.floor} 樓` : '—'}</td>
                    <td className="px-3 py-2 text-right">{l.asking_price ? `${(l.asking_price / 10000).toFixed(0)} 萬` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Email alert */}
      <div className="mt-8 bg-gray-50 rounded p-4">
        <h2 className="text-lg font-semibold mb-2">設定價格通知</h2>
        {alertSent ? (
          <p className="text-green-600">✓ 已設定！當價格變動超過 {alertThreshold}% 時，我們會通知你。</p>
        ) : (
          <form onSubmit={handleSubscribe} className="flex flex-wrap gap-2 items-end">
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={alertEmail}
              onChange={e => setAlertEmail(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm flex-1 min-w-[200px]"
            />
            <div className="flex items-center gap-1 text-sm">
              <span>變動超過</span>
              <input
                type="number"
                min="1"
                max="50"
                value={alertThreshold}
                onChange={e => setAlertThreshold(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-2 w-16 text-center"
              />
              <span>% 時通知</span>
            </div>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
              設定通知
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ProjectDetail.jsx
git commit -m "feat: ProjectDetail page with map, chart, listings, alert form"
```

---

## Task 19: Compare page + CompareTable component

**Files:**
- Create: `frontend/src/components/CompareTable.jsx`
- Modify: `frontend/src/pages/Compare.jsx`

- [ ] **Step 1: Create `frontend/src/components/CompareTable.jsx`**

```jsx
import { Link } from 'react-router-dom'
import PriceTrendChart from './PriceTrendChart'

function Row({ label, values }) {
  return (
    <tr className="border-t">
      <td className="px-3 py-2 text-sm text-gray-500 font-medium bg-gray-50 whitespace-nowrap">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-2 text-sm text-center">{v ?? '—'}</td>
      ))}
    </tr>
  )
}

export default function CompareTable({ projects, transactionsMap }) {
  if (projects.length === 0) return <p className="text-gray-400">尚未加入任何比較物件</p>

  const avgPrice = (id) => {
    const txs = transactionsMap[id] || []
    const prices = txs.map(t => t.unit_price_per_ping).filter(Boolean)
    if (!prices.length) return null
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length
    return `${(avg / 10000).toFixed(1)} 萬/坪`
  }

  const datasets = projects.map(p => ({
    label: p.name,
    transactions: transactionsMap[p.id] || [],
  }))

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="px-3 py-2 bg-gray-50 text-left text-sm text-gray-500">項目</th>
              {projects.map(p => (
                <th key={p.id} className="px-3 py-2 text-center text-sm">
                  <Link to={`/project/${p.id}`} className="text-blue-700 hover:underline">{p.name}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="城市" values={projects.map(p => p.city)} />
            <Row label="行政區" values={projects.map(p => p.district)} />
            <Row label="建物類型" values={projects.map(p => p.building_type)} />
            <Row label="狀態" values={projects.map(p => p.status)} />
            <Row label="總樓層" values={projects.map(p => p.total_floors ? `${p.total_floors} 層` : null)} />
            <Row label="成交均價" values={projects.map(p => avgPrice(p.id))} />
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h3 className="text-base font-semibold mb-2">成交價格走勢比較</h3>
        <PriceTrendChart datasets={datasets} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `frontend/src/pages/Compare.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCompare } from '../hooks/useCompare'
import { getProject, getTransactions } from '../api/client'
import CompareTable from '../components/CompareTable'

export default function Compare() {
  const { compareList, removeFromCompare, clearCompare } = useCompare()
  const [projects, setProjects] = useState([])
  const [transactionsMap, setTransactionsMap] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (compareList.length === 0) {
      setProjects([])
      setTransactionsMap({})
      return
    }
    setLoading(true)
    Promise.all(compareList.map(c => getProject(c.id)))
      .then(ps => {
        setProjects(ps)
        return Promise.all(ps.map(p => getTransactions(p.id).then(txs => [p.id, txs])))
      })
      .then(entries => setTransactionsMap(Object.fromEntries(entries)))
      .finally(() => setLoading(false))
  }, [compareList.length])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/" className="text-sm text-gray-500 hover:underline">← 首頁</Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-1">建案比較</h1>
        </div>
        {compareList.length > 0 && (
          <button onClick={clearCompare} className="text-sm text-red-500 hover:underline">
            清空比較清單
          </button>
        )}
      </div>

      {compareList.length === 0 ? (
        <div className="text-gray-400 py-16 text-center">
          <p>尚未加入任何建案</p>
          <Link to="/search" className="mt-2 inline-block text-blue-600 hover:underline">去搜尋建案</Link>
        </div>
      ) : loading ? (
        <p className="text-gray-500">載入中...</p>
      ) : (
        <CompareTable projects={projects} transactionsMap={transactionsMap} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/CompareTable.jsx frontend/src/pages/Compare.jsx
git commit -m "feat: Compare page with CompareTable and multi-line chart"
```

---

## Task 20: Watchlist page

**Files:**
- Modify: `frontend/src/pages/Watchlist.jsx`

- [ ] **Step 1: Update `frontend/src/pages/Watchlist.jsx`**

```jsx
import { Link } from 'react-router-dom'
import { useWatchlist } from '../hooks/useWatchlist'
import { useCompare } from '../hooks/useCompare'

export default function Watchlist() {
  const { watchlist, removeFromWatchlist } = useWatchlist()
  const { isInCompare, addToCompare, compareList } = useCompare()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="text-sm text-gray-500 hover:underline">← 首頁</Link>
      <div className="flex items-center justify-between mt-1 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">我的追蹤清單</h1>
        {compareList.length > 0 && (
          <Link to="/compare" className="text-sm text-green-600 hover:underline">
            前往比較（{compareList.length}）
          </Link>
        )}
      </div>

      {watchlist.length === 0 ? (
        <div className="text-gray-400 py-16 text-center">
          <p>尚未追蹤任何建案</p>
          <Link to="/search" className="mt-2 inline-block text-blue-600 hover:underline">去搜尋建案</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {watchlist.map(item => (
            <div key={item.project_id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between gap-4">
              <div>
                <Link
                  to={`/project/${item.project_id}`}
                  className="font-semibold text-blue-700 hover:underline"
                >
                  {item.name}
                </Link>
                <p className="text-xs text-gray-400 mt-0.5">
                  加入時間：{new Date(item.added_at).toLocaleDateString('zh-TW')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => addToCompare({ id: item.project_id, name: item.name })}
                  disabled={isInCompare(item.project_id) || compareList.length >= 4}
                  className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                >
                  {isInCompare(item.project_id) ? '✓ 比較中' : '+ 比較'}
                </button>
                <button
                  onClick={() => removeFromWatchlist(item.project_id)}
                  className="text-xs px-3 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50"
                >
                  移除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Watchlist.jsx
git commit -m "feat: Watchlist page"
```

---

## Task 21: Docker Compose + deployment config

**Files:**
- Create: `docker-compose.yml`
- Create: `nginx.conf`
- Create: `.env.example`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: housing
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s

  backend:
    build: ./backend
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "8000:8000"
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  worker:
    build: ./backend
    env_file: .env
    depends_on:
      - db
      - redis
    command: celery -A tasks.celery_app worker --loglevel=info

  beat:
    build: ./backend
    env_file: .env
    depends_on:
      - redis
    command: celery -A tasks.celery_app beat --loglevel=info

  frontend:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./frontend:/app
    ports:
      - "5173:5173"
    command: sh -c "npm install && npm run dev -- --host"

volumes:
  pg_data:
```

- [ ] **Step 2: Create `.env.example`**

```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/housing
REDIS_URL=redis://redis:6379/0
RESEND_API_KEY=re_your_key_here
BASE_URL=http://localhost:5173
```

- [ ] **Step 3: Copy .env for local use**

```bash
cp /home/zoewang/projects/housing-monitor/.env.example /home/zoewang/projects/housing-monitor/.env
# Edit .env and fill in RESEND_API_KEY
```

- [ ] **Step 4: Start all services**

```bash
cd /home/zoewang/projects/housing-monitor
docker compose up --build
```

Expected: all 5 services start, backend accessible at http://localhost:8000/docs, frontend at http://localhost:5173.

- [ ] **Step 5: Run Alembic migrations inside container**

```bash
docker compose exec backend alembic upgrade head
```

Expected: tables created successfully.

- [ ] **Step 6: Final commit**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: Docker Compose deployment config"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] 建案搜尋與列表 → Task 3, 14, 15
- [x] 建案詳情頁（基本資訊 + 走勢圖）→ Task 17, 18
- [x] 進階地圖（生活機能）→ Task 16
- [x] 追蹤清單（localStorage）→ Task 13, 20
- [x] 多物件比較（最多 4 個）→ Task 13, 19
- [x] 時價登錄爬蟲 → Task 7
- [x] 異動偵測 → Task 8
- [x] Email 通知訂閱 → Task 6, 9, 18
- [x] Celery 排程 → Task 10
- [x] Docker 部署 → Task 21

**No placeholders found.**

**Type consistency verified:** `unit_price_per_ping` used consistently across Transaction model, crawler, detection, PriceTrendChart.
