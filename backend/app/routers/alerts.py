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

