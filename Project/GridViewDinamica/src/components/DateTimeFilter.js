export default class DateTimeFilter {
  constructor() {
    this.languageVarId = 'aa44dc4c-476b-45e9-a094-16687e063342';
  }

  getLanguage() {
    try {
      return (
        window?.wwLib?.wwVariable?.getValue?.(this.languageVarId) || 'en'
      );
    } catch (e) {
      return 'en';
    }
  }

  init(params) {
    this.params = params;
    this.lang = this.getLanguage();
    this.eGui = document.createElement('div');
    this.eGui.className = 'ag-date-filter';
    this.eGui.style.display = 'flex';
    this.eGui.style.gap = '4px';
    this.eGui.innerHTML = `
      <input type="text" class="from-date" placeholder="${this.placeholder()}" style="flex:1;" />
      <input type="text" class="to-date" placeholder="${this.placeholder()}" style="flex:1;" />
    `;
    this.fromInput = this.eGui.querySelector('.from-date');
    this.toInput = this.eGui.querySelector('.to-date');
    const listener = () => this.params.filterChangedCallback();
    this.fromInput.addEventListener('input', listener);
    this.toInput.addEventListener('input', listener);
  }

  placeholder() {
    const sample = new Date(Date.UTC(2000, 0, 2, 0, 0));
    const opts = { day: '2-digit', month: '2-digit', year: 'numeric' };
    try {
      return new Intl.DateTimeFormat(this.lang, opts).format(sample);
    } catch (e) {
      return 'dd/mm/yyyy';
    }
  }

  parseDate(str) {
    if (!str) return null;
    const parts = str
      .trim()
      .split(/[^0-9]/)
      .filter(Boolean)
      .map(p => parseInt(p, 10));
    if (parts.length < 3) return null;
    let day, month, year;
    if (this.lang === 'en' || this.lang === 'en-US') {
      [month, day, year] = parts;
    } else {
      [day, month, year] = parts;
    }
    const d = new Date(year, (month || 1) - 1, day || 1);
    return isNaN(d.getTime()) ? null : d;
  }

  isFilterActive() {
    return this.fromInput.value !== '' || this.toInput.value !== '';
  }

  doesFilterPass(params) {
    const value = this.params.valueGetter({ data: params.data });
    if (!value) return false;
    const date = this.parseDate(value) || new Date(value);
    if (isNaN(date.getTime())) return false;
    const from = this.parseDate(this.fromInput.value);
    const to = this.parseDate(this.toInput.value);
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  }

  getModel() {
    if (!this.isFilterActive()) return null;
    return {
      from: this.fromInput.value || null,
      to: this.toInput.value || null,
    };
  }

  setModel(model) {
    this.fromInput.value = model?.from || '';
    this.toInput.value = model?.to || '';
  }

  getGui() {
    return this.eGui;
  }

  destroy() {}
}
