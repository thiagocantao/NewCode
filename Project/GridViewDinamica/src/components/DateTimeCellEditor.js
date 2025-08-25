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
    input.type = 'date';
    input.lang = this.lang;
    input.style.width = '100%';
    input.style.height = '100%';
    input.style.fontSize = '13px';
    input.style.borderRadius = '6px';
    input.style.padding = '4px';

    if (params.value) {
      const date = new Date(params.value);
      if (!isNaN(date.getTime())) {
        input.value = this.toISODate(date);
      }
    }

    this.eInput = input;
  }

  toISODate(date) {
    const pad = n => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  getGui() {
    return this.eInput;
  }

  afterGuiAttached() {
    if (this.eInput) {
      this.eInput.focus();
      this.eInput.showPicker?.();
    }
  }

  getValue() {
    return this.eInput.value || '';
  }

  destroy() {}

  isPopup() {
    return false;
  }
}
