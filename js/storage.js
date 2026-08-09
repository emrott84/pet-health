(() => {
  'use strict';

  const APP_ID = 'pet-health';
  const VERSION = 1;
  const STORAGE_KEY = 'petHealth.v1';

  function makeId() {
    if (globalThis.crypto && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'pet-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function defaultState() {
    const now = new Date().toISOString();
    return {
      app: APP_ID,
      version: VERSION,
      createdAt: now,
      updatedAt: now,
      pets: []
    };
  }

  function normalizePet(pet) {
    const now = new Date().toISOString();
    return {
      id: String(pet.id || makeId()),
      name: String(pet.name || '').trim(),
      species: String(pet.species || '').trim(),
      breed: String(pet.breed || '').trim(),
      birthDate: pet.birthDate ? String(pet.birthDate) : '',
      birthDateApproximate: Boolean(pet.birthDateApproximate),
      sex: ['female', 'male', 'unknown'].includes(pet.sex) ? pet.sex : '',
      createdAt: pet.createdAt || now,
      updatedAt: pet.updatedAt || now
    };
  }

  function validateState(value) {
    return value &&
      typeof value === 'object' &&
      value.app === APP_ID &&
      Number(value.version) === VERSION &&
      Array.isArray(value.pets);
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();

      const parsed = JSON.parse(raw);
      if (!validateState(parsed)) {
        throw new Error('Ungültiger Pet-Health-Datensatz.');
      }

      return {
        ...defaultState(),
        ...parsed,
        pets: parsed.pets.map(normalizePet)
      };
    } catch (error) {
      console.error('Pet Health konnte gespeicherte Daten nicht laden:', error);
      return defaultState();
    }
  }

  function save(state) {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function createPet(data) {
    return normalizePet({
      ...data,
      id: makeId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  window.PetHealthStorage = { load, save, createPet };
})();
