import pytest

async def make_project(client, name="測試案"):
    r = await client.post("/api/projects", json={"name": name})
    return r.json()["id"]

@pytest.mark.asyncio
async def test_create_alert_subscription(client):
    pid = await make_project(client)
    resp = await client.post("/api/alerts", json={
        "project_id": pid,
        "email": "buyer@example.com",
        "threshold_percent": 5.0,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "buyer@example.com"
    assert "unsubscribe_token" in data

@pytest.mark.asyncio
async def test_unsubscribe(client):
    pid = await make_project(client)
    sub = (await client.post("/api/alerts", json={
        "project_id": pid,
        "email": "buyer@example.com",
        "threshold_percent": 3.0,
    })).json()
    token = sub["unsubscribe_token"]
    resp = await client.delete(f"/api/alerts/{token}")
    assert resp.status_code == 200

@pytest.mark.asyncio
async def test_unsubscribe_invalid_token(client):
    resp = await client.delete("/api/alerts/nonexistent-token")
    assert resp.status_code == 404
