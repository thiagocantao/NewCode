<template>
  <div
    v-if="selectedLabel"
    class="user-cell"
    :class="{ 'user-cell--group-user': selectedGroup && selectedUser }"
    :style="pointerStyle"
  >
    <!-- CASO: Grupo + Responsável (stack) -->
    <template v-if="selectedGroup && selectedUser">
      <div
        class="avatar-outer group-avatar-wrapper selected-group-avatar"
        :title="selectedGroup.name || ''"
        @mouseenter="onGroupMouseEnter"
        @mouseleave="onGroupMouseLeave"
      >
        <div class="avatar-middle">
          <div class="user-cell__avatar">
            <template v-if="groupPhoto">
              <img :src="groupPhoto" alt="Group Photo" />
            </template>
            <template v-else>
              <span class="material-symbols-outlined user-cell__group-icon">groups</span>
            </template>
          </div>
        </div>
        <div v-if="showGroupTooltip" class="user-cell__group-tooltip">
          {{ selectedGroup.name }}
        </div>
      </div>

      <div class="avatar-outer selected-user-avatar">
        <div class="avatar-middle">
          <div class="user-cell__avatar">
            <template v-if="userPhoto">
              <img :src="userPhoto" alt="User Photo" />
            </template>
            <template v-else>
              <span class="user-cell__initial">{{ userInitial }}</span>
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- CASO: Só Grupo -->
    <template v-else-if="selectedGroup">
      <div
        class="avatar-outer group-avatar-wrapper"
        :title="selectedGroup.name || ''"
        @mouseenter="onGroupMouseEnter"
        @mouseleave="onGroupMouseLeave"
      >
        <div class="avatar-middle">
          <div class="user-cell__avatar">
            <template v-if="groupPhoto">
              <img :src="groupPhoto" alt="Group Photo" />
            </template>
            <template v-else>
              <span class="material-symbols-outlined user-cell__group-icon">groups</span>
            </template>
          </div>
        </div>
        <div v-if="showGroupTooltip" class="user-cell__group-tooltip">
          {{ selectedGroup.name }}
        </div>
      </div>
    </template>

    <!-- CASO: Só Responsável -->
    <template v-else>
      <div class="avatar-outer">
        <div class="avatar-middle">
          <div class="user-cell__avatar">
            <template v-if="userPhoto">
              <img :src="userPhoto" alt="User Photo" />
            </template>
            <template v-else>
              <span class="user-cell__initial">{{ userInitial }}</span>
            </template>
          </div>
        </div>
      </div>
    </template>

    <span class="user-cell__name">{{ selectedLabel }}</span>
  </div>
</template>

