from sqlalchemy import Integer, String, Numeric, Boolean, ForeignKey, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base

class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False, index=True)
    floor: Mapped[int | None] = mapped_column(Integer)
    unit_type: Mapped[str | None] = mapped_column(String(50))     # e.g. "3房2廳"
    size_ping: Mapped[float | None] = mapped_column(Numeric(8, 2))
    interior_ping: Mapped[float | None] = mapped_column(Numeric(8, 2))
    parking_included: Mapped[bool | None] = mapped_column(Boolean)
    asking_price: Mapped[int | None] = mapped_column(Integer)      # 元
    last_seen_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))

    project: Mapped["Project"] = relationship(back_populates="listings")
