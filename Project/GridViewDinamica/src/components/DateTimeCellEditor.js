export default class DateTimeCellEditor {
  init(params) {
    this.params = params;
    const tag = (params.colDef?.TagControl || params.colDef?.tagControl || '').toUpperCase();
    const type = tag === 'DEADLINE' ? 'datetime-local' : 'date';

    const input = document.createElement('input');
    input.type = type;
    input.style.width = '100%';
    input.style.height = '100%';
    input.style.fontSize = '13px';
    input.style.borderRadius = '6px';
    input.style.padding = '4px';

    if (params.value) {
      input.value = this.toInputValue(params.value, type);
    }
    this.value = input.value || '';

    const sync = e => {
      this.value = e.target.value;
    };
    input.addEventListener('input', sync);
    input.addEventListener('change', sync);

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.stopPropagation();
        e.preventDefault();
        this.value = e.target.value;
        if (this.params && this.params.api && this.params.api.stopEditing) {
          this.params.api.stopEditing();
        } else if (this.params && typeof this.params.stopEditing === 'function') {
          this.params.stopEditing();
        }
      }
    });

    this.eInput = input;
  }

  toInputValue(value, type) {
    try {
      let v = value;
      if (typeof v === 'string') {
        v = v.replace(' ', 'T');
        v = v.replace(/([+\-]\d{2}):?(\d{2})?$/, '$1:$2');
      }
      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        const pad = n => String(n).padStart(2, '0');
        if (type === 'datetime-local') {
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      }
    } catch (e) {}
    return value;
  }

  getGui() {
    return this.eInput;
  }

  afterGuiAttached() {
    if (this.eInput) this.eInput.focus();
  }

  getValue() {
    return this.value || '';
  }

  destroy() {}

  isCancelBeforeStart() {
    return false;
  }

  isCancelAfterEnd() {
    return false;
  }

  isPopup() {
    return false;
  }
}

