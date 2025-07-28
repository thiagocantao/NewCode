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

    // keep value in sync so getValue works even after element removal
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
    // return the cached value to avoid issues if the element was removed
    return this.value;
  }

  destroy() {}

  isPopup() {
    return false;
  }
}
