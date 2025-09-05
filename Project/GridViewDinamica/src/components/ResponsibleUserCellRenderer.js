// ===== ResponsibleUserCellRenderer.js =====
export default class ResponsibleUserCellRenderer {
  init(params) {
    this.params = params;
    this.eGui = document.createElement('div');
    this.eGui.className = 'ru-cell';
 
    this.injectCSSOnce();
    this.render();
  }

  // ---- Helpers base ----
  get row() {
    return this.params?.data || {};
  }
  get colDef() {
    return this.params?.colDef || {};
  }
  isResponsibleCol() {
    const tag = (this.colDef.TagControl || this.colDef.tagControl || this.colDef.tagcontrol || '').toUpperCase();
    const fieldDb = (this.colDef.FieldDB || '').toUpperCase();
    const field = (this.colDef.field || '').toUpperCase();
    return tag === 'RESPONSIBLEUSERID' || fieldDb === 'RESPONSIBLEUSERID' || field === 'RESPONSIBLEUSERID';
  }

  getIds() {
    const val = this.params.value;
    let userId = this.row.ResponsibleUserID ?? null;
    let groupId = this.row.AssignedGroupID ?? null;

    if (val && typeof val === 'object') {
      userId = val.userid ?? userId;
      groupId = val.groupid ?? groupId;
    } else if (val != null && userId == null) {
      userId = val;
    }
    return { userId, groupId };
  }

  // ---- Options / listOptions normalization ----
  getOptionsArray() {
    const cd = this.colDef;
    let options = [];

    if (Array.isArray(this.params.options)) options = this.params.options;
    else if (Array.isArray(cd.listOptions)) options = cd.listOptions;
    else if (typeof cd.listOptions === 'string' && cd.listOptions.trim()) {
      options = cd.listOptions.split(',').map(s => s.trim());
    } else if (cd.dataSource && typeof cd.dataSource.list_options === 'string' && cd.dataSource.list_options.trim()) {
      options = cd.dataSource.list_options.split(',').map(s => s.trim());
    }

    const normalize = (opt) => {
      if (typeof opt === 'object') {
        const findKey = key => Object.keys(opt).find(k => k.toLowerCase() === key);
        const labelKey = findKey('label') || findKey('name');
        const valueKey = findKey('value') || findKey('id');
        return {
          ...opt,
          id: opt.id ?? opt.value ?? (valueKey ? opt[valueKey] : undefined),
          name: opt.name ?? opt.label ?? (labelKey ? opt[labelKey] : undefined),
        };
      }
      return { id: opt, name: String(opt) };
    };

    return (options || []).map(normalize);
  }

  resolveUserMeta(userId) {
    if (userId == null) return { name: null, photo: null };
    const sid = String(userId);
    const options = this.getOptionsArray();

    // 1) procurar como usuário “raiz”
    let fromOptions =
      options.find(o => String(o.id) === sid && String(o?.type || '').toLowerCase() !== 'group');

    // 2) procurar dentro de grupos
    if (!fromOptions) {
      for (const g of options) {
        if (String(g?.type || '').toLowerCase() === 'group' && Array.isArray(g.groupUsers)) {
          const m = g.groupUsers.find(x => String(x.id ?? x.value ?? x.UserID) === sid);
          if (m) {
            fromOptions = {
              id: m.id ?? m.value ?? m.UserID,
              name: m.name ?? m.DisplayName ?? m.label,
              photoUrl: m.photoUrl ?? m.PhotoURL ?? m.PhotoUrl ?? m.photo ?? m.image ?? m.img
            };
            break;
          }
        }
      }
    }

    // 3) fallback a partir da própria linha
    const nameFromRow = this.row.ResponsibleUser || this.row.Username || this.row.UserName || this.row.User || null;
    const photoFromRow = this.row.photoUrl || this.row.PhotoUrl || this.row.PhotoURL || this.row.UserPhoto || null;

    return {
      name: fromOptions?.name ?? nameFromRow,
      photo: fromOptions?.photoUrl ?? photoFromRow
    };
  }

