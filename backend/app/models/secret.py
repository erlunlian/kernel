from typing import Optional
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship
from app.models.link_agent_secret import LinkAgentSecret

if TYPE_CHECKING:
    from app.models.agent import Agent

class SecretBase(SQLModel):
    key: str = Field(unique=True, index=True)
    value: str

class Secret(SecretBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    description: Optional[str] = None
    
    agents: List["Agent"] = Relationship(back_populates="secrets", link_model=LinkAgentSecret)
