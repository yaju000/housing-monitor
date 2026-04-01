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
    last_seen_at: datetime | None

    model_config = {"from_attributes": True}
