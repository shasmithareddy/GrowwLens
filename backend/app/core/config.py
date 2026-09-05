import os
from pydantic import BaseModel


def load_dotenv_file() -> None:
    """Load simple KEY=VALUE entries without requiring a third-party package."""
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.env"))
    if not os.path.exists(env_path):
        return
    with open(env_path, "r", encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_dotenv_file()

class Settings(BaseModel):
    PROJECT_NAME: str = "GrowwLens"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")
    
    # Real Groww API Credentials
    GROWW_API_KEY: str = os.getenv("GROWW_API_KEY", "")
    GROWW_API_SECRET: str = os.getenv("GROWW_API_SECRET", "")
    
    # Storage & Consistency
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///groww_lens.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    REDIS_ENABLED: bool = os.getenv("REDIS_ENABLED", "").lower() in {"1", "true", "yes"}
    
    # Optional Third-Party Services
    FINNHUB_API_KEY: str = os.getenv("FINNHUB_API_KEY", "")
    TWELVEDATA_API_KEY: str = os.getenv("TWELVEDATA_API_KEY", "")
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "alerts@growwlens.dev")
    
    # Indian Stock Market API Credentials
    INDIAN_STOCK_API_KEY: str = os.getenv("INDIAN_STOCK_API_KEY", "")
    INDIAN_STOCK_API_URL: str = os.getenv("INDIAN_STOCK_API_URL", "https://stock.indianapi.in")
    
    # Market Stream Configuration
    SIMULATOR_INTERVAL_SECONDS: float = float(os.getenv("SIMULATOR_INTERVAL_SECONDS", "1.5"))
    REAL_GROWW_POLL_INTERVAL_SECONDS: float = float(os.getenv("REAL_GROWW_POLL_INTERVAL_SECONDS", "3.0"))
    STALE_DATA_THRESHOLD_SECONDS: float = 15.0
    ANOMALY_VOLUME_MULTIPLIER: float = 2.0
    ALERT_COOLDOWN_SECONDS: int = 60
    SIMULATION_ENABLED_BY_DEFAULT: bool = False

settings = Settings()
