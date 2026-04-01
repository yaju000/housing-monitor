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
