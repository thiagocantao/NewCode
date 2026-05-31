export default class ListCellEditor {
  init(params) {
    this.params = params;
    const colDef = params.colDef || {};
    this.options = this.normalizeOptions(
      colDef.listDataSource,
      colDef.listIdColumn,
      colDef.listLabelColumn
    );
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
    const rows = this.resolveRows(dataSource);

    if (!Array.isArray(rows)) return [];

    return rows.map(item => {
      if (item && typeof item === 'object') {
        const fallbackIdKey = Object.keys(item).find(key => key.toLowerCase() === 'id');
        const fallbackLabelKey = Object.keys(item).find(key => ['label', 'name', 'title'].includes(key.toLowerCase()));
        const value = this.resolveFieldValue(item, idColumn, [fallbackIdKey, 'value', 'id']);
        const label = this.resolveFieldValue(item, labelColumn, [fallbackLabelKey, 'label', 'name', 'title'], value);
        return { value, label: label == null ? '' : String(label) };
      }

      return { value: item, label: item == null ? '' : String(item) };
    });
  }


  resolveRows(dataSource) {
    let source = dataSource;

    if (typeof source === 'string') {
      source = this.parseDataSourceString(source);
    }

    const collectionRows = window.wwLib?.wwUtils?.getDataFromCollection
      ? window.wwLib.wwUtils.getDataFromCollection(source)
      : source;

    if (Array.isArray(collectionRows)) return collectionRows;
    if (!collectionRows || typeof collectionRows !== 'object') return [];

    const arrayValue = Object.values(collectionRows).find(value => Array.isArray(value));
    return arrayValue || [];
  }


  parseDataSourceString(source) {
    const value = source.trim().replace(/\\n/g, '\n');

    if (!value) return [];

    try {
      return JSON.parse(value);
    } catch (error) {
      const normalizedValue = value
        .replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3')
        .replace(/,\s*([}\]])/g, '$1');

      try {
        return JSON.parse(normalizedValue);
      } catch (normalizedError) {
        return [];
      }
    }
  }

  resolveFieldValue(item, configuredPath, fallbackPaths = [], fallbackValue = undefined) {
    const configuredValue = this.getValueByPath(item, configuredPath);
    if (configuredValue !== undefined && configuredValue !== null && configuredValue !== '') return configuredValue;

    for (const fallbackPath of fallbackPaths) {
      const fallbackPathValue = this.getValueByPath(item, fallbackPath);
      if (fallbackPathValue !== undefined && fallbackPathValue !== null && fallbackPathValue !== '') {
        return fallbackPathValue;
      }
    }

    return fallbackValue;
  }

  normalizePropertyPath(path) {
    if (path === undefined || path === null || path === '') return null;
    if (Array.isArray(path)) return path.join('.');
    if (typeof path === 'object') {
      return this.normalizePropertyPath(path.path ?? path.value ?? path.key ?? path.name ?? path.id ?? path.property);
    }

    return String(path)
      .replace(/^context\.mapping\??\.?/, '')
      .replace(/^context\.item\??\.?/, '')
      .replace(/^item\./, '')
      .replace(/^\[['"]?/, '')
      .replace(/['"]?\]$/, '')
      .replace(/\[['"]([^'"]+)['"]\]/g, '.$1');
  }

  getValueByPath(item, path) {
    const normalizedPath = this.normalizePropertyPath(path);
    if (!normalizedPath) return undefined;

    if (window.wwLib?.resolveObjectPropertyPath) {
      const resolvedValue = window.wwLib.resolveObjectPropertyPath(item, normalizedPath);
      if (resolvedValue !== undefined) return resolvedValue;
    }

    return normalizedPath
      .split('.')
      .reduce((value, key) => (value && value[key] !== undefined ? value[key] : undefined), item);
  }

  renderOptions() {
    this.optionsContainer.innerHTML = '';

    this.filteredOptions.forEach(option => {
      const optionElement = document.createElement('button');
      optionElement.type = 'button';
      optionElement.className = 'grid-list-cell-editor__option';
      optionElement.textContent = option.label;
      if (String(option.value) === String(this.value)) optionElement.classList.add('selected');

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
