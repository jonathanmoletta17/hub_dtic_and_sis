from __future__ import annotations

import pytest

from app.config import Settings


def make_settings(**overrides: object) -> Settings:
    base_values = {
        "DTIC_GLPI_URL": "http://dtic.local/apirest.php/",
        "DTIC_GLPI_APP_TOKEN": "dtic-app",
        "DTIC_GLPI_USER_TOKEN": None,
        "SIS_GLPI_URL": "http://sis.local/apirest.php/",
        "SIS_GLPI_APP_TOKEN": "sis-app",
        "SIS_GLPI_USER_TOKEN": None,
        "DB_HOST": "sis-db.local",
        "DB_PORT": 3307,
        "DB_NAME": "sisdb",
        "DB_USER": "sis-user",
        "DB_PASS": "sis-pass",
        "DB_HOST_DTIC": "dtic-db.local",
        "DB_PORT_DTIC": 3310,
        "DB_NAME_DTIC": "dticdb",
        "DB_USER_DTIC": "dtic-user",
        "DB_PASS_DTIC": "dtic-pass",
        "CORS_ORIGINS": " http://localhost:3000 , http://hub.local:8080 ,, ",
    }
    base_values.update(overrides)
    return Settings(_env_file=None, **base_values)


def test_cors_origins_are_trimmed_and_empty_entries_removed() -> None:
    settings = make_settings()

    assert settings.cors_origins == [
        "http://localhost:3000",
        "http://hub.local:8080",
    ]


def test_get_glpi_instance_normalizes_trailing_slash() -> None:
    settings = make_settings()

    instance = settings.get_glpi_instance("DTIC")

    assert instance.url == "http://dtic.local/apirest.php"
    assert instance.app_token == "dtic-app"
    assert instance.user_token is None


def test_get_glpi_instance_keeps_optional_service_user_token_when_configured() -> None:
    settings = make_settings(DTIC_GLPI_USER_TOKEN="dtic-user")

    instance = settings.get_glpi_instance("DTIC")

    assert instance.user_token == "dtic-user"


def test_get_db_config_returns_context_specific_dsn() -> None:
    settings = make_settings()

    sis_db = settings.get_db_config("sis")
    dtic_db = settings.get_db_config("dtic")

    assert sis_db.dsn == "mysql+aiomysql://sis-user:sis-pass@sis-db.local:3307/sisdb"
    assert dtic_db.dsn == "mysql+aiomysql://dtic-user:dtic-pass@dtic-db.local:3310/dticdb"


@pytest.mark.parametrize("method_name", ["get_glpi_instance", "get_db_config"])
def test_invalid_context_raises_clear_value_error(method_name: str) -> None:
    settings = make_settings()

    with pytest.raises(ValueError, match="Contexto inv"):
        getattr(settings, method_name)("foo")
