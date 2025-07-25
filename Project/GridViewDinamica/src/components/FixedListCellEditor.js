export default class FixedListCellEditor {
  init(params) {
    this.params = params;
    this.eGui = document.createElement('div');
    this.eGui.style.width = '100%';
    this.eGui.style.height = '100%';

    // Fixed list options
    this.options = [
      { value: 1, label: 'Carro' },
      { value: 2, label: 'Navio' },
      { value: 3, label: 'Avi\u00E3o' }
    ];

    // Initial value
    this.value = params.value;

    const select = document.createElement('select');
    select.style.width = '100%';
    select.style.height = '100%';
    select.style.fontSize = '13px';
    select.style.borderRadius = '6px';
    select.style.padding = '4px';

    this.options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.innerHTML = opt.label;
      if (opt.value == this.value) option.selected = true;
      select.appendChild(option);
    });

    select.addEventListener('change', e => {
      this.value = e.target.value;
    });

    this.eGui.appendChild(select);
    this.select = select;
  }

  getGui() {
    return this.eGui;
  }

  afterGuiAttached() {
    if (this.select) this.select.focus();
  }

  getValue() {
    return this.value;
  }

  destroy() {}

  isPopup() {
    return false;
  }
}
