from datetime import datetime
from sqlalchemy import String, Numeric, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
from app.database import Base

class AlertSubscription(Base):
    __tablename__ = "alert_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(200), nullable=False)
    threshold_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=3.0)
    unsubscribe_token: Mapped[str] = mapped_column(
        String(36), default=lambda: str(uuid.uuid4()), unique=True
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now()
    )

    project: Mapped["Project"] = relationship(back_populates="subscriptions")
    logs: Mapped[list["AlertLog"]] = relationship(back_populates="subscription", cascade="all, delete-orphan")


class AlertLog(Base):
    __tablename__ = "alert_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    subscription_id: Mapped[int] = mapped_column(ForeignKey("alert_subscriptions.id"), nullable=False)
    alert_type: Mapped[str] = mapped_column(String(30))  # price_drop / new_transaction
    triggered_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    sent_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    old_value: Mapped[float | None] = mapped_column(Numeric(12, 2))
    new_value: Mapped[float | None] = mapped_column(Numeric(12, 2))

    subscription: Mapped["AlertSubscription"] = relationship(back_populates="logs")
