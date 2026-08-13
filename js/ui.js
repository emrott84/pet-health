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

  function getWeightSummary(
    petId,
    weights = []
  ) {
    const petWeights =
      weights
        .filter(
          (weight) =>
            weight.petId === petId &&
            Number.isFinite(
              Number(weight.weightKg)
            )
        )
        .sort(
          (a, b) =>
            String(b.date).localeCompare(
              String(a.date)
            )
        );

    const current =
      petWeights[0] || null;

    const previous =
      petWeights[1] || null;

    if (!current) {
      return {
        current: null,
        trend: null
      };
    }

    if (!previous) {
      return {
        current,
        trend: null
      };
    }

    const currentKg =
      Number(current.weightKg);

    const previousKg =
      Number(previous.weightKg);

    if (previousKg <= 0) {
      return {
        current,
        trend: null
      };
    }

    const change =
      (currentKg - previousKg) /
      previousKg;

    if (change >= 0.005) {
      return {
        current,
        trend: {
          symbol: '↑',
          label: 'steigend'
        }
      };
    }

    if (change <= -0.005) {
      return {
        current,
        trend: {
          symbol: '↓',
          label: 'fallend'
        }
      };
    }

    return {
      current,
      trend: {
        symbol: '→',
        label: 'weitgehend unverändert'
      }
    };
  }

  function renderHome(
    pets,
    weights = []
  ) {                       
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
      const weightSummary =
        getWeightSummary(
          pet.id,
          weights
        );

      const currentWeight =
        weightSummary.current;

      const trend =
        weightSummary.trend;
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
              <div
                class="pet-card-weight ${
                  currentWeight
                    ? ''
                    : 'hidden'
                }"
                data-card-weight="${escapeHtml(pet.id)}"
              >
                ${
                  currentWeight
                    ? `
                      <strong>
                        ${formatKg(
                          currentWeight.weightKg
                        )}
                      </strong>

                      ${
                        trend
                          ? `
                            <span
                              class="weight-trend"
                              title="Tendenz: ${escapeHtml(trend.label)}"
                              aria-label="Tendenz: ${escapeHtml(trend.label)}"
                            >
                              ${trend.symbol}
                            </span>
                          `
                          : ''
                      }
                    `
                    : ''
                }
              </div>
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

            <label>
              Bemerkung

              <textarea
                rows="2"
                placeholder="Wie geht's ${escapeHtml(pet.name)} heute?"
                data-quick-journal="${escapeHtml(pet.id)}"
              ></textarea>
            </label>

            <div class="quick-entry-hint">
              Enter speichert · Shift + Enter für Zeilenumbruch
            </div>
          </div>

        </div>
      `;
    }).join('');
  }

  function updateCardWeight(
    petId,
    weights = []
  ) {
    const container =
      document.querySelector(
        `[data-card-weight="${petId}"]`
      );

    if (!container) return;

    const {
      current,
      trend
    } = getWeightSummary(
      petId,
      weights
    );

    if (!current) {
      container.innerHTML = '';
      container.classList.add(
        'hidden'
      );

      return;
    }

    container.classList.remove(
      'hidden'
    );

    container.innerHTML = `
      <strong>
        ${formatKg(
          current.weightKg
        )}
      </strong>

      ${
        trend
          ? `
            <span
              class="weight-trend"
              title="Tendenz: ${escapeHtml(trend.label)}"
              aria-label="Tendenz: ${escapeHtml(trend.label)}"
            >
              ${trend.symbol}
            </span>
          `
          : ''
      }
    `;
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

    const targetPanel =
      panels.find(
        (panel) =>
          panel.dataset.quickEntry ===
          petId
      );

    const targetButton =
      buttons.find(
        (button) =>
          button.dataset.quickToggle ===
          petId
      );

    if (
      !targetPanel ||
      !targetButton
    ) {
      return false;
    }

    const willOpen =
      targetPanel.classList.contains(
        'hidden'
      );

    panels.forEach(
      (panel) => {
        panel.classList.add(
          'hidden'
        );
      }
    );

    buttons.forEach(
      (button) => {
        button.textContent = '+';

        button.setAttribute(
          'aria-expanded',
          'false'
        );
      }
    );

    if (!willOpen) {
      return false;
    }

    targetPanel.classList.remove(
      'hidden'
    );

    targetButton.textContent = '×';

    targetButton.setAttribute(
      'aria-expanded',
      'true'
    );

    return true;
  }

  function renderWeightChart(
    petId,
    weights = []
  ) {
    const container =
      $('recordWeightChart');

    if (!container) return;

    const petWeights =
      weights
        .filter(
          (weight) =>
            weight.petId === petId &&
            Number.isFinite(
              Number(weight.weightKg)
            )
        )
        .sort(
          (a, b) =>
            String(a.date).localeCompare(
              String(b.date)
            )
        );

    if (!petWeights.length) {
      container.innerHTML = `
        <div class="chart-empty">
          Noch keine Gewichtsmessung vorhanden.
        </div>
      `;

      return;
    }

    if (petWeights.length === 1) {
      container.innerHTML = `
        <div class="chart-empty">
          Eine Messung vorhanden.
          Der Verlauf wird ab der zweiten Messung sichtbar.
        </div>
      `;

      return;
    }


    const width = 1000;
    const height = 320;

    const padding = {
      top: 24,
      right: 24,
      bottom: 48,
      left: 78
    };

    const values =
      petWeights.map(
        (weight) =>
          Number(weight.weightKg)
      );

    let minWeight =
      Math.min(...values);

    let maxWeight =
      Math.max(...values);

    const spread =
      maxWeight - minWeight;

    /*
    * Etwas Luft ober- und unterhalb
    * der tatsächlichen Messwerte.
    */
    const weightPadding =
      spread > 0
        ? Math.max(
            spread * 0.15,
            0.01
          )
        : Math.max(
            maxWeight * 0.02,
            0.05
          );

    minWeight =
      Math.max(
        0,
        minWeight - weightPadding
      );

    maxWeight +=
      weightPadding;


    const chartWidth =
      width -
      padding.left -
      padding.right;

    const chartHeight =
      height -
      padding.top -
      padding.bottom;


    function xFor(index) {
      return (
        padding.left +
        (
          index /
          (petWeights.length - 1)
        ) *
        chartWidth
      );
    }


    function yFor(weightKg) {
      const range =
        maxWeight - minWeight;

      return (
        padding.top +
        (
          1 -
          (
            weightKg -
            minWeight
          ) /
          range
        ) *
        chartHeight
      );
    }


    const points =
      petWeights.map(
        (weight, index) => ({
          x: xFor(index),
          y: yFor(
            Number(weight.weightKg)
          ),
          weight
        })
      );


    const path =
      points
        .map(
          (point, index) =>
            `${
              index === 0
                ? 'M'
                : 'L'
            } ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
        )
        .join(' ');


    /*
    * Drei horizontale Orientierungslinien:
    * oben, Mitte, unten.
    */
    const gridLines =
      [0, 0.5, 1]
        .map((position) => {
          const y =
            padding.top +
            chartHeight *
            position;

          const weight =
            maxWeight -
            (
              maxWeight -
              minWeight
            ) *
            position;

          const label =
            weight.toLocaleString(
              'de-DE',
              {
                minimumFractionDigits: 3,
                maximumFractionDigits: 3
              }
            );

          return `
            <line
              class="chart-grid-line"
              x1="${padding.left}"
              y1="${y}"
              x2="${width - padding.right}"
              y2="${y}"
            />

            <text
              class="chart-grid-label"
              x="${padding.left - 14}"
              y="${y + 9}"
              text-anchor="end"
            >
              ${label}
            </text>
          `;
        })
        .join('');


    const circles =
      points
        .map((point) => {
          const date =
            formatDate(
              point.weight.date
            );

          const weight =
            formatKg(
              point.weight.weightKg
            );

          return `
            <circle
              class="chart-point"
              cx="${point.x}"
              cy="${point.y}"
              r="7"
            >
              <title>
                ${escapeHtml(date)} · ${escapeHtml(weight)}
              </title>
            </circle>
          `;
        })
        .join('');


    const firstDate =
      formatDate(
        petWeights[0].date
      );

    const lastDate =
      formatDate(
        petWeights[
          petWeights.length - 1
        ].date
      );


    container.innerHTML = `
      <svg
        viewBox="0 0 ${width} ${height}"
        role="img"
        aria-label="Gewichtsverlauf"
      >
        ${gridLines}

        <path
          class="chart-line"
          d="${path}"
        />

        ${circles}

        <text
          class="chart-date-label"
          x="${padding.left}"
          y="${height - 12}"
          text-anchor="start"
        >
          ${escapeHtml(firstDate)}
        </text>

        <text
          class="chart-date-label"
          x="${width - padding.right}"
          y="${height - 12}"
          text-anchor="end"
        >
          ${escapeHtml(lastDate)}
        </text>
      </svg>
    `;
  }

  function renderJournal(
    petId,
    journalEntries = []
  ) {
    const container =
      $('recordJournal');

    if (!container) return;


    const entries =
      journalEntries
        .filter(
          (entry) =>
            entry.petId === petId &&
            entry.text
        )
        .sort((a, b) => {
          const aTime =
            new Date(
              a.createdAt ||
              `${a.date}T00:00:00`
            ).getTime();

          const bTime =
            new Date(
              b.createdAt ||
              `${b.date}T00:00:00`
            ).getTime();

          return bTime - aTime;
        });


    if (!entries.length) {
      container.innerHTML = `
        <div class="journal-empty">
          Noch keine Bemerkungen vorhanden.
        </div>
      `;

      return;
    }


    function entryHtml(entry) {
      let time = '';

      if (entry.createdAt) {
        const created =
          new Date(entry.createdAt);

        if (
          !Number.isNaN(
            created.getTime()
          )
        ) {
          time =
            created.toLocaleTimeString(
              'de-DE',
              {
                hour: '2-digit',
                minute: '2-digit'
              }
            );
        }
      }

      return `
        <article class="journal-entry">
          <div class="journal-entry-date">
            <strong>
              ${escapeHtml(
                formatDate(entry.date)
              )}
            </strong>

            ${
              time
                ? `
                  <span>
                    ${escapeHtml(time)} Uhr
                  </span>
                `
                : ''
            }
          </div>

          <p>
            ${escapeHtml(entry.text)}
          </p>
        </article>
      `;
    }


    const currentEntries =
      entries.slice(0, 3);

    const olderEntries =
      entries.slice(3);


    let html =
      currentEntries
        .map(entryHtml)
        .join('');


    if (olderEntries.length) {
      html += `
        <details class="journal-history">
          <summary>
            Ältere Bemerkungen anzeigen
            (${olderEntries.length})
          </summary>

          <div class="journal-history-content">
            ${
              olderEntries
                .map(entryHtml)
                .join('')
            }
          </div>
        </details>
      `;
    }


    container.innerHTML = html;
  }

  function renderRecord(
    pet,
    weights = [],
    journalEntries = []
  ) {
    $('recordAvatar').textContent =
      speciesIcon(pet.species);

    $('recordName').textContent =
      pet.name;

    const age =
      calculateAge(
        pet.birthDate,
        pet.birthDateApproximate
      );

    $('recordSummary').textContent =
      [
        pet.species,
        age !== 'Nicht angegeben'
          ? age
          : ''
      ]
        .filter(Boolean)
        .join(' · ');

    $('recordSpecies').textContent =
      pet.species || '–';

    $('recordBreed').textContent =
      pet.breed ||
      'Nicht angegeben';

    $('recordBirthDate').textContent =
      pet.birthDate
        ? `${
            pet.birthDateApproximate
              ? 'ca. '
              : ''
          }${formatDate(
            pet.birthDate
          )}`
        : 'Nicht angegeben';

    $('recordAge').textContent =
      age;

    $('recordSex').textContent =
      sexLabel(pet.sex);

    $('recordNeutered').textContent =
      neuteredLabel(
        pet.neutered
      );

    $('recordTargetWeight').textContent =
      targetWeightLabel(
        pet.targetWeightMin,
        pet.targetWeightMax
      );


    /*
    * Gewicht
    */
    const {
      current,
      trend
    } = getWeightSummary(
      pet.id,
      weights
    );

    const weightElement =
      $('recordCurrentWeight');

    const trendElement =
      $('recordWeightTrend');

    const dateElement =
      $('recordWeightDate');


    if (!current) {
      weightElement.textContent =
        'Noch keine Messung';

      dateElement.textContent =
        'Noch keine Messung';

      trendElement.textContent = '';

      trendElement.classList.add(
        'hidden'
      );

    } else {
      weightElement.textContent =
        formatKg(
          current.weightKg
        );

      dateElement.textContent =
        `Messung vom ${
          formatDate(current.date)
        }`;

      if (trend) {
        trendElement.textContent =
          trend.symbol;

        trendElement.title =
          `Tendenz: ${trend.label}`;

        trendElement.setAttribute(
          'aria-label',
          `Tendenz: ${trend.label}`
        );

        trendElement.classList.remove(
          'hidden'
        );

      } else {
        trendElement.textContent = '';

        trendElement.classList.add(
          'hidden'
        );
      }
    }


    renderWeightChart(
      pet.id,
      weights
    );

    renderJournal(
      pet.id,
      journalEntries
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
    updateCardWeight,
    showToast
  };
})();
