export default class ListFilterRenderer {
  constructor() {
    this.searchText = '';
    this.selectedValues = [];
    this.allValues = [];
    this.filteredValues = [];
    this.selectAll = false;
    this.formattedValues = [];
  }

  init(params) {
    this.params = params;
    this.loadValues();
    this.createGui();
  }

  createGui() {
    this.eGui = document.createElement('div');
    this.eGui.className = 'list-filter';
    this.eGui.innerHTML = `
      <div class="field-search">
        <input type="text" placeholder="Search..." class="search-input" />
        <span class="search-icon">
          <i class="material-symbols-outlined-search">search</i>
        </span>
      </div>
      <div class="select-all-row">
        <label>
          <input type="checkbox" class="select-all-checkbox" />
          <span>Select all</span>
        </label>
      </div>
      <div class="filter-list"></div>
    `;

    this.searchInput = this.eGui.querySelector('.search-input');
    this.filterList = this.eGui.querySelector('.filter-list');
    this.selectAllCheckbox = this.eGui.querySelector('.select-all-checkbox');

    this.setupEventListeners();
    this.renderFilterList();
  }

  setupEventListeners() {
    this.searchInput.addEventListener('input', (e) => {
      this.searchText = e.target.value;
      this.filterValues();
    });

    this.selectAllCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        this.selectedValues = [...this.filteredValues];
      } else {
        this.selectedValues = [];
      }
      this.renderFilterList();
      this.applyFilter();
    });
  }

  // Função utilitária para acessar campos aninhados
  getNestedValue(obj, path) {
    return path.split('.').reduce((o, p) => (o && o[p] !== undefined ? o[p] : undefined), obj);
  }

  // Função auxiliar igual ao FormatterCellRenderer
  getRoundedSpanColor(value, colorArray, fieldName) {
    if (!colorArray || !Array.isArray(colorArray) || !value) return value;
    const matchingStyle = colorArray.find(item => item.Valor === value);
    if (!matchingStyle) return value;
    const borderRadius = fieldName === 'StatusID' ? '4px' : '12px';
    const fontweight = "font-weight:bold;";
    return `<span style="height:25px; color: ${matchingStyle.CorFonte}; background:${matchingStyle.CorFundo}; border: 1px solid ${matchingStyle.CorFundo}; border-radius: ${borderRadius}; ${fontweight} display: inline-flex; align-items: center; padding: 0 12px;">${value}</span>`;
  }

  dateFormatter(dateValue, lang) {
    try {
      if (!dateValue) return '';
      const dateOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      };
      const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      };
      const datePart = new Intl.DateTimeFormat(lang || 'en', dateOptions).format(new Date(dateValue));
      const timePart = new Intl.DateTimeFormat(lang || 'en', timeOptions).format(new Date(dateValue));
      return `${datePart} ${timePart}`;
    } catch (error) {
      return dateValue;
    }
  }

  loadValues() {
    const api = this.params.api;
    const column = this.params.column;
    const colDef = column.getColDef();
    const field = colDef.field || column.getColId();

    const tag = (colDef.TagControl || colDef.tagControl || colDef.tagcontrol || '').toString().toUpperCase();
    const identifier = (colDef.FieldDB || '').toString().toUpperCase();
    const categoryTags = ['CATEGORYID','SUBCATEGORYID','CATEGORYLEVEL3ID'];
    this.isCategoryField = categoryTags.includes(tag) || categoryTags.includes(identifier);

    const normalize = (opt) => {
      if (typeof opt === 'object') {
        const findKey = key => Object.keys(opt).find(k => k.toLowerCase() === key);
        const labelKey = findKey('label') || findKey('name');
        const valueKey = findKey('value') || findKey('id');
        return {
          ...opt,
          value: valueKey ? opt[valueKey] : opt.value,
          label: labelKey ? opt[labelKey] : opt.label || opt.name
        };
      }
      return { value: opt, label: String(opt) };
    };

    this.allValues = [];
    this.formattedValues = [];
    api.forEachNode(node => {
      if (!node.data) return;
      const rawValue = this.getNestedValue(node.data, field);
      if (rawValue === undefined || rawValue === null) return;

      // Resolve renderer params (pode ser função)
      const rendererParams = typeof colDef.cellRendererParams === 'function'
        ? colDef.cellRendererParams({ data: node.data, value: rawValue, colDef })
        : colDef.cellRendererParams || {};

      // Obtém opções para mapear valor -> label
      let optionsArr = [];
      if (Array.isArray(rendererParams.options)) {
        optionsArr = rendererParams.options;
      } else if (Array.isArray(colDef.options)) {
        optionsArr = colDef.options;
      } else if (Array.isArray(colDef.listOptions)) {
        optionsArr = colDef.listOptions;
      } else if (typeof colDef.listOptions === 'string' && colDef.listOptions.trim() !== '') {
        optionsArr = colDef.listOptions.split(',').map(o => o.trim());
      } else if (colDef.dataSource && typeof colDef.dataSource.list_options === 'string' && colDef.dataSource.list_options.trim() !== '') {
        optionsArr = colDef.dataSource.list_options.split(',').map(o => o.trim());
      }

      const options = (optionsArr || []).map(normalize);
      const match = options.find(o => o.value == rawValue);
      const display = match ? (match.label != null ? match.label : match.value) : rawValue;

      // Aplica formatter ou style array conforme editor
      let formatted = display;
      try {
        if (this.isCategoryField) {
          formatted = `<span style="height:25px; color:#303030; background:#c9edf9; border:1px solid #c9edf9; border-radius:12px; font-weight:normal; display:inline-flex; align-items:center; padding:0 12px;">${display}</span>`;
        } else if (rendererParams.useCustomFormatter && typeof rendererParams.formatter === 'string') {
          const formatterFn = new Function(
            'value',
            'row',
            'colDef',
            'getRoundedSpanColor',
            'dateFormatter',
            rendererParams.formatter
          );
          formatted = formatterFn(
            display,
            node.data,
            colDef,
            this.getRoundedSpanColor,
            this.dateFormatter
          );
        } else if (rendererParams.useStyleArray && Array.isArray(rendererParams.styleArray)) {
          const styled = this.getRoundedSpanColor(display, rendererParams.styleArray, colDef.FieldDB);
          if (styled) formatted = styled;
        }
      } catch (e) {
        // se der erro, mantém valor calculado
      }

      this.allValues.push(rawValue);
      this.formattedValues.push(formatted);
    });
    // Remover duplicatas mantendo o mapeamento
    const seen = new Set();
    const uniqueRaw = [];
    const uniqueFormatted = [];
    this.allValues.forEach((raw, idx) => {
      if (!seen.has(raw)) {
        seen.add(raw);
        uniqueRaw.push(raw);
        uniqueFormatted.push(this.formattedValues[idx]);
      }
    });
    // Função utilitária para extrair texto puro de HTML
    function stripHtml(html) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    }
    // Ordena os valores alfabeticamente pelo texto visível formatado
    const zipped = uniqueRaw.map((raw, idx) => ({ raw, formatted: uniqueFormatted[idx] }));
    zipped.sort((a, b) => {
      const textA = stripHtml(String(a.formatted)).toLowerCase();
      const textB = stripHtml(String(b.formatted)).toLowerCase();
      return textA.localeCompare(textB, undefined, { sensitivity: 'base' });
    });
    this.allValues = zipped.map(z => z.raw);
    this.formattedValues = zipped.map(z => z.formatted);
    this.filteredValues = [...this.allValues];
    this.selectedValues = this.selectedValues.map(value => this.resolveRawValue(value));
  }

  filterValues() {
    if (!this.searchText) {
      this.filteredValues = [...this.allValues];
    } else {
      this.filteredValues = this.allValues.filter((raw, idx) => {
        const formatted = this.formattedValues[idx];
        return String(formatted).toLowerCase().includes(this.searchText.toLowerCase());
      });
    }
    this.renderFilterList();
  }

  resolveRawValue(value) {
    const directIndex = this.allValues.indexOf(value);
    if (directIndex !== -1) return this.allValues[directIndex];

    if (value === null) {
      const nullIndex = this.allValues.indexOf(null);
      return nullIndex !== -1 ? this.allValues[nullIndex] : value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      const lower = trimmed.toLowerCase();

      if (lower === 'null') {
        const nullIndex = this.allValues.indexOf(null);
        if (nullIndex !== -1) return this.allValues[nullIndex];
      }

      if (lower === 'true' || lower === 'false') {
        const boolValue = lower === 'true';
        const boolIndex = this.allValues.indexOf(boolValue);
        if (boolIndex !== -1) return this.allValues[boolIndex];
      }

      if (trimmed !== '') {
        const numValue = Number(trimmed);
        if (!Number.isNaN(numValue)) {
          const numIndex = this.allValues.indexOf(numValue);
          if (numIndex !== -1) return this.allValues[numIndex];
        }
      }

      const strIndex = this.allValues.findIndex(raw => {
        if (raw === value) return true;
        if (typeof raw === 'number' || typeof raw === 'boolean') {
          return String(raw) === trimmed;
        }
        return false;
      });
      if (strIndex !== -1) return this.allValues[strIndex];
    }

    if (typeof value === 'number') {
      const strValue = String(value);
      const strIndex = this.allValues.findIndex(raw => typeof raw === 'string' && raw === strValue);
      if (strIndex !== -1) return this.allValues[strIndex];
    }

    if (typeof value === 'boolean') {
      const boolStr = value ? 'true' : 'false';
      const boolIndex = this.allValues.findIndex(raw => typeof raw === 'string' && raw.toLowerCase && raw.toLowerCase() === boolStr);
      if (boolIndex !== -1) return this.allValues[boolIndex];
    }

    return value;
  }

  renderFilterList() {
    this.selectAllCheckbox.checked =
      this.filteredValues.length > 0 &&
      this.filteredValues.every(v => this.selectedValues.includes(v));

    this.filterList.innerHTML = this.filteredValues.map((rawValue) => {
      const idx = this.allValues.indexOf(rawValue);
      const formattedValue = this.formattedValues[idx] || rawValue;
      const checked = this.selectedValues.includes(rawValue) ? 'checked' : '';
      const itemClass = this.selectedValues.includes(rawValue) ? ' selected' : '';
      return `
        <label class="filter-item${itemClass}">
          <input type="checkbox" value="${idx}" data-raw-index="${idx}" ${checked} />
          <span class="filter-label" title="">${formattedValue}</span>
        </label>
      `;
    }).join('');

    this.filterList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const rawIndexAttr = e.target.getAttribute('data-raw-index');
        const rawIndex = rawIndexAttr != null ? Number(rawIndexAttr) : -1;
        const rawValue = (rawIndex >= 0 && rawIndex < this.allValues.length)
          ? this.allValues[rawIndex]
          : this.resolveRawValue(e.target.value);
        if (e.target.checked) {
          if (!this.selectedValues.includes(rawValue)) {
            this.selectedValues.push(rawValue);
          }
        } else {
          this.selectedValues = this.selectedValues.filter(v => v !== rawValue);
        }
        this.selectAllCheckbox.checked =
          this.filteredValues.length > 0 &&
          this.filteredValues.every(v => this.selectedValues.includes(v));
        this.applyFilter();
      });
    });
  }

  applyFilter() {
    this.params.filterChangedCallback();
  }

  clearFilter() {
    this.selectedValues = [];
    this.searchText = '';
    this.searchInput.value = '';
    this.filteredValues = [...this.allValues];
    this.renderFilterList();
    this.params.filterChangedCallback();
  }

  isFilterActive() {
    return this.selectedValues.length > 0;
  }

  doesFilterPass(params) {
    if (this.selectedValues.length === 0) return true;
    const field = this.params.column.getColDef().field || this.params.column.getColId();
    const value = this.getNestedValue(params.data, field);
    return this.selectedValues.includes(value);
  }

  getModel() {
    if (this.selectedValues.length === 0) return null;
    return {
      type: 'list',
      values: this.selectedValues
    };
  }

  setModel(model) {
    if (model && Array.isArray(model.values)) {
      this.selectedValues = model.values.map(value => this.resolveRawValue(value));
    } else {
      this.selectedValues = [];
    }
    this.renderFilterList();
  }

  getGui() {
    return this.eGui;
  }

  onNewRowsLoaded() {
    this.loadValues();
    this.filterValues();
  }
} 
