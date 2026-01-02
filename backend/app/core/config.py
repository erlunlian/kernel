import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Kernel"
    DATABASE_URL: str = "sqlite:///./kernel.db"
    ARTIFACTS_DIR: str = os.path.join(os.getcwd(), "kernel_data")
    E2B_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    SECRET_KEY: str = "CHANGE_ME_IN_PROD_BUT_MUST_BE_URL_SAFE_BASE64_32_BYTES" 

    class Config:
        env_file = ".env"

settings = Settings()
