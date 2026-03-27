"""
config.py
---------
Loads all environment variables from .env using pydantic-settings.
All settings are validated at startup — bad config fails fast with
a clear error before the app accepts any requests.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str = "expense_tracker"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Singleton — import this everywhere instead of reading os.environ directly
settings = Settings()
