let responsibleUserCache = null;

async function loadResponsibleUserOptions() {
  if (responsibleUserCache) return responsibleUserCache;
  try {
    const lang = window.wwLib?.wwVariable?.getValue('aa44dc4c-476b-45e9-a094-16687e063342');
    const loggeduserid = window?.wwLib?.wwVariable?.getValue?.('fc54ab80-1a04-4cfe-a504-793bdcfce5dd');
    const companyId = window.wwLib?.wwVariable?.getValue('5d099f04-cd42-41fd-94ad-22d4de368c3a');
    const apiUrl = window.wwLib?.wwVariable?.getValue('1195995b-34c3-42a5-b436-693f0f4f8825');
    const apiKey = window.wwLib?.wwVariable?.getValue('d180be98-8926-47a7-b7f1-6375fbb95fa3');
    const apiAuth = window.wwLib?.wwVariable?.getValue('dfcde09f-42f3-4b5c-b2e8-4314650655db');
    if (!apiUrl) return [];

    const fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(companyId ? { p_idcompany: companyId } : {}),
        ...(lang ? { p_language: lang } : {}),
        ...(loggeduserid ? { p_loggeduserid: loggeduserid } : {}),
      }),
    };
    if (apiKey) fetchOptions.headers['apikey'] = apiKey;
    if (apiAuth) fetchOptions.headers['Authorization'] = apiAuth;

    const baseUrl = apiUrl.endsWith('/') ? apiUrl : apiUrl + '/';
    const response = await fetch(baseUrl + 'getLookupGroupsAndUsers', fetchOptions);
    const data = await response.json();
    responsibleUserCache = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.result)
          ? data.result
          : Array.isArray(data?.results)
            ? data.results
            : [];
    return responsibleUserCache;
  } catch {
    return [];
  }
}

const getProp = (obj, ...keys) => {
  for (const key of keys) {
    const match = Object.keys(obj || {}).find(
      k => k.toLowerCase() === String(key).toLowerCase()
    );
    if (match) return obj[match];
  }
  return undefined;
};

function mapOptions(list) {
  const arr = Array.isArray(list) ? list : [];
  const hasNested = arr.some(it => Array.isArray(getProp(it, 'groupUsers')) && getProp(it, 'groupUsers').length);
  if (hasNested) {
    return arr.map(item => {
      const children = getProp(item, 'groupUsers');
      return {
        ...item,
        id: getProp(item, 'id', 'value'),
        name: getProp(item, 'name', 'label'),
        value: getProp(item, 'value', 'id'),
        label: getProp(item, 'label', 'name'),
        ...(Array.isArray(children) && children.length ? { groupUsers: mapOptions(children) } : {})
      };
    });
  }

  const groups = {};
  const users = [];
  for (const raw of arr) {
    const id = getProp(raw, 'id', 'value');
    const name = getProp(raw, 'name', 'label');
    const type = String(getProp(raw, 'type') || '').toLowerCase();
    if (type === 'group') {
      groups[id] = { ...raw, id, name, value: id, label: name, groupUsers: [] };
    } else {
      const gid = getProp(raw, 'groupId', 'groupid', 'group_id', 'group');
      users.push({ ...raw, id, name, value: id, label: name, groupId: gid });
    }
  }

  const result = Object.values(groups);
  for (const usr of users) {
    const gid = usr.groupId;
    delete usr.groupId;
    if (gid != null && groups[gid]) groups[gid].groupUsers.push(usr);
    else result.push(usr);
  }
  return result;
}

export default class ResponsibleUserFilterRenderer {
  constructor() {
    this.searchText = '';
    this.selectedUsers = [];
    this.selectedGroups = [];
    this.users = [];
    this.groups = [];
    this.filteredUsers = [];
    this.filteredGroups = [];
    this.userToGroups = {};
    this.groupToUsers = {};
  }

  init(params) {
    this.params = params;
    this.createGui();
    this.loadOptions().then(() => this.filterValues());
  }

