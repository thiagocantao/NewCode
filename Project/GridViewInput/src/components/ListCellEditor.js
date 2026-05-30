export default class ListCellEditor {
  init(params) {
    this.params = params;
    const colDef = params.colDef || {};
    this.options = this.normalizeOptions(colDef.listDataSource, colDef.listIdColumn, colDef.listLabelColumn);
    this.filteredOptions = [...this.options];
    this.value = params.value;

    this.eGui = document.createElement('div');
    this.eGui.className = 'grid-list-cell-editor';
    this.eGui.innerHTML = `
      <input type="text" class="grid-list-cell-editor__search" placeholder="Search..." />
      <div class="grid-list-cell-editor__options"></div>
    `;

    this.searchInput = this.eGui.querySelector('.grid-list-cell-editor__search');
    this.optionsContainer = this.eGui.querySelector('.grid-list-cell-editor__options');

    this.searchInput.addEventListener('input', event => {
      const query = String(event.target.value || '').toLowerCase();
      this.filteredOptions = this.options.filter(option =>
        String(option.label ?? '').toLowerCase().includes(query)
      );
      this.renderOptions();
    });

    this.renderOptions();
  }

  normalizeOptions(dataSource, idColumn, labelColumn) {
    const rows = window.wwLib?.wwUtils?.getDataFromCollection
      ? window.wwLib.wwUtils.getDataFromCollection(dataSource)
      : dataSource;

    if (!Array.isArray(rows)) return [];

    return rows.map(item => {
      if (item && typeof item === 'object') {
        const fallbackIdKey = Object.keys(item).find(key => key.toLowerCase() === 'id');
        const fallbackLabelKey = Object.keys(item).find(key => ['label', 'name', 'title'].includes(key.toLowerCase()));
        const value = idColumn ? item[idColumn] : item[fallbackIdKey] ?? item.value;
        const label = labelColumn ? item[labelColumn] : item[fallbackLabelKey] ?? item.label ?? item.name ?? value;
        return { value, label: label == null ? '' : String(label) };
      }

      return { value: item, label: item == null ? '' : String(item) };
    });
  }

  renderOptions() {
    this.optionsContainer.innerHTML = '';

    this.filteredOptions.forEach(option => {
      const optionElement = document.createElement('button');
      optionElement.type = 'button';
      optionElement.className = 'grid-list-cell-editor__option';
      optionElement.textContent = option.label;
      if (option.value === this.value) optionElement.classList.add('selected');

      optionElement.addEventListener('click', () => {
        this.value = option.value;
        this.params.api?.stopEditing?.();
      });

      this.optionsContainer.appendChild(optionElement);
    });
  }

  getGui() {
    return this.eGui;
  }

  afterGuiAttached() {
    this.searchInput?.focus();
  }

  getValue() {
    return this.value;
  }

  isPopup() {
    return true;
  }
}