<script>
export default {
  name: 'UserCellRenderer',
  props: {
    params: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      currentParams: this.params,
      optionsCache: [],
      showGroupTooltip: false
    };
  },
  async created() {
    // Carrega options (se vieram por params ou via API)
    if (this.currentParams.options && this.currentParams.options.length) {
      this.optionsCache = this.mapOptions(this.currentParams.options);
    } else {
      this.optionsCache = this.mapOptions(await this.fetchOptions());
    }
  },
  computed: {
    options() {
      return this.optionsCache;
    },

    /* -----------------------------
       GRUPO SELECIONADO
       - Preferência:
         1) value.groupid (quando cell value é objeto)
         2) AssignedGroupID (ID -> lookup em options)
         3) AssignedGroupName (nome direto)
    ------------------------------ */
    selectedGroup() {
      const val = this.currentParams.value;

      // Caso: valor-objeto com groupid
      if (val && typeof val === 'object' && val.groupid) {
        const grp = this.findGroupById(val.groupid);
        if (grp) return { name: grp.name, photo: this.pickPhoto(grp) };
      }

      // Caso: temos ID de grupo no rowData
      const groupId =
        this.currentParams.data?.AssignedGroupID ||
        this.currentParams.data?.GroupID ||
        this.currentParams.data?.GroupId;
      if (groupId) {
        const grp = this.findGroupById(groupId);
        if (grp) return { name: grp.name, photo: this.pickPhoto(grp) };
      }

      // Caso: temos nome do grupo direto no rowData
      const name =
        this.currentParams.data?.AssignedGroupName ||
        this.currentParams.data?.GroupName ||
        this.currentParams.data?.Group;
      if (name) {
        const photo =
          this.currentParams.data?.AssignedGroupPhotoUrl ||
          this.currentParams.data?.AssignedGroupPhotoURL ||
          this.currentParams.data?.AssignedGroupPhoto ||
          this.currentParams.data?.GroupPhotoURL ||
          this.currentParams.data?.GroupPhotoUrl ||
          this.currentParams.data?.GroupPhoto ||
          this.currentParams.data?.photoUrl; // último fallback
        return { name, photo };
      }

      return null;
    },

    /* -----------------------------
       RESPONSÁVEL SELECIONADO
       - Preferência:
         1) value.userid (quando cell value é objeto) -> procura dentro do grupo, senão global
         2) IDs no rowData (Technical responsible / ResponsibleUserID / etc) -> lookup em options
         3) Nome direto no rowData (ResponsibleUser / Username / UserName)
    ------------------------------ */
    selectedUser() {
      const val = this.currentParams.value;

      // 1) valor-objeto com userid/groupid
      if (val && typeof val === 'object') {
        if (val.userid && val.groupid) {
          const grp = this.findGroupById(val.groupid);
          if (grp) {
            const u = (grp.groupUsers || []).find(u => String(u.id) === String(val.userid));
            if (u) return { name: u.name, photo: this.pickPhoto(u) };
          }
        } else if (val.userid) {
          const u = this.findUserById(val.userid);
          if (u) return { name: u.name, photo: this.pickPhoto(u) };
        }
      }

      // 2) IDs no rowData
      const technicalRespId =
        this.currentParams.data?.['Technical responsible'] ||
        this.currentParams.data?.TechnicalResponsible ||
        this.currentParams.data?.Technical_responsible ||
        this.currentParams.data?.TechnicalResponsibleID ||
        this.currentParams.data?.ResponsibleUserID ||
        this.currentParams.data?.ResponsibleID ||
        this.currentParams.data?.UserID;

      if (technicalRespId) {
        // Se houver AssignedGroupID, tenta dentro do grupo primeiro
        const groupId =
          this.currentParams.data?.AssignedGroupID ||
          this.currentParams.data?.GroupID ||
          this.currentParams.data?.GroupId;
        if (groupId) {
          const grp = this.findGroupById(technicalRespId) || this.findGroupById(groupId);
          // Se technicalRespId for na verdade um groupid inválido, a busca acima ainda se mantém robusta
          if (grp) {
            const u = (grp.groupUsers || []).find(u => String(u.id) === String(technicalRespId));
            if (u) return { name: u.name, photo: this.pickPhoto(u) };
          }
        }
        // Busca global
        const u = this.findUserById(technicalRespId);
        if (u) return { name: u.name, photo: this.pickPhoto(u) };
      }

      // 3) Nome direto no rowData
      const name =
        this.currentParams.data?.ResponsibleUser ||
        this.currentParams.data?.Username ||
        this.currentParams.data?.UserName ||
        this.currentParams.data?.Responsible ||
        this.currentParams.data?.Assignee;

      if (name) {
        const photo =
          this.currentParams.data?.photoUrl ||
          this.currentParams.data?.PhotoURL ||
          this.currentParams.data?.PhotoUrl ||
          this.currentParams.data?.UserPhoto ||
          this.currentParams.data?.UserPhotoUrl;
        return { name, photo };
      }

      return null;
    },

    /* Rótulo: se houver os dois, mostra o nome do responsável; senão o que existir */
    selectedLabel() {
      if (this.selectedGroup && this.selectedUser) return this.selectedUser.name;
      if (this.selectedGroup) return this.selectedGroup.name;
      return this.selectedUser ? this.selectedUser.name : '';
    },

    /* Foto do usuário / grupo (consolidadas) */
    userPhoto() {
      const u = this.selectedUser;
      return (
        u?.photo ||
        u?.photoUrl ||
        u?.PhotoURL ||
        u?.PhotoUrl ||
        ''
      );
    },
    groupPhoto() {
      const g = this.selectedGroup;
      return (
        g?.photo ||
        g?.photoUrl ||
        g?.PhotoURL ||
        g?.PhotoUrl ||
        ''
      );
    },

    userInitial() {
      return this.selectedUser ? this.getInitial(this.selectedUser.name) : '';
    },

    isEditable() {
      const editable = this.currentParams.colDef?.editable;
      if (typeof editable === 'function') {
        try {
          return !!editable(this.currentParams);
        } catch {
          return false;
        }
      }
      return !!editable;
    },
    pointerStyle() {
      return this.isEditable ? { cursor: 'pointer' } : {};
    }
  },
  methods: {
    /* Normaliza structure de options (grupos com groupUsers, usuários folha) */
    mapOptions(list) {
      const getProp = (obj, ...keys) => {
        for (const key of keys) {
          const match = Object.keys(obj || {}).find(
            k => k.toLowerCase() === String(key).toLowerCase()
          );
          if (match) return obj[match];
        }
        return undefined;
      };
      return (list || []).map(item => {
        const children = getProp(item, 'groupUsers', 'children', 'users');
        return {
          ...item,
          id: getProp(item, 'id', 'value', 'userId', 'userid', 'groupid'),
          name: getProp(item, 'name', 'label'),
          value: getProp(item, 'value', 'id'),
          label: getProp(item, 'label', 'name'),
          photoUrl:
            getProp(item, 'photoUrl', 'PhotoUrl', 'PhotoURL', 'photo', 'image', 'img') || undefined,
          ...(Array.isArray(children) && children.length
            ? { groupUsers: this.mapOptions(children) }
            : {})
        };
      });
    },

    pickPhoto(entity) {
      return (
        entity?.photoUrl ||
        entity?.PhotoUrl ||
        entity?.PhotoURL ||
        entity?.photo ||
        entity?.image ||
        entity?.img ||
        undefined
      );
    },

    onGroupMouseEnter() {
      this.showGroupTooltip = true;
      this.updateRowZIndex(true);
    },
    onGroupMouseLeave() {
      this.showGroupTooltip = false;
      this.updateRowZIndex(false);
    },
    updateRowZIndex(raise) {
      const cell = this.currentParams?.eGridCell;
      if (cell) {
        cell.style.overflow = raise ? 'visible' : '';
        const row = cell.parentElement;
        if (row) {
          row.style.zIndex = raise ? 1000 : '';
          row.style.overflow = raise ? 'visible' : '';
        }
      }
    },

    async fetchOptions() {
      try {
        const lang = window.wwLib?.wwVariable?.getValue('aa44dc4c-476b-45e9-a094-16687e063342');
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
            ...(lang ? { p_language: lang } : {})
          })
        };
        if (apiKey) fetchOptions.headers['apikey'] = apiKey;
        if (apiAuth) fetchOptions.headers['Authorization'] = apiAuth;

        const baseUrl = apiUrl.endsWith('/') ? apiUrl : apiUrl + '/';
        const response = await fetch(baseUrl + 'getLookupGroupsAndUsers', fetchOptions);
        const data = await response.json();
        return Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.result)
              ? data.result
              : Array.isArray(data?.results)
                ? data.results
                : [];
      } catch {
        return [];
      }
    },

    /* Busca grupo/usuário em options */
    findGroupById(id, list = this.options) {
      const target = String(id);
      for (const item of list || []) {
        const hasChildren = Array.isArray(item.groupUsers) && item.groupUsers.length > 0;
        // Alguns datasets usam o próprio item como grupo (com children)
        if (String(item.id) === target && hasChildren) {
          return item;
        }
        if (hasChildren) {
          const found = this.findGroupById(target, item.groupUsers);
          if (found) return found;
        }
      }
      return null;
    },
    findUserById(id, list = this.options) {
      const target = String(id);
      for (const item of list || []) {
        const hasGroup = Array.isArray(item.groupUsers) && item.groupUsers.length > 0;
        if (!hasGroup && String(item.id) === target) {
          return item;
        }
        if (hasGroup) {
          const found = this.findUserById(target, item.groupUsers);
          if (found) return found;
        }
      }
      return null;
    },

    getInitial(name) {
      return name ? String(name).trim().charAt(0).toUpperCase() : '';
    },

    refresh(params) {
      this.currentParams = params;
      // Se options mudarem dinamicamente
      if (params?.options && params.options !== this.optionsCache) {
        this.optionsCache = this.mapOptions(params.options);
      }
      return true;
    }
  }
};
</script>

