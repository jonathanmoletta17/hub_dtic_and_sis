"""
Configuração do Pytest — tensor-aurora

Define env vars falsas ANTES de importar a aplicação para evitar erro
de validação do BaseSettings do Pydantic (que ocorre no import level).
"""
import os

os.environ.setdefault("DTIC_GLPI_URL", "http://mock.dtic.local")
os.environ.setdefault("DTIC_GLPI_APP_TOKEN", "mock")
os.environ.setdefault("DTIC_GLPI_USER_TOKEN", "mock")

os.environ.setdefault("SIS_GLPI_URL", "http://mock.sis.local")
os.environ.setdefault("SIS_GLPI_APP_TOKEN", "mock")
os.environ.setdefault("SIS_GLPI_USER_TOKEN", "mock")

os.environ.setdefault("GLPI_CORS_ORIGINS", "http://localhost:3000")
os.environ.setdefault("SESSION_SECRET_KEY", "mock_" * 4) # 20 chars min
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
