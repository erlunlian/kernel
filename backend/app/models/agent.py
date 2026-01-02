from datetime import datetime
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from app.models.link_agent_secret import LinkAgentSecret
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.secret import Secret

class AgentBase(SQLModel):
    name: str = Field(index=True)
    status: str = Field(default="active")  # active, paused
    schedule: Optional[str] = None
    description: Optional[str] = None

class Agent(AgentBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    current_version_id: Optional[int] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    versions: List["AgentVersion"] = Relationship(back_populates="agent", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    runs: List["Run"] = Relationship(back_populates="agent", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    secrets: List["Secret"] = Relationship(back_populates="agents", link_model=LinkAgentSecret)

class AgentVersionBase(SQLModel):
    code: str
    dependencies: str = "requests\n"

class AgentVersion(AgentVersionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    agent_id: int = Field(foreign_key="agent.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    parent_version_id: Optional[int] = None
    
    agent: Agent = Relationship(back_populates="versions")
    runs: List["Run"] = Relationship(back_populates="version")
