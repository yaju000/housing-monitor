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
