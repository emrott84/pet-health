(() => {
  'use strict';

  const APP_ID = 'pet-health';
  const VERSION = 3;

  function makeId(prefix = 'id') {
    if (
      globalThis.crypto &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID();
    }

    return `${prefix}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  function defaultState() {
    const now = new Date().toISOString();

    return {
      app: APP_ID,
      version: VERSION,
      createdAt: now,
      updatedAt: now,

      pets: [],
      weights: [],
      journalEntries: []
    };
  }

  function normalizeCondition(condition) {
    const now = new Date().toISOString();

    return {
      id: String(
        condition?.id ||
        makeId('condition')
      ),

      name: String(
        condition?.name || ''
      ).trim(),

      note: String(
        condition?.note || ''
      ).trim(),

      active:
        condition?.active !== false,

      createdAt:
        condition?.createdAt || now,

      updatedAt:
        condition?.updatedAt ||
        condition?.createdAt ||
        now
    };
  }

  function normalizeMedication(medication) {
    const now = new Date().toISOString();

    return {
      id: String(
        medication?.id ||
        makeId('medication')
      ),

      name: String(
        medication?.name || ''
      ).trim(),

      dose: String(
        medication?.dose || ''
      ).trim(),

      note: String(
        medication?.note || ''
      ).trim(),

      active:
        medication?.active !== false,

      createdAt:
        medication?.createdAt || now,

      updatedAt:
        medication?.updatedAt ||
        medication?.createdAt ||
        now
    };
  }

  function normalizePet(pet) {
    const now = new Date().toISOString();

    const neutered =
      pet?.neutered === true
        ? true
        : pet?.neutered === false
          ? false
          : null;

    return {
      id: String(
        pet?.id || makeId('pet')
      ),

      name: String(
        pet?.name || ''
      ).trim(),

      species: String(
        pet?.species || ''
      ).trim(),

      breed: String(
        pet?.breed || ''
      ).trim(),

      birthDate:
        pet?.birthDate
          ? String(pet.birthDate)
          : '',

      birthDateApproximate:
        Boolean(
          pet?.birthDateApproximate
        ),

      sex:
        [
          'female',
          'male',
          'unknown'
        ].includes(pet?.sex)
          ? pet.sex
          : '',

      neutered,

      targetWeightMin:
        pet?.targetWeightMin != null &&
        Number.isFinite(
          Number(pet.targetWeightMin)
        )
          ? Number(
              pet.targetWeightMin
            )
          : null,

      targetWeightMax:
        pet?.targetWeightMax != null &&
        Number.isFinite(
          Number(pet.targetWeightMax)
        )
          ? Number(
              pet.targetWeightMax
            )
          : null,

      conditions:
        Array.isArray(
          pet?.conditions
        )
          ? pet.conditions
              .map(
                normalizeCondition
              )
              .filter(
                (item) => item.name
              )
          : [],

      medications:
        Array.isArray(
          pet?.medications
        )
          ? pet.medications
              .map(
                normalizeMedication
              )
              .filter(
                (item) => item.name
              )
          : [],

      createdAt:
        pet?.createdAt || now,

      updatedAt:
        pet?.updatedAt || now
    };
  }

  function normalizeWeight(weight) {
    const now = new Date().toISOString();

    return {
      id: String(
        weight?.id ||
        makeId('weight')
      ),

      petId: String(
        weight?.petId || ''
      ),

      date: String(
        weight?.date || ''
      ),

      weightKg:
        Number(weight?.weightKg),

      note: String(
        weight?.note || ''
      ).trim(),

      createdAt:
        weight?.createdAt || now,

      updatedAt:
        weight?.updatedAt ||
        weight?.createdAt ||
        now
    };
  }

  function normalizeJournalEntry(entry) {
    const now =
      new Date().toISOString();

    return {
      id: String(
        entry?.id ||
        makeId('journal')
      ),

      petId: String(
        entry?.petId || ''
      ),

      date: String(
        entry?.date || ''
      ),

      text: String(
        entry?.text || ''
      ).trim(),

      createdAt:
        entry?.createdAt || now,

      updatedAt:
        entry?.updatedAt ||
        entry?.createdAt ||
        now
    };
  }

  function validateV3State(value) {
    return (
      value &&
      typeof value === 'object' &&
      value.app === APP_ID &&
      Number(value.version) === 3 &&
      Array.isArray(value.pets) &&
      Array.isArray(value.weights) &&
      Array.isArray(
        value.journalEntries
      )
    );
  }

  function normalizeCurrentState(value) {
    const base = defaultState();

    const pets =
      value.pets.map(
        normalizePet
      );

    const petIds =
      new Set(
        pets.map(
          (pet) => pet.id
        )
      );

    const weights =
      value.weights
        .map(normalizeWeight)
        .filter(
          (weight) =>
            petIds.has(
              weight.petId
            ) &&
            /^\d{4}-\d{2}-\d{2}$/.test(
              weight.date
            ) &&
            Number.isFinite(
              weight.weightKg
            ) &&
            weight.weightKg > 0
        );

    const journalEntries =
      value.journalEntries
        .map(
          normalizeJournalEntry
        )
        .filter(
          (entry) =>
            petIds.has(
              entry.petId
            ) &&
            /^\d{4}-\d{2}-\d{2}$/.test(
              entry.date
            ) &&
            entry.text
        );

    return {
      ...base,
      ...value,

      app: APP_ID,
      version: VERSION,

      pets,
      weights,
      journalEntries
    };
  }

  async function loadFromApi() {
    const response = await fetch(
      '/api/state',
      {
        headers: {
          Accept: 'application/json'
        },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      throw new Error(
        `API-State konnte nicht geladen werden (${response.status}).`
      );
    }

    const parsed = await response.json();

    if (!validateV3State(parsed)) {
      throw new Error(
        'Ungültiger Pet-Health-State von der API.'
      );
    }

    return normalizeCurrentState(
      parsed
    );
  }

  async function createPetOnApi(data) {
    const response = await fetch(
      '/api/pets',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },

        body: JSON.stringify(data)
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        `Tier konnte nicht angelegt werden (${response.status}).`
      );
    }

    return normalizePet(
      result.pet
    );
  }


  async function updatePetOnApi(
    petId,
    data
  ) {
    const response = await fetch(
      `/api/pets/${encodeURIComponent(petId)}`,
      {
        method: 'PUT',

        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },

        body: JSON.stringify(data)
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        `Tier konnte nicht aktualisiert werden (${response.status}).`
      );
    }

    return normalizePet(
      result.pet
    );
  }

  async function saveWeightOnApi(
    petId,
    date,
    weightKg,
    note = ''
  ) {
    const response = await fetch(
      `/api/pets/${encodeURIComponent(petId)}/weights/${encodeURIComponent(date)}`,
      {
        method: 'PUT',

        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },

        body: JSON.stringify({
          weightKg,
          note
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        `Gewicht konnte nicht gespeichert werden (${response.status}).`
      );
    }

    return result.weight;
  }

  async function createJournalOnApi(
    petId,
    date,
    text
  ) {
    const response = await fetch(
      `/api/pets/${encodeURIComponent(petId)}/journal`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },

        body: JSON.stringify({
          date,
          text
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        `Bemerkung konnte nicht gespeichert werden (${response.status}).`
      );
    }

    return result.journalEntry;
  }

  async function updateJournalOnApi(
    petId,
    journalId,
    text
  ) {
    const response = await fetch(
      `/api/pets/${encodeURIComponent(petId)}/journal/${encodeURIComponent(journalId)}`,
      {
        method: 'PUT',

        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },

        body: JSON.stringify({
          text
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        `Bemerkung konnte nicht aktualisiert werden (${response.status}).`
      );
    }

    return normalizeJournalEntry(
      result.journalEntry
    );
  }

  async function deleteJournalOnApi(
    petId,
    journalId
  ) {
    const response = await fetch(
      `/api/pets/${encodeURIComponent(petId)}/journal/${encodeURIComponent(journalId)}`,
      {
        method: 'DELETE',
        headers: {
          Accept: 'application/json'
        }
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        `Bemerkung konnte nicht gelöscht werden (${response.status}).`
      );
    }

    return result.journalId;
  }

  window.PetHealthStorage = {
    loadFromApi,
    createPetOnApi,
    updatePetOnApi,
    saveWeightOnApi,
    createJournalOnApi,
    updateJournalOnApi,
    deleteJournalOnApi
  };
})();