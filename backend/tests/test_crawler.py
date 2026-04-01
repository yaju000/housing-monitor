import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.crawler import parse_lvr_csv_row, normalize_city_code

def test_normalize_city_code():
    assert normalize_city_code("台北市") == "A"
    assert normalize_city_code("新北市") == "F"
    assert normalize_city_code("台中市") == "B"
    assert normalize_city_code("台南市") == "D"
    assert normalize_city_code("高雄市") == "E"

def test_parse_lvr_csv_row_valid():
    row = {
        "鄉鎮市區": "大安區",
        "交易年月日": "1130101",  # 民國113年1月1日
        "建物移轉總面積㎡": "100.00",
        "總價元": "20000000",
        "單價元平方公尺": "200000",
        "總樓層數": "12",
        "移轉層次": "5",
        "建物型態": "住宅大樓(11層含以上有電梯)",
    }
    result = parse_lvr_csv_row(row, project_id=1, city="台北市")
    assert result["total_price"] == 20000000
    # 1 坪 = 3.305785 m²; 100m² ≈ 30.25 坪
    assert result["size_ping"] == pytest.approx(30.25, abs=0.1)
    # unit price per ping: total / size_ping
    assert result["unit_price_per_ping"] > 0

def test_parse_lvr_csv_row_missing_fields():
    row = {"鄉鎮市區": "大安區"}
    result = parse_lvr_csv_row(row, project_id=1, city="台北市")
    assert result["total_price"] is None
