from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session
from sse_starlette.sse import EventSourceResponse
from app.core.database import get_session
from app.models import Run, AgentVersion
from app.services.agent_service import agent_service
from app.runtime.executor import agent_executor

router = APIRouter()

@router.get("/", response_model=List[Run])
def list_actions(agent_id: int, session: Session = Depends(get_session)):
    return agent_service.list_runs(session, agent_id)

@router.post("/trigger/{agent_id}", response_model=Run)
async def trigger_run(agent_id: int, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    run = agent_service.create_run(session, agent_id, trigger_type="manual")
    
    agent = session.get(Run, run.id).agent
    version = session.get(Run, run.id).version

    # Load linked secrets
    secrets = {}
    if agent.secrets:
        from app.core.security import decrypt_value
        for secret in agent.secrets:
             secrets[secret.key] = decrypt_value(secret.value)

    # Start execution in background immediately
    await agent_executor.start_run(
        agent_name=agent.name,
        run_id=run.id,
        code=version.code,
        dependencies=version.dependencies,
        secrets=secrets
    )
    
    return run

@router.get("/{run_id}/stream")
async def stream_run(run_id: int, session: Session = Depends(get_session)):
    run = session.get(Run, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    # 1. If run is actively controlled by executor, stream from memory
    # 2. If run is 'running' in DB but NOT in executor -> It's a zombie (server restarted). Mark failed.
    # 3. If run is finished (success/error), replay from DB.

    # Check executor first
    # Note: We need to access the private active_runs to check existence, or try streaming.
    # The stream_logs generator handles the "not active" case gracefully by returning, 
    # but we need to distinguish "finished just now" from "zombie".
    
    # Let's try to stream. If the generator yields nothing and status is running vs finished...
    
    # Actually, simpler logic:
    # If run.status is running:
    #   Check if locally active. 
    #   If yes -> Stream.
    #   If no -> Mark as failed (server restart killed it), return "System Error: Run interrupted."
    # If run.status is finished:
    #   Return full logs from DB.

    # We need to access _active_runs key check safely for zombie detection
    is_active_locally = run_id in agent_executor._active_runs
    
    if run.status == "running" and not is_active_locally:
        # Zombie Run
        run.status = "error"
        run.end_time = datetime.utcnow()
        if not run.logs: run.logs = ""
        run.logs += "\n[SYSTEM] Run interrupted (Server Restart)\n"
        session.add(run)
        session.commit()
        # Fall through to finished matching

    if run.status != "running":
        # Return static logs
        # We wrap it in an iterator to work with EventSourceResponse
        # But EventSourceResponse expects "data: ..." format? 
        # Actually EventSourceResponse takes an iterable of strings or dictionaries.
        
        # We want to emulate the stream replay. 
        # The logs in DB are a big string. We should split by line?
        logs = run.logs or ""
        async def finite_stream():
            for line in logs.splitlines():
                yield dict(data=line)
            yield dict(data="[SYSTEM] Run already completed.")
        
        return EventSourceResponse(finite_stream())

    # Active running stream
    async def event_generator():
        async for log_line in agent_executor.stream_logs(run_id):
            yield dict(data=log_line)
    
    return EventSourceResponse(event_generator())
