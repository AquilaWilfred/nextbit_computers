from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

ROOT_ENV = None
for candidate in Path(__file__).resolve().parents:
    env_path = candidate / ".env"
    if env_path.exists() and env_path.is_file() and env_path.stat().st_size > 0:
        ROOT_ENV = env_path
        break

class Settings(BaseSettings):
    app_name: str = "NextBit Catalogue API"
    app_version: str = "0.1.0"
    debug: bool = True
    port: int = 8001

    database_url: str
    mongo_url: str
    redis_url: str

    gateway_url: str = "http://localhost:8080"
    internal_api_key: str = "nextbit_internal_secret_2026"

    class Config:
        env_file = str(ROOT_ENV) if ROOT_ENV else ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
