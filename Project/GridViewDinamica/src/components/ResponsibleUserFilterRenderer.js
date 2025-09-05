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

  getOptionsArray() {
    const params = this.params || {};
    const colDef = params.colDef || params.column?.getColDef?.() || {};
    let options = [];

    if (Array.isArray(params.options)) options = params.options;
    else if (Array.isArray(colDef.listOptions)) options = colDef.listOptions;
    else if (typeof colDef.listOptions === 'string' && colDef.listOptions.trim()) {
      options = colDef.listOptions.split(',').map(o => o.trim());
    } else if (
      colDef.dataSource &&
      typeof colDef.dataSource.list_options === 'string' &&
      colDef.dataSource.list_options.trim()
    ) {
      options = colDef.dataSource.list_options.split(',').map(o => o.trim());
    }

    const normalize = (opt) => {
      if (typeof opt === 'object') {
        const findKey = keys => Object.keys(opt).find(k => keys.includes(k.toLowerCase()));
        const labelKey = findKey(['label', 'name', 'displayname', 'display_name']);
        const valueKey = findKey(['value', 'id', 'userid', 'user_id']);
        const typeKey = findKey(['type']);
        const groupUsersKey = findKey(['groupusers', 'group_users']);
        const normalized = {
          ...opt,
          id: opt.id ?? opt.value ?? (valueKey ? opt[valueKey] : undefined),
          name: opt.name ?? opt.label ?? (labelKey ? opt[labelKey] : undefined),
          type: opt.type ?? (typeKey ? opt[typeKey] : undefined)
        };
        if (groupUsersKey && Array.isArray(opt[groupUsersKey])) {
          normalized.groupUsers = opt[groupUsersKey].map(normalize);
        }
        return normalized;
      }
      return { id: opt, name: String(opt) };
    };

    return (options || []).map(normalize);
  }

  loadValues() {
    const api = this.params.api;
    this.userInfo = {};

    const options = this.getOptionsArray();
    options.forEach(opt => {
      const type = String(opt.type || '').toLowerCase();
      if (type === 'group') {
        const groupId = opt.id;
        const gKey = `group-${groupId}`;
        if (!this.userInfo[gKey]) {
          const photo = opt.photoUrl || opt.PhotoURL || opt.PhotoUrl || opt.photo || opt.image || opt.img || '';
          this.userInfo[gKey] = { type: 'group', id: groupId, name: opt.name || '', photo };

        }
        if (Array.isArray(opt.groupUsers)) {
          opt.groupUsers.forEach(u => {
            const uid = u.id ?? u.value ?? u.UserID;
            if (uid !== undefined && uid !== null) {
              const userName = u.name ?? u.label ?? u.DisplayName ?? '';
              const userPhoto = u.photoUrl || u.PhotoURL || u.PhotoUrl || u.photo || u.image || u.img || '';
              const uKey = `user-${uid}`;
              if (!this.userInfo[uKey]) {
                this.userInfo[uKey] = { type: 'responsible', id: uid, name: userName, photo: userPhoto };
              }
            }
          });
        }

      } else {
        const uid = opt.id;
        const uKey = `user-${uid}`;
        if (!this.userInfo[uKey]) {
          const photo = opt.photoUrl || opt.PhotoURL || opt.PhotoUrl || opt.photo || opt.image || opt.img || '';
          this.userInfo[uKey] = { type: 'responsible', id: uid, name: opt.name || '', photo };
        }
      }
    });

    const field = this.params.column.getColDef().field || this.params.column.getColId();
    api.forEachNode(node => {
      const data = node.data || {};
      const userId = this.getNestedValue(data, field);

      const groupId = data.AssignedGroupID || data.GroupID || data.groupid;

      if (groupId !== undefined && groupId !== null) {
        const gKey = `group-${groupId}`;
        if (!this.userInfo[gKey]) {
          const gName = data.AssignedGroupName || data.GroupName || data.Group || '';
          const gPhoto = data.groupPhoto || data.GroupPhoto || data.GroupImage || '';
          this.userInfo[gKey] = { type: 'group', id: groupId, name: gName, photo: gPhoto };
        }

      }

      if (userId !== undefined && userId !== null) {
        const uKey = `user-${userId}`;
        if (!this.userInfo[uKey]) {
          const uName = data.ResponsibleUser || data.Username || data.UserName || '';
          const uPhoto = data.photoUrl || data.PhotoUrl || data.PhotoURL || data.UserPhoto || '';
          this.userInfo[uKey] = { type: 'responsible', id: userId, name: uName, photo: uPhoto };
        }
      }

    });

    const respKeys = Object.keys(this.userInfo).filter(k => this.userInfo[k].type === 'responsible');

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
        const target = (info.name || '').toLowerCase();
        return target.includes(q);

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
      const initial = name.trim().charAt(0).toUpperCase();
      const avatar = photo

        ? `<img src="${photo}" alt="" />`
        : info.type === 'group'
          ? `<span class="user-initial material-symbols-outlined">groups</span>`
          : `<span class="user-initial">${initial}</span>`;


      const item = `
        <label class="filter-item${selected.has(key) ? ' selected' : ''}">
          <input type="checkbox" value="${key}" ${checked} />
          <span class="user-option">
            <span class="avatar-outer"><span class="avatar-middle"><span class="user-avatar${info.type === 'userGroup' ? ' user-group' : ''}">${avatar}</span></span></span>
            <span class="filter-label">${name}</span>
          </span>
        </label>
      `;
      if (info.type === 'group') groupHtml.push(item);
      else respHtml.push(item);

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
      const fieldName = this.params.column.getColDef().field || this.params.column.getColId();
      const val = this.getNestedValue(row, fieldName);

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
