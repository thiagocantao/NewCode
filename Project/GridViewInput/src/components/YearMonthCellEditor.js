export default class YearMonthCellEditor {
  init(params) {
    this.params = params;
    this.mode = params.yearMonthMode || params.colDef?.yearMonthMode || 'year';
    this.value = this.normalizeValue(params.value);

    if (this.mode === 'year') {
      this.createYearPicker();
      return;
    }

    this.createMonthPicker();
  }

  createMonthPicker() {
    const input = document.createElement('input');
    input.type = 'month';
    input.className = 'grid-year-month-cell-editor';
    input.style.width = '100%';
    input.style.height = '100%';
    input.style.boxSizing = 'border-box';
    input.style.padding = '4px 8px';
    input.style.border = '1px solid #cbd5e1';
    input.style.borderRadius = '6px';
    input.style.font = 'inherit';
    input.value = this.value;
    input.addEventListener('input', event => {
      this.value = event.target.value;
    });
    input.addEventListener('change', event => {
      this.value = event.target.value;
      this.params.api?.stopEditing?.();
    });
    input.addEventListener('keydown', event => this.handleKeydown(event));

    this.eGui = input;
  }

  createYearPicker() {
    const currentYear = Number(this.value) || new Date().getFullYear();
    this.decadeStart = Math.floor(currentYear / 10) * 10;

    this.eGui = document.createElement('div');
    this.eGui.className = 'grid-year-picker';
    this.renderYearPicker();
  }

  renderYearPicker() {
    const years = Array.from({ length: 12 }, (_, index) => this.decadeStart - 1 + index);
    this.eGui.innerHTML = `
      <div class="grid-year-picker__header">
        <button type="button" class="grid-year-picker__nav" data-action="previous" aria-label="Previous years">‹</button>
        <span>${this.decadeStart} - ${this.decadeStart + 9}</span>
        <button type="button" class="grid-year-picker__nav" data-action="next" aria-label="Next years">›</button>
      </div>
      <div class="grid-year-picker__years">
        ${years.map(year => `
          <button type="button" class="grid-year-picker__year${String(year) === String(this.value) ? ' selected' : ''}" data-year="${year}">
            ${year}
          </button>
        `).join('')}
      </div>
    `;

    this.eGui.querySelector('[data-action="previous"]')?.addEventListener('click', () => {
      this.decadeStart -= 10;
      this.renderYearPicker();
    });
    this.eGui.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      this.decadeStart += 10;
      this.renderYearPicker();
    });
    this.eGui.querySelectorAll('[data-year]').forEach(button => {
      button.addEventListener('click', () => {
        this.value = button.dataset.year;
        this.params.api?.stopEditing?.();
      });
    });
  }

  handleKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.value = event.target.value;
      this.params.api?.stopEditing?.();
    }
  }

  normalizeValue(value) {
    if (value == null || value === '') return '';
    const stringValue = String(value);

    if (this.mode === 'month') {
      const match = stringValue.match(/^(\d{4})-(\d{2})/);
      return match ? `${match[1]}-${match[2]}` : stringValue;
    }

    const yearMatch = stringValue.match(/\d{4}/);
    return yearMatch ? yearMatch[0] : stringValue;
  }

  getGui() {
    return this.eGui;
  }

  afterGuiAttached() {
    if (this.mode === 'month') {
      this.eGui?.focus();
      this.eGui?.showPicker?.();
    } else {
      this.eGui?.querySelector('.grid-year-picker__year.selected')?.focus();
    }
  }

  getValue() {
    return this.value;
  }

  isPopup() {
    return this.mode === 'year';
  }
}
