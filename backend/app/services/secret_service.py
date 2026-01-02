from typing import List, Optional
from sqlmodel import Session, select
from app.models import Secret
from app.models.agent import Agent

class SecretService:
    def list_secrets(self, session: Session) -> List[Secret]:
        return session.exec(select(Secret)).all()

    def create_secret(self, session: Session, key: str, value: str, description: str = None) -> Secret:
        from app.core.security import encrypt_value
        encrypted_val = encrypt_value(value)
        secret = Secret(key=key, value=encrypted_val, description=description)
        session.add(secret)
        session.commit()
        session.refresh(secret)
        return secret

    def delete_secret(self, session: Session, secret_id: int) -> bool:
        secret = session.get(Secret, secret_id)
        if not secret:
            return False
        session.delete(secret)
        session.commit()
        return True

    def get_links(self, session: Session, agent_id: int) -> List[Secret]:
        agent = session.get(Agent, agent_id)
        if not agent:
            return []
        return agent.secrets

    def link_secret(self, session: Session, agent_id: int, secret_id: int) -> bool:
        agent = session.get(Agent, agent_id)
        secret = session.get(Secret, secret_id)
        if not agent or not secret:
            return False
        if secret not in agent.secrets:
            agent.secrets.append(secret)
            session.add(agent)
            session.commit()
        return True

    def unlink_secret(self, session: Session, agent_id: int, secret_id: int) -> bool:
        agent = session.get(Agent, agent_id)
        secret = session.get(Secret, secret_id)
        if not agent or not secret:
            return False
        if secret in agent.secrets:
            agent.secrets.remove(secret)
            session.add(agent)
            session.commit()
        return True

secret_service = SecretService()
