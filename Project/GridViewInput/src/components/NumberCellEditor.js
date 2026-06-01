export default class NumberCellEditor {
  init(params) {
    this.params = params;
    this.value = this.resolveInitialValue(params);

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.className = 'grid-number-cell-editor';
    input.value = this.value;

    Object.assign(input.style, {
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      font: 'inherit',
      outline: 'none',
      boxShadow: 'none',
    });

    input.addEventListener('keydown', event => this.handleKeydown(event));
    input.addEventListener('beforeinput', event => this.handleBeforeInput(event));
    input.addEventListener('paste', event => this.handlePaste(event));
    input.addEventListener('drop', event => this.handleDrop(event));
    input.addEventListener('input', () => this.syncValue());

    this.eInput = input;
  }

  resolveInitialValue(params) {
    const eventKey = params?.eventKey ?? params?.charPress;

    if (typeof eventKey === 'string' && eventKey.length === 1) {
      return this.sanitizeValue(eventKey);
    }

    return this.sanitizeValue(params?.value ?? '');
  }

  sanitizeValue(value) {
    return String(value ?? '').replace(/[^0-9.,]/g, '');
  }

  isAllowedCharacter(value) {
    return /^[0-9.,]$/.test(value);
  }

  handleKeydown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.length !== 1) return;

    if (!this.isAllowedCharacter(event.key)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  handleBeforeInput(event) {
    if (!event.data) return;

    if (this.sanitizeValue(event.data) !== event.data) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  handlePaste(event) {
    const pastedValue = event.clipboardData?.getData('text') ?? '';
    const sanitizedValue = this.sanitizeValue(pastedValue);

    if (pastedValue === sanitizedValue) return;

    event.preventDefault();
    this.insertText(sanitizedValue);
  }

  handleDrop(event) {
    const droppedValue = event.dataTransfer?.getData('text') ?? '';
    const sanitizedValue = this.sanitizeValue(droppedValue);

    if (droppedValue === sanitizedValue) return;

    event.preventDefault();
    this.insertText(sanitizedValue);
  }

  insertText(text) {
    if (!text) return;

    const input = this.eInput;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;

    input.value = `${input.value.slice(0, start)}${text}${input.value.slice(end)}`;
    const cursorPosition = start + text.length;
    input.setSelectionRange(cursorPosition, cursorPosition);
    this.syncValue();
  }

  syncValue() {
    const sanitizedValue = this.sanitizeValue(this.eInput.value);

    if (sanitizedValue !== this.eInput.value) {
      const cursorPosition = this.eInput.selectionStart ?? sanitizedValue.length;
      this.eInput.value = sanitizedValue;
      this.eInput.setSelectionRange(
        Math.min(cursorPosition, sanitizedValue.length),
        Math.min(cursorPosition, sanitizedValue.length)
      );
    }

    this.value = this.eInput.value;
  }

  getGui() {
    return this.eInput;
  }

  afterGuiAttached() {
    this.eInput.focus();
    this.eInput.select();
  }

  getValue() {
    return this.value;
  }

  isPopup() {
    return false;
  }
}
