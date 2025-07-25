export default class DateTimeCellEditor {
  init(params) {
    this.params = params;
    const input = document.createElement('input');
    input.type = 'datetime-local';
    input.style.width = '100%';
    input.style.height = '100%';
    input.style.fontSize = '13px';
    input.style.borderRadius = '6px';
    input.style.padding = '4px';

    // Set initial value if provided
    if (params.value) {
      input.value = this.toDateTimeLocal(params.value);
    }

    this.eInput = input;
  }

  toDateTimeLocal(value) {
    try {
      // handle formats like 'YYYY-MM-DD HH:mm:ss+00' or ISO strings
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
    } catch(e) {}
    return value;
  }

  getGui() {
    return this.eInput;
  }

  afterGuiAttached() {
    if (this.eInput) this.eInput.focus();
  }

  getValue() {
    return this.eInput.value;
  }

  destroy() {}

  isPopup() {
    return false;
  }
}
