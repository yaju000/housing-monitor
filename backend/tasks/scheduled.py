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
            old_avg = await get_recent_avg_price(project.id, db, days=90)
            to_notify = await find_changed_subscriptions(project.id, new_avg, old_avg, db)
            for sub, old_val, new_val in to_notify:
                await send_price_alert(sub, project, old_val, new_val, db)
                notifications_sent += 1

    return {"processed": total_processed, "notifications": notifications_sent}
