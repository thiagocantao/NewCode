export default class DateTimeCellEditor {
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
    const input = document.createElement('input');
    input.type = 'text';
    input.style.width = '100%';
    input.style.height = '100%';
    input.style.fontSize = '13px';
    input.style.borderRadius = '6px';
    input.style.padding = '4px';

    if (params.value) {
      const date = new Date(params.value);
      if (!isNaN(date.getTime())) {
        input.value = this.formatDate(date);
      } else {
        input.value = params.value;
      }
    }

    this.value = input.value;
    const syncValue = e => {
      this.value = e.target.value;
    };
    input.addEventListener('input', syncValue);
    input.addEventListener('change', syncValue);

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.stopPropagation();
        e.preventDefault();
        this.value = e.target.value;
        if (this.params && this.params.api) {
          this.params.api.stopEditing();
        } else if (this.params && typeof this.params.stopEditing === 'function') {
          this.params.stopEditing();
        }
      }
    });

    this.eInput = input;
  }

  formatDate(date) {
    try {
      const opts = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      };
      return new Intl.DateTimeFormat(this.lang, opts).format(date);
    } catch (e) {
      return date.toISOString();
    }
  }

  parseDate(value) {
    if (!value) return null;
    const parts = value
      .trim()
      .split(/[^0-9]/)
      .filter(Boolean)
      .map(p => parseInt(p, 10));
    if (parts.length < 3) return null;
    let day, month, year, hour = 0, minute = 0;
    if (this.lang === 'en' || this.lang === 'en-US') {
      [month, day, year, hour, minute] = parts;
    } else {
      [day, month, year, hour, minute] = parts;
    }
    const d = new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0);
    return isNaN(d.getTime()) ? null : d;
  }

  getGui() {
    return this.eInput;
  }

  afterGuiAttached() {
    if (this.eInput) this.eInput.focus();
  }

  getValue() {
    const date = this.parseDate(this.value);
    if (date) {
      const pad = n => n.toString().padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
    return this.value;
  }

  destroy() {}

  isPopup() {
    return false;
  }
}
