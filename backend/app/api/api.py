from fastapi import APIRouter
from app.api.endpoints import agents, runs, artifacts, ai, secrets

api_router = APIRouter()
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
api_router.include_router(runs.router, prefix="/runs", tags=["runs"])
api_router.include_router(secrets.router, prefix="/secrets", tags=["secrets"])
api_router.include_router(artifacts.router, prefix="/artifacts", tags=["artifacts"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