<style scoped>
.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-cell--group-user {
  gap: 0;
}
.user-cell--group-user .selected-group-avatar {
  margin-right: -8px;   /* mantém o grupo "um pouco atrás" */
  position: relative;
  z-index: 1;
}
.user-cell--group-user .selected-user-avatar {
  position: relative;
  z-index: 2;
}
.group-avatar-wrapper {
  position: relative;
}

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
.user-cell__avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #4B6CB7;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.user-cell__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
.user-cell__initial {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--grid-view-dinamica-font-size, 12px);
  font-family: var(--grid-view-dinamica-font-family, Roboto, Arial, sans-serif);
  font-weight: 400;
  background: transparent;
  color: #fff;
  border-radius: 50%;
  letter-spacing: 0.5px;
}
.user-cell__group-icon {
  color: #fff;
  font-size: 18px;
}
.user-cell__name {
  font-size: var(--grid-view-dinamica-font-size, 12px);
  font-family: var(--grid-view-dinamica-font-family, Roboto, Arial, sans-serif);
  font-weight: 400;
  color: #444;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 3px;
}

/* Tooltip do grupo */
.user-cell__group-tooltip {
  position: absolute;
  top: 35px;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: #fff;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: var(--grid-view-dinamica-font-size, 12px);
  font-family: var(--grid-view-dinamica-font-family, Roboto, Arial, sans-serif);
  white-space: nowrap;
  z-index: 1000;
  text-align: center;
}
</style>
