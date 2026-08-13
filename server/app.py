from pathlib import Path
import sqlite3

from flask import Flask, jsonify


app = Flask(__name__)


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "pethealth.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)

    # SQLite erzwingt Fremdschlüsselbeziehungen
    # nicht automatisch bei jeder Verbindung.
    connection.execute("PRAGMA foreign_keys = ON")

    return connection


def init_database():
    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    with get_connection() as connection:

        # Interne Informationen zur Datenbank
        connection.execute("""
            CREATE TABLE IF NOT EXISTS app_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)


        # Tiere / Stammdaten
        connection.execute("""
            CREATE TABLE IF NOT EXISTS pets (
                id TEXT PRIMARY KEY,

                name TEXT NOT NULL,
                species TEXT NOT NULL,
                breed TEXT NOT NULL DEFAULT '',

                birth_date TEXT,
                birth_date_approximate INTEGER
                    NOT NULL DEFAULT 0,

                sex TEXT,
                neutered INTEGER,

                target_weight_min REAL,
                target_weight_max REAL,

                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)


        # Gewicht
        connection.execute("""
            CREATE TABLE IF NOT EXISTS weights (
                id TEXT PRIMARY KEY,

                pet_id TEXT NOT NULL,
                date TEXT NOT NULL,
                weight_kg REAL NOT NULL,
                note TEXT NOT NULL DEFAULT '',

                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,

                FOREIGN KEY (pet_id)
                    REFERENCES pets(id)
                    ON DELETE CASCADE,

                UNIQUE (pet_id, date)
            )
        """)


        # Bemerkungen / Journal
        connection.execute("""
            CREATE TABLE IF NOT EXISTS journal_entries (
                id TEXT PRIMARY KEY,

                pet_id TEXT NOT NULL,
                date TEXT NOT NULL,
                text TEXT NOT NULL,

                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,

                FOREIGN KEY (pet_id)
                    REFERENCES pets(id)
                    ON DELETE CASCADE
            )
        """)


        # Krankheiten / Diagnosen
        connection.execute("""
            CREATE TABLE IF NOT EXISTS conditions (
                id TEXT PRIMARY KEY,

                pet_id TEXT NOT NULL,
                name TEXT NOT NULL,
                note TEXT NOT NULL DEFAULT '',
                active INTEGER NOT NULL DEFAULT 1,

                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,

                FOREIGN KEY (pet_id)
                    REFERENCES pets(id)
                    ON DELETE CASCADE
            )
        """)


        # Medikation
        connection.execute("""
            CREATE TABLE IF NOT EXISTS medications (
                id TEXT PRIMARY KEY,

                pet_id TEXT NOT NULL,
                name TEXT NOT NULL,
                dose TEXT NOT NULL DEFAULT '',
                note TEXT NOT NULL DEFAULT '',
                active INTEGER NOT NULL DEFAULT 1,

                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,

                FOREIGN KEY (pet_id)
                    REFERENCES pets(id)
                    ON DELETE CASCADE
            )
        """)


        # Indizes für häufige Abfragen
        connection.execute("""
            CREATE INDEX IF NOT EXISTS
            idx_weights_pet_date
            ON weights (pet_id, date)
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS
            idx_journal_pet_date
            ON journal_entries (pet_id, date)
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS
            idx_conditions_pet
            ON conditions (pet_id)
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS
            idx_medications_pet
            ON medications (pet_id)
        """)


        connection.execute("""
            INSERT OR IGNORE INTO app_meta (
                key,
                value
            )
            VALUES (
                'database_version',
                '1'
            )
        """)

        connection.commit()


@app.get("/api/health")
def health():
    with get_connection() as connection:

        tables = connection.execute("""
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            ORDER BY name
        """).fetchall()

        version = connection.execute("""
            SELECT value
            FROM app_meta
            WHERE key = 'database_version'
        """).fetchone()

    return jsonify({
        "status": "ok",
        "database": DB_PATH.name,
        "databaseVersion":
            version[0] if version else None,
        "tables": [
            row[0]
            for row in tables
        ]
    })


if __name__ == "__main__":
    init_database()

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False
    )