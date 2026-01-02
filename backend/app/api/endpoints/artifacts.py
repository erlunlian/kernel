import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlmodel import Session
from app.core.database import get_session
from app.models import Agent
from app.services.artifact_service import artifact_service

router = APIRouter()

@router.get("/{agent_id}/{run_id}")
def list_run_artifacts(agent_id: int, run_id: int, session: Session = Depends(get_session)):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    return artifact_service.list_artifacts(agent.name, run_id)

@router.get("/{agent_id}/{run_id}/{filename}")
def download_artifact(agent_id: int, run_id: int, filename: str, session: Session = Depends(get_session)):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    path = os.path.join(artifact_service.base_dir, agent.name, str(run_id), filename)
    if not os.path.exists(path):
         raise HTTPException(status_code=404, detail="Artifact not found")
    # Security check: ensure path is within run dir (artifact_service handles creation safely, but reading needs check)
    if not path.startswith(os.path.abspath(artifact_service.base_dir)):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return FileResponse(path)
