(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const Storage = window.PetHealthStorage;
  const UI = window.PetHealthUI;

  let state = Storage.load();
  let activePetId = null;
  let editingPetId = null;

  function saveState() {
    try {
      Storage.save(state);
      return true;
    } catch (error) {
      console.error('Speichern fehlgeschlagen:', error);
      UI.showToast('Speichern fehlgeschlagen.');
      return false;
    }
  }

  function showHome() {
    activePetId = null;
    $('homeView').classList.remove('hidden');
    $('petView').classList.add('hidden');
    UI.renderHome(state.pets);
  }

  function openPet(petId) {
    const pet = state.pets.find((item) => item.id === petId);
    if (!pet) return;

    activePetId = petId;
    $('homeView').classList.add('hidden');
    $('petView').classList.remove('hidden');
    UI.renderRecord(pet);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openCreateDialog() {
    editingPetId = null;
    $('dialogTitle').textContent = 'Tier hinzufügen';
    $('savePetBtn').textContent = 'Tier speichern';
    UI.fillPetForm(null);
    $('petDialog').showModal();
    setTimeout(() => $('petName').focus(), 0);
  }

  function openEditDialog() {
    const pet = state.pets.find((item) => item.id === activePetId);
    if (!pet) return;

    editingPetId = pet.id;
    $('dialogTitle').textContent = `${pet.name} bearbeiten`;
    $('savePetBtn').textContent = 'Änderungen speichern';
    UI.fillPetForm(pet);
    $('petDialog').showModal();
  }

  function closeDialog() {
    editingPetId = null;
    $('petDialog').close();
  }

  function handlePetSubmit(event) {
    event.preventDefault();
    const data = UI.readPetForm();

    if (!data.name || !data.species) {
      UI.showToast('Name und Tierart werden benötigt.');
      return;
    }

    if (data.birthDate) {
      const birth = new Date(data.birthDate + 'T12:00:00');
      const today = new Date();
      if (birth > today) {
        UI.showToast('Das Geburtsdatum kann nicht in der Zukunft liegen.');
        return;
      }
    }

    if (
      data.targetWeightMin !== null &&
      (
        !Number.isFinite(data.targetWeightMin) ||
        data.targetWeightMin <= 0
      )
    ) {
      UI.showToast('Bitte eine gültige Untergrenze angeben.');
      return;
    }

    if (
      data.targetWeightMax !== null &&
      (
        !Number.isFinite(data.targetWeightMax) ||
        data.targetWeightMax <= 0
      )
    ) {
      UI.showToast('Bitte eine gültige Obergrenze angeben.');
      return;
    }

    if (
      data.targetWeightMin !== null &&
      data.targetWeightMax !== null &&
      data.targetWeightMin > data.targetWeightMax
    ) {
      UI.showToast('Die Untergrenze darf nicht über der Obergrenze liegen.');
      return;
    }

    if (editingPetId) {
      const pet = state.pets.find((item) => item.id === editingPetId);
      if (!pet) return;

      Object.assign(pet, data, { updatedAt: new Date().toISOString() });
      if (!saveState()) return;

      const petId = pet.id;
      closeDialog();
      openPet(petId);
      UI.showToast('Tierakte aktualisiert.');
      return;
    }

    const pet = Storage.createPet(data);
    state.pets.push(pet);

    if (!saveState()) {
      state.pets = state.pets.filter((item) => item.id !== pet.id);
      return;
    }

    closeDialog();
    UI.renderHome(state.pets);
    openPet(pet.id);
    UI.showToast(`${pet.name} wurde angelegt.`);
  }

  function bindEvents() {
    $('addPetBtn').addEventListener('click', openCreateDialog);
    $('emptyAddPetBtn').addEventListener('click', openCreateDialog);
    $('backBtn').addEventListener('click', showHome);
    $('editPetBtn').addEventListener('click', openEditDialog);
    $('closeDialogBtn').addEventListener('click', closeDialog);
    $('cancelDialogBtn').addEventListener('click', closeDialog);
    $('petForm').addEventListener('submit', handlePetSubmit);

    $('petGrid').addEventListener(
      'click',
      (event) => {

        const quickToggle =
          event.target.closest(
            '[data-quick-toggle]'
          );

        if (quickToggle) {
          event.preventDefault();
          event.stopPropagation();

          UI.toggleQuickEntry(
            quickToggle.dataset.quickToggle
          );

          return;
        }

        const card =
          event.target.closest(
            '[data-pet-id]'
          );

        if (!card) return;

        openPet(
          card.dataset.petId
        );
      }
    );
  }

  function init() {
    bindEvents();
    showHome();
  }

  init();
})();
