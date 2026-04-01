import pytest
from app.services.detection import compute_avg_price, has_price_changed

def test_compute_avg_price_empty():
    assert compute_avg_price([]) is None

def test_compute_avg_price():
    prices = [600000, 650000, 700000]
    assert compute_avg_price(prices) == pytest.approx(650000.0)

def test_has_price_changed_below_threshold():
    assert has_price_changed(old=600000, new=615000, threshold_pct=3.0) is False

def test_has_price_changed_above_threshold():
    assert has_price_changed(old=600000, new=640000, threshold_pct=3.0) is True

def test_has_price_changed_drop():
    assert has_price_changed(old=700000, new=650000, threshold_pct=5.0) is True

def test_has_price_changed_none_old():
    # No previous price → always notify (first data point)
    assert has_price_changed(old=None, new=600000, threshold_pct=3.0) is True

def test_has_price_changed_none_new():
    assert has_price_changed(old=600000, new=None, threshold_pct=3.0) is False
