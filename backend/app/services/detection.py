from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date, timedelta
from app.models.transaction import Transaction
from app.models.alert import AlertSubscription

def compute_avg_price(prices: list[float]) -> float | None:
    if not prices:
        return None
    return sum(prices) / len(prices)

def has_price_changed(old: float | None, new: float | None, threshold_pct: float) -> bool:
    if new is None:
        return False
    if old is None:
        return True  # first data point, notify
    change_pct = abs(new - old) / old * 100
    return change_pct >= threshold_pct

async def get_recent_avg_price(project_id: int, db: AsyncSession, days: int = 90) -> float | None:
    """Compute average unit_price_per_ping from last `days` days of transactions."""
    since = date.today() - timedelta(days=days)
    stmt = select(func.avg(Transaction.unit_price_per_ping)).where(
        Transaction.project_id == project_id,
        Transaction.unit_price_per_ping.isnot(None),
        Transaction.transaction_date >= since,
    )
    result = await db.execute(stmt)
    avg = result.scalar_one_or_none()
    return float(avg) if avg is not None else None

async def find_changed_subscriptions(
    project_id: int,
    new_avg: float | None,
    previous_avg: float | None,
    db: AsyncSession,
) -> list[tuple[AlertSubscription, float | None, float | None]]:
    """Return subscriptions that should be notified given price change."""
    stmt = select(AlertSubscription).where(AlertSubscription.project_id == project_id)
    result = await db.execute(stmt)
    subscriptions = result.scalars().all()
    to_notify = []
    for sub in subscriptions:
        if has_price_changed(previous_avg, new_avg, sub.threshold_percent):
            to_notify.append((sub, previous_avg, new_avg))
    return to_notify
