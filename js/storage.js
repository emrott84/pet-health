(() => {
  'use strict';

  const APP_ID = 'pet-health';
  const VERSION = 2;
  const STORAGE_KEY = 'petHealth.v2';
  const LEGACY_V1_KEY = 'petHealth.v1';

  function makeId(prefix = 'id') {
    if (globalThis.crypto && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `${prefix}-` +
      Date.now().toString(36) +
      '-' +
      Math.random().toString(36).slice(2, 10);
  }

  function defaultState() {
    const now = new Date().toISOString();

    return {
      app: APP_ID,
      version: VERSION,
      createdAt: now,
      updatedAt: now,
      pets: [],
      weights: []
    };
  }

  function normalizeCondition(condition) {
    const now = new Date().toISOString();

    return {
      id: String(condition?.id || makeId('condition')),
      name: String(condition?.name || '').trim(),
      note: String(condition?.note || '').trim(),
      active: condition?.active !== false,
      createdAt: condition?.createdAt || now,
      updatedAt: condition?.updatedAt || condition?.createdAt || now
    };
  }

  function normalizeMedication(medication) {
    const now = new Date().toISOString();

    return {
      id: String(medication?.id || makeId('medication')),
      name: String(medication?.name || '').trim(),
      dose: String(medication?.dose || '').trim(),
      note: String(medication?.note || '').trim(),
      active: medication?.active !== false,
      createdAt: medication?.createdAt || now,
      updatedAt: medication?.updatedAt || medication?.createdAt || now
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
      id: String(pet?.id || makeId('pet')),
      name: String(pet?.name || '').trim(),
      species: String(pet?.species || '').trim(),
      breed: String(pet?.breed || '').trim(),

      birthDate: pet?.birthDate
        ? String(pet.birthDate)
        : '',

      birthDateApproximate: Boolean(pet?.birthDateApproximate),

      sex: ['female', 'male', 'unknown'].includes(pet?.sex)
        ? pet.sex
        : '',

      neutered,

      targetWeightMin:
        pet?.targetWeightMin != null &&
        Number.isFinite(Number(pet.targetWeightMin))
          ? Number(pet.targetWeightMin)
          : null,

      targetWeightMax:
        pet?.targetWeightMax != null &&
        Number.isFinite(Number(pet.targetWeightMax))
          ? Number(pet.targetWeightMax)
          : null,

      conditions: Array.isArray(pet?.conditions)
        ? pet.conditions
            .map(normalizeCondition)
            .filter((item) => item.name)
        : [],

      medications: Array.isArray(pet?.medications)
        ? pet.medications
            .map(normalizeMedication)
            .filter((item) => item.name)
        : [],

      createdAt: pet?.createdAt || now,
      updatedAt: pet?.updatedAt || now
    };
  }

  function normalizeWeight(weight) {
    const now = new Date().toISOString();

    return {
      id: String(weight?.id || makeId('weight')),
      petId: String(weight?.petId || ''),
      date: String(weight?.date || ''),
      weightKg: Number(weight?.weightKg),
      note: String(weight?.note || '').trim(),
      createdAt: weight?.createdAt || now,
      updatedAt: weight?.updatedAt || weight?.createdAt || now
    };
  }

  function validateCurrentState(value) {
    return (
      value &&
      typeof value === 'object' &&
      value.app === APP_ID &&
      Number(value.version) === VERSION &&
      Array.isArray(value.pets) &&
      Array.isArray(value.weights)
    );
  }

  function validateV1State(value) {
    return (
      value &&
      typeof value === 'object' &&
      value.app === APP_ID &&
      Number(value.version) === 1 &&
      Array.isArray(value.pets)
    );
  }

  function normalizeCurrentState(value) {
    const base = defaultState();

    const pets = value.pets.map(normalizePet);
    const petIds = new Set(
      pets.map((pet) => pet.id)
    );

    const weights = value.weights
      .map(normalizeWeight)
      .filter((weight) =>
        petIds.has(weight.petId) &&
        /^\d{4}-\d{2}-\d{2}$/.test(weight.date) &&
        Number.isFinite(weight.weightKg) &&
        weight.weightKg > 0
      );

    return {
      ...base,
      ...value,
      app: APP_ID,
      version: VERSION,
      pets,
      weights
    };
  }

  function migrateV1(value) {
    const now = new Date().toISOString();

    return {
      app: APP_ID,
      version: VERSION,
      createdAt: value.createdAt || now,
      updatedAt: now,

      pets: value.pets.map(normalizePet),

      weights: []
    };
  }

  function save(state) {
    state.app = APP_ID;
    state.version = VERSION;
    state.updatedAt = new Date().toISOString();

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  }

  function load() {
    try {
      const currentRaw =
        localStorage.getItem(STORAGE_KEY);

      if (currentRaw) {
        const parsed = JSON.parse(currentRaw);

        if (!validateCurrentState(parsed)) {
          throw new Error(
            'Ungültiger Pet-Health-v2-Datensatz.'
          );
        }

        return normalizeCurrentState(parsed);
      }

      const legacyRaw =
        localStorage.getItem(LEGACY_V1_KEY);

      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);

        if (!validateV1State(parsed)) {
          throw new Error(
            'Ungültiger Pet-Health-v1-Datensatz.'
          );
        }

        const migrated = migrateV1(parsed);

        save(migrated);

        console.info(
          'Pet Health: Daten erfolgreich von v1 auf v2 migriert.'
        );

        return migrated;
      }

      return defaultState();

    } catch (error) {
      console.error(
        'Pet Health konnte gespeicherte Daten nicht laden:',
        error
      );

      return defaultState();
    }
  }

  function createPet(data) {
    return normalizePet({
      ...data,
      id: makeId('pet'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  function createWeight(data) {
    return normalizeWeight({
      ...data,
      id: makeId('weight'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  window.PetHealthStorage = {
    load,
    save,
    createPet,
    createWeight
  };
})();