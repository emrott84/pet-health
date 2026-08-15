(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const Storage = window.PetHealthStorage;
  const UI = window.PetHealthUI;

  let state = null;
  let activePetId = null;
  let editingPetId = null;

  function todayISO() {
    const now = new Date();
    const offset = now.getTimezoneOffset();

    return new Date(
      now.getTime() - offset * 60000
    )
      .toISOString()
      .slice(0, 10);
  }

  function showHome() {
    activePetId = null;
    $('homeView').classList.remove('hidden');
    $('petView').classList.add('hidden');
    UI.renderHome(
      state.pets,
      state.weights
    );
  }

  function openPet(petId) {
    const pet = state.pets.find((item) => item.id === petId);
    if (!pet) return;

    activePetId = petId;
    $('homeView').classList.add('hidden');
    $('petView').classList.remove('hidden');
    UI.renderRecord(
      pet,
      state.weights,
      state.journalEntries
    );
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

  async function handlePetSubmit(event) {
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

    try {
      if (editingPetId) {
        const petId = editingPetId;

        const updatedPet =
          await Storage.updatePetOnApi(
            petId,
            data
          );

        const index =
          state.pets.findIndex(
            (item) =>
              item.id === petId
          );

        if (index === -1) {
          throw new Error(
            'Tier wurde im lokalen State nicht gefunden.'
          );
        }

        state.pets[index] =
          updatedPet;

        closeDialog();
        openPet(petId);

        UI.showToast(
          'Tierakte aktualisiert.'
        );

        return;
      }


      const pet =
        await Storage.createPetOnApi(
          data
        );

      state.pets.push(
        pet
      );

      closeDialog();

      UI.renderHome(
        state.pets,
        state.weights
      );

      openPet(
        pet.id
      );

      UI.showToast(
        `${pet.name} wurde angelegt.`
      );

    } catch (error) {
      console.error(
        'Tier konnte nicht gespeichert werden:',
        error
      );

      UI.showToast(
        error.message ||
        'Tier konnte nicht gespeichert werden.'
      );
    }
  }

  function getTodayWeight(petId) {
    const today = todayISO();

    return state.weights.find(
      (weight) =>
        weight.petId === petId &&
        weight.date === today
    ) || null;
  }


  function prepareQuickEntry(petId) {
    const panel = [
      ...document.querySelectorAll(
        '[data-quick-entry]'
      )
    ].find(
      (item) =>
        item.dataset.quickEntry ===
        petId
    );

    if (!panel) return;

    const weightInput =
      panel.querySelector(
        '[data-quick-weight]'
      );

    const journalInput =
      panel.querySelector(
        '[data-quick-journal]'
      );

    const todayWeight =
      getTodayWeight(petId);

    if (weightInput) {
      weightInput.value =
        todayWeight
          ? Number(
              todayWeight.weightKg
            ).toFixed(3)
          : '';
    }

    setTimeout(() => {
      if (
        todayWeight &&
        journalInput
      ) {
        journalInput.focus();
        return;
      }

      weightInput?.focus();
    }, 0);
  }


  function focusQuickJournal(petId) {
    const panel = [
      ...document.querySelectorAll(
        '[data-quick-entry]'
      )
    ].find(
      (item) =>
        item.dataset.quickEntry ===
        petId
    );

    const journalInput =
      panel?.querySelector(
        '[data-quick-journal]'
      );

    journalInput?.focus();
  }


  async function saveQuickWeight(
    petId,
    input
  ) {
    const pet =
      state.pets.find(
        (item) =>
          item.id === petId
      );

    if (!pet) {
      UI.showToast(
        'Tier wurde nicht gefunden.'
      );

      return false;
    }


    const rawValue =
      String(input.value)
        .trim()
        .replace(',', '.');


    /*
    * Leeres Feld bedeutet:
    * Gewicht heute überspringen.
    */
    if (!rawValue) {
      return true;
    }


    const weightKg =
      Number(rawValue);

    if (
      !Number.isFinite(weightKg) ||
      weightKg <= 0 ||
      weightKg > 5000
    ) {
      UI.showToast(
        'Bitte ein gültiges Gewicht eingeben.'
      );

      input.focus();

      return false;
    }


    const date =
      todayISO();

    const existing =
      getTodayWeight(petId);


    try {
      const savedWeight =
        await Storage.saveWeightOnApi(
          petId,
          date,
          weightKg,
          ''
        );


      if (existing) {
        const index =
          state.weights.findIndex(
            (item) =>
              item.id === existing.id
          );

        if (index !== -1) {
          state.weights[index] =
            savedWeight;
        }

      } else {
        state.weights.push(
          savedWeight
        );
      }


      UI.updateCardWeight(
        petId,
        state.weights
      );


      if (existing) {
        UI.showToast(
          `Gewicht für ${pet.name} auf ` +
          `${weightKg.toLocaleString(
            'de-DE',
            {
              minimumFractionDigits: 3,
              maximumFractionDigits: 3
            }
          )} kg aktualisiert.`
        );

      } else {
        UI.showToast(
          `${weightKg.toLocaleString(
            'de-DE',
            {
              minimumFractionDigits: 3,
              maximumFractionDigits: 3
            }
          )} kg für ${pet.name} gespeichert.`
        );
      }


      return true;

    } catch (error) {
      console.error(
        'Gewicht konnte nicht gespeichert werden:',
        error
      );

      UI.showToast(
        error.message ||
        'Gewicht konnte nicht gespeichert werden.'
      );

      input.focus();

      return false;
    }
  }


  async function saveQuickJournal(
    petId,
    input
  ) {
    const pet =
      state.pets.find(
        (item) =>
          item.id === petId
      );

    if (!pet) {
      UI.showToast(
        'Tier wurde nicht gefunden.'
      );

      return false;
    }


    const text =
      input.value.trim();


    /*
    * Leere Bemerkung:
    * nichts speichern,
    * Schnelleingabe nur schließen.
    */
    if (!text) {
      UI.toggleQuickEntry(
        petId
      );

      return true;
    }


    try {
      const entry =
        await Storage.createJournalOnApi(
          petId,
          todayISO(),
          text
        );


      state.journalEntries.push(
        entry
      );


      input.value = '';

      UI.toggleQuickEntry(
        petId
      );


      UI.showToast(
        `Bemerkung für ${pet.name} gespeichert.`
      );


      return true;

    } catch (error) {
      console.error(
        'Bemerkung konnte nicht gespeichert werden:',
        error
      );

      UI.showToast(
        error.message ||
        'Bemerkung konnte nicht gespeichert werden.'
      );

      input.focus();

      return false;
    }
  }

  function bindEvents() {
    $('addPetBtn').addEventListener(
      'click',
      openCreateDialog
    );

    $('emptyAddPetBtn').addEventListener(
      'click',
      openCreateDialog
    );

    $('backBtn').addEventListener(
      'click',
      showHome
    );

    $('editPetBtn').addEventListener(
      'click',
      openEditDialog
    );

    $('closeDialogBtn').addEventListener(
      'click',
      closeDialog
    );

    $('cancelDialogBtn').addEventListener(
      'click',
      closeDialog
    );

    $('petForm').addEventListener(
      'submit',
      handlePetSubmit
    );

    $('addConditionBtn').addEventListener(
      'click',
      () => {
        UI.addConditionRow();
      }
    );


    $('addMedicationBtn').addEventListener(
      'click',
      () => {
        UI.addMedicationRow();
      }
    );


    $('petDialog').addEventListener(
      'click',
      (event) => {

        const removeButton =
          event.target.closest(
            '[data-remove-health]'
          );

        if (!removeButton) return;

        const row =
          removeButton.closest(
            '[data-condition-row], [data-medication-row]'
          );

        row?.remove();
      }
    );

    /*
    * Tierkarte:
    * + = Schnelleintrag
    * Rest der Karte = Tierakte
    */
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

          const petId =
            quickToggle.dataset.quickToggle;

          const opened =
            UI.toggleQuickEntry(
              petId
            );

          if (opened) {
            prepareQuickEntry(
              petId
            );
          }

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


    /*
    * Tastatursteuerung im Schnelleintrag
    */
    $('petGrid').addEventListener(
      'keydown',
      async (event) => {

        const weightInput =
          event.target.closest(
            '[data-quick-weight]'
          );

        if (
          weightInput &&
          (
            event.key === 'Enter' ||
            event.key === 'Tab'
          )
        ) {
          event.preventDefault();

          const petId =
            weightInput.dataset.quickWeight;

          const saved =
            await saveQuickWeight(
              petId,
              weightInput
            );

          if (saved) {
            focusQuickJournal(
              petId
            );
          }

          return;
        }


        const journalInput =
          event.target.closest(
            '[data-quick-journal]'
          );

        if (
          journalInput &&
          event.key === 'Enter' &&
          !event.shiftKey
        ) {
          event.preventDefault();

          await saveQuickJournal(
            journalInput.dataset.quickJournal,
            journalInput
          );
        }
      }
    );


    /*
    * Dialog schließen,
    * wenn außerhalb geklickt wird
    */
    $('petDialog').addEventListener(
      'click',
      (event) => {

        const dialog =
          $('petDialog');

        const rect =
          dialog.getBoundingClientRect();

        const outside =
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom;

        if (outside) {
          closeDialog();
        }
      }
    );
  }

  async function init() {
    try {
      state = await Storage.loadFromApi();

      bindEvents();
      showHome();

      console.info(
        'Pet Health: State aus API geladen.'
      );

    } catch (error) {
      console.error(
        'Pet Health konnte den Server-State nicht laden:',
        error
      );

      UI.showToast(
        'Daten konnten nicht vom Server geladen werden.'
      );
    }
  }

  init();
})();
