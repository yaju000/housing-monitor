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

