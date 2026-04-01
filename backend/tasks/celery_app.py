from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery("housing_monitor", broker=settings.REDIS_URL, backend=settings.REDIS_URL)

celery_app.conf.beat_schedule = {
    "crawl-lvr-daily": {
        "task": "tasks.scheduled.crawl_and_notify",
        "schedule": crontab(hour=3, minute=0),  # 每天凌晨 3 點
        "args": (["台北市", "新北市"],),
    },
}

celery_app.conf.timezone = "Asia/Taipei"
