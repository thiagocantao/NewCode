export default class ListFilterRenderer {
  constructor() {
    this.searchText = '';
    this.selectedValues = [];
    this.allValues = [];
    this.filteredValues = [];
    this.selectAll = false;
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
    const cellRendererParams = colDef.cellRendererParams || {};

    this.allValues = [];
    this.formattedValues = [];
    api.forEachNode(node => {
      if (node.data) {
        let value = this.getNestedValue(node.data, field);
        let formatted = value;
        // Aplica o formatter se necessário, igual ao FormatterCellRenderer
        if (cellRendererParams.useCustomFormatter && typeof cellRendererParams.formatter === 'string') {
          try {
            const formatterFn = new Function(
              'value',
              'row',
              'colDef',
              'getRoundedSpanColor',
              'dateFormatter',
              cellRendererParams.formatter
            );
            formatted = formatterFn(
              value,
              node.data,
              colDef,
              this.getRoundedSpanColor,
              this.dateFormatter
            );
          } catch (e) {
            // Se der erro, mantém o valor original
          }
        }
        if (value !== undefined && value !== null) {
          this.allValues.push(value);
          this.formattedValues.push(formatted);
        }
      }
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

  renderFilterList() {
    this.selectAllCheckbox.checked =
      this.filteredValues.length > 0 &&
      this.filteredValues.every(v => this.selectedValues.includes(v));

    this.filterList.innerHTML = this.filteredValues.map((rawValue) => {
      const idx = this.allValues.indexOf(rawValue);
      const formattedValue = this.formattedValues[idx] || rawValue;
      const checked = this.selectedValues.includes(rawValue) ? 'checked' : '';
      return `
        <label class="filter-item${this.selectedValues.includes(rawValue) ? ' selected' : ''}">
          <input type="checkbox" value="${rawValue}" ${checked} />
          <span class="filter-label" title="">${formattedValue}</span>
        </label>
      `;
    }).join('');

    this.filterList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const value = e.target.value;
        if (e.target.checked) {
          if (!this.selectedValues.includes(value)) {
            this.selectedValues.push(value);
          }
        } else {
          this.selectedValues = this.selectedValues.filter(v => v !== value);
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
    if (model && model.values) {
      this.selectedValues = model.values;
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