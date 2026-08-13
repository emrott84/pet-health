from datetime import datetime, timezone
from pathlib import Path
import sqlite3
import uuid

from flask import Flask, jsonify, request


app = Flask(__name__)


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "pethealth.db"


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def get_connection():
    connection = sqlite3.connect(DB_PATH)

    connection.row_factory = sqlite3.Row

    connection.execute(
        "PRAGMA foreign_keys = ON"
    )

    return connection


def init_database():
    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    with get_connection() as connection:

        connection.execute("""
            CREATE TABLE IF NOT EXISTS app_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)


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


def pet_to_dict(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "species": row["species"],
        "breed": row["breed"],

        "birthDate":
            row["birth_date"],

        "birthDateApproximate":
            bool(
                row[
                    "birth_date_approximate"
                ]
            ),

        "sex": row["sex"],

        "neutered":
            None
            if row["neutered"] is None
            else bool(row["neutered"]),

        "targetWeightMin":
            row["target_weight_min"],

        "targetWeightMax":
            row["target_weight_max"],

        "createdAt":
            row["created_at"],

        "updatedAt":
            row["updated_at"]
    }

def weight_to_dict(row):
    return {
        "id": row["id"],
        "petId": row["pet_id"],
        "date": row["date"],
        "weightKg": row["weight_kg"],
        "note": row["note"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"]
    }


def journal_to_dict(row):
    return {
        "id": row["id"],
        "petId": row["pet_id"],
        "date": row["date"],
        "text": row["text"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"]
    }


def condition_to_dict(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "note": row["note"],
        "active": bool(row["active"]),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"]
    }


def medication_to_dict(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "dose": row["dose"],
        "note": row["note"],
        "active": bool(row["active"]),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"]
    }

@app.get("/api/state")
def get_state():
    with get_connection() as connection:

        pet_rows = connection.execute("""
            SELECT *
            FROM pets
            ORDER BY name COLLATE NOCASE
        """).fetchall()


        weight_rows = connection.execute("""
            SELECT *
            FROM weights
            ORDER BY date, created_at
        """).fetchall()


        journal_rows = connection.execute("""
            SELECT *
            FROM journal_entries
            ORDER BY date, created_at
        """).fetchall()


        condition_rows = connection.execute("""
            SELECT *
            FROM conditions
            ORDER BY created_at
        """).fetchall()


        medication_rows = connection.execute("""
            SELECT *
            FROM medications
            ORDER BY created_at
        """).fetchall()


    conditions_by_pet = {}

    for row in condition_rows:
        pet_id = row["pet_id"]

        conditions_by_pet.setdefault(
            pet_id,
            []
        ).append(
            condition_to_dict(row)
        )


    medications_by_pet = {}

    for row in medication_rows:
        pet_id = row["pet_id"]

        medications_by_pet.setdefault(
            pet_id,
            []
        ).append(
            medication_to_dict(row)
        )


    pets = []

    for row in pet_rows:
        pet = pet_to_dict(row)

        pet["conditions"] = (
            conditions_by_pet.get(
                pet["id"],
                []
            )
        )

        pet["medications"] = (
            medications_by_pet.get(
                pet["id"],
                []
            )
        )

        pets.append(pet)


    return jsonify({
        "app": "pet-health",
        "version": 3,

        "pets": pets,

        "weights": [
            weight_to_dict(row)
            for row in weight_rows
        ],

        "journalEntries": [
            journal_to_dict(row)
            for row in journal_rows
        ]
    })


@app.get("/api/pets")
def get_pets():
    with get_connection() as connection:

        rows = connection.execute("""
            SELECT *
            FROM pets
            ORDER BY name COLLATE NOCASE
        """).fetchall()

    return jsonify([
        pet_to_dict(row)
        for row in rows
    ])

@app.put("/api/pets/<pet_id>/weights/<date_value>")
def save_weight(pet_id, date_value):
    data = request.get_json(silent=True) or {}


    # Datum prüfen
    try:
        datetime.strptime(
            date_value,
            "%Y-%m-%d"
        )

    except ValueError:
        return jsonify({
            "error":
                "Ungültiges Datum. Erwartet wird YYYY-MM-DD."
        }), 400


    # Gewicht prüfen
    raw_weight = data.get("weightKg")

    if (
        raw_weight is None or
        isinstance(raw_weight, bool)
    ):
        return jsonify({
            "error":
                "Ein gültiges Gewicht wird benötigt."
        }), 400


    try:
        weight_kg = float(raw_weight)

    except (TypeError, ValueError):
        return jsonify({
            "error":
                "Ein gültiges Gewicht wird benötigt."
        }), 400


    if (
        weight_kg <= 0 or
        weight_kg > 5000
    ):
        return jsonify({
            "error":
                "Das Gewicht muss zwischen 0 und 5000 kg liegen."
        }), 400


    note = str(
        data.get("note", "")
    ).strip()

    now = now_iso()

    weight_id = "weight_" + uuid.uuid4().hex


    with get_connection() as connection:

        # Existiert das Tier überhaupt?
        pet = connection.execute("""
            SELECT id
            FROM pets
            WHERE id = ?
        """, (
            pet_id,
        )).fetchone()


        if not pet:
            return jsonify({
                "error":
                    "Tier nicht gefunden."
            }), 404


        connection.execute("""
            INSERT INTO weights (
                id,
                pet_id,
                date,
                weight_kg,
                note,
                created_at,
                updated_at
            )
            VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
            )

            ON CONFLICT (pet_id, date)
            DO UPDATE SET
                weight_kg = excluded.weight_kg,
                note = excluded.note,
                updated_at = excluded.updated_at
        """, (
            weight_id,
            pet_id,
            date_value,
            weight_kg,
            note,
            now,
            now
        ))


        connection.commit()


        row = connection.execute("""
            SELECT *
            FROM weights
            WHERE
                pet_id = ?
                AND date = ?
        """, (
            pet_id,
            date_value
        )).fetchone()


    created = row["id"] == weight_id


    response = jsonify({
        "created": created,
        "weight": weight_to_dict(row)
    })


    return (
        response,
        201 if created else 200
    )


@app.post("/api/pets")
def create_pet():
    data = request.get_json(silent=True) or {}

    name = str(
        data.get("name", "")
    ).strip()

    species = str(
        data.get("species", "")
    ).strip()


    if not name or not species:
        return jsonify({
            "error":
                "Name und Tierart werden benötigt."
        }), 400


    pet_id = "pet_" + uuid.uuid4().hex

    now = now_iso()


    birth_date = data.get("birthDate") or None

    birth_approximate = 1 if data.get(
            "birthDateApproximate",
            False
        ) else 0


    neutered_value = data.get("neutered")

    if neutered_value is True:
        neutered = 1

    elif neutered_value is False:
        neutered = 0

    else:
        neutered = None


    target_min = data.get("targetWeightMin")

    target_max = data.get("targetWeightMax")


    with get_connection() as connection:

        connection.execute("""
            INSERT INTO pets (
                id,
                name,
                species,
                breed,
                birth_date,
                birth_date_approximate,
                sex,
                neutered,
                target_weight_min,
                target_weight_max,
                created_at,
                updated_at
            )
            VALUES (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
            )
        """, (
            pet_id,
            name,
            species,
            str(
                data.get(
                    "breed",
                    ""
                )
            ).strip(),
            birth_date,
            birth_approximate,
            data.get("sex") or None,
            neutered,
            target_min,
            target_max,
            now,
            now
        ))

        connection.commit()

        row = connection.execute("""
            SELECT *
            FROM pets
            WHERE id = ?
        """, (
            pet_id,
        )).fetchone()


    return jsonify(
        pet_to_dict(row)
    ), 201


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
            version[0]
            if version
            else None,

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