import os
import shutil
from typing import List
from app.core.config import settings

class ArtifactService:
    def __init__(self):
        self.base_dir = settings.ARTIFACTS_DIR
        os.makedirs(self.base_dir, exist_ok=True)
        # Ensure subdirectories
        os.makedirs(os.path.join(self.base_dir, "inbox"), exist_ok=True)

    def get_run_dir(self, agent_name: str, run_id: int) -> str:
        """Creates and returns the directory for a specific run."""
        path = os.path.join(self.base_dir, agent_name, str(run_id))
        os.makedirs(path, exist_ok=True)
        return path

    def save_artifact(self, agent_name: str, run_id: int, filename: str, content: bytes):
        run_dir = self.get_run_dir(agent_name, run_id)
        # Security check to prevent .. traversal
        safe_filename = os.path.basename(filename)
        path = os.path.join(run_dir, safe_filename)
        with open(path, "wb") as f:
            f.write(content)
        return path

    def list_artifacts(self, agent_name: str, run_id: int) -> List[str]:
        run_dir = self.get_run_dir(agent_name, run_id)
        if not os.path.exists(run_dir):
            return []
        return os.listdir(run_dir)

artifact_service = ArtifactService()
