# App configuration via environment / defaults.
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./trivia.db"
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 30  # 30 days for child convenience
    admin_token_expire_minutes: int = 60 * 2  # 2h admin sessions — re-login after expiry
    question_pack_size: int = 12  # questions per session (10-15 per plan)

    # NOTE: jwt_secret MUST be set in the environment (no default — prevents accidental prod use).
    # Example: export JWT_SECRET="your-256-bit-secret-here"

    class Config:
        env_file = ".env"


settings = Settings()
