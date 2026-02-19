export default class FixedListCellEditor {
  init(params) {
    this.params = params;
    const colDef = params.colDef || {};
    this.rendererParams =
      typeof colDef.cellRendererParams === 'function'
        ? colDef.cellRendererParams(params)
        : colDef.cellRendererParams || {};
    this.eGui = document.createElement('div');
    this.eGui.className = 'list-editor';
    this.eGui.innerHTML = `
      <span class="editor-close">&times;</span>
      <div class="field-search">
        <input type="text" class="search-input" placeholder="Search..." />
        <span class="search-icon"><i class="material-symbols-outlined-search">search</i></span>
      </div>
      <div class="filter-list"></div>
    `;
    this.searchInput = this.eGui.querySelector('.search-input');
    this.listEl = this.eGui.querySelector('.filter-list');
    this.closeBtn = this.eGui.querySelector('.editor-close');

    // log API calls triggered while loading list options
    this.restoreApiLogger = this.setupApiLogger();


    const tag =
      (params.colDef.TagControl ||
        params.colDef.tagControl ||
        params.colDef.tagcontrol ||
        '').toUpperCase();
    const identifier = (params.colDef.FieldDB || '').toUpperCase();
    this.isResponsibleUser =
      tag === 'RESPONSIBLEUSERID' || identifier === 'RESPONSIBLEUSERID';
    const categoryTags = ['CATEGORYID','SUBCATEGORYID','CATEGORYLEVEL3ID'];
    this.isCategoryField = categoryTags.includes(tag) || categoryTags.includes(identifier);


    // Fixed list options (supports promises)
    const normalize = opt =>
      typeof opt === 'object' ? opt : { value: opt, label: String(opt) };

    const resolveOptions = arr => {
      

      this.options = (arr || []).map(normalize);
      this.filteredOptions = [...this.options];
      this.renderOptions();
    };

    this.getColumnFieldKey = () => {
      if (!this.params) return null;
      const col = this.params.column;
      if (col && typeof col.getColId === 'function') {
        const id = col.getColId();
        if (id) return id;
      }
      return this.params.colDef?.field || this.params.colDef?.colId || null;
    };

    this.extractOptionLabel = value => {
      if (!this.options || !this.options.length) return undefined;
      const match = this.options.find(opt => String(opt.value) === String(value));
      if (!match) return undefined;
      const label =
        match.label ??
        match.name ??
        match.text ??
        match.descricao ??
        match.description ??
        match.Valor ??
        match.value;
      return label != null ? label : undefined;
    };

    this.updateDisplayLabel = (value, { refresh = true } = {}) => {
      const fieldKey = this.getColumnFieldKey();
      const rowData = this.params?.node?.data;
      if (!fieldKey || !rowData) return;
      const labelField = `${fieldKey}__displayLabel`;
      const label = this.extractOptionLabel(value);
      if (label != null) {
        rowData[labelField] = String(label);
      } else if (value != null && value !== '') {
        rowData[labelField] = String(value);
      } else {
        delete rowData[labelField];
      }
      if (refresh && this.params.api && this.params.node) {
        this.params.api.refreshCells({
          rowNodes: [this.params.node],
          columns: [fieldKey],
          force: true,
        });
      }
    };

    let optionsPromise;
    if (typeof params.options === 'function') {
     
      try {
        const result = params.options(params);
        
        optionsPromise =
          result && typeof result.then === 'function'
            ? result
            : Promise.resolve(result);
      } catch (err) {
        
        optionsPromise = Promise.resolve([]);
      }
    } else if (params.options && typeof params.options.then === 'function') {

      
      optionsPromise = params.options;
    } else if (Array.isArray(params.options)) {
      
      optionsPromise = Promise.resolve(params.options);
    } else if (typeof params.colDef.options === 'function') {
     
      try {
        const result = params.colDef.options(params);
        
        optionsPromise =
          result && typeof result.then === 'function'
            ? result
            : Promise.resolve(result);
      } catch (err) {
        
        optionsPromise = Promise.resolve([]);
      }

    } else if (Array.isArray(params.colDef.options)) {
      
      optionsPromise = Promise.resolve(params.colDef.options);
    } else if (Array.isArray(params.colDef.listOptions)) {
      
      optionsPromise = Promise.resolve(params.colDef.listOptions);
    } else if (
      typeof params.colDef.listOptions === 'function'
    ) {
     
      try {
        const result = params.colDef.listOptions(params);
        
        optionsPromise =
          result && typeof result.then === 'function'
            ? result
            : Promise.resolve(result);
      } catch (err) {
        
        optionsPromise = Promise.resolve([]);
      }

    } else if (
      typeof params.colDef.listOptions === 'string' &&
      params.colDef.listOptions.trim() !== ''
    ) {
      

      optionsPromise = Promise.resolve(
        params.colDef.listOptions.split(',').map(o => o.trim())
      );
    } else if (
      params.colDef.dataSource &&
      typeof params.colDef.dataSource.list_options === 'string' &&
      params.colDef.dataSource.list_options.trim() !== ''
    ) {

      optionsPromise = Promise.resolve(
        params.colDef.dataSource.list_options
          .split(',')
          .map(o => o.trim())
      );
    } else {
      optionsPromise = Promise.resolve([]);
    }

    optionsPromise
      .then(res => {
        resolveOptions(res);
      })
      .catch(err => {
        resolveOptions([]);
      });


    this.value = params.value;

    this.searchInput.addEventListener('input', e => {
      this.filterOptions(e.target.value);
    });

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        if (this.params.api && this.params.api.stopEditing) {
          this.params.api.stopEditing(true);
        } else if (this.params.stopEditing) {
          this.params.stopEditing(true);
        }
      });
    }
  }

  setupApiLogger() {
    const origFetch = window.fetch;
    const origAxiosReq = window.axios && window.axios.request;
    const XHR = window.XMLHttpRequest;
    const origXHROpen = XHR && XHR.prototype.open;
    const origXHRSend = XHR && XHR.prototype.send;
    if (origFetch) {
      window.fetch = (input, init = {}) => {
     
        return origFetch(input, init);
      };
    }
    if (origAxiosReq) {
      window.axios.request = function (config) {
        
        return origAxiosReq.apply(this, arguments);
      };
    }
    if (origXHROpen && origXHRSend) {
      XHR.prototype.open = function (method, url) {
        this.__flcMethod = method;
        this.__flcUrl = url;
        return origXHROpen.apply(this, arguments);
      };
      XHR.prototype.send = function (body) {
        
        return origXHRSend.call(this, body);
      };
    }
    return () => {
      if (origFetch) window.fetch = origFetch;
      if (origAxiosReq) window.axios.request = origAxiosReq;
       if (origXHROpen) XHR.prototype.open = origXHROpen;
       if (origXHRSend) XHR.prototype.send = origXHRSend;
    };

  }

  filterOptions(text) {
    const t = text.toLowerCase();
    this.filteredOptions = this.options.filter(opt => {
      const label = this.stripHtml(String(this.formatOption(opt)));
      return label.toLowerCase().includes(t);
    });
    this.renderOptions();
  }

  stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

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
      const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
      const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
      const datePart = new Intl.DateTimeFormat(lang || 'en', dateOptions).format(
        new Date(dateValue)
      );
      const timePart = new Intl.DateTimeFormat(lang || 'en', timeOptions).format(
        new Date(dateValue)
      );
      return `${datePart} ${timePart}`;
    } catch (error) {
      return dateValue;
    }
  }

  formatOption(opt) {
    const value = opt.label != null ? opt.label : opt.value;
    if (this.isCategoryField) {
      return `<span style="height:25px; color:#303030; background:#c9edf9; border:1px solid #c9edf9; border-radius:12px; font-weight:normal; display:inline-flex; align-items:center; padding:0 12px;">${value}</span>`;
    }
    const colDef = this.params.colDef || {};
    const params = this.rendererParams || {};
    try {
      if (params.useCustomFormatter && typeof params.formatter === 'string') {
        const fn = new Function(
          'value',
          'row',
          'colDef',
          'getRoundedSpanColor',
          'dateFormatter',
          params.formatter
        );
        return fn(
          value,
          {},
          colDef,
          this.getRoundedSpanColor.bind(this),
          this.dateFormatter.bind(this)
        );
      } else if (params.useStyleArray && Array.isArray(params.styleArray)) {
        const styled = this.getRoundedSpanColor(
          value,
          params.styleArray,
          colDef.FieldDB
        );
        if (styled) return styled;
      }
    } catch (e) {
      
    }
    return value;
  }

  renderOptions() {
    this.listEl.innerHTML = this.filteredOptions
      .map(opt => {
        const formatted = this.formatOption(opt);
        const selected = opt.value == this.value ? ' selected' : '';
        if (this.isResponsibleUser) {
          const photo = opt.photo || opt.image || opt.img || '';
          const name = this.stripHtml(String(formatted));
          const initial = name ? name.trim().charAt(0).toUpperCase() : '';
          const avatar = photo
            ? `<img src="${photo}" alt="" />`
            : `<span class="user-initial">${initial}</span>`;
          return `
            <div class="filter-item${selected}" data-value="${opt.value}">
              <span class="user-option">
                <span class="avatar-outer"><span class="avatar-middle"><span class="user-avatar">${avatar}</span></span></span>
                <span class="filter-label">${formatted}</span>
              </span>
            </div>`;
        }

        return `<div class="filter-item${selected}" data-value="${opt.value}"><span class="filter-label">${formatted}</span></div>`;
      })
      .join('');
    this.listEl.querySelectorAll('.filter-item').forEach(el => {
      el.addEventListener('click', () => {
        const selectedValue = el.getAttribute('data-value');
        this.value = selectedValue;
        this.updateDisplayLabel(selectedValue, { refresh: false });
        if (this.params.api && this.params.api.stopEditing) {
          this.params.api.stopEditing();
        } else if (this.params.stopEditing) {
          this.params.stopEditing();
        }
      });
    });
  }

  getGui() {
    return this.eGui;
  }

  afterGuiAttached() {
    if (this.searchInput) this.searchInput.focus();
  }

  getValue() {
    this.updateDisplayLabel(this.value);
    return this.value;
  }

  destroy() {
    if (this.restoreApiLogger) {
      try {
        this.restoreApiLogger();
      } finally {
        this.restoreApiLogger = null;
      }
    }
  }

  isPopup() {
    return true;
  }
}
