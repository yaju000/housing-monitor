import asyncio
import resend
from app.config import settings
from app.models.alert import AlertSubscription, AlertLog
from app.models.project import Project
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

resend.api_key = settings.RESEND_API_KEY

def _format_price(value: float | None) -> str:
    if value is None:
        return "—"
    wan = value / 10000
    return f"{wan:,.0f} 萬/坪"

def _price_direction(old: float | None, new: float | None) -> str:
    if old is None or new is None:
        return ""
    return "↑" if new > old else "↓"

async def send_price_alert(
    subscription: AlertSubscription,
    project: Project,
    old_avg: float | None,
    new_avg: float | None,
    db: AsyncSession,
) -> None:
    direction = _price_direction(old_avg, new_avg)
    change_pct = ""
    if old_avg and new_avg:
        pct = abs(new_avg - old_avg) / old_avg * 100
        change_pct = f"（{direction}{pct:.1f}%）"

    unsubscribe_url = f"{settings.BASE_URL}/unsubscribe/{subscription.unsubscribe_token}"
    project_url = f"{settings.BASE_URL}/project/{project.id}"

    html = f"""
    <h2>【房價追蹤】{project.city or ""}{project.district or ""} {project.name} 有新成交資料</h2>
    <ul>
      <li>最新成交均價：{_format_price(new_avg)} {change_pct}</li>
      <li>前次均價：{_format_price(old_avg)}</li>
    </ul>
    <p><a href="{project_url}">查看建案詳情</a></p>
    <hr>
    <p style="font-size:12px">
      <a href="{unsubscribe_url}">取消訂閱此通知</a>
    </p>
    """

    await asyncio.to_thread(
        resend.Emails.send,
        {
            "from": "房價追蹤 <noreply@housing-monitor.tw>",
            "to": [subscription.email],
            "subject": f"【房價追蹤】{project.name} 有新成交資料",
            "html": html,
        },
    )

    log = AlertLog(
        subscription_id=subscription.id,
        alert_type="price_drop" if (old_avg and new_avg and new_avg < old_avg) else "new_transaction",
        triggered_at=datetime.now(timezone.utc),
        sent_at=datetime.now(timezone.utc),
        old_value=old_avg,
        new_value=new_avg,
    )
    db.add(log)
    await db.commit()
