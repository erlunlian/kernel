from typing import Optional
from sqlmodel import Field, SQLModel

class LinkAgentSecret(SQLModel, table=True):
    agent_id: Optional[int] = Field(default=None, foreign_key="agent.id", primary_key=True)
    secret_id: Optional[int] = Field(default=None, foreign_key="secret.id", primary_key=True)
