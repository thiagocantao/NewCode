export default class ListCellEditor {
  init(params) {
    this.params = params;
    this.eGui = document.createElement('div');
    this.eGui.style.width = '100%';
    this.eGui.style.height = '100%';

    // Opções da lista
    const optionsArr = Array.isArray(params.colDef.options) ? params.colDef.options : (Array.isArray(params.colDef.listOptions) ? params.colDef.listOptions : []);
    this.options = optionsArr.map(opt => typeof opt === 'object' ? opt : { value: opt, label: String(opt) });

    // Valor inicial
    this.value = params.value;

    // Cria o select customizado
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