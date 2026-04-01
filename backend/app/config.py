from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379/0"
    RESEND_API_KEY: str = ""
    BASE_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"

settings = Settings()
