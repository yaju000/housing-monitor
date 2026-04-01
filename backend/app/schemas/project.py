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
