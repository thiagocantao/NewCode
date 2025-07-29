export default class ListCellEditor {
  init(params) {
    this.params = params;
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
      (params.colDef.TagControl ||
        params.colDef.tagControl ||
        params.colDef.tagcontrol ||
        '').toUpperCase();
    const identifier = (params.colDef.FieldDB || '').toUpperCase();
    this.isResponsibleUser =
      tag === 'RESPONSIBLEUSERID' || identifier === 'RESPONSIBLEUSERID';

    // Build option array
    let optionsArr = [];
    if (Array.isArray(params.colDef.options)) {
      optionsArr = params.colDef.options;
    } else if (Array.isArray(params.colDef.listOptions)) {
      optionsArr = params.colDef.listOptions;
    } else if (
      typeof params.colDef.listOptions === 'string' &&
      params.colDef.listOptions.trim() !== ''
    ) {
      optionsArr = params.colDef.listOptions.split(',').map(o => o.trim());
    } else if (
      params.colDef.dataSource &&
      typeof params.colDef.dataSource.list_options === 'string' &&
      params.colDef.dataSource.list_options.trim() !== ''
    ) {
      optionsArr = params.colDef.dataSource.list_options
        .split(',')
        .map(o => o.trim());
    }
    this.options = optionsArr.map(opt =>
      typeof opt === 'object' ? opt : { value: opt, label: String(opt) }
    );
    this.filteredOptions = [...this.options];
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

    this.renderOptions();
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
    const params = colDef.cellRendererParams || {};
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
      console.error('Format option error', e);
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

  destroy() {}

  isPopup() {
    return true;
  }
}