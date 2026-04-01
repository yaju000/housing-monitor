import pytest

async def make_project(client, name="測試案"):
    r = await client.post("/api/projects", json={"name": name})
    return r.json()["id"]

@pytest.mark.asyncio
async def test_create_listing(client):
    pid = await make_project(client)
    resp = await client.post(f"/api/projects/{pid}/listings", json={
        "floor": 5,
        "unit_type": "3房2廳",
        "size_ping": 35.5,
        "asking_price": 25000000,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["unit_type"] == "3房2廳"
    assert data["project_id"] == pid

@pytest.mark.asyncio
async def test_list_listings(client):
    pid = await make_project(client)
    await client.post(f"/api/projects/{pid}/listings", json={"floor": 3, "size_ping": 28.0})
    await client.post(f"/api/projects/{pid}/listings", json={"floor": 7, "size_ping": 40.0})
    resp = await client.get(f"/api/projects/{pid}/listings")
    assert resp.status_code == 200
    assert len(resp.json()) == 2
