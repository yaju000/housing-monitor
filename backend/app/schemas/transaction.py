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
