from typing import List, Optional
from datetime import datetime
from sqlmodel import Session, select
from app.models import Agent, AgentVersion, Run

class AgentService:
    def list_agents(self, session: Session) -> List[Agent]:
        return session.exec(select(Agent)).all()

    def get_agent(self, session: Session, agent_id: int) -> Optional[Agent]:
        return session.get(Agent, agent_id)

    def get_agent_code(self, session: Session, agent_id: int) -> Optional[str]:
        agent = self.get_agent(session, agent_id)
        if not agent or not agent.current_version_id:
            return None
        version = session.get(AgentVersion, agent.current_version_id)
        return version.code if version else None

    def list_agent_versions(self, session: Session, agent_id: int) -> List[AgentVersion]:
        return session.exec(select(AgentVersion).where(AgentVersion.agent_id == agent_id).order_by(AgentVersion.created_at.desc())).all()

    def update_agent_code(self, session: Session, agent_id: int, new_code: str) -> Optional[AgentVersion]:
        agent = self.get_agent(session, agent_id)
        if not agent:
            return None
            
        # Create new version
        # Inherit dependencies/parent from current
        current_version = None
        if agent.current_version_id:
            current_version = session.get(AgentVersion, agent.current_version_id)
            
        dependencies = current_version.dependencies if current_version else "requests\n"
        
        new_version = AgentVersion(
            agent_id=agent.id,
            code=new_code,
            dependencies=dependencies,
            parent_version_id=agent.current_version_id
        )
        session.add(new_version)
        session.commit()
        session.refresh(new_version)
        
        agent.current_version_id = new_version.id
        agent.updated_at = datetime.utcnow()
        session.add(agent)
        session.commit()
        session.refresh(agent)
        
        return new_version

    def create_agent(self, session: Session, name: str, description: str = None) -> Agent:
        agent = Agent(name=name, description=description)
        session.add(agent)
        session.commit()
        session.refresh(agent)
        
        # Create initial runnable version
        default_code = f"""import time
import os

print("Starting agent '{name}' initialization...")
print("Environment check: OK")

def task():
    print("Performing automated task...")
    time.sleep(1)
    print("Task data processed.")
    
    # Write a sample artifact
    with open("/data/status.txt", "w") as f:
        f.write("Agent run successful.\\nTimestamp: " + str(time.time()))
    print("Artifact 'status.txt' written.")

if __name__ == "__main__":
    task()
    print("Agent execution complete.")
"""
        version = AgentVersion(agent_id=agent.id, code=default_code, dependencies="requests\n")
        session.add(version)
        session.commit()
        session.refresh(version)
        
        agent.current_version_id = version.id
        session.add(agent)
        session.commit()
        session.refresh(agent)
        return agent

    def delete_agent(self, session: Session, agent_id: int) -> bool:
        agent = session.get(Agent, agent_id)
        if not agent:
            return False
        session.delete(agent)
        session.commit()
        return True

    def list_runs(self, session: Session, agent_id: int) -> List[Run]:
        return session.exec(select(Run).where(Run.agent_id == agent_id).order_by(Run.start_time.desc())).all()

    def create_run(self, session: Session, agent_id: int, trigger_type: str = "manual") -> Run:
        agent = self.get_agent(session, agent_id)
        if not agent:
            raise ValueError("Agent not found")
        
        run = Run(
            agent_id=agent.id,
            version_id=agent.current_version_id,
            trigger_type=trigger_type,
            status="queued"
        )
        session.add(run)
        session.commit()
        session.refresh(run)
        return run

    def get_latest_run_logs(self, session: Session, agent_id: int) -> Optional[str]:
        run = session.exec(select(Run).where(Run.agent_id == agent_id).order_by(Run.start_time.desc())).first()
        return run.logs if run else None


agent_service = AgentService()
