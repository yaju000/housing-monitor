import io
import zipfile
import csv
from datetime import date
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.transaction import Transaction
from app.models.project import Project

CITY_CODES: dict[str, str] = {
    "台北市": "A",
    "新北市": "F",
    "台中市": "B",
    "台南市": "D",
    "高雄市": "E",
    "基隆市": "C",
    "桃園市": "H",
}

LVR_BASE_URL = "https://plvr.land.moi.gov.tw/DownloadOpenData"

def normalize_city_code(city: str) -> str:
    return CITY_CODES.get(city, "A")

def _roc_date_to_iso(roc_str: str) -> date | None:
    """Convert ROC date string like '1130101' to Python date."""
    try:
        roc_str = roc_str.strip()
        if len(roc_str) != 7:
            return None
        year = int(roc_str[:3]) + 1911
        month = int(roc_str[3:5])
        day = int(roc_str[5:7])
        return date(year, month, day)
    except (ValueError, IndexError):
        return None

def _m2_to_ping(m2_str: str) -> float | None:
    try:
        return round(float(m2_str) / 3.305785, 2)
    except (ValueError, TypeError):
        return None

def parse_lvr_csv_row(row: dict, project_id: int, city: str) -> dict:
    size_ping = _m2_to_ping(row.get("建物移轉總面積㎡", ""))
    try:
        total_price = int(row.get("總價元", "").replace(",", "")) or None
    except (ValueError, AttributeError):
        total_price = None

    unit_price_per_ping = None
    if total_price and size_ping and size_ping > 0:
        unit_price_per_ping = round(total_price / size_ping)

    try:
        floor = int(row.get("移轉層次", "").replace("層", "").strip() or "0") or None
    except ValueError:
        floor = None

    return {
        "project_id": project_id,
        "transaction_date": _roc_date_to_iso(row.get("交易年月日", "")),
        "size_ping": size_ping,
        "total_price": total_price,
        "unit_price_per_ping": unit_price_per_ping,
        "floor": floor,
        "building_type": row.get("建物型態"),
        "source": "government",
        "raw_data": dict(row),
    }

async def fetch_and_store_lvr_data(city: str, db: AsyncSession) -> int:
    """Download 實價登錄 ZIP for a city, parse CSVs, upsert Transactions.
    Returns number of rows processed."""
    code = normalize_city_code(city)
    url = f"{LVR_BASE_URL}?type=zip&fileName={code}_lvr_land_A.zip"

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(url, follow_redirects=True)
        resp.raise_for_status()

    count = 0
    with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
        for name in zf.namelist():
            if not name.lower().endswith(".csv"):
                continue
            with zf.open(name) as f:
                text = f.read().decode("utf-8-sig", errors="replace")
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                address = row.get("土地區段位置建物門牌", "")
                if not address:
                    continue
                # Find matching project by address substring
                stmt = select(Project).where(
                    Project.city == city,
                    Project.address.ilike(f"%{address[:10]}%")
                ).limit(1)
                result = await db.execute(stmt)
                project = result.scalar_one_or_none()
                if not project:
                    continue
                data = parse_lvr_csv_row(row, project.id, city)
                transaction = Transaction(**data)
                db.add(transaction)
                count += 1
        await db.commit()
    return count
