"""
GLPI Universal Backend — Configuration
Pydantic Settings com suporte multi-instância (DTIC + SIS)
"""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


class GLPIInstance:
    """Configuração de uma instância GLPI."""

    def __init__(self, url: str, app_token: str, user_token: str):
        self.url = self._normalize_url(url)
        self.app_token = app_token
        self.user_token = user_token

    @staticmethod
    def _normalize_url(url: str) -> str:
        return url.rstrip("/")

    def __repr__(self) -> str:
        return f"GLPIInstance(url={self.url})"


class DBConfig:
    """Configuração de um banco de dados MySQL."""

    def __init__(self, host: str, port: int, name: str, user: str, password: str):
        self.host = host
        self.port = port
        self.name = name
        self.user = user
        self.password = password

    @property
    def dsn(self) -> str:
        return f"mysql+aiomysql://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"

    def __repr__(self) -> str:
        return f"DBConfig(host={self.host}, db={self.name})"


class Settings(BaseSettings):
    """Configurações carregadas do .env"""

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # DTIC GLPI API
    dtic_glpi_url: str = Field(alias="DTIC_GLPI_URL")
    dtic_glpi_app_token: str = Field(alias="DTIC_GLPI_APP_TOKEN")
    dtic_glpi_user_token: str = Field(alias="DTIC_GLPI_USER_TOKEN")

    # SIS GLPI API
    sis_glpi_url: str = Field(alias="SIS_GLPI_URL")
    sis_glpi_app_token: str = Field(alias="SIS_GLPI_APP_TOKEN")
    sis_glpi_user_token: str = Field(alias="SIS_GLPI_USER_TOKEN")

    # SIS Database
    db_host: str = Field(default="10.72.30.39", alias="DB_HOST")
    db_port: int = Field(default=3306, alias="DB_PORT")
    db_name: str = Field(default="sisdb", alias="DB_NAME")
    db_user: str = Field(default="sis_r", alias="DB_USER")
    db_pass: str = Field(default="", alias="DB_PASS")

    # DTIC Database
    db_host_dtic: str = Field(default="10.72.30.39", alias="DB_HOST_DTIC")
    db_port_dtic: int = Field(default=3306, alias="DB_PORT_DTIC")
    db_name_dtic: str = Field(default="glpi2db", alias="DB_NAME_DTIC")
    db_user_dtic: str = Field(default="cau_r", alias="DB_USER_DTIC")
    db_pass_dtic: str = Field(default="", alias="DB_PASS_DTIC")

    # Charger Categories (SIS)
    sis_charger_itil_categories: str = Field(
        default="55,56,57,58,101,102,103",
        alias="SIS_CHARGER_ITIL_CATEGORIES"
    )

    # App
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    app_port: int = Field(default=8080, alias="APP_PORT")

    def get_glpi_instance(self, context: str) -> GLPIInstance:
        """Retorna a instância GLPI para o contexto (dtic ou sis)."""
        ctx = context.lower()
        if ctx == "dtic":
            return GLPIInstance(
                url=self.dtic_glpi_url,
                app_token=self.dtic_glpi_app_token,
                user_token=self.dtic_glpi_user_token,
            )
        elif ctx == "sis":
            return GLPIInstance(
                url=self.sis_glpi_url,
                app_token=self.sis_glpi_app_token,
                user_token=self.sis_glpi_user_token,
            )
        else:
            raise ValueError(f"Contexto inválido: '{context}'. Use 'dtic' ou 'sis'.")

    def get_db_config(self, context: str) -> DBConfig:
        """Retorna a config de DB para o contexto."""
        ctx = context.lower()
        if ctx == "dtic":
            return DBConfig(
                host=self.db_host_dtic,
                port=self.db_port_dtic,
                name=self.db_name_dtic,
                user=self.db_user_dtic,
                password=self.db_pass_dtic,
            )
        elif ctx == "sis":
            return DBConfig(
                host=self.db_host,
                port=self.db_port,
                name=self.db_name,
                user=self.db_user,
                password=self.db_pass,
            )
        else:
            raise ValueError(f"Contexto inválido: '{context}'. Use 'dtic' ou 'sis'.")


# Singleton
settings = Settings()
