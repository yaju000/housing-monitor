from pydantic import BaseModel
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
