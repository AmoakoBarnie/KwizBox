"""App configuration via environment / defaults."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./trivia.db"
    jwt_secret: str = "CHANGE_ME_IN_PROD_ghana_stem_trivia"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 30  # 30 days for child convenience
    admin_token_expire_minutes: int = 60 * 12  # 12h admin sessions
    question_pack_size: int = 12  # questions per session (10-15 per plan)

    class Config:
        env_file = ".env"


settings = Settings()
