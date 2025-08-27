export default class FixedListCellEditor {
  init(params) {
    this.params = params;

    // Renderer params (mantém compatibilidade com seu formatter/styleArray)
    const colDef = params.colDef || {};
    this.rendererParams =
      typeof colDef.cellRendererParams === 'function'
        ? colDef.cellRendererParams(params)
        : colDef.cellRendererParams || {};

    // Estado
    this.value = params.value;
    this.searchTerm = '';
    this.currentGroup = null;         // grupo em drill-in
    this.currentGroupUsers = [];      // membros do grupo atual
    this.groupStack = [];
    this.groupBy = 'type';            // igual ao componente fornecido
    this.searchPlaceholder = 'Search user...';

    const tag =
      (colDef.TagControl || colDef.tagControl || colDef.tagcontrol || '').toUpperCase();
    const identifier = (colDef.FieldDB || '').toUpperCase();
    this.isResponsibleUser = tag === 'RESPONSIBLEUSERID' || identifier === 'RESPONSIBLEUSERID';

    // Normalização das opções (mantém chaves extras intactas)
    let optionsArr = [];
    if (Array.isArray(params.options)) {
      optionsArr = params.options;
    } else if (Array.isArray(colDef.listOptions)) {
      optionsArr = colDef.listOptions;
    } else if (typeof colDef.listOptions === 'string' && colDef.listOptions.trim() !== '') {
      optionsArr = colDef.listOptions.split(',').map(o => o.trim());
    } else if (colDef.dataSource && typeof colDef.dataSource.list_options === 'string' && colDef.dataSource.list_options.trim() !== '') {
      optionsArr = colDef.dataSource.list_options.split(',').map(o => o.trim());
    }

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

    this.options = (optionsArr || []).map(normalize);
    this.filteredRoot = [...this.options]; // lista raiz filtrada (quando não está num grupo)

    // DOM
    this.eGui = document.createElement('div');
    this.eGui.className = 'user-selector-dropdown'; // wrapper (mesmas classes)
    this.eGui.innerHTML = `
      <div class="user-selector__dropdown" data-role="dropdown">
        <div class="user-selector__search" data-role="search-row">
          <input type="text" class="user-selector__input" placeholder="${this.searchPlaceholder}" />
          <span class="material-symbols-outlined user-selector__icon">search</span>
        </div>

        <div class="user-selector__group-header" data-role="group-header" style="display:none;">
          <span class="material-symbols-outlined user-selector__back" data-role="back-btn">chevron_left</span>
          <span class="user-selector__group-title" data-role="group-title"></span>
        </div>
        <div class="user-selector__group-count" data-role="group-count" style="display:none;"></div>

        <div class="user-selector__list" data-role="list"></div>
        <div class="user-selector__no-results" data-role="no-results" style="display:none;">No user found</div>
      </div>
    `;

    // Close (X) no topo da dropdown
    const closeBtn = document.createElement('span');
    closeBtn.className = 'editor-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
      if (this.params.api && this.params.api.stopEditing) this.params.api.stopEditing(true);
      else if (this.params.stopEditing) this.params.stopEditing(true);
    });
    this.eGui.querySelector('[data-role="dropdown"]').prepend(closeBtn);

    // Refs
    this.searchRow   = this.eGui.querySelector('[data-role="search-row"]');
    this.searchInput = this.eGui.querySelector('.user-selector__input');
    this.groupHeader = this.eGui.querySelector('[data-role="group-header"]');
    this.backBtn     = this.eGui.querySelector('[data-role="back-btn"]');
    this.groupTitle  = this.eGui.querySelector('[data-role="group-title"]');
    this.groupCount  = this.eGui.querySelector('[data-role="group-count"]');
    this.listEl      = this.eGui.querySelector('[data-role="list"]');
    this.noResultsEl = this.eGui.querySelector('[data-role="no-results"]');

    // Eventos
    this.searchInput.addEventListener('input', (e) => {
      this.searchTerm = (e.target.value || '').toLowerCase();
      this.applyRootFilter();
      this.render();
    });

    this.backBtn.addEventListener('click', () => this.backToRoot());

    // CSS (ajustado: 14px, wght 400, ícone groups 14px)
    this.injectCSSOnce();

    // Render inicial (root)
    this.applyRootFilter();
    this.render();
  }

  // Busca na raiz (considera grupos e membros)
  applyRootFilter() {
    if (!this.searchTerm) {
      this.filteredRoot = [...this.options];
      return;
    }
    const q = this.searchTerm;
    this.filteredRoot = this.options.filter(item => {
      const type = String(item?.[this.groupBy] || '').toLowerCase();
      const name = String(item?.name || item?.label || '').toLowerCase();

      if (type === 'group') {
        const groupNameMatch = name.includes(q);
        const hasMemberMatch = (Array.isArray(item.groupUsers) ? item.groupUsers : [])
          .some(m => String(m.name || m.DisplayName || m.label || '').toLowerCase().includes(q));
        return groupNameMatch || hasMemberMatch;
      }
      return name.includes(q);
    });
  }

  // Abrir grupo: "Assign to team" só em ResponsibleUser
  openGroup(group) {
    if (!group || !Array.isArray(group.groupUsers)) return;
    this.groupStack.push(this.currentGroup);
    this.currentGroup = group;

    const members = group.groupUsers || [];
    this.currentGroupUsers = this.isResponsibleUser
      ? [{ id: null, name: 'Assign to team', isAssignToTeam: true }, ...members]
      : members.slice();

    // Em modo grupo, esconde busca (igual ao Vue)
    this.searchTerm = '';
    if (this.searchInput) this.searchInput.value = '';
    this.render();
  }

  // Voltar
  backToRoot() {
    this.currentGroup = this.groupStack.pop() || null;
    if (this.currentGroup) {
      const members = this.currentGroup.groupUsers || [];
      this.currentGroupUsers = this.isResponsibleUser
        ? [{ id: null, name: 'Assign to team', isAssignToTeam: true }, ...members]
        : members.slice();
    } else {
      this.currentGroupUsers = [];
      this.applyRootFilter();
    }
    this.render();
  }

  // Helpers visuais / formatters
  stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  getRoundedSpanColor(value, colorArray, fieldName) {
    if (!colorArray || !Array.isArray(colorArray) || !value) return value;
    const it = colorArray.find(item => item.Valor === value);
    if (!it) return value;
    const borderRadius = fieldName === 'StatusID' ? '4px' : '12px';
    const fontweight = 'font-weight:bold;';
    return `<span style="height:25px; color:${it.CorFonte}; background:${it.CorFundo}; border:1px solid ${it.CorFundo}; border-radius:${borderRadius}; ${fontweight} display:inline-flex; align-items:center; padding:0 12px;">${value}</span>`;
  }

  dateFormatter(dateValue, lang) {
    try {
      if (!dateValue) return '';
      const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
      const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
      const d = new Date(dateValue);
      const datePart = new Intl.DateTimeFormat(lang || 'en', dateOptions).format(d);
      const timePart = new Intl.DateTimeFormat(lang || 'en', timeOptions).format(d);
      return `${datePart} ${timePart}`;
    } catch {
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
        return fn(value, {}, colDef, this.getRoundedSpanColor.bind(this), this.dateFormatter.bind(this));
      } else if (params.useStyleArray && Array.isArray(params.styleArray)) {
        const styled = this.getRoundedSpanColor(value, params.styleArray, colDef.FieldDB);
        if (styled) return styled;
      }
    } catch (e) {
      console.error('Format option error', e);
    }
    return value;
  }

  getInitial(name) {
    return name ? String(name).trim().charAt(0).toUpperCase() : '';
  }

  isGroupLabelText(label) {
    const v = String(label || '').toUpperCase();
    return ['GROUP', 'GROUPS', 'GRUPO', 'GRUPOS'].includes(v);
  }

  // Agrupamento por this.groupBy (root)
  groupRootItems(items) {
    if (!items || !items.length) return { groups: [], ungrouped: [] };
    const groups = new Map();
    const ungrouped = [];

    for (const u of items) {
      const key = u?.[this.groupBy];
      if (key === undefined || key === null || key === '') {
        ungrouped.push(u);
      } else {
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(u);
      }
    }

    return {
      groups: Array.from(groups, ([label, items]) => ({ label, items })),
      ungrouped
    };
  }

  // Render master
  render() {
    if (this.currentGroup) {
      this.searchRow.style.display = 'none';
      this.groupHeader.style.display = '';
      this.groupTitle.textContent = this.currentGroup.name || '';
      const count = (this.currentGroup.groupUsers || []).length || 0;
      this.groupCount.style.display = '';
      this.groupCount.textContent = `${count} ${count === 1 ? 'member' : 'members'}`;
      this.renderGroupView();
    } else {
      this.searchRow.style.display = '';
      this.groupHeader.style.display = 'none';
      this.groupCount.style.display = 'none';
      this.renderRootView();
    }
  }

  // ROOT VIEW
  renderRootView() {
    const { groups, ungrouped } = this.groupRootItems(this.filteredRoot);
    let html = '';

    // Grupos (Users / Group)
    for (const group of groups) {
      const showLabel = !['USERS', 'USER', 'USUARIOS', 'USUÁRIO', 'USUÁRIOS'].includes(String(group.label || '').toUpperCase());
      html += `
        <div class="user-selector__group">
          <div class="user-selector__group-label">${showLabel ? (group.label || '') : ''}</div>
          <div class="user-selector__group-items">
            ${group.items.map(u => this.renderRootItem(u, group.label)).join('')}
          </div>
        </div>
      `;
    }

    // Itens sem grupo
    html += ungrouped.map(u => this.renderRootItem(u, '')).join('');

    this.listEl.innerHTML = html || '';
    this.noResultsEl.style.display = (html.trim() === '') ? '' : 'none';

    // Bind cliques (root)
    this.listEl.querySelectorAll('[data-action="open-group"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const grp = this.filteredRoot.find(x => String(x.id || x.value) === id);
        if (grp) this.openGroup(grp);
      });
    });

    this.listEl.querySelectorAll('[data-action="select-user"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-id');
        // callback opcional
        if (typeof this.params.colDef?.onSelect === 'function') {
          try { this.params.colDef.onSelect({ userid: val, groupid: null }, this.params); } catch {}
        }
        this.postGroupAndUser({ p_groupid: null, p_responsibleuserid: val });
        const selected = this.options.find(u => String(u.id || u.value) === String(val));
        this.commitSelection({ userid: val, groupid: null }, {
          userName: selected?.name || selected?.label || '',
          groupName: null,
        });
      });
    });
  }

  // Item na raiz (agrupado): avatar só quando for ResponsibleUser
  renderRootItem(user, groupLabel) {
    const formatted = this.formatOption(user);
    const plain = this.stripHtml(String(formatted));
    const hasChildren = Array.isArray(user.groupUsers) && user.groupUsers.length > 0;
    const isGroupType = this.isGroupLabelText(groupLabel) || String(user?.[this.groupBy] || '').toUpperCase() === 'GROUP';

    const actionAttr = (hasChildren || isGroupType)
      ? 'data-action="open-group"'
      : 'data-action="select-user"';
    const chevron = hasChildren
      ? `<span class="material-symbols-outlined user-selector__chevron" ${actionAttr} data-id="${user.id || user.value}">chevron_right</span>`
      : '';

    // NÃO ResponsibleUser: só label (mantém HTML do formatter)
    if (!this.isResponsibleUser) {
      return `
        <div class="user-selector__item" ${actionAttr} data-id="${user.id || user.value}">
          <span class="user-selector__name">${formatted}</span>
          ${chevron}
        </div>
      `;
    }

    // ResponsibleUser: avatar/inicial/ícone de grupo
    const photo = user.PhotoURL || user.PhotoUrl || user.photo || user.image || user.img || '';
    const avatarHTML = isGroupType
      ? `<span class="material-symbols-outlined user-selector__group-icon">groups</span>`
      : (photo
          ? `<img src="${photo}" alt="User Photo" />`
          : `<span class="user-selector__initial">${this.getInitial(user.name || plain)}</span>`);

    return `
      <div class="user-selector__item" ${actionAttr} data-id="${user.id || user.value}">
        <div class="avatar-outer">
          <div class="avatar-middle">
            <div class="user-selector__avatar">${avatarHTML}</div>
          </div>
        </div>
        <span class="user-selector__name">${formatted}</span>
        ${chevron}
      </div>
    `;
  }

  // GROUP VIEW
  renderGroupView() {
    // renderiza a lista do grupo atual (com "Assign to team" no topo apenas em ResponsibleUser)
    const list = this.currentGroupUsers || [];
    this.listEl.innerHTML = list.map(member => this.renderGroupMember(member)).join('') || '';
    this.noResultsEl.style.display = (list.length === 0) ? '' : 'none';

    // Bind cliques (grupo)
    this.listEl.querySelectorAll('[data-action="assign-team"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const payload = { userid: null, groupid: this.currentGroup.id };
        if (typeof this.params.colDef?.onSelect === 'function') {
          try { this.params.colDef.onSelect(payload, this.params); } catch {}
        }
        this.postGroupAndUser({ p_groupid: this.currentGroup.id, p_responsibleuserid: null });
        this.commitSelection({ userid: null, groupid: this.currentGroup.id }, {
          userName: null,
          groupName: this.currentGroup?.name || '',
        });
      });
    });

    this.listEl.querySelectorAll('[data-action="select-user"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-id');
        const payload = { userid: userId, groupid: this.currentGroup.id };
        if (typeof this.params.colDef?.onSelect === 'function') {
          try { this.params.colDef.onSelect(payload, this.params); } catch {}
        }
        this.postGroupAndUser({ p_groupid: this.currentGroup.id, p_responsibleuserid: userId });
        const member = (this.currentGroup.groupUsers || []).find(m => String(m.id || m.UserID || m.value) === String(userId));
        this.commitSelection({ userid: userId, groupid: this.currentGroup.id }, {
          userName: member?.name || member?.DisplayName || member?.label || '',
          groupName: this.currentGroup?.name || '',
        });
      });
    });
  }

  // Item de membro do grupo: avatar só quando for ResponsibleUser
  renderGroupMember(member) {
    const isAssign = !!member.isAssignToTeam;
    const name = isAssign ? 'Assign to team' : (member.name || member.DisplayName || member.label || '');
    const actionAttr = isAssign ? 'data-action="assign-team"' : 'data-action="select-user"';
    const idAttr = isAssign ? '' : `data-id="${member.id || member.UserID || member.value}"`;

    // NÃO ResponsibleUser: só label
    if (!this.isResponsibleUser) {
      return `
        <div class="user-selector__item" ${actionAttr} ${idAttr}>
          <span class="user-selector__name">${name}</span>
        </div>
      `;
    }

    // ResponsibleUser: avatar/inicial/ícone de grupo
    const photo = isAssign ? '' : (member.PhotoURL || member.PhotoUrl || member.photo || member.image || member.img || '');
    const avatarHTML = isAssign
      ? `<span class="material-symbols-outlined user-selector__group-icon">groups</span>`
      : (photo
          ? `<img src="${photo}" alt="User Photo" />`
          : `<span class="user-selector__initial">${this.getInitial(name)}</span>`);

    return `
      <div class="user-selector__item" ${actionAttr} ${idAttr}>
        <div class="avatar-outer">
          <div class="avatar-middle">
            <div class="user-selector__avatar">${avatarHTML}</div>
          </div>
        </div>
        <span class="user-selector__name">${name}</span>
      </div>
    `;
  }

  // Commit & AG Grid hooks
  commitSelection(val, meta = {}) {
    this.value = val; // objeto { userid, groupid }
    if (this.params.data) {
      if (Object.prototype.hasOwnProperty.call(meta, 'userName')) {
        this.params.data.ResponsibleUser = meta.userName;
      }
      if (Object.prototype.hasOwnProperty.call(meta, 'groupName')) {
        this.params.data.AssignedGroupName = meta.groupName;
      }
    }
    if (this.params.api && this.params.api.stopEditing) {
      this.params.api.stopEditing();
    } else if (this.params.stopEditing) {
      this.params.stopEditing();
    }
  }

  async postGroupAndUser({ p_groupid, p_responsibleuserid }) {
    try {
      const p_ticketid = this.params?.data?.TicketID;
      const p_loggeduserid = window?.wwLib?.wwVariable?.getValue?.('fc54ab80-1a04-4cfe-a504-793bdcfce5dd');
      const sb = window?.wwLib?.wwPlugins?.supabase;
      if (sb?.callPostgresFunction) {
        await sb.callPostgresFunction({
          functionName: 'postGroupAndUser',
          params: {
            p_ticketid,
            p_groupid,
            p_responsibleuserid,
            p_loggeduserid,
          },
        });
      }
    } catch (e) {
      console.warn('postGroupAndUser failed', e);
    }
  }

  getGui() {
    return this.eGui;
  }

  afterGuiAttached() {
    if (this.searchInput) this.searchInput.focus();
  }

  getValue() {
    // Retorna o que o grid salvará na célula (userid ou null)
    return this.value;
  }

  destroy() {}

  isPopup() {
    return true;
  }

  // CSS injetado (14px, wght 400, ícone groups 14px)
  injectCSSOnce() {
    const id = '__fixed_list_user_selector_css_v2__';
    const old = document.getElementById('__fixed_list_user_selector_css__');
    if (old) old.remove();
    if (document.getElementById(id)) return;

    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
.user-selector-dropdown {
  position: relative;
  width: auto;
  display: inline-block;
  font-family: inherit;
}
.user-selector__dropdown {
  position: relative;
  width: 260px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px #0002;
  z-index: 10;
  padding: 8px 0 4px 0;
  border: none;
  display: flex;
  flex-direction: column;
}
.editor-close {
  position: absolute;
  top: 6px;
  right: 8px;
  cursor: pointer;
  font-size: 16px;
  color: #6b7280;
  z-index: 20;
}

/* Busca */
.user-selector__search {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  position: relative;
  padding: 0 12px;
  width: 100%;
  box-sizing: border-box;
}
.user-selector__input {
  flex: 1;
  width: 100%;
  padding: 8px 36px 8px 12px;
  border-radius: 20px;
  font-size: 14px;            /* 14px */
  border: 1px solid #E0E0E0 !important;
  background: #fff;
  outline: none !important;
  box-shadow: none !important;
  transition: border 0.2s;
  box-sizing: border-box;
  font-weight: 400;           /* sem bold */
}
.user-selector__input:focus {
  border: 1.5px solid #E0E0E0 !important;
  outline: none !important;
  box-shadow: none !important;
}
.user-selector__icon {
  position: absolute;
  right: 22px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  color: #888;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Cabeçalho do grupo (drill-in) */
.user-selector__group-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px 4px;
}
.user-selector__back {
  cursor: pointer;
  font-size: 18px;
  color: #444;
}
.user-selector__group-title {
  flex: 1;
  font-size: 14px;            /* 14px */
  font-weight: 400;           /* sem bold */
}
.user-selector__group-count {
  font-size: 12px;
  padding: 0 12px 8px;
  color: #888;
}

/* Lista */
.user-selector__list {
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #bdbdbd transparent;
}
.user-selector__list::-webkit-scrollbar { width: 6px; background: transparent; border-radius: 12px; }
.user-selector__list::-webkit-scrollbar-thumb { background: #bdbdbd; border-radius: 12px; }
.user-selector__list::-webkit-scrollbar-corner { background: transparent; }
.user-selector__list::-webkit-scrollbar-button { display: none; height: 0; }

/* Rótulo do agrupamento */
.user-selector__group-label {
  padding: 4px 12px;
  color: #444;
  font-size: 14px;            /* 14px */
  font-weight: 400;           /* sem bold */
}

/* Itens dentro do agrupamento */
.user-selector__group-items {
  max-height: 130px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #bdbdbd transparent;
}
.user-selector__group-items::-webkit-scrollbar { width: 6px; background: transparent; border-radius: 12px; }
.user-selector__group-items::-webkit-scrollbar-thumb { background: #bdbdbd; border-radius: 12px; }
.user-selector__group-items::-webkit-scrollbar-corner { background: transparent; }
.user-selector__group-items::-webkit-scrollbar-button { display: none; height: 0; }

/* Linha de item */
.user-selector__item {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background 0.2s;
  gap: 10px;
  border: none;
}
.user-selector__item:hover { background: #f5f5f5; }

/* Nome do usuário/grupo */
.user-selector__name {
  font-size: 14px;            /* 14px */
  font-weight: 400;           /* sem bold */
  color: #444;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 0;
  max-width: 100%;
  padding-left: 3px;
}

/* Avatares (usados só em ResponsibleUser) */
.avatar-outer {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #3A4663;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}
.avatar-middle {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}
.user-selector__avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #4B6CB7;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.user-selector__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

/* Letra inicial */
.user-selector__initial {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;            /* 14px */
  font-weight: 400;           /* sem bold */
  background: transparent; color: #fff; border-radius: 50%; letter-spacing: .5px;
}

/* Ícone de grupo (14px) */
.user-selector__group-icon {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;            /* 14px */
  font-weight: 400;           /* sem bold */
  color: #fff;
  font-variation-settings: "wght" 400, "GRAD" 0, "opsz" 24, "FILL" 0;
}

/* Chevron direita */
.user-selector__chevron {
  margin-left: auto;
  font-size: 18px;
  color: #888;
  cursor: pointer;
}

/* Sem resultados */
.user-selector__no-results {
  color: #aaa;
  text-align: center;
  padding: 8px 0;
  font-size: 14px;
}
`;
    document.head.appendChild(style);
  }
}
