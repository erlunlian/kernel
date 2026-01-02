from datetime import datetime
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship

class RunBase(SQLModel):
    status: str = Field(default="queued")  # queued, running, success, error
    trigger_type: str = "manual"
    input_payload: Optional[str] = None

class Run(RunBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    agent_id: int = Field(foreign_key="agent.id")
    version_id: Optional[int] = Field(foreign_key="agentversion.id")
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    logs: Optional[str] = ""
    artifacts_written: Optional[str] = "[]"  # JSON list of paths

    agent: "Agent" = Relationship(back_populates="runs")
    version: "AgentVersion" = Relationship(back_populates="runs")
