from __future__ import annotations

import os
from pathlib import Path


TEST_ENV = {
    "DTIC_GLPI_URL": "http://dtic.local/apirest.php",
    "DTIC_GLPI_APP_TOKEN": "dtic-app",
    "SIS_GLPI_URL": "http://sis.local/apirest.php",
    "SIS_GLPI_APP_TOKEN": "sis-app",
    "DB_HOST": "sis-db.local",
    "DB_PORT": "3307",
    "DB_NAME": "sisdb",
    "DB_USER": "sis-user",
    "DB_PASS": "sis-pass",
    "DB_HOST_DTIC": "dtic-db.local",
    "DB_PORT_DTIC": "3310",
    "DB_NAME_DTIC": "dticdb",
    "DB_USER_DTIC": "dtic-user",
    "DB_PASS_DTIC": "dtic-pass",
    "LOCAL_STATE_DB_PATH": str(Path(__file__).resolve().parent / ".tmp" / "local_state.db"),
}


for key, value in TEST_ENV.items():
    os.environ.setdefault(key, value)