  async loadOptions() {
    try {
      const raw = await loadResponsibleUserOptions();
      const mapped = mapOptions(raw);
      const userMap = {};
      const groupMap = {};
      this.userToGroups = {};
      this.groupToUsers = {};

      const processItem = (item, parentGroupId) => {
        const id = String(getProp(item, 'id', 'value'));
        const name = getProp(item, 'name', 'label') || '';
        const photo = item.photoUrl || item.PhotoUrl || item.PhotoURL || item.photo || item.image || item.img || '';
        if (Array.isArray(item.groupUsers) && item.groupUsers.length) {
          if (!groupMap[id]) groupMap[id] = { id, name };
          const memberIds = [];
          for (const u of item.groupUsers) {
            const uid = String(getProp(u, 'id', 'value'));
            memberIds.push(uid);
            processItem(u, id);
            if (!this.userToGroups[uid]) this.userToGroups[uid] = [];
            if (!this.userToGroups[uid].includes(id)) this.userToGroups[uid].push(id);
          }
          this.groupToUsers[id] = memberIds;
        } else {
          if (!userMap[id]) userMap[id] = { id, name, photo };
          if (parentGroupId) {
            if (!this.groupToUsers[parentGroupId]) this.groupToUsers[parentGroupId] = [];
            if (!this.groupToUsers[parentGroupId].includes(id)) this.groupToUsers[parentGroupId].push(id);
            if (!this.userToGroups[id]) this.userToGroups[id] = [];
            if (!this.userToGroups[id].includes(parentGroupId)) this.userToGroups[id].push(parentGroupId);
          }
        }
      };

      mapped.forEach(item => processItem(item, null));

      this.users = Object.values(userMap);
      this.groups = Object.values(groupMap);
      this.filteredUsers = [...this.users];
      this.filteredGroups = [...this.groups];
    } catch {
      this.users = [];
      this.groups = [];
      this.filteredUsers = [];
      this.filteredGroups = [];
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
        this.selectedUsers = this.filteredUsers.map(u => u.id);
        this.selectedGroups = this.filteredGroups.map(g => g.id);
      } else {
        this.selectedUsers = [];
        this.selectedGroups = [];
      }
      this.renderFilterList();
      this.applyFilter();
    });
  }

  filterValues() {
    const term = (this.searchText || '').toLowerCase();
    if (!term) {
      this.filteredUsers = [...this.users];
      this.filteredGroups = [...this.groups];
    } else {
      this.filteredUsers = this.users.filter(u => (u.name || '').toLowerCase().includes(term));
      this.filteredGroups = this.groups.filter(g => (g.name || '').toLowerCase().includes(term));
    }
    this.renderFilterList();
  }

  renderFilterList() {
    const allIds = [...this.filteredUsers.map(u => u.id), ...this.filteredGroups.map(g => g.id)];
    this.selectAllCheckbox.checked =
      allIds.length > 0 &&
      allIds.every(id => this.selectedUsers.includes(id) || this.selectedGroups.includes(id));

    let html = '';

    if (this.filteredGroups.length) {
      html += `<div class="filter-section"><div class="section-label">Groups</div>` +
        this.filteredGroups.map(g => {
          const checked = this.selectedGroups.includes(g.id) ? 'checked' : '';
          const avatar = `<span style="font-size:19px;" class="material-symbols-outlined user-selector__group-icon">groups</span>`;
          return `
            <label class="filter-item${checked ? ' selected' : ''}">
              <input type="checkbox" data-type="group" value="${g.id}" ${checked} />
              <span class="user-option">
                <span class="avatar-outer"><span class="avatar-middle"><span class="user-avatar">${avatar}</span></span></span>
                <span class="filter-label">${g.name}</span>
              </span>
            </label>
          `;
        }).join('') + `</div>`;
    }

    if (this.filteredUsers.length) {
      html += `<div class="filter-section"><div class="section-label">Responsibles</div>` +
        this.filteredUsers.map(u => {
          const checked = this.selectedUsers.includes(u.id) ? 'checked' : '';
          const initial = u.name ? u.name.trim().charAt(0).toUpperCase() : '';
          const avatar = u.photo
            ? `<img src="${u.photo}" alt="" />`
            : `<span class="user-initial">${initial}</span>`;
          return `
            <label class="filter-item${checked ? ' selected' : ''}">
              <input type="checkbox" data-type="user" value="${u.id}" ${checked} />
              <span class="user-option">
                <span class="avatar-outer"><span class="avatar-middle"><span class="user-avatar">${avatar}</span></span></span>
                <span class="filter-label">${u.name}</span>
              </span>
            </label>
          `;
        }).join('') + `</div>`;
    }

    this.filterList.innerHTML = html;

    this.filterList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const id = e.target.value;
        const type = e.target.getAttribute('data-type');
        if (e.target.checked) {
          if (type === 'user') {
            if (!this.selectedUsers.includes(id)) this.selectedUsers.push(id);
          } else {
            if (!this.selectedGroups.includes(id)) this.selectedGroups.push(id);
          }
        } else {
          if (type === 'user') {
            this.selectedUsers = this.selectedUsers.filter(v => v !== id);
          } else {
            this.selectedGroups = this.selectedGroups.filter(v => v !== id);
          }
        }
        const ids = [...this.filteredUsers.map(u => u.id), ...this.filteredGroups.map(g => g.id)];
        this.selectAllCheckbox.checked =
          ids.length > 0 && ids.every(v => this.selectedUsers.includes(v) || this.selectedGroups.includes(v));
        this.applyFilter();
      });
    });
  }

  applyFilter() {
    this.params.filterChangedCallback();
  }

  clearFilter() {
    this.selectedUsers = [];
    this.selectedGroups = [];
    this.searchText = '';
    if (this.searchInput) this.searchInput.value = '';
    this.filterValues();
    this.params.filterChangedCallback();
  }

  isFilterActive() {
    return this.selectedUsers.length > 0 || this.selectedGroups.length > 0;
  }

  doesFilterPass(params) {
    if (!this.isFilterActive()) return true;
    const field = this.params.column.getColDef().field || this.params.column.getColId();
    const value = this.getNestedValue(params.data, field);
    const allowed = new Set();
    this.selectedUsers.forEach(uid => {
      allowed.add(String(uid));
      (this.userToGroups[uid] || []).forEach(gid => allowed.add(String(gid)));
    });
    this.selectedGroups.forEach(gid => {
      allowed.add(String(gid));
      (this.groupToUsers[gid] || []).forEach(uid => allowed.add(String(uid)));
    });
    return allowed.has(String(value));
  }

  getModel() {
    if (!this.isFilterActive()) return null;
    return { users: this.selectedUsers, groups: this.selectedGroups };
  }

  setModel(model) {
    if (model) {
      this.selectedUsers = Array.isArray(model.users) ? [...model.users] : [];
      this.selectedGroups = Array.isArray(model.groups) ? [...model.groups] : [];
    } else {
      this.selectedUsers = [];
      this.selectedGroups = [];
    }
    this.renderFilterList();
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((o, p) => (o && o[p] !== undefined ? o[p] : undefined), obj);
  }

  getGui() {
    return this.eGui;
  }

  onNewRowsLoaded() {
    this.filterValues();
  }
}

