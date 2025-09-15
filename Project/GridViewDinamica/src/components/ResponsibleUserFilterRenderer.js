export default class ResponsibleUserFilterRenderer {
  constructor() {
    this.searchText = '';
    this.selectedValues = [];
    // armazenamos separadamente usuários e grupos
    this.userKeys = [];
    this.groupKeys = [];
    this.filteredUserKeys = [];
    this.filteredGroupKeys = [];
    this.metaMap = {}; // key -> { id, type, name, photo }
    this.groupToUsers = {};
    this.userToGroups = {};
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
        <span class="search-icon material-symbols-outlined">search</span>
        <input type="text" placeholder="Search..." class="search-input" />
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
      const all = [...this.filteredUserKeys, ...this.filteredGroupKeys];
      if (e.target.checked) {
        this.selectedValues = [...all];
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
    const column = this.params.column;
    const colDef = column.getColDef();

    // obtém opções usadas pelo editor/renderer
    let crParams = colDef.cellRendererParams || {};
    if (typeof crParams === 'function') {
      try { crParams = crParams(this.params); } catch { crParams = {}; }
    }
    const options = Array.isArray(crParams.options) ? crParams.options : [];

    this.userKeys = [];
    this.groupKeys = [];
    this.filteredUserKeys = [];
    this.filteredGroupKeys = [];
    this.metaMap = {};
    this.groupToUsers = {};
    this.userToGroups = {};

    const addUser = (u) => {
      const id = u?.id ?? u?.value ?? u?.UserID;
      if (id == null) return;
      const key = `u-${id}`;
      if (this.metaMap[key]) return;
      const name = u.name || u.label || u.DisplayName || '';
      const photo = u.photoUrl || u.PhotoURL || u.PhotoUrl || u.photo || u.image || u.img || '';
      this.metaMap[key] = { id, type: 'user', name, photo };
      this.userKeys.push(key);
    };

    const addGroup = (g) => {
      const id = g?.id ?? g?.value;
      if (id == null) return;
      const key = `g-${id}`;
      const name = g.name || g.label || '';
      const photo = g.photoUrl || g.PhotoURL || g.PhotoUrl || g.photo || g.image || g.img || '';
      this.metaMap[key] = { id, type: 'group', name, photo };
      this.groupKeys.push(key);
      const members = Array.isArray(g.groupUsers) ? g.groupUsers : [];
      this.groupToUsers[id] = [];
      members.forEach(m => {
        const uid = m?.id ?? m?.value ?? m?.UserID;
        if (uid == null) return;
        this.groupToUsers[id].push(String(uid));
        if (!this.userToGroups[uid]) this.userToGroups[uid] = [];
        this.userToGroups[uid].push(String(id));
        addUser(m);
      });
    };

    options.forEach(opt => {
      const type = String(opt?.type || '').toLowerCase();
      if (type === 'group' || Array.isArray(opt.groupUsers)) {
        addGroup(opt);
      } else {
        addUser(opt);
      }
    });

    const sortFn = (a, b) => {
      const na = (this.metaMap[a]?.name || '').toLowerCase();
      const nb = (this.metaMap[b]?.name || '').toLowerCase();
      return na.localeCompare(nb);
    };
    this.userKeys.sort(sortFn);
    this.groupKeys.sort(sortFn);
    this.filteredUserKeys = [...this.userKeys];
    this.filteredGroupKeys = [...this.groupKeys];
  }

  filterValues() {
    const search = (this.searchText || '').toLowerCase();
    if (!search) {
      this.filteredUserKeys = [...this.userKeys];
      this.filteredGroupKeys = [...this.groupKeys];
    } else {
      this.filteredUserKeys = this.userKeys.filter(k =>
        (this.metaMap[k]?.name || '').toLowerCase().includes(search)
      );
      this.filteredGroupKeys = this.groupKeys.filter(k =>
        (this.metaMap[k]?.name || '').toLowerCase().includes(search)
      );
    }
    this.renderFilterList();
  }

  renderFilterList() {
    const filteredAll = [...this.filteredUserKeys, ...this.filteredGroupKeys];
    this.selectAllCheckbox.checked =
      filteredAll.length > 0 && filteredAll.every(v => this.selectedValues.includes(v));

    const renderItem = (key) => {
      const meta = this.metaMap[key] || {};
      const checked = this.selectedValues.includes(key) ? 'checked' : '';
      const name = meta.name || '';
      const photo = meta.photo;
      const initial = name ? name.trim().charAt(0).toUpperCase() : '';
      const avatar = meta.type === 'group'
        ? `<span style="font-size:19px; padding-top:3px; padding-left:3px" class="material-symbols-outlined">groups</span>`
        : (photo
            ? `<img src="${photo}" alt="" />`
            : `<span class="user-initial">${initial}</span>`);
      return `
        <label class="filter-item${this.selectedValues.includes(key) ? ' selected' : ''}">
          <input type="checkbox" value="${key}" ${checked} />
          <span class="user-option">
            <span class="avatar-outer"><span class="avatar-middle"><span class="user-avatar">${avatar}</span></span></span>
            <span class="filter-label">${name}</span>
          </span>
        </label>`;
    };

    let html = '';
    if (this.filteredUserKeys.length) {
      html += `<div class="filter-group-label">Responsibles</div>`;
      html += this.filteredUserKeys.map(renderItem).join('');
    }
    if (this.filteredGroupKeys.length) {
      html += `<div class="filter-group-label">Groups</div>`;
      html += this.filteredGroupKeys.map(renderItem).join('');
    }
    this.filterList.innerHTML = html;

    this.filterList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const value = e.target.value;
        if (e.target.checked) {
          if (!this.selectedValues.includes(value)) this.selectedValues.push(value);
        } else {
          this.selectedValues = this.selectedValues.filter(v => v !== value);
        }
        const all = [...this.filteredUserKeys, ...this.filteredGroupKeys];
        this.selectAllCheckbox.checked =
          all.length > 0 && all.every(v => this.selectedValues.includes(v));
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
    this.filteredUserKeys = [...this.userKeys];
    this.filteredGroupKeys = [...this.groupKeys];
    this.renderFilterList();
    this.params.filterChangedCallback();
  }

  isFilterActive() {
    return this.selectedValues.length > 0;
  }

  doesFilterPass(params) {
    if (this.selectedValues.length === 0) return true;
    const row = params.data || {};
    const rowUserId =
      row.ResponsibleUserID || row.ResponsibleID || row.UserID || row.UserId || null;
    const rowGroupId =
      row.AssignedGroupID || row.GroupID || row.GroupId || null;

    for (const key of this.selectedValues) {
      const meta = this.metaMap[key];
      if (!meta) continue;
      if (meta.type === 'user') {
        if (rowUserId != null && String(rowUserId) === String(meta.id)) return true;
        if (rowGroupId != null) {
          const members = this.groupToUsers[rowGroupId] || [];
          if (members.includes(String(meta.id))) return true;
        }
      } else if (meta.type === 'group') {
        if (rowGroupId != null && String(rowGroupId) === String(meta.id)) return true;
        if (rowUserId != null) {
          const groups = this.userToGroups[rowUserId] || [];
          if (groups.includes(String(meta.id))) return true;
        }
      }
    }
    return false;
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
