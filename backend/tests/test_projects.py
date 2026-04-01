import pytest

@pytest.mark.asyncio
async def test_create_project(client):
    resp = await client.post("/api/projects", json={
        "name": "信義新案",
        "city": "台北市",
        "district": "信義區",
        "building_type": "大樓",
        "status": "新成屋",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "信義新案"
    assert data["id"] is not None

@pytest.mark.asyncio
async def test_search_projects(client):
    await client.post("/api/projects", json={"name": "大安好宅", "city": "台北市", "district": "大安區"})
    await client.post("/api/projects", json={"name": "信義豪宅", "city": "台北市", "district": "信義區"})

    resp = await client.get("/api/projects?q=大安")
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) == 1
    assert results[0]["name"] == "大安好宅"

@pytest.mark.asyncio
async def test_search_projects_by_district(client):
    await client.post("/api/projects", json={"name": "A案", "city": "台北市", "district": "信義區"})
    await client.post("/api/projects", json={"name": "B案", "city": "台北市", "district": "大安區"})

    resp = await client.get("/api/projects?district=信義區")
    assert resp.status_code == 200
    results = resp.json()
    assert all(p["district"] == "信義區" for p in results)

@pytest.mark.asyncio
async def test_get_project_by_id(client):
    created = (await client.post("/api/projects", json={"name": "測試案"})).json()
    resp = await client.get(f"/api/projects/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "測試案"

@pytest.mark.asyncio
async def test_get_project_not_found(client):
    resp = await client.get("/api/projects/99999")
    assert resp.status_code == 404