  resolveGroupMeta(groupId) {
    if (groupId == null) return { name: null, photo: null };
    const sid = String(groupId);
    const options = this.getOptionsArray();

    const g = options.find(o => String(o.id ?? o.value) === sid && String(o?.type || '').toLowerCase() === 'group');

    const nameFromRow = this.row.AssignedGroupName || this.row.GroupName || this.row.Group || null;
    const photoFromRow = this.row.groupPhoto || this.row.GroupPhoto || this.row.GroupImage || null;

    return {
      name: g?.name ?? nameFromRow,
      photo: g?.photoUrl ?? g?.PhotoURL ?? g?.PhotoUrl ?? g?.photo ?? g?.image ?? g?.img ?? photoFromRow
    };
  }

  // ---- Render ----
  render() {
    const isResp = this.isResponsibleCol();
    const { userId, groupId } = this.getIds();
    const user = this.resolveUserMeta(userId);
    const group = this.resolveGroupMeta(groupId);

    if (!isResp) {
      const plain = user?.name || this.params.value || '';
      this.eGui.innerHTML = `<div class="ru-text">${this.escape(plain ?? '')}</div>`;
      return;
    }

    const groupAvatar = group?.name
      ? this.renderAvatar(group.photo, group.name, true)
      : '';

    const userAvatar = user?.name
      ? this.renderAvatar(user.photo, user.name, false)
      : '';

    const textLabel = (group?.name && user?.name)
      ? `${user.name}`
      : (user?.name || group?.name || '');

    if (groupAvatar && userAvatar) {
      this.eGui.innerHTML = `
        <div class="ru-duo" title="${this.escape(group?.name)}">
          <div class="ru-avatar ru-group">${groupAvatar}</div>
          <div class="ru-avatar ru-user">${userAvatar}</div>
          <div class="ru-label">${this.escape(textLabel)}</div>
        </div>
      `;
      return;
    }

    const single = userAvatar || groupAvatar;
    this.eGui.innerHTML = `
      <div class="ru-single" title="${this.escape(textLabel)}">
        <div class="ru-avatar">${single}</div>
        <div class="ru-label">${this.escape(textLabel)}</div>
      </div>
    `;
  }

  renderAvatar(photo, name, isGroup) {
    if (isGroup) {
      return `
        <span class="avatar-outer">
          <span class="avatar-middle">
            <span class="ru-ava ru-ava--group">
              <span style="font-size: 14px" class="material-symbols-outlined ru-group-icon">groups</span>
            </span>
          </span>
        </span>
      `;
    }
    const inner = photo
      ? `<img src="${photo}" alt="${this.escape(name || '')}" />`
      : `<span class="ru-initial">${this.escape((name || '').trim().charAt(0).toUpperCase())}</span>`;
    return `
      <span class="avatar-outer">
        <span class="avatar-middle">
          <span class="ru-ava">${inner}</span>
        </span>
      </span>
    `;
  }

  escape(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  getGui() {
    return this.eGui;
  }
  refresh(params) {
    this.params = params;
    this.render();
    return true;
  }

  // ---- CSS com look “anel” para avatares ----
  injectCSSOnce() {
    const id = '__ru_cell_renderer_css__';
    if (typeof document === 'undefined' || document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
.ru-cell { display:flex; align-items:center; height:100%; }
.ru-text { font-size:13px; color:#374151; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ru-label { margin-left: 8px; font-size: 13px; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ru-single { display:flex; align-items:center; }
.ru-duo { display:flex; align-items:center; position: relative; }
.ru-avatar { display:inline-flex; }
.ru-avatar + .ru-avatar { margin-left: -10px; }

.avatar-outer {
  width: 32px; height: 32px; border-radius: 50%;
  border: 1px solid #3A4663; display:flex; align-items:center; justify-content:center; background:#fff;
}
.avatar-middle {
  width: 30px; height: 30px; border-radius: 50%;
  border: 2px solid #fff; display:flex; align-items:center; justify-content:center; background:#fff;
}
.ru-ava {
  width: 26px; height: 26px; border-radius:50%;
  background: #4B6CB7; display:flex; align-items:center; justify-content:center; overflow:hidden;
}
.ru-ava img {  object-fit:cover; border-radius:50%; }
.ru-initial {  display:flex; align-items:center; justify-content:center; color:#fff; font-size:14px; }

.ru-ava--group { background: #4B6CB7; }
.ru-group-icon {
  font-size: 14px; line-height:1; color:#fff;
  font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
}

.ru-group { z-index: 1; }
.ru-user  { z-index: 2; }
`;
    document.head.appendChild(style);
  }
}
