export default class ResponsibleUserFilterRenderer {
  constructor() {
    this.searchText = '';
    this.selectedValues = [];
    this.allValues = [];
    this.filteredValues = [];
    this.selectAll = false;
    // key -> { type: 'responsible'|'group', id, name, photo }
    this.userInfo = {};
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
    this.userInfo = {};

    api.forEachNode(node => {
      const data = node.data || {};

      const userId = data.ResponsibleUserID ?? this.getNestedValue(data, 'ResponsibleUserID');
      if (userId !== undefined && userId !== null) {
        const key = `user-${userId}`;
        if (!this.userInfo[key]) {
          const name = data.ResponsibleUser || data.Username || data.UserName || '';
          const photo = data.photoUrl || data.PhotoUrl || data.PhotoURL || data.UserPhoto || '';
          this.userInfo[key] = { type: 'responsible', id: userId, name, photo };
        }
      }

      const groupId = data.AssignedGroupID || data.GroupID || data.groupid;
      if (groupId !== undefined && groupId !== null) {
        const key = `group-${groupId}`;
        if (!this.userInfo[key]) {
          const name = data.AssignedGroupName || data.GroupName || data.Group || '';
          const photo = data.groupPhoto || data.GroupPhoto || data.GroupImage || '';
          this.userInfo[key] = { type: 'group', id: groupId, name, photo };
        }
      }
    });

    const respKeys = Object.keys(this.userInfo).filter(k => this.userInfo[k].type !== 'group');
    const groupKeys = Object.keys(this.userInfo).filter(k => this.userInfo[k].type === 'group');

    const sortByName = (a, b) => {
      const na = (this.userInfo[a].name || '').toLowerCase();
      const nb = (this.userInfo[b].name || '').toLowerCase();
      return na.localeCompare(nb, undefined, { sensitivity: 'base' });
    };

    respKeys.sort(sortByName);
    groupKeys.sort(sortByName);

    this.allValues = [...respKeys, ...groupKeys];
    this.filteredValues = [...this.allValues];
  }

  filterValues() {
    if (!this.searchText) {
      this.filteredValues = [...this.allValues];
    } else {
      const q = this.searchText.toLowerCase();
      this.filteredValues = this.allValues.filter(key => {
        const info = this.userInfo[key] || {};
        return String(info.name || '').toLowerCase().includes(q);
      });
    }
    this.renderFilterList();
  }

  renderFilterList() {
    const selected = new Set(this.selectedValues);
    this.selectAllCheckbox.checked =
      this.filteredValues.length > 0 &&
      this.filteredValues.every(v => selected.has(v));

    const respHtml = [];
    const groupHtml = [];

    this.filteredValues.forEach(key => {
      const info = this.userInfo[key] || {};
      const checked = selected.has(key) ? 'checked' : '';
      const name = info.name || '';
      const photo = info.photo;
      const initial = name ? name.trim().charAt(0).toUpperCase() : '';
      const avatar = photo
        ? `<img src="${photo}" alt="" />`
        : info.type === 'group'
          ? `<span class="user-initial material-symbols-outlined">groups</span>`
          : `<span class="user-initial">${initial}</span>`;

      const item = `
        <label class="filter-item${selected.has(key) ? ' selected' : ''}">
          <input type="checkbox" value="${key}" ${checked} />
          <span class="user-option">
            <span class="avatar-outer"><span class="avatar-middle"><span class="user-avatar">${avatar}</span></span></span>
            <span class="filter-label">${name}</span>
          </span>
        </label>
      `;
      if (info.type === 'group') groupHtml.push(item); else respHtml.push(item);
    });

    const sections = [];
    if (respHtml.length) {
      sections.push(`<div class="filter-section"><div class="filter-section-title">Responsibles</div>${respHtml.join('')}</div>`);
    }
    if (groupHtml.length) {
      sections.push(`<div class="filter-section"><div class="filter-section-title">Groups</div>${groupHtml.join('')}</div>`);
    }
    this.filterList.innerHTML = sections.join('');

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
        const sel = new Set(this.selectedValues);
        this.selectAllCheckbox.checked =
          this.filteredValues.length > 0 &&
          this.filteredValues.every(v => sel.has(v));
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
    const row = params.data || {};
    return this.selectedValues.some(key => {
      const info = this.userInfo[key];
      if (!info) return false;
      if (info.type === 'group') {
        const gid = row.AssignedGroupID || row.GroupID || row.groupid;
        return String(gid) === String(info.id);
      }
      const field = this.params.column.getColDef().field || this.params.column.getColId();
      const val = this.getNestedValue(row, field);
      return String(val) === String(info.id);
    });
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
