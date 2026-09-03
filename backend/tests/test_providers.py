import pytest
from app.models.schemas import GPSPosition
from app.services.routing.providers.mock import MockRoutingProvider
from app.services.routing.providers.osrm import OSRMRoutingProvider
from app.services.routing.providers.base import ProviderError

@pytest.mark.asyncio
async def test_mock_provider_always_returns():
    prov = MockRoutingProvider()
    o = GPSPosition(latitude=12.97, longitude=77.59)
    d = GPSPosition(latitude=13.0, longitude=77.60)
    res = await prov.get_routes(o, d, alternatives=True)
    assert len(res["routes"]) == 3
    assert res["is_simulated"] is True

@pytest.mark.asyncio
async def test_mock_invalid_coords_raises():
    prov = MockRoutingProvider()
    o = GPSPosition(latitude=0, longitude=0)
    d = GPSPosition(latitude=12.97, longitude=77.59)
    with pytest.raises(ValueError):
        await prov.get_routes(o, d)

@pytest.mark.asyncio
async def test_osrm_provider_returns_real_geometry():
    prov = OSRMRoutingProvider()
    o = GPSPosition(latitude=12.9716, longitude=77.5946)
    d = GPSPosition(latitude=12.9866, longitude=77.6066)
    res = await prov.get_routes(o, d, alternatives=False)
    assert len(res["routes"]) >= 1
    assert res["is_simulated"] is False
    assert len(res["routes"][0]["points"]) > 5

@pytest.mark.asyncio
async def test_osrm_timeout_handling():
    prov = OSRMRoutingProvider(base_url="https://invalid.osrm.example.invalid", timeout=1)
    o = GPSPosition(latitude=12.97, longitude=77.59)
    d = GPSPosition(latitude=13.0, longitude=77.60)
    with pytest.raises(Exception):
        await prov.get_routes(o, d)

@pytest.mark.asyncio
async def test_osrm_no_route():
    prov = OSRMRoutingProvider()
    # Ocean coords likely no route
    o = GPSPosition(latitude=0.5, longitude=0.5)  # near ocean but not 0,0
    d = GPSPosition(latitude=0.6, longitude=0.6)
    try:
        res = await prov.get_routes(o, d)
        # If it returns, check it's handled
        assert "routes" in res
    except Exception as e:
        assert isinstance(e, ProviderError) or isinstance(e, ValueError)
