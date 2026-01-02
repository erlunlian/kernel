import asyncio
import json
from datetime import datetime
from typing import Dict, Any, AsyncGenerator, Optional
from e2b_code_interpreter import AsyncSandbox as Sandbox, FileType
from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import engine
from app.models import Run
from app.services.artifact_service import artifact_service

class AgentExecutor:
    def __init__(self):
        # run_id -> { "queues": [...], "history": [], "task": asyncio.Task }
        self._active_runs: Dict[int, Dict[str, Any]] = {}

    async def start_run(
        self,
        agent_name: str,
        run_id: int,
        code: str,
        dependencies: str = "",
        secrets: Dict[str, str] = {},
        payload: Dict[str, Any] = {}
    ):
        """
        Starts the execution of the agent code in a background task.
        """
        if run_id in self._active_runs:
            # Already running
            return

        # Initialize state
        self._active_runs[run_id] = {
            "queues": [],
            "history": [],
            "task": None
        }

        # Start background task
        task = asyncio.create_task(
            self._manage_run(agent_name, run_id, code, dependencies, secrets, payload)
        )
        self._active_runs[run_id]["task"] = task

    async def stream_logs(self, run_id: int) -> AsyncGenerator[str, None]:
        """
        Yields logs for a given run_id. Matches keys in _active_runs.
        If run is active, yields history + live updates.
        """
        if run_id not in self._active_runs:
            print(f"Warning: Attempted to stream unknown or finished run {run_id}")
            return

        run_data = self._active_runs[run_id]
        queue = asyncio.Queue()
        
        # 1. Replay history immediately
        for log in run_data["history"]:
            queue.put_nowait(log)
            
        run_data["queues"].append(queue)
        
        try:
            while True:
                msg = await queue.get()
                if msg is None: # Sentinel
                    break
                yield msg
        finally:
            if run_id in self._active_runs:
                if queue in run_data["queues"]:
                    run_data["queues"].remove(queue)

    async def _manage_run(
        self,
        agent_name: str,
        run_id: int,
        code: str,
        dependencies: str,
        secrets: Dict[str, str],
        payload: Dict[str, Any]
    ):
        """
        Background task that actually runs the code, updates DB, and broadcasts logs.
        """
        
        # Local buffer for DB updates to avoid too many commits
        db_buffer = []
        last_db_update = datetime.utcnow()
        
        def broadcast(msg: str | None):
            # 1. Update In-Memory
            if run_id in self._active_runs:
                run_data = self._active_runs[run_id]
                if msg is not None:
                    run_data["history"].append(msg)
                    db_buffer.append(msg)
                
                # Push to all waiting queues
                for q in run_data["queues"]:
                    q.put_nowait(msg)

        async def flush_db(session: Session, run_obj: Run, force: bool = False):
            nonlocal last_db_update, db_buffer
            now = datetime.utcnow()
            if not db_buffer:
                return
            
            # Save if forced, or enough time passed, or buffer is large
            if force or (now - last_db_update).total_seconds() > 2 or len(db_buffer) >= 20:
                chunk = "\n".join(db_buffer) + "\n"
                
                # Append to logs
                if not run_obj.logs:
                    run_obj.logs = ""
                run_obj.logs += chunk
                
                session.add(run_obj)
                session.commit()
                session.refresh(run_obj)
                
                db_buffer.clear()
                last_db_update = now

        # --- Execution Logic ---
        with Session(engine) as session:
            run = None
            try:
                run = session.get(Run, run_id)
                if not run:
                    broadcast("[SYSTEM] Error: Run record not found in database.")
                    return

                # Mark as Running
                run.status = "running"
                run.start_time = datetime.utcnow()
                session.add(run)
                session.commit()
                session.refresh(run)

                # Prepare Environment
                env_vars = secrets.copy()
                if settings.E2B_API_KEY:
                    env_vars["E2B_API_KEY"] = settings.E2B_API_KEY

                # -- Sandbox Operations --
                sandbox = None
                try:
                    broadcast(f"[SYSTEM] Initializing Sandbox for Run {run_id}...")
                    try:
                        sandbox = await Sandbox.create(api_key=settings.E2B_API_KEY, envs=env_vars)
                    except Exception as e:
                        broadcast(f"[SYSTEM] Failed to create sandbox: {e}")
                        raise e

                    broadcast("[SYSTEM] Sandbox started.")
                    await flush_db(session, run)

                    # 1. Install Dependencies
                    if dependencies and dependencies.strip():
                        deps = " ".join(dependencies.splitlines())
                        broadcast(f"[SYSTEM] Installing: {deps}")
                        await flush_db(session, run)
                        
                        await sandbox.commands.run(
                            f"pip install {deps}",
                            on_stdout=lambda o: broadcast(f"[STDOUT] {getattr(o, 'line', str(o))}"),
                            on_stderr=lambda o: broadcast(f"[STDERR] {getattr(o, 'line', str(o))}")
                        )

                    # 2. Setup Data
                    await sandbox.files.make_dir("/data")

                    # 3. Execute Code
                    broadcast("[SYSTEM] Executing code...")
                    await flush_db(session, run)
                    
                    exec_result = await sandbox.run_code(
                        code,
                        on_stdout=lambda o: broadcast(f"[STDOUT] {getattr(o, 'line', str(o))}"),
                        on_stderr=lambda o: broadcast(f"[STDERR] {getattr(o, 'line', str(o))}")
                    )

                    if exec_result.error:
                        broadcast(f"[ERROR] {exec_result.error.name}: {exec_result.error.value}")
                        if exec_result.error.traceback:
                            broadcast("\n".join(exec_result.error.traceback))
                    else:
                        broadcast("[SYSTEM] Execution completed successfully.")

                    # 4. Artifacts
                    try:
                        files = await sandbox.files.list("/data")
                        if files:
                             broadcast(f"[SYSTEM] Found {len(files)} artifacts.")
                        
                        saved_artifacts = []
                        for file_info in files:
                            if file_info.type == FileType.DIR:
                                continue
                            
                            content = await sandbox.files.read(f"/data/{file_info.name}")
                            if isinstance(content, str):
                                content = content.encode('utf-8')
                            
                            artifact_service.save_artifact(
                                agent_name, run_id, file_info.name, content
                            )
                            broadcast(f"[SYSTEM] Saved artifact: {file_info.name}")
                            saved_artifacts.append(file_info.name)
                            
                        # Update Run record with artifacts list
                        if saved_artifacts:
                            run.artifacts_written = json.dumps(saved_artifacts)
                            session.add(run)

                    except Exception as e:
                        broadcast(f"[SYSTEM] Error saving artifacts: {str(e)}")

                except Exception as e:
                    broadcast(f"[SYSTEM] Sandbox Error: {str(e)}")
                    run.status = "error" # Infrastructure error
                    
                finally:
                    if sandbox:
                        await sandbox.kill()

            except Exception as e:
                # Top-level DB/Code error
                print(f"AgentExecutor Critical Error: {e}")
                
            finally:
                # Finalize DB
                try:
                    if run:
                        await flush_db(session, run, force=True)
                        if run.status == "running":
                            run.status = "success"
                        
                        run.end_time = datetime.utcnow()
                        session.add(run)
                        session.commit()
                except Exception as e:
                    print(f"Error finalizing run in DB: {e}")

                # Cleanup Local State
                broadcast(None) # Signal end of stream
                if run_id in self._active_runs:
                    del self._active_runs[run_id]

agent_executor = AgentExecutor()

