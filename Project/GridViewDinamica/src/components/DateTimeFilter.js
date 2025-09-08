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
      <input type="datetime-local" class="from-date" style="flex:1;" lang="${this.lang}" />
      <input type="datetime-local" class="to-date" style="flex:1;" lang="${this.lang}" />

    `;
    this.fromInput = this.eGui.querySelector('.from-date');
    this.toInput = this.eGui.querySelector('.to-date');
    const listener = () => this.params.filterChangedCallback();
    this.fromInput.addEventListener('input', listener);
    this.toInput.addEventListener('input', listener);
  }

  toDateTimeLocal(value) {
    try {
      let v = value;
      if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?([\+\-]\d{2})?$/.test(v)) {
        v = v.replace(' ', 'T');
        if (/([\+\-]\d{2})(\d{2})?$/.test(v)) v = v.replace(/([\+\-]\d{2})(\d{2})?$/, '$1:$2');
        if (/([\+\-]\d{2})$/.test(v)) v = v.replace(/([\+\-]\d{2})$/, '$1:00');
      }
      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        const pad = n => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    } catch (e) {}
    return value;
  }


  isFilterActive() {
    return this.fromInput.value !== '' || this.toInput.value !== '';
  }

  doesFilterPass(params) {
    const value = this.params.valueGetter({ data: params.data });
    if (!value) return false;
    const date = new Date(value);
    if (isNaN(date.getTime())) return false;
    const from = this.fromInput.value ? new Date(this.fromInput.value) : null;
    const to = this.toInput.value ? new Date(this.toInput.value) : null;

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
    this.fromInput.value = model?.from ? this.toDateTimeLocal(model.from) : '';
    this.toInput.value = model?.to ? this.toDateTimeLocal(model.to) : '';
  }

  getGui() {
    return this.eGui;
  }

  destroy() {}
}
