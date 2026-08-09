(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[char]);
  }

  function speciesIcon(species = '') {
    const s = species.trim().toLowerCase();
    if (s.includes('katze') || s.includes('kater')) return '🐱';
    if (s.includes('hund')) return '🐶';
    if (s.includes('kanin') || s.includes('hase')) return '🐰';
    if (s.includes('vogel') || s.includes('papagei') || s.includes('sittich')) return '🐦';
    if (s.includes('pferd') || s.includes('pony')) return '🐴';
    if (s.includes('hamster') || s.includes('maus') || s.includes('ratte')) return '🐹';
    if (s.includes('reptil') || s.includes('echse')) return '🦎';
    return '🐾';
  }

  function formatDate(iso) {
    if (!iso) return 'Nicht angegeben';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  function calculateAge(birthDate, approximate = false) {
    if (!birthDate) return 'Nicht angegeben';
    const birth = new Date(birthDate + 'T12:00:00');
    if (Number.isNaN(birth.getTime())) return 'Nicht angegeben';

    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    if (today.getDate() < birth.getDate()) months--;
    if (months < 0) {
      years--;
      months += 12;
    }

    let text;
    if (years <= 0) {
      const totalMonths = Math.max(0, months);
      text = `${totalMonths} ${totalMonths === 1 ? 'Monat' : 'Monate'}`;
    } else if (years < 2 && months > 0) {
      text = `${years} ${years === 1 ? 'Jahr' : 'Jahre'}, ${months} ${months === 1 ? 'Monat' : 'Monate'}`;
    } else {
      text = `${years} ${years === 1 ? 'Jahr' : 'Jahre'}`;
    }

    return approximate ? `ca. ${text}` : text;
  }

  function sexLabel(sex) {
    if (sex === 'female') return 'Weiblich';
    if (sex === 'male') return 'Männlich';
    if (sex === 'unknown') return 'Unbekannt';
    return 'Nicht angegeben';
  }

  function neuteredLabel(neutered) {
    if (neutered === true) return 'Ja';
    if (neutered === false) return 'Nein';
    return 'Nicht angegeben';
  }

  function formatKg(value) {
    if (value == null || !Number.isFinite(Number(value))) {
      return null;
    }

    return Number(value).toLocaleString('de-DE', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }) + ' kg';
  }

  function targetWeightLabel(min, max) {
    const minText = formatKg(min);
    const maxText = formatKg(max);

    if (minText && maxText) {
      return `${minText} – ${maxText}`;
    }

    if (minText) {
      return `ab ${minText}`;
    }

    if (maxText) {
      return `bis ${maxText}`;
    }

    return 'Nicht gesetzt';
  }

  function renderHome(pets) {
    const empty = $('emptyState');
    const grid = $('petGrid');

    empty.classList.toggle('hidden', pets.length > 0);
    grid.classList.toggle('hidden', pets.length === 0);

    if (!pets.length) {
      grid.innerHTML = '';
      return;
    }

    const sorted = [...pets].sort((a, b) =>
      a.name.localeCompare(b.name, 'de')
    );

    grid.innerHTML = sorted.map((pet) => {
      const age = pet.birthDate
        ? calculateAge(
            pet.birthDate,
            pet.birthDateApproximate
          )
        : '';

      const details = [
        pet.species,
        age
      ].filter(Boolean).join(' · ');

      return `
        <div class="pet-card-wrap">

          <button
            class="pet-card"
            type="button"
            data-pet-id="${escapeHtml(pet.id)}"
          >
            <div class="pet-avatar">
              ${speciesIcon(pet.species)}
            </div>

            <div class="pet-card-content">
              <h2>${escapeHtml(pet.name)}</h2>

              <p>
                ${escapeHtml(details || 'Tierakte')}
              </p>

              ${
                pet.breed
                  ? `<p>${escapeHtml(pet.breed)}</p>`
                  : ''
              }
            </div>
          </button>

          <button
            class="quick-add-toggle"
            type="button"
            data-quick-toggle="${escapeHtml(pet.id)}"
            aria-label="Schnelleintrag für ${escapeHtml(pet.name)}"
            aria-expanded="false"
          >
            +
          </button>

          <div
            class="quick-entry hidden"
            data-quick-entry="${escapeHtml(pet.id)}"
          >
            <label>
              Gewicht heute

              <div class="quick-weight-input">
                <input
                  type="number"
                  inputmode="decimal"
                  min="0.01"
                  max="5000"
                  step="0.001"
                  placeholder="z. B. 4,725"
                  data-quick-weight="${escapeHtml(pet.id)}"
                />

                <span>kg</span>
              </div>
            </label>
          </div>

        </div>
      `;
    }).join('');
  }

  function toggleQuickEntry(petId) {
    const panels = [
      ...document.querySelectorAll(
        '[data-quick-entry]'
      )
    ];

    const buttons = [
      ...document.querySelectorAll(
        '[data-quick-toggle]'
      )
    ];

    const targetPanel = panels.find(
      panel =>
        panel.dataset.quickEntry === petId
    );

    const targetButton = buttons.find(
      button =>
        button.dataset.quickToggle === petId
    );

    if (!targetPanel || !targetButton) {
      return;
    }

    const willOpen =
      targetPanel.classList.contains('hidden');

    panels.forEach((panel) => {
      panel.classList.add('hidden');
    });

    buttons.forEach((button) => {
      button.textContent = '+';
      button.setAttribute(
        'aria-expanded',
        'false'
      );
    });

    if (!willOpen) {
      return;
    }

    targetPanel.classList.remove('hidden');

    targetButton.textContent = '×';

    targetButton.setAttribute(
      'aria-expanded',
      'true'
    );

    const input =
      targetPanel.querySelector(
        '[data-quick-weight]'
      );

    if (input) {
      setTimeout(() => input.focus(), 0);
    }
  }

  function renderRecord(pet) {
    $('recordAvatar').textContent = speciesIcon(pet.species);
    $('recordName').textContent = pet.name;
    const age = calculateAge(pet.birthDate, pet.birthDateApproximate);
    $('recordSummary').textContent = [pet.species, age !== 'Nicht angegeben' ? age : ''].filter(Boolean).join(' · ');
    $('recordSpecies').textContent = pet.species || '–';
    $('recordBreed').textContent = pet.breed || 'Nicht angegeben';
    $('recordBirthDate').textContent = pet.birthDate
      ? `${pet.birthDateApproximate ? 'ca. ' : ''}${formatDate(pet.birthDate)}`
      : 'Nicht angegeben';
    $('recordAge').textContent = age;
    $('recordSex').textContent = sexLabel(pet.sex);
    $('recordNeutered').textContent = neuteredLabel(pet.neutered);
    $('recordTargetWeight').textContent =
    targetWeightLabel(
      pet.targetWeightMin,
      pet.targetWeightMax
    );
  }

  function fillPetForm(pet) {
    $('petName').value = pet?.name || '';
    $('petSpecies').value = pet?.species || '';
    $('petBreed').value = pet?.breed || '';
    $('petBirthDate').value = pet?.birthDate || '';
    $('petBirthApprox').checked = Boolean(pet?.birthDateApproximate);
    $('petSex').value = pet?.sex || '';
    $('petNeutered').value =
    pet?.neutered === true
      ? 'yes'
      : pet?.neutered === false
        ? 'no'
        : '';
    $('petTargetWeightMin').value =
      pet?.targetWeightMin != null
        ? pet.targetWeightMin
        : '';

    $('petTargetWeightMax').value =
      pet?.targetWeightMax != null
        ? pet.targetWeightMax
        : '';
  }

  function readPetForm() {
    const neuteredValue = $('petNeutered').value;
    const rawTargetMin =
      $('petTargetWeightMin').value.replace(',', '.');

    const rawTargetMax =
      $('petTargetWeightMax').value.replace(',', '.');

    const targetWeightMin =
      rawTargetMin === ''
        ? null
        : Number(rawTargetMin);

    const targetWeightMax =
      rawTargetMax === ''
        ? null
        : Number(rawTargetMax);

    return {
      name: $('petName').value.trim(),
      species: $('petSpecies').value.trim(),
      breed: $('petBreed').value.trim(),
      birthDate: $('petBirthDate').value,
      birthDateApproximate: $('petBirthApprox').checked,
      sex: $('petSex').value,

      neutered:
        neuteredValue === 'yes'
          ? true
          : neuteredValue === 'no'
            ? false
            : null,
      targetWeightMin,
      targetWeightMax
    };                    
  }

  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  window.PetHealthUI = {
    renderHome,
    renderRecord,
    fillPetForm,
    readPetForm,
    toggleQuickEntry,
    showToast
  };
})();
