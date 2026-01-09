export default class ResponsibleUserFilterRenderer {
  constructor() {
    this.searchText = '';
    this.selectedValues = [];
    this.allValues = [];
    this.filteredValues = [];
    this.selectAll = false;
    // key -> { type: 'responsible'|'group', id, name, photo }

    this.userInfo = {};
    this.lookupByRawValue = new Map();
  }

  init(params) {
    this.params = params;
    this.loadValues();
    this.createGui();
  }

  createGui() {
    this.eGui = document.createElement('div');
    this.eGui.className = 'list-filter';
    this.applyAvatarTheme();
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

  applyAvatarTheme() {
    if (!this.eGui) return;
    const theme = window?.wwLib?.wwVariable?.getValue?.('61c1b425-10e8-40dc-8f1f-b117c08b9726') || {};
    const avatarBackground = theme?.bgButtonPrimary || '#4B6CB7';
    const avatarShadow = theme?.primary || '#3A4663';
    this.eGui.style.setProperty('--grid-view-dinamica-avatar-bg', avatarBackground);
    this.eGui.style.setProperty('--grid-view-dinamica-avatar-shadow', avatarShadow);
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

  shouldUseResponsibleCollection(identifier, tag) {
    const targets = new Set(['RESPONSIBLEUSERID', 'XXXXXX']);
    return targets.has(identifier) || targets.has(tag);
  }

  getResponsibleCollectionOptions() {
    const COLLECTION_ID = '0e41f029-e1c3-4302-82ca-16aceccdadb1';
    try {
      const collection = window?.wwLib?.wwCollection?.getCollection?.(COLLECTION_ID);
      const data = collection?.data;
      if (!Array.isArray(data)) {
        return [];
      }
      return data
        .map(item => this.normalizeCollectionEntry(item))
        .filter(item => item);
    } catch (error) {
      console.warn('[GridViewDinamica] Failed to resolve ResponsibleUser filter options from collection', error);
      return [];
    }
  }

  normalizeCollectionEntry(item) {
    if (item === undefined || item === null) {
      return null;
    }

    if (typeof item !== 'object') {
      const value = this.ensureDisplayText(item);
      if (!value) return null;
      return {
        id: value,
        name: value,
        type: 'responsible',
        photo: '',
        matchCandidates: [value],
      };
    }

    const name = this.ensureDisplayText(item.name ?? item.Name ?? item.label ?? item.Label);
    if (!name) {
      return null;
    }

    const id = item.id ?? item.Id ?? item.ID ?? item.value ?? item.Value ?? name;
    const photo = item.photoUrl || item.PhotoUrl || item.PhotoURL || item.photo || item.image || item.img || '';
    const type = item.type ?? item.Type ?? 'responsible';
    const matchCandidates = this.extractCollectionMatchCandidates(item);

    return {
      id,
      name,
      type,
      photo,
      matchCandidates,
    };
  }

  extractCollectionMatchCandidates(item) {
    if (!item || typeof item !== 'object') return [];
    const keys = [
      'id',
      'Id',
      'ID',
      'value',
      'Value',
      'name',
      'Name',
      'label',
      'Label',
      'username',
      'Username',
      'userName',
      'UserName',
      'displayName',
      'DisplayName',
      'userid',
      'userId',
      'user_id',
      'email',
      'Email',
    ];
    const candidates = [];
    keys.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(item, key)) {
        candidates.push(item[key]);
      }
    });
    return candidates;
  }

  normalizeOptionType(type) {
    const text = this.ensureDisplayText(type).toLowerCase();
    if (!text) return 'responsible';
    if (text.includes('group') || text === 'g' || text.includes('grupo')) {
      return 'group';
    }
    return 'responsible';
  }

  buildEntryKey(type, id, name) {
    const baseCandidate = id !== undefined && id !== null && id !== ''
      ? this.ensureDisplayText(id)
      : this.ensureDisplayText(name);
    if (!baseCandidate) return null;
    return `${type}-${baseCandidate}`;
  }

  ensureDisplayText(value) {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') {
      return value.trim();
    }
    return String(value).trim();
  }

  normalizeLookupValue(value) {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      return trimmed.toLowerCase();
    }
    try {
      const str = String(value).trim();
      if (!str) return null;
      return str.toLowerCase();
    } catch (error) {
      return null;
    }
  }

  pickFirstCandidate(candidates) {
    if (!Array.isArray(candidates)) return '';
    for (const candidate of candidates) {
      const display = this.ensureDisplayText(candidate);
      if (display) return display;
    }
    return '';
  }

  ingestOptionList(options) {
    if (!Array.isArray(options)) return;
    options.forEach(opt => this.ingestOption(opt));
  }

  ingestOption(opt) {
    if (opt === undefined || opt === null) return;

    if (typeof opt !== 'object') {
      const value = this.ensureDisplayText(opt);
      if (!value) return;
      this.registerEntry({ type: 'responsible', id: value, name: value, photo: '' }, [value]);
      return;
    }

    const type = this.normalizeOptionType(opt.type);
    const idCandidate = opt.id ?? opt.Id ?? opt.ID ?? opt.value ?? opt.Value ?? opt.UserID ?? opt.UserId ?? opt.userid ?? opt.user_id;
    const optionNames = [
      opt.name,
      opt.Name,
      opt.label,
      opt.Label,
      opt.displayName,
      opt.DisplayName,
      opt.fullName,
      opt.FullName,
      opt.username,
      opt.Username,
      opt.userName,
      opt.UserName,
    ];
    const name = this.pickFirstCandidate([...optionNames, idCandidate]);
    const photo = opt.photoUrl || opt.PhotoUrl || opt.PhotoURL || opt.photo || opt.image || opt.img || '';
    const extraMatches = Array.isArray(opt.matchCandidates) ? opt.matchCandidates : [];
    const matchCandidates = [
      idCandidate,
      opt.id,
      opt.Id,
      opt.ID,
      opt.value,
      opt.Value,
      opt.UserID,
      opt.UserId,
      opt.userid,
      opt.user_id,
      ...optionNames,
      ...extraMatches,
    ];

    this.registerEntry({ type, id: idCandidate ?? name, name, photo }, matchCandidates);

    if (type === 'group' && Array.isArray(opt.groupUsers)) {
      opt.groupUsers.forEach(user => {
        if (user === undefined || user === null) return;
        if (typeof user === 'object') {
          this.ingestOption({ ...user, type: 'responsible' });
        } else {
          const normalizedUser = this.ensureDisplayText(user);
          if (normalizedUser) {
            this.registerEntry({ type: 'responsible', id: normalizedUser, name: normalizedUser, photo: '' }, [normalizedUser]);
          }
        }
      });
    }
  }

  registerEntry(details, matchCandidates = []) {
    if (!details) return;
    const type = this.normalizeOptionType(details.type);
    const key = this.buildEntryKey(type, details.id, details.name);
    if (!key) return;

    const resolvedName = this.ensureDisplayText(details.name) || this.ensureDisplayText(details.id);
    if (!resolvedName) return;

    if (!this.userInfo[key]) {
      this.userInfo[key] = {
        type,
        id: details.id ?? resolvedName,
        name: resolvedName,
        photo: details.photo || '',
        matchValues: new Set(),
      };
    } else {
      const info = this.userInfo[key];
      info.type = type;
      if ((!info.name || !info.name.trim()) && resolvedName) info.name = resolvedName;
      if ((info.id === undefined || info.id === null || info.id === '') && details.id !== undefined && details.id !== null && details.id !== '') {
        info.id = details.id;
      }
      if (!info.photo && details.photo) info.photo = details.photo;
      if (!info.matchValues) info.matchValues = new Set();
    }

    const info = this.userInfo[key];
    const allMatches = [
      details.id,
      details.name,
      resolvedName,
      ...(Array.isArray(matchCandidates) ? matchCandidates : []),
    ];
    allMatches.forEach(value => this.addMatchValue(info, key, value));
  }

  addMatchValue(info, key, rawValue) {
    if (!info || rawValue === undefined || rawValue === null) return;
    if (Array.isArray(rawValue)) {
      rawValue.forEach(value => this.addMatchValue(info, key, value));
      return;
    }

    const normalized = this.normalizeLookupValue(rawValue);
    if (!normalized) return;

    if (!info.matchValues) info.matchValues = new Set();
    info.matchValues.add(normalized);

    let matches = this.lookupByRawValue.get(normalized);
    if (!matches) {
      matches = new Set();
      this.lookupByRawValue.set(normalized, matches);
    }
    matches.add(key);
  }

  populateFromRowData(api, colDef) {
    const field = colDef.field || this.params.column.getColId();
    if (!api || (api.isDestroyed && api.isDestroyed())) return;

    api.forEachNode(node => {
      const data = node?.data;
      if (!data) return;

      const userValue = this.getNestedValue(data, field);
      const userNameCandidates = [
        data.ResponsibleUser,
        data.ResponsibleUserName,
        data.Username,
        data.UserName,
        data.UserFullName,
        data.AssignedUser,
        data.AssignedUserName,
      ];
      const userPhoto = data.photoUrl || data.PhotoUrl || data.PhotoURL || data.UserPhoto || '';
      const userName = this.pickFirstCandidate([...userNameCandidates, userValue]);
      this.registerEntry(
        { type: 'responsible', id: userValue, name: userName, photo: userPhoto },
        [userValue, ...userNameCandidates]
      );

      const groupIdCandidates = [data.AssignedGroupID, data.GroupID, data.groupid];
      const groupNameCandidates = [
        data.AssignedGroupName,
        data.GroupName,
        data.Group,
        data.groupname,
      ];
      const groupId = this.pickFirstCandidate(groupIdCandidates);
      const groupName = this.pickFirstCandidate([...groupNameCandidates, groupId]);
      const groupPhoto = data.groupPhoto || data.GroupPhoto || data.GroupImage || '';
      this.registerEntry(
        { type: 'group', id: groupId, name: groupName, photo: groupPhoto },
        [...groupIdCandidates, ...groupNameCandidates]
      );
    });
  }

  collectMatchesFromValue(value, resultSet) {
    if (!this.lookupByRawValue || !resultSet) return;
    if (Array.isArray(value)) {
      value.forEach(item => this.collectMatchesFromValue(item, resultSet));
      return;
    }
    const normalized = this.normalizeLookupValue(value);
    if (!normalized) return;
    const matches = this.lookupByRawValue.get(normalized);
    if (!matches) return;
    matches.forEach(key => resultSet.add(key));
  }

  finalizeUserInfo() {
    const respKeys = [];
    const groupKeys = [];
    Object.keys(this.userInfo).forEach(key => {
      const info = this.userInfo[key];
      if (!info) return;
      if (!info.matchValues) info.matchValues = new Set();
      if (info.name) {
        info.name = this.ensureDisplayText(info.name);
      }
      if (!info.name) {
        const fallback = this.ensureDisplayText(info.id);
        if (fallback) info.name = fallback;
      }
      this.addMatchValue(info, key, info.name);
      this.addMatchValue(info, key, info.id);

      if (info.type === 'group') groupKeys.push(key);
      else respKeys.push(key);
    });

    const sortByName = (a, b) => {
      const na = (this.userInfo[a]?.name || '').toLowerCase();
      const nb = (this.userInfo[b]?.name || '').toLowerCase();
      return na.localeCompare(nb, undefined, { sensitivity: 'base' });
    };

    respKeys.sort(sortByName);
    groupKeys.sort(sortByName);

    this.allValues = [...respKeys, ...groupKeys];
    this.filteredValues = [...this.allValues];
    this.selectedValues = this.selectedValues.filter(value => this.userInfo[value]);
  }

  loadValues() {
    const api = this.params.api;
    this.userInfo = {};
    this.lookupByRawValue = new Map();

    const column = this.params.column;
    const colDef = column?.getColDef?.() || {};
    const identifier = (colDef.FieldDB || '').toString().toUpperCase();
    const tag = (colDef.TagControl || colDef.tagControl || colDef.tagcontrol || '').toString().toUpperCase();

    let options = [];
    if (this.shouldUseResponsibleCollection(identifier, tag)) {
      options = this.getResponsibleCollectionOptions();
    }

    if (!Array.isArray(options) || !options.length) {
      options = this.getOptionsArray();
    }

    this.ingestOptionList(options);
    this.populateFromRowData(api, colDef);
    this.finalizeUserInfo();
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
      const name = this.ensureDisplayText(info.name || info.id || '');
      const photo = info.photo;
      const initialSource = this.ensureDisplayText(name);
      const initial = initialSource ? initialSource.charAt(0).toUpperCase() : '';
      const avatar = photo

        ? `<img src="${photo}" alt="" />`
        : info.type === 'group'
          ? `<span class="user-initial material-symbols-outlined">groups</span>`
          : `<span class="user-initial">${initial}</span>`;


      const item = `
        <label class="filter-item${selected.has(key) ? ' selected' : ''}">
          <input type="checkbox" value="${key}" ${checked} />
          <span class="user-option">
            <span class="avatar-outer"><span class="avatar-middle"><span class="user-avatar${info.type === 'group' ? ' user-group' : ''}">${avatar}</span></span></span>
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
    const colDef = this.params.column?.getColDef?.() || {};
    const fieldName = colDef.field || this.params.column.getColId();

    const matches = new Set();
    this.collectMatchesFromValue(this.getNestedValue(row, fieldName), matches);

    const userCandidates = [
      row.ResponsibleUser,
      row.ResponsibleUserName,
      row.Username,
      row.UserName,
      row.UserFullName,
      row.AssignedUser,
      row.AssignedUserName,
    ];
    userCandidates.forEach(value => this.collectMatchesFromValue(value, matches));

    const groupCandidates = [
      row.AssignedGroupID,
      row.GroupID,
      row.groupid,
      row.AssignedGroupName,
      row.GroupName,
      row.Group,
      row.groupname,
    ];
    groupCandidates.forEach(value => this.collectMatchesFromValue(value, matches));

    const selectedSet = new Set(this.selectedValues);
    for (const key of matches) {
      if (selectedSet.has(key)) {
        return true;
      }
    }

    return this.selectedValues.some(key => {
      const info = this.userInfo[key];
      if (!info) return false;

      const normalizedId = this.normalizeLookupValue(info.id);
      const normalizedName = this.normalizeLookupValue(info.name);

      if (info.type === 'group') {
        return groupCandidates.some(candidate => {
          const normalizedCandidate = this.normalizeLookupValue(candidate);
          if (!normalizedCandidate) return false;
          if (normalizedId && normalizedCandidate === normalizedId) return true;
          if (normalizedName && normalizedCandidate === normalizedName) return true;
          const fallbackMatches = new Set();
          this.collectMatchesFromValue(candidate, fallbackMatches);
          return fallbackMatches.has(key);
        });
      }

      const fieldValue = this.getNestedValue(row, fieldName);
      const normalizedField = this.normalizeLookupValue(fieldValue);
      if (!normalizedField) return false;
      if (normalizedId && normalizedField === normalizedId) return true;
      if (normalizedName && normalizedField === normalizedName) return true;
      const fallbackMatches = new Set();
      this.collectMatchesFromValue(fieldValue, fallbackMatches);
      return fallbackMatches.has(key);
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
