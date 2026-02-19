export default class ListFilterRenderer {
  constructor() {
    this.searchText = '';
    this.selectedValues = [];
    this.allValues = [];
    this.filteredValues = [];
    this.selectAll = false;
    this.formattedValues = [];
    this.rendererConfig = {};
    this.statusLookupMap = null;
    this.isStatusField = false;
  
    // Ensure methods keep the correct 'this' even inside async/promises
    this.loadValues = this.loadValues.bind(this);
    this.populateFromRows = this.populateFromRows.bind(this);
    if (typeof this.resolveEditorLikeOptions === 'function') {
      this.resolveEditorLikeOptions = this.resolveEditorLikeOptions.bind(this);
    }
    
  }

  init(params) {
    this.params = params;
    const maybePromise = this.loadValues();
    if (maybePromise && typeof maybePromise.then === 'function') {
      maybePromise
        .then(() => {
          this.createGui();
        })
        .catch(() => {
          this.createGui();
        });
    } else {
      this.createGui();
    }
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
    const borderRadius = fieldName === 'StatusID' || fieldName === 'CategoryLevel3ID' || fieldName === 'CategoryID' || fieldName === 'SubCategoryID' ? '4px' : '12px';
    const fontweight = fieldName === 'ImpactID' ? "" : 'font-weight:bold;';
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

    const tag = (colDef.TagControl || colDef.tagControl || colDef.tagcontrol || '').toString().toUpperCase();
    const identifier = (colDef.FieldDB || '').toString().toUpperCase();
    this.isStatusField = identifier === 'STATUSID';
    this.statusLookupMap = this.isStatusField ? new Map() : null;
    const categoryTags = ['CATEGORYID','SUBCATEGORYID','CATEGORYLEVEL3ID'];
    this.isCategoryField = categoryTags.includes(tag) || categoryTags.includes(identifier);

    this.rendererConfig = this.buildRendererConfig(colDef);

    let optionsSource = null;

    if (identifier === 'STATUSID') {
      optionsSource = this.resolveStatusCollectionOptions(colDef);
    }

    if (optionsSource == null) {
      optionsSource = this.resolveFilterOptions();
    }

    if (optionsSource && typeof optionsSource.then === 'function') {
      return optionsSource
        .then(options => {
          const populated = this.populateFromExplicitOptions(options, colDef);
          if (!populated) {
            this.populateFromRows(api, column, colDef);
          }
        })
        .catch(error => {
          
          this.populateFromRows(api, column, colDef);
        });
    }

    const populated = this.populateFromExplicitOptions(optionsSource, colDef);
    if (!populated) {
      this.populateFromRows(api, column, colDef);
    }

    return null;
  }

  resolveFilterOptions() {
    const filterParams = this.params?.filterParams || {};
    if (typeof filterParams.getFilterOptions === 'function') {
      try {
        return filterParams.getFilterOptions(this.params);
      } catch (error) {

        
      }
    }
    if (Array.isArray(filterParams.options)) {
      return filterParams.options;
    }
    return null;
  }

  buildRendererConfig(colDef) {
    const rendererParams = this.getRendererParams(colDef);

    const derivedConfig = {};
    if (rendererParams.useCustomFormatter && typeof rendererParams.formatter === 'string') {
      derivedConfig.useCustomFormatter = true;
      derivedConfig.formatter = rendererParams.formatter;
    }
    if (rendererParams.useStyleArray && Array.isArray(rendererParams.styleArray)) {
      derivedConfig.useStyleArray = true;
      derivedConfig.styleArray = rendererParams.styleArray;
    }

    const filterConfig = this.params.filterParams?.rendererConfig || {};

    return {
      ...derivedConfig,
      ...filterConfig,
    };
  }

  getRendererParams(colDef) {
    try {
      if (typeof colDef.cellRendererParams === 'function') {
        return colDef.cellRendererParams({ data: {}, value: undefined, colDef }) || {};
      }
      return colDef.cellRendererParams || {};
    } catch (error) {
      return {};
    }
  }

  resolveStatusCollectionOptions(colDef) {
    const COLLECTION_ID = '95233031-3746-48c8-8c3c-8722b0075d61';

    try {
      const collection = window?.wwLib?.wwCollection?.getCollection?.(COLLECTION_ID);
      const data = collection?.data;

      if (!Array.isArray(data)) {
        return null;
      }

      const sampleValue = this.findSampleValue(colDef);
      const normalizeValueType = (value) => {
        if (sampleValue === undefined || sampleValue === null) return value;

        const sampleType = typeof sampleValue;
        if (sampleType === 'number') {
          const numeric = Number(value);
          return Number.isNaN(numeric) ? value : numeric;
        }

        if (sampleType === 'boolean') {
          if (typeof value === 'boolean') return value;
          if (typeof value === 'string') {
            const lowered = value.toLowerCase();
            if (lowered === 'true') return true;
            if (lowered === 'false') return false;
          }
          return value;
        }

        if (sampleType === 'string') {
          return value != null ? String(value) : value;
        }

        return value;
      };

      const mapped = data
        .map(item => {
          const hasStatusLabel = item?.status != null && item.status !== '';
          const baseValue = hasStatusLabel ? item.status : item?.id;
          if (baseValue === undefined || baseValue === null || baseValue === '') {
            return null;
          }

          const displayText = this.ensureDisplayText(baseValue);
          const normalizedValue = hasStatusLabel
            ? this.ensureDisplayText(item.status)
            : normalizeValueType(baseValue);

          if (this.statusLookupMap) {
            this.registerStatusLookupKey(normalizedValue, normalizedValue);
            if (hasStatusLabel) {
              this.registerStatusLookupKey(item.status, normalizedValue);
            }
            if (item?.id !== undefined && item?.id !== null && item.id !== '') {
              this.registerStatusLookupKey(item.id, normalizedValue);
            }
          }

          return {
            value: normalizedValue,
            label: displayText,
          };
        })
        .filter(option => option && option.value !== undefined && option.value !== null);

      return mapped;
    } catch (error) {
     
      return null;
    }
  }

  registerStatusLookupKey(rawValue, canonicalValue) {
    if (!this.statusLookupMap || rawValue === undefined || rawValue === null) return;
    if (canonicalValue === undefined || canonicalValue === null) return;

    const variations = new Set();
    variations.add(rawValue);

    if (typeof rawValue === 'string') {
      variations.add(rawValue.trim());
      variations.add(rawValue.trim().toLowerCase());
    } else {
      const stringValue = String(rawValue);
      variations.add(stringValue);
      variations.add(stringValue.trim());
      variations.add(stringValue.trim().toLowerCase());
    }

    variations.forEach(variation => {
      if (variation !== undefined && variation !== null && variation !== '') {
        this.statusLookupMap.set(variation, canonicalValue);
      }
    });
  }

  resolveStatusCanonicalValue(value) {
    if (!this.statusLookupMap) return value;
    if (value === undefined || value === null) return value;

    const attempts = [];
    attempts.push(value);

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== value) attempts.push(trimmed);
      attempts.push(trimmed.toLowerCase());
    } else {
      const stringValue = String(value);
      attempts.push(stringValue);
      const trimmed = stringValue.trim();
      if (trimmed !== stringValue) attempts.push(trimmed);
      attempts.push(trimmed.toLowerCase());
    }

    for (const attempt of attempts) {
      if (attempt === undefined || attempt === null) continue;
      if (this.statusLookupMap.has(attempt)) {
        return this.statusLookupMap.get(attempt);
      }
    }

    return value;
  }

  findSampleValue(colDef) {
    const api = this.params?.api;
    if (!api) return undefined;

    const field = colDef.field || this.params.column.getColId();
    let sample = undefined;

    api.forEachNode(node => {
      if (sample !== undefined) return;
      if (!node?.data) return;
      const candidate = this.getNestedValue(node.data, field);
      if (candidate !== undefined && candidate !== null) {
        sample = candidate;
      }
    });

    return sample;
  }

  populateFromExplicitOptions(optionsInput, colDef) {
    const options = Array.isArray(optionsInput) ? optionsInput : [];
    if (!options.length) {
      this.allValues = [];
      this.formattedValues = [];
      this.filteredValues = [];
      return false;
    }

    const normalized = options
      .map(opt => this.normalizeOption(opt))
      .filter(opt => opt && (opt.value !== undefined || opt.value === null));

    if (!normalized.length) {
      this.allValues = [];
      this.formattedValues = [];
      this.filteredValues = [];
      return false;
    }

    const zipped = normalized.map(opt => {
      const rawValue = opt.value;
      const display = opt.label != null ? opt.label : opt.value;
      const formatted = this.formatDisplayValue(this.ensureDisplayText(display), colDef);
      return { raw: rawValue, formatted };
    });

    const uniqueMap = new Map();
    zipped.forEach(item => {
      const key = this.buildRawKey(item.raw);
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    const unique = Array.from(uniqueMap.values());
    unique.sort((a, b) => this.compareFormattedValues(a.formatted, b.formatted));

    this.allValues = unique.map(item => item.raw);
    this.formattedValues = unique.map(item => item.formatted);
    this.filteredValues = [...this.allValues];
    this.selectedValues = this.selectedValues.map(value => this.resolveRawValue(value));
    return true;
  }

  populateFromRows(api, column, colDef) {
    const field = colDef.field || column.getColId();

    this.allValues = [];
    this.formattedValues = [];

    api.forEachNode(node => {
      if (!node.data) return;
      const rawValue = this.getNestedValue(node.data, field);
      if (rawValue === undefined || rawValue === null) return;

      const rendererParams = typeof colDef.cellRendererParams === 'function'
        ? colDef.cellRendererParams({ data: node.data, value: rawValue, colDef })
        : colDef.cellRendererParams || {};

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

      const options = (optionsArr || []).map(opt => this.normalizeOption(opt));
      const match = options.find(o => o.value == rawValue);
      const baseDisplay = match ? (match.label != null ? match.label : match.value) : rawValue;
      const display = this.ensureDisplayText(baseDisplay);

      let formatted = display;
      try {
        if (this.isCategoryField) {
          const colorCategory = window.wwLib?.wwVariable?.getValue('61c1b425-10e8-40dc-8f1f-b117c08b9726').categoryColor;
          formatted = `<span style="height:25px; color:#303030; background:${colorCategory}; border:1px solid ${colorCategory}; border-radius:5px; font-weight:normal; display:inline-flex; align-items:center; padding:0 12px;">${display}</span>`;
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

    const seen = new Map();
    const unique = [];
    this.allValues.forEach((raw, idx) => {
      const key = this.buildRawKey(raw);
      if (!seen.has(key)) {
        seen.set(key, true);
        unique.push({ raw, formatted: this.formattedValues[idx] });
      }
    });

    unique.sort((a, b) => this.compareFormattedValues(a.formatted, b.formatted));

    this.allValues = unique.map(item => item.raw);
    this.formattedValues = unique.map(item => item.formatted);
    this.filteredValues = [...this.allValues];
    this.selectedValues = this.selectedValues.map(value => this.resolveRawValue(value));
  }

  normalizeOption(opt) {
    if (opt === undefined) return null;
    if (opt === null) return { value: null, label: '' };

    if (typeof opt === 'object') {
      const lowerKeyMap = Object.keys(opt).reduce((acc, key) => {
        acc[key.toLowerCase()] = key;
        return acc;
      }, {});

      const findKey = candidates => {
        for (const candidate of candidates) {
          const actual = lowerKeyMap[candidate];
          if (actual) return actual;
        }
        return null;
      };

      const valueKey = findKey([
        'value',
        'id',
        'key',
        'valor',
        'codigo',
        'code',
        'statusid',
        'userid',
      ]);

      const labelKey = findKey([
        'label',
        'name',
        'displayname',
        'descricao',
        'description',
        'text',
        'valor',
        'title',
      ]);

      const rawValue = valueKey != null ? opt[valueKey] : undefined;
      const labelSource = labelKey != null ? opt[labelKey] : undefined;

      let finalValue = rawValue;
      if (finalValue === undefined) {
        if (labelSource !== undefined) {
          finalValue = labelSource;
        } else if (Array.isArray(opt.options) && opt.options.length === 1) {
          finalValue = opt.options[0];
        } else if (valueKey == null && labelKey == null) {
          const firstKey = Object.keys(opt)[0];
          if (firstKey) {
            finalValue = opt[firstKey];
          }
        }
      }

      let finalLabel = labelSource;
      if (finalLabel === undefined) {
        finalLabel = finalValue;
      }

      let normalizedValue = finalValue !== undefined ? finalValue : '';
      if (typeof normalizedValue === 'object') {
        normalizedValue = this.ensureDisplayText(normalizedValue);
      }

      let normalizedLabel = finalLabel != null ? finalLabel : normalizedValue;
      if (typeof normalizedLabel === 'object') {
        normalizedLabel = this.ensureDisplayText(normalizedLabel);
      }

      return {
        value: normalizedValue,
        label: normalizedLabel,
      };
    }

    return { value: opt, label: opt == null ? '' : String(opt) };
  }

  formatDisplayValue(display, colDef) {
    let formatted = this.ensureDisplayText(display);
    try {
      if (this.isCategoryField) {
        const colorCategory = window.wwLib?.wwVariable?.getValue('61c1b425-10e8-40dc-8f1f-b117c08b9726').categoryColor;
        formatted = `<span style="height:25px; color:#303030; background:${colorCategory}; border:1px solid ${colorCategory}; border-radius:5px; font-weight:normal; display:inline-flex; align-items:center; padding:0 12px;">${display}</span>`;
      } else if (this.rendererConfig.useCustomFormatter && typeof this.rendererConfig.formatter === 'string') {
        const formatterFn = new Function(
          'value',
          'row',
          'colDef',
          'getRoundedSpanColor',
          'dateFormatter',
          this.rendererConfig.formatter
        );
        formatted = formatterFn(
          display,
          {},
          colDef,
          this.getRoundedSpanColor,
          this.dateFormatter
        );
      } else if (this.rendererConfig.useStyleArray && Array.isArray(this.rendererConfig.styleArray)) {
        const styled = this.getRoundedSpanColor(display, this.rendererConfig.styleArray, colDef.FieldDB);
        if (styled) formatted = styled;
      }
    } catch (e) {
      // se der erro, mantém valor calculado
    }
    return formatted;
  }

  buildRawKey(raw) {
    if (raw === null) return 'raw:null';
    if (raw === undefined) return 'raw:undefined';
    if (typeof raw === 'object') {
      try {
        return `raw:object:${JSON.stringify(raw)}`;
      } catch (error) {
        return `raw:object:${String(raw)}`;
      }
    }
    return `raw:${typeof raw}:${String(raw)}`;
  }

  compareFormattedValues(a, b) {
    const textA = this.stripHtml(String(a)).toLowerCase();
    const textB = this.stripHtml(String(b)).toLowerCase();
    return textA.localeCompare(textB, undefined, { sensitivity: 'base' });
  }

  stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  ensureDisplayText(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Date) return this.dateFormatter(value);
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }


  normalizeOption(opt) {
    if (opt === undefined) return null;
    if (opt === null) return { value: null, label: '' };

    if (typeof opt === 'object') {
      const lowerKeyMap = Object.keys(opt).reduce((acc, key) => {
        acc[key.toLowerCase()] = key;
        return acc;
      }, {});

      const findKey = candidates => {
        for (const candidate of candidates) {
          const actual = lowerKeyMap[candidate];
          if (actual) return actual;
        }
        return null;
      };

      const valueKey = findKey([
        'value',
        'id',
        'key',
        'valor',
        'codigo',
        'code',
        'statusid',
        'userid',
      ]);

      const labelKey = findKey([
        'label',
        'name',
        'displayname',
        'descricao',
        'description',
        'text',
        'valor',
        'title',
      ]);

      const rawValue = valueKey != null ? opt[valueKey] : undefined;
      const labelSource = labelKey != null ? opt[labelKey] : undefined;

      let finalValue = rawValue;
      if (finalValue === undefined) {
        if (labelSource !== undefined) {
          finalValue = labelSource;
        } else if (Array.isArray(opt.options) && opt.options.length === 1) {
          finalValue = opt.options[0];
        } else if (valueKey == null && labelKey == null) {
          const firstKey = Object.keys(opt)[0];
          if (firstKey) {
            finalValue = opt[firstKey];
          }
        }
      }

      let finalLabel = labelSource;
      if (finalLabel === undefined) {
        finalLabel = finalValue;
      }

      let normalizedValue = finalValue !== undefined ? finalValue : '';
      if (typeof normalizedValue === 'object') {
        normalizedValue = this.ensureDisplayText(normalizedValue);
      }

      let normalizedLabel = finalLabel != null ? finalLabel : normalizedValue;
      if (typeof normalizedLabel === 'object') {
        normalizedLabel = this.ensureDisplayText(normalizedLabel);
      }

      return {
        value: normalizedValue,
        label: normalizedLabel,
      };
    }


    return { value: opt, label: opt == null ? '' : String(opt) };
  }

  formatDisplayValue(display, colDef) {
    let formatted = this.ensureDisplayText(display);

    try {
      if (this.isCategoryField) {
        const colorCategory = window.wwLib?.wwVariable?.getValue('61c1b425-10e8-40dc-8f1f-b117c08b9726').categoryColor;
        formatted = `<span style="height:25px; color:#303030; background:${colorCategory}; border:1px solid ${colorCategory}; border-radius:5px; font-weight:normal; display:inline-flex; align-items:center; padding:0 12px;">${display}</span>`;
      } else if (this.rendererConfig.useCustomFormatter && typeof this.rendererConfig.formatter === 'string') {
        const formatterFn = new Function(
          'value',
          'row',
          'colDef',
          'getRoundedSpanColor',
          'dateFormatter',
          this.rendererConfig.formatter
        );
        formatted = formatterFn(
          display,
          {},
          colDef,
          this.getRoundedSpanColor,
          this.dateFormatter
        );
      } else if (this.rendererConfig.useStyleArray && Array.isArray(this.rendererConfig.styleArray)) {
        const styled = this.getRoundedSpanColor(display, this.rendererConfig.styleArray, colDef.FieldDB);
        if (styled) formatted = styled;
      }
    } catch (e) {
      // se der erro, mantém valor calculado
    }
    return formatted;
  }

  buildRawKey(raw) {
    if (raw === null) return 'raw:null';
    if (raw === undefined) return 'raw:undefined';
    if (typeof raw === 'object') {
      try {
        return `raw:object:${JSON.stringify(raw)}`;
      } catch (error) {
        return `raw:object:${String(raw)}`;
      }
    }
    return `raw:${typeof raw}:${String(raw)}`;
  }

  compareFormattedValues(a, b) {
    const textA = this.stripHtml(String(a)).toLowerCase();
    const textB = this.stripHtml(String(b)).toLowerCase();
    return textA.localeCompare(textB, undefined, { sensitivity: 'base' });
  }

  stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }
  
  ensureDisplayText(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Date) return this.dateFormatter(value);
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
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
    if (this.isStatusField && this.statusLookupMap) {
      const canonical = this.resolveStatusCanonicalValue(value);
      if (canonical !== value) {
        const canonicalIndex = this.allValues.indexOf(canonical);
        if (canonicalIndex !== -1) {
          return this.allValues[canonicalIndex];
        }
        return canonical;
      }
    }

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
      const title = this.stripHtml(this.ensureDisplayText(formattedValue)).replace(/"/g, '&quot;');
      return `
        <label class="filter-item${itemClass}">
          <input type="checkbox" value="${idx}" data-raw-index="${idx}" ${checked} />
          <span class="filter-label" title="${title}">${formattedValue}</span>
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
    const resolvedValue = this.resolveRawValue(value);
    return this.selectedValues.includes(resolvedValue);
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
    const maybePromise = this.loadValues();
    if (maybePromise && typeof maybePromise.then === 'function') {
      maybePromise
        .then(() => {
          this.filterValues();
        })
        .catch(() => {
          this.filterValues();
        });
    } else {
      this.filterValues();
    }
  }
}
