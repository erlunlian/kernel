from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.core.database import get_session
from app.models import Agent
from app.services.agent_service import agent_service
from pydantic import BaseModel

router = APIRouter()

class AgentCreate(BaseModel):
    name: str
    description: str = None

class CodeUpdate(BaseModel):
    code: str

@router.get("/", response_model=List[Agent])
def list_agents(session: Session = Depends(get_session)):
    return agent_service.list_agents(session)

@router.post("/", response_model=Agent)
def create_agent(agent_in: AgentCreate, session: Session = Depends(get_session)):
    return agent_service.create_agent(session, agent_in.name, agent_in.description)

    agent = agent_service.get_agent(session, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent

@router.get("/{agent_id}/code", response_model=dict)
def get_agent_code(agent_id: int, session: Session = Depends(get_session)):
    code = agent_service.get_agent_code(session, agent_id)
    if code is None:
        raise HTTPException(status_code=404, detail="Agent code not found")
    return {"code": code}

@router.get("/{agent_id}/versions", response_model=List[dict])
def list_agent_versions(agent_id: int, session: Session = Depends(get_session)):
    versions = agent_service.list_agent_versions(session, agent_id)
    return [{"id": v.id, "created_at": v.created_at, "parent_version_id": v.parent_version_id, "code": v.code} for v in versions]

@router.post("/{agent_id}/code", response_model=dict)
def update_agent_code(agent_id: int, update: CodeUpdate, session: Session = Depends(get_session)):
    version = agent_service.update_agent_code(session, agent_id, update.code)
    if not version:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"version_id": version.id, "ok": True}

@router.delete("/{agent_id}")
def delete_agent(agent_id: int, session: Session = Depends(get_session)):
    success = agent_service.delete_agent(session, agent_id)
    if not success:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"ok": True}

@router.get("/{agent_id}/logs", response_model=dict)
def get_agent_logs(agent_id: int, session: Session = Depends(get_session)):
    logs = agent_service.get_latest_run_logs(session, agent_id)
    if logs is None:
        # Return empty logs if no run found, or 404? 
        # User experience: if never run, empty logs is fine.
        return {"logs": ""}
    return {"logs": logs}

@router.get("/{agent_id}/secrets", response_model=List[dict])
def list_agent_secrets(agent_id: int, session: Session = Depends(get_session)):
    from app.services.secret_service import secret_service
    secrets = secret_service.get_links(session, agent_id)
    return [{"id": s.id, "key": s.key} for s in secrets]

@router.post("/{agent_id}/secrets/{secret_id}")
def link_secret_to_agent(agent_id: int, secret_id: int, session: Session = Depends(get_session)):
    from app.services.secret_service import secret_service
    success = secret_service.link_secret(session, agent_id, secret_id)
    if not success:
        raise HTTPException(status_code=404, detail="Agent or Secret not found")
    return {"ok": True}

@router.delete("/{agent_id}/secrets/{secret_id}")
def unlink_secret_from_agent(agent_id: int, secret_id: int, session: Session = Depends(get_session)):
    from app.services.secret_service import secret_service
    success = secret_service.unlink_secret(session, agent_id, secret_id)
    if not success:
        raise HTTPException(status_code=404, detail="Agent or Secret not found")
    return {"ok": True}
