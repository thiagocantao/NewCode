export default class ListCellEditor {
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

    const tag =
      (params.colDef.context?.TagControl ||
        params.colDef.TagControl ||
        params.colDef.tagControl ||
        params.colDef.tagcontrol ||
        '')
        .toString()
        .trim()
        .toUpperCase();
    const identifier =
      (params.colDef.context?.FieldDB || params.colDef.FieldDB || '')
        .toString()
        .trim()
        .toUpperCase();
    this.isResponsibleUser =
      tag === 'RESPONSIBLEUSERID' || identifier === 'RESPONSIBLEUSERID';
    const categoryTags = ['CATEGORYID', 'SUBCATEGORYID', 'CATEGORYLEVEL3ID'];
    this.isCategoryField =
      categoryTags.includes(tag) || categoryTags.includes(identifier);


    // Build option array (supports promises)
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

    const resolveOptions = (arr) => {
      this.options = (arr || []).map(normalize);
      this.filteredOptions = [...this.options];
      this.renderOptions();
    };

    let optionsPromise;
    if (params.options && typeof params.options.then === 'function') {
      optionsPromise = params.options;
    } else if (Array.isArray(params.options)) {
      optionsPromise = Promise.resolve(params.options);
    } else if (Array.isArray(params.colDef.options)) {
      optionsPromise = Promise.resolve(params.colDef.options);
    } else if (Array.isArray(params.colDef.listOptions)) {
      optionsPromise = Promise.resolve(params.colDef.listOptions);
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
        params.colDef.dataSource.list_options.split(',').map(o => o.trim())
      );
    } else {
      optionsPromise = Promise.resolve([]);
    }

    optionsPromise.then(resolveOptions);

    this.value = params.value;

    this.searchInput.addEventListener('input', e => {
      this.filterOptions(e.target.value);
    });

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.params.api && this.params.api.stopEditing) {
          this.params.api.stopEditing(true);
        } else if (this.params.stopEditing) {
          this.params.stopEditing(true);
        }
      });
    }

    // Close editor when clicking outside
    this.handleOutsideClick = (e) => {
      if (!this.eGui.contains(e.target)) {
        if (this.params.api && this.params.api.stopEditing) {
          this.params.api.stopEditing();
        } else if (this.params.stopEditing) {
          this.params.stopEditing();
        }
      }
    };
    document.addEventListener('mousedown', this.handleOutsideClick);
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
    const borderRadius = fieldName === 'StatusID' ? '4px' : '12px';
    const fontweight = 'font-weight:bold;';
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
          colDef.context?.FieldDB || colDef.FieldDB
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
        const selected = opt.value == this.value ? ' selected' : '';

        if (this.isResponsibleUser) {
          const formatted = this.formatOption(opt);
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

        if (this.isCategoryField) {
          const label = this.stripHtml(String(opt.label != null ? opt.label : opt.value));
          return `<div class="filter-item${selected} category-option" data-value="${opt.value}"><span class="filter-label">${label}</span></div>`;
        }

        const formatted = this.formatOption(opt);
        return `<div class="filter-item${selected}" data-value="${opt.value}"><span class="filter-label">${formatted}</span></div>`;
      })
      .join('');
    this.listEl.querySelectorAll('.filter-item').forEach(el => {
      el.addEventListener('click', () => {
        this.value = el.getAttribute('data-value');
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
    return this.value;
  }

  destroy() {
    document.removeEventListener('mousedown', this.handleOutsideClick);
  }

  isPopup() {
    return true;
  }
}
