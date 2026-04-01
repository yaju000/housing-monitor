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

