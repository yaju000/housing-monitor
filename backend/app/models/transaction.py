from datetime import date
from sqlalchemy import Integer, String, Numeric, Date, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    transaction_date: Mapped[date | None] = mapped_column(Date, index=True)
    size_ping: Mapped[float | None] = mapped_column(Numeric(8, 2))
    total_price: Mapped[int | None] = mapped_column(Integer)        # 元
    unit_price_per_ping: Mapped[int | None] = mapped_column(Integer) # 元/坪
    floor: Mapped[int | None] = mapped_column(Integer)
    building_type: Mapped[str | None] = mapped_column(String(20))
    source: Mapped[str] = mapped_column(String(20), default="government")  # government / manual
    raw_data: Mapped[dict | None] = mapped_column(JSONB)

    project: Mapped["Project"] = relationship(back_populates="transactions")
