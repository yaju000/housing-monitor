import pytest
from datetime import date

async def make_project(client, name="測試案"):
    r = await client.post("/api/projects", json={"name": name})
    return r.json()["id"]

@pytest.mark.asyncio
async def test_list_transactions_empty(client):
    pid = await make_project(client)
    resp = await client.get(f"/api/projects/{pid}/transactions")
    assert resp.status_code == 200
    assert resp.json() == []

@pytest.mark.asyncio
async def test_transactions_for_nonexistent_project(client):
    resp = await client.get("/api/projects/99999/transactions")
    assert resp.status_code == 404
