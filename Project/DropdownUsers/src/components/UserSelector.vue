<template>
  <div ref="dropdownRoot" class="user-selector-dropdown">
    <div
      class="user-selector__selected"
      @click="toggleDropdown"
      :style="containerStyle"
      :class="{ 'user-selector__selected--group-user': selectedGroup && selectedUser }"
    >
      <!-- Sem seleção -->
      <template v-if="!selectedGroup && !selectedUser">
        <div class="user-selector__avatar-unassigned">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#F3F4F6"/>
            <path d="M12 12c1.933 0 3.5-1.567 3.5-3.5S13.933 5 12 5s-3.5 1.567-3.5 3.5S10.067 12 12 12zm0 2c-2.33 0-7 1.167-7 3.5V20h14v-2.5c0-2.333-4.67-3.5-7-3.5z" fill="#BDBDBD"/>
          </svg>
        </div>
      </template>

      <!-- Grupo + Usuário -->
      <template v-else-if="selectedGroup && selectedUser">
        <div
          class="avatar-outer group-avatar-wrapper selected-group-avatar"
          @mouseenter="showGroupTooltip = true"
          @mouseleave="showGroupTooltip = false"
        >
          <div class="avatar-middle">
            <div class="user-selector__avatar">
              <template v-if="selectedGroup.photoUrl || selectedGroup.PhotoURL || selectedGroup.PhotoUrl">
                <img :src="selectedGroup.photoUrl || selectedGroup.PhotoURL || selectedGroup.PhotoUrl" alt="Group Photo" />
              </template>
              <template v-else>
                <span class="material-symbols-outlined user-selector__group-icon">groups</span>
              </template>
            </div>
          </div>
          <div v-if="showGroupTooltip" class="user-selector__group-tooltip">
            <div>{{ selectedGroup.name }}</div>
            <div class="user-selector__group-tooltip-count">
              {{ (selectedGroup && selectedGroup.groupUsers ? selectedGroup.groupUsers.length : 0) }}
              {{ (selectedGroup && selectedGroup.groupUsers ? selectedGroup.groupUsers.length : 0) === 1 ? 'member' : 'members' }}
            </div>
          </div>
        </div>

        <div class="avatar-outer selected-user-avatar">
          <div class="avatar-middle">
            <div class="user-selector__avatar">
              <template v-if="selectedUser.photoUrl || selectedUser.PhotoURL || selectedUser.PhotoUrl">
                <img :src="selectedUser.photoUrl || selectedUser.PhotoURL || selectedUser.PhotoUrl" alt="User Photo" />
              </template>
              <template v-else>
                <span class="user-selector__initial" :style="initialStyle">{{ getInitial(selectedUser.name) }}</span>
              </template>
            </div>
          </div>
        </div>
      </template>

      <!-- Somente grupo OU somente usuário -->
      <template v-else>
        <div
          class="avatar-outer group-avatar-wrapper"
          v-if="selectedGroup"
          @mouseenter="showGroupTooltip = true"
          @mouseleave="showGroupTooltip = false"
        >
          <div class="avatar-middle">
            <div class="user-selector__avatar">
              <template v-if="selectedGroup.photoUrl || selectedGroup.PhotoURL || selectedGroup.PhotoUrl">
                <img :src="selectedGroup.photoUrl || selectedGroup.PhotoURL || selectedGroup.PhotoUrl" alt="Group Photo" />
              </template>
              <template v-else>
                <span class="material-symbols-outlined user-selector__group-icon">groups</span>
              </template>
            </div>
          </div>
          <div v-if="showGroupTooltip" class="user-selector__group-tooltip">
            <div>{{ selectedGroup.name }}</div>
            <div class="user-selector__group-tooltip-count">
              {{ (selectedGroup && selectedGroup.groupUsers ? selectedGroup.groupUsers.length : 0) }}
              {{ (selectedGroup && selectedGroup.groupUsers ? selectedGroup.groupUsers.length : 0) === 1 ? 'member' : 'members' }}
            </div>
          </div>
        </div>

        <div class="avatar-outer" v-else>
          <div class="avatar-middle">
            <div class="user-selector__avatar">
              <template v-if="selectedUser && (selectedUser.photoUrl || selectedUser.PhotoURL || selectedUser.PhotoUrl)">
                <img :src="selectedUser.photoUrl || selectedUser.PhotoURL || selectedUser.PhotoUrl" alt="User Photo" />
              </template>
              <template v-else>
                <span class="user-selector__initial" :style="initialStyle">{{ selectedUser ? getInitial(selectedUser.name) : '' }}</span>
              </template>
            </div>
          </div>
        </div>
      </template>

      <span class="user-selector__name" :style="nameStyle">{{ selectedLabel }}</span>
    </div>

    <!-- Dropdown -->
    <div v-if="isOpen" class="user-selector__dropdown">
      <template v-if="currentGroup">
        <div class="user-selector__group-header">
          <span class="material-symbols-outlined user-selector__back" @click.stop="backToRoot">chevron_left</span>
          <span class="user-selector__group-title" :style="nameStyle">{{ currentGroup.name }}</span>
        </div>
        <div class="user-selector__group-count">{{ currentGroupCountLabel }}</div>
      </template>

      <template v-else>
        <div class="user-selector__search">
          <input
            v-model="search"
            type="text"
            :placeholder="searchPlaceholder"
            class="user-selector__input"
            :style="inputStyle"
          />
          <span class="material-symbols-outlined user-selector__icon">search</span>
        </div>
        <div v-if="showClearButton" class="user-selector__clear" @click.stop="clearSelection">✕</div>
      </template>

      <div class="user-selector__list" :style="userListStyle">
        <template v-if="groupBy && !currentGroup">
          <div class="user-selector__group" v-for="group in groupedUsers.groups" :key="group.label || 'g'">
            <div class="user-selector__group-label" :style="nameStyle">
              {{ group.label && group.label.toUpperCase() !== 'USERS' && group.label.toUpperCase() !== 'USER' && group.label.toUpperCase() !== 'USUARIOS' ? group.label : '' }}
            </div>

            <div class="user-selector__group-items" :style="groupListStyle">
              <div
                v-for="user in group.items"
                :key="user.id || 'u'"
                class="user-selector__item"
                :class="{ disabled: user.isEnabled === false }"
                @click.stop="user.isEnabled === false ? null : isGroupLabel(group.label) ? handleGroupClick(user) : selectUser(user)"
              >
                <div class="avatar-outer">
                  <div class="avatar-middle">
                    <div class="user-selector__avatar">
                      <template v-if="user.photoUrl || user.PhotoURL || user.PhotoUrl">
                        <img :src="user.photoUrl || user.PhotoURL || user.PhotoUrl" alt="User Photo" />
                      </template>
                      <template v-else>
                        <span v-if="isGroupLabel(group.label)" class="material-symbols-outlined user-selector__group-icon">groups</span>
                        <span v-else class="user-selector__initial" :style="initialStyle">{{ getInitial(user.name) }}</span>
                      </template>
                    </div>
                  </div>
                </div>
                <span class="user-selector__name" :style="nameStyle">{{ user.name }}</span>
                <span
                  v-if="user.groupUsers && user.groupUsers.length && groupClickBehavior !== 'select'"
                  class="material-symbols-outlined user-selector__chevron"
                  @click.stop="openGroup(user)"
                >
                  chevron_right
                </span>
              </div>
            </div>
          </div>

          <div
            v-for="user in groupedUsers.ungrouped"
            :key="user.id || 'uu'"
            class="user-selector__item"
            :class="{ disabled: user.isEnabled === false }"
            @click.stop="
              user.isEnabled === false
                ? null
                : user.groupUsers && user.groupUsers.length
                  ? handleGroupClick(user)
                  : selectUser(user)
            "
          >
            <div class="avatar-outer">
              <div class="avatar-middle">
                <div class="user-selector__avatar">
                  <template v-if="user.photoUrl || user.PhotoURL || user.PhotoUrl">
                    <img :src="user.photoUrl || user.PhotoURL || user.PhotoUrl" alt="User Photo" />
                  </template>
                  <template v-else>
                    <span class="user-selector__initial" :style="initialStyle">{{ getInitial(user.name) }}</span>
                  </template>
                </div>
              </div>
            </div>
            <span class="user-selector__name" :style="nameStyle">{{ user.name }}</span>
            <span
              v-if="user.groupUsers && user.groupUsers.length && groupClickBehavior !== 'select'"
              class="material-symbols-outlined user-selector__chevron"
              @click.stop="openGroup(user)"
            >
              chevron_right
            </span>
          </div>
        </template>

        <template v-else>
          <div
            v-for="user in filteredUsers"
            :key="user.id !== null ? user.id : 'assign'"
            class="user-selector__item"
            :class="{ disabled: user.isEnabled === false }"
            @click.stop="
              user.isEnabled === false
                ? null
                : user.groupUsers && user.groupUsers.length
                  ? handleGroupClick(user)
                  : selectUser(user)
            "
          >
            <div class="avatar-outer">
              <div class="avatar-middle">
                <div class="user-selector__avatar">
                  <template v-if="user.photoUrl || user.PhotoURL || user.PhotoUrl">
                    <img :src="user.photoUrl || user.PhotoURL || user.PhotoUrl" alt="User Photo" />
                  </template>
                  <template v-else>
                    <span v-if="user.isAssignToTeam" class="material-symbols-outlined user-selector__group-icon">groups</span>
                    <span v-else class="user-selector__initial" :style="initialStyle">{{ getInitial(user.name) }}</span>
                  </template>
                </div>
              </div>
            </div>
            <span class="user-selector__name" :style="nameStyle">{{ user.name }}</span>
            <span
              v-if="user.groupUsers && user.groupUsers.length && groupClickBehavior !== 'select'"
              class="material-symbols-outlined user-selector__chevron"
              @click.stop="openGroup(user)"
            >
              chevron_right
            </span>
          </div>
        </template>

        <div v-if="filteredUsers.length === 0" class="user-selector__no-results" :style="nameStyle">No user found</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UserSelector',
  props: {
    datasource:        { type: Array, default: function() { return []; } },
    groupBy:           String,
    showClearButton:   { type: Boolean, default: false },
    nameFontFamily:    String,
    nameFontSize:      String,
    nameFontWeight:    [String, Number],
    initialFontFamily: String,
    initialFontSize:   String,
    initialFontWeight: [String, Number],
    inputFontFamily:   String,
    inputFontSize:     String,
    inputFontWeight:   [String, Number],
    unassignedLabel:   { type: String, default: 'Unassigned' },
    searchPlaceholder: { type: String, default: 'Search user...' },
    initialSelectedId: [String, Number, Object],
    initialGroupId:    [String, Number],
    selectedUserId:    [String, Number, Object],
    uid:               String,
    maxWidth:          [String, Number],
    groupListHeight:   [String, Number],
    userListHeight:    [String, Number],
    dropdownListMaxHeight: [String, Number],
    supabaseUrl:       String,
    apiKey:            String,
    authToken:         String,
    groupClickBehavior: {
      type: String,
      default: 'open',
      validator: function(value) {
        return ['open', 'select'].indexOf(value) !== -1;
      }
    }
  },
  data: function() {
    return {
      search: '',
      isOpen: false,
      selectedUser: null,
      selectedGroup: null,
      currentGroup: null,
      currentGroupUsers: [],
      groupStack: [],
      showGroupTooltip: false,
      selectedUserIdVar: null,
      isApplyingInitial: false,
      lastVarPayload: null,
      // --- novos ---
      pendingInit: { groupId: null, userId: null },
      lastAppliedSig: null
    };
  },
  computed: {
    filteredUsers: function() {
      var source = this.currentGroup ? (this.currentGroupUsers || []) : this.datasource;
      var list = Array.isArray(source) ? source : [];
      if (!this.search) return list;
      var q = String(this.search).toLowerCase();
      if (this.currentGroup) {
        var assignItem = list[0];
        var rest = list.slice(1).filter(function(u) {
          return String(u.name || '').toLowerCase().includes(q);
        });
        return [assignItem].concat(rest);
      }
      return list.filter(function(u) {
        return String(u.name || '').toLowerCase().includes(q);
      });
    },
    groupedUsers: function() {
      if (!this.groupBy) return { groups: [], ungrouped: this.filteredUsers };
      var groups = new Map();
      var ungrouped = [];
      for (var i = 0; i < this.filteredUsers.length; i++) {
        var user = this.filteredUsers[i];
        var key;
        if (typeof wwLib !== 'undefined' && wwLib.resolveObjectPropertyPath) {
          key = wwLib.resolveObjectPropertyPath(user, this.groupBy);
        } else {
          key = user && user[this.groupBy];
        }
        if (key === undefined || key === null || key === '') {
          ungrouped.push(user);
        } else {
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(user);
        }
      }
      return { groups: Array.from(groups, function(entry) { return { label: entry[0], items: entry[1] }; }), ungrouped: ungrouped };
    },
    nameStyle: function() {
      return { fontFamily: this.nameFontFamily, fontSize: this.nameFontSize, fontWeight: this.nameFontWeight };
    },
    initialStyle: function() {
      return { fontFamily: this.initialFontFamily, fontSize: this.initialFontSize, fontWeight: this.initialFontWeight };
    },
    inputStyle: function() {
      return { fontFamily: this.inputFontFamily, fontSize: this.inputFontSize, fontWeight: this.inputFontWeight };
    },
    containerStyle: function() {
      if (!this.maxWidth) return {};
      return { maxWidth: (typeof this.maxWidth === 'number' ? this.maxWidth + 'px' : this.maxWidth) };
    },
    userListStyle: function() {
      var height = this.userListHeight;
      if (height === undefined || height === null || height === '') height = this.dropdownListMaxHeight;
      if (height === undefined || height === null || height === '') return {};
      return {
        maxHeight:
          typeof height === 'number'
            ? height + 'px'
            : height
      };
    },
    groupListStyle: function() {
      var height = this.groupListHeight;
      if (height === undefined || height === null || height === '') return {};
      return {
        maxHeight:
          typeof height === 'number'
            ? height + 'px'
            : height
      };
    },
    currentGroupCountLabel: function() {
      var count = (this.currentGroup && this.currentGroup.groupUsers) ? this.currentGroup.groupUsers.length : 0;
      return count + ' ' + (count === 1 ? 'member' : 'members');
    },
    selectedLabel: function() {
      if (this.selectedGroup && this.selectedUser) return this.selectedUser.name;
      if (this.selectedGroup && !this.selectedUser) return this.selectedGroup.name;
      return this.selectedUser ? this.selectedUser.name : this.unassignedLabel;
    }
  },
  created: function() {
    try {
      if (typeof wwLib !== 'undefined' && wwLib.wwVariable && wwLib.wwVariable.useComponentVariable) {
        this.selectedUserIdVar = wwLib.wwVariable.useComponentVariable({
          uid: this.uid,
          name: 'selectedUserId',
          type: 'object',
          defaultValue: { userid: null, groupid: null }
        });
      }
    } catch (e) {}
  },
  mounted: function() {
    var self = this;
    document.addEventListener('click', this.handleClickOutside);
    this.applyInitialSelection();
    this.$nextTick(function() { self.tryResolveSelection(true); });

    // (opcional) honrar selectedUserId uma vez, se você ainda usa como prop de entrada
    if (typeof this.selectedUserId !== 'undefined' && this.selectedUserId !== null && this.selectedUserId !== '') {
      this.setSelectedFromValue(this.selectedUserId);
      this.emitSelection();
      this.updateComponentVariable();
    }
  },
  beforeDestroy: function() {
    document.removeEventListener('click', this.handleClickOutside);
  },
  watch: {
    initialGroupId: function(newVal, oldVal) {
      if (this.equalsShallow(newVal, oldVal)) return;
      this.applyInitialSelection();
    },
    initialSelectedId: function(newVal, oldVal) {
      if (this.equalsShallow(newVal, oldVal)) return;
      this.applyInitialSelection();
    },
    datasource: function(newVal, oldVal) {
      if (newVal === oldVal) return;
      // ao chegar/alterar a fonte, tente aplicar o que está pendente
      this.tryResolveSelection(true);
    }
  },
  methods: {
    /* ------- UI ------- */
    toggleDropdown: function() {
      this.isOpen = !this.isOpen;
      if (!this.isOpen) this.resetDropdownState();
    },
    closeDropdown: function(event) {
      var root = this.$refs && this.$refs.dropdownRoot;
      var contains = root && root.contains ? root.contains(event.target) : false;
      if (this.isOpen && !contains) {
        this.isOpen = false;
        this.resetDropdownState();
      }
    },
    resetDropdownState: function() {
      this.currentGroup = null;
      this.currentGroupUsers = [];
      this.groupStack = [];
      this.search = '';
    },
    handleClickOutside: function(event) {
      this.closeDropdown(event);
    },

    /* ------- Helpers ------- */
    getInitial: function(name) {
      return name ? String(name).trim().charAt(0).toUpperCase() : '';
    },
    isGroupLabel: function(label) {
      var value = String(label || '').toUpperCase();
      return ['GROUP', 'GROUPS', 'GRUPO', 'GRUPOS'].includes(value);
    },
    findGroupById: function(id, list) {
      list = list || this.datasource;
      for (var i = 0; i < (list ? list.length : 0); i++) {
        var item = list[i];
        if (String(item.id) === String(id)) return item;
        if (item.groupUsers && item.groupUsers.length) {
          var found = this.findGroupById(id, item.groupUsers);
          if (found) return found;
        }
      }
      return null;
    },
    findUserById: function(id, list) {
      list = list || this.datasource;
      for (var i = 0; i < (list ? list.length : 0); i++) {
        var item = list[i];
        var hasGroup = item.groupUsers && item.groupUsers.length > 0;
        if (String(item.id) === String(id) && !hasGroup) return item;
        if (hasGroup) {
          var found = this.findUserById(id, item.groupUsers);
          if (found) return found;
        }
      }
      return null;
    },
    equalsShallow: function(a, b) {
      if (a === b) return true;
      if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
      var ak = Object.keys(a), bk = Object.keys(b);
      if (ak.length !== bk.length) return false;
      for (var i = 0; i < ak.length; i++) {
        var k = ak[i];
        if (a[k] !== b[k]) return false;
      }
      return true;
    },

    /* ------- Clique ------- */
    clearSelection: function() {
      this.selectedGroup = null;
      this.selectedUser = null;
      this.currentGroup = null;
      this.currentGroupUsers = [];
      this.groupStack = [];
      this.emitSelection({ userid: null, groupid: null });
      this.updateComponentVariable();
    },
    selectUser: function(user) {
      var value;
      if (this.currentGroup) {
        if (user.isAssignToTeam) {
          this.selectedGroup = this.currentGroup;
          this.selectedUser = null;
          value = { userid: null, groupid: this.currentGroup.id };
        } else {
          this.selectedGroup = this.currentGroup;
          this.selectedUser = user;
          value = { userid: user.id, groupid: this.currentGroup.id };
        }
      } else {
        this.selectedGroup = null;
        this.selectedUser = user;
        value = { userid: user.id, groupid: null };
      }
      this.isOpen = false;
      this.resetDropdownState();
      this.emitSelection(value);
      this.updateComponentVariable();
    },
    openGroup: function(group) {
      if (this.groupClickBehavior === 'select') return;
      if (group.groupUsers && group.groupUsers.length) {
        this.groupStack.push(this.currentGroup);
        this.currentGroup = group;
        this.currentGroupUsers = [{ id: null, name: 'Assign to team', isAssignToTeam: true }].concat(group.groupUsers);
        this.search = '';
      }
    },
    handleGroupClick: function(group) {
      if (this.groupClickBehavior === 'select') {
        this.selectGroup(group);
      } else {
        this.openGroup(group);
      }
    },
    selectGroup: function(group) {
      this.selectedGroup = group;
      this.selectedUser = null;
      this.isOpen = false;
      this.resetDropdownState();
      this.emitSelection({ userid: null, groupid: group ? group.id : null });
      this.updateComponentVariable();
    },
    backToRoot: function() {
      this.currentGroup = this.groupStack.length ? this.groupStack.pop() : null;
      this.currentGroupUsers = this.currentGroup
        ? [{ id: null, name: 'Assign to team', isAssignToTeam: true }].concat(this.currentGroup.groupUsers || [])
        : [];
      this.search = '';
      this.isOpen = true;
    },

    /* ------- Seleção inicial (registra intenção) ------- */
    applyInitialSelection: function() {
      if (this.isApplyingInitial) return;
      this.isApplyingInitial = true;
      try {
        var groupId = (this.initialGroupId !== '' && this.initialGroupId !== undefined && this.initialGroupId !== null)
          ? this.initialGroupId : null;

        var rawUser = (this.initialSelectedId !== '' && this.initialSelectedId !== undefined && this.initialSelectedId !== null)
          ? this.initialSelectedId : null;

        var userId = rawUser;
        var explicitGroupFromObj = null;
        if (rawUser && typeof rawUser === 'object') {
          userId = (typeof rawUser.userid !== 'undefined') ? rawUser.userid : null;
          explicitGroupFromObj = (typeof rawUser.groupid !== 'undefined') ? rawUser.groupid : null;
        }
        var effectiveGroupId = groupId !== null ? groupId : explicitGroupFromObj;

        // registra intenção e tenta resolver
        this.pendingInit.groupId = effectiveGroupId || null;
        this.pendingInit.userId  = userId || null;
        this.tryResolveSelection(true);
      } finally {
        this.isApplyingInitial = false;
      }
    },

    /* ------- Resolve quando dados estão prontos ------- */
    tryResolveSelection: function(allowEmit) {
      var gId = this.pendingInit.groupId;
      var uId = this.pendingInit.userId;

      var hasData = Array.isArray(this.datasource) && this.datasource.length > 0;
      if (!hasData && (gId || uId)) return false;

      var newSelectedGroup = null;
      var newSelectedUser  = null;

      if (gId) {
        var group = this.findGroupById(gId);
        if (!group) return false; // ainda não dá pra aplicar
        newSelectedGroup = group;

        if (uId) {
          var inGroup = this.findUserById(uId, group && group.groupUsers ? group.groupUsers : []);
          var user    = inGroup || this.findUserById(uId);
          newSelectedUser = user || null;
        } else {
          newSelectedUser = null; // só grupo
        }
      } else if (uId) {
        newSelectedGroup = null;
        newSelectedUser  = this.findUserById(uId) || null;
        if (uId && !newSelectedUser) return false; // ainda não dá pra aplicar
      } else {
        newSelectedGroup = null;
        newSelectedUser  = null;
      }

      this.selectedGroup = newSelectedGroup;
      this.selectedUser  = newSelectedUser;

      var sig = (this.selectedGroup ? String(this.selectedGroup.id) : 'null')
              + '|'
              + (this.selectedUser ? String(this.selectedUser.id) : 'null');

      if (sig !== this.lastAppliedSig) {
        this.lastAppliedSig = sig;
        if (allowEmit) {
          this.emitSelection();
          this.updateComponentVariable();
        }
      }
      return true;
    },

    setSelectedFromValue: function(value) {
      if (!value) {
        this.selectedUser = null;
        this.selectedGroup = null;
        return;
      }
      if (typeof value === 'object') {
        var hasGroupId = (typeof value.groupid !== 'undefined' && value.groupid !== null && value.groupid !== '');
        var group = hasGroupId ? this.findGroupById(value.groupid) : null;
        this.selectedGroup = group || null;

        var hasUserId = (typeof value.userid !== 'undefined' && value.userid !== null && value.userid !== '');
        if (group && hasUserId) {
          var user = this.findUserById(value.userid, group.groupUsers || []);
          this.selectedUser = user || null;
        } else if (!group && hasUserId) {
          this.selectedUser = this.findUserById(value.userid) || null;
        } else {
          this.selectedUser = null;
        }
      } else {
        this.selectedUser = this.findUserById(value) || null;
        this.selectedGroup = null;
      }
    },

    emitSelection: function(explicitValue) {
      var value = explicitValue || {
        userid: this.selectedUser ? this.selectedUser.id : null,
        groupid: this.selectedGroup ? this.selectedGroup.id : null
      };
      this.$emit('user-selected', value);
      this.$emit('trigger-event', { name: 'onChange', event: { value: value } });
    },

    updateComponentVariable: function() {
      if (!(this.selectedUserIdVar && this.selectedUserIdVar.setValue)) return;
      var payload = {
        userid: this.selectedUser ? this.selectedUser.id : null,
        groupid: this.selectedGroup ? this.selectedGroup.id : null
      };
      var same =
        this.lastVarPayload &&
        this.lastVarPayload.userid === payload.userid &&
        this.lastVarPayload.groupid === payload.groupid;

      if (!same) {
        try { this.selectedUserIdVar.setValue(payload); } catch (e) {}
        this.lastVarPayload = payload;
      }
    }
  }
};
</script>

<style scoped>
.user-selector-dropdown{position:relative;width:auto;display:inline-block;font-family:inherit}
.user-selector__selected{display:flex;align-items:center;cursor:pointer;border-radius:24px;padding:6px 16px 6px 8px;background:transparent;min-height:44px;transition:box-shadow .2s;gap:10px;border:none;width:auto;min-width:0}
.user-selector__selected:hover,.user-selector__selected:focus{box-shadow:none}
.avatar-outer{width:32px;height:32px;border-radius:50%;border:1px solid #3A4663;display:flex;align-items:center;justify-content:center;background:#fff}
.group-avatar-wrapper{position:relative}
.user-selector__selected--group-user{gap:0}
.user-selector__selected--group-user .selected-group-avatar{margin-right:-8px;position:relative;z-index:1}
.user-selector__selected--group-user .selected-user-avatar{position:relative;z-index:2}
.user-selector__group-tooltip{position:absolute;top:35px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:6px 10px;border-radius:4px;font-size:16px;white-space:nowrap;z-index:101;text-align:center}
.user-selector__group-tooltip-count{font-size:12px;color:#ddd}
.avatar-middle{width:30px;height:30px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;background:#fff}
.user-selector__avatar{width:26px;height:26px;border-radius:50%;background:#4B6CB7;display:flex;align-items:center;justify-content:center;overflow:hidden}
.user-selector__avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.user-selector__initial{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:400;background:transparent;color:#fff;border-radius:50%;letter-spacing:.5px}
.user-selector__group-icon{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff}
.user-selector__name{font-size:15px;font-weight:500;color:#444;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:1;min-width:0;max-width:100%;padding-left:3px}
.user-selector__dropdown{position:absolute;top:110%;left:0;width:220px;background:#fff;border-radius:8px;box-shadow:0 4px 16px #0002;z-index:10;padding:8px 0 4px 0;border:none;display:flex;flex-direction:column}
.user-selector__list{max-height:400px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#bdbdbd transparent}
.user-selector__list::-webkit-scrollbar{width:6px;background:transparent;border-radius:12px}
.user-selector__list::-webkit-scrollbar-thumb{background:#bdbdbd;border-radius:12px}
.user-selector__search{display:flex;align-items:center;margin-bottom:8px;position:relative;padding:0 12px;width:100%;box-sizing:border-box}
.user-selector__clear{text-align:right;padding:0 16px 8px;font-size:14px;color:#888;cursor:pointer;user-select:none}
.user-selector__clear:hover{color:#555}
.user-selector__input{flex:1;width:100%;padding:8px 36px 8px 12px;border-radius:20px;font-size:15px;border:1px solid #E0E0E0!important;background:#fff;outline:none!important;box-shadow:none!important;transition:border .2s;box-sizing:border-box}
.user-selector__input:focus{border:1.5px solid #E0E0E0!important;outline:none!important;box-shadow:none!important}
.user-selector__icon{position:absolute;right:22px;top:50%;transform:translateY(-50%);font-size:22px;color:#888;pointer-events:none;display:flex;align-items:center;justify-content:center}
.user-selector__item{display:flex;align-items:center;cursor:pointer;padding:8px 12px;border-radius:6px;transition:background .2s;gap:10px;border:none}
.user-selector__item.disabled{pointer-events:none;opacity:.5}
.user-selector__item:hover{background:#f5f5f5}
.user-selector__chevron{margin-left:auto;font-size:20px;color:#888;cursor:pointer}
.user-selector__group-header{display:flex;align-items:center;gap:4px;padding:0 12px 4px}
.user-selector__back{cursor:pointer;font-size:20px;color:#444}
.user-selector__group-title{flex:1}
.user-selector__group-count{font-size:12px;padding:0 12px 8px;color:#888}
.user-selector__group-label{padding:4px 12px;font-weight:600;color:#444}
.user-selector__group-items{max-height:130px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#bdbdbd transparent}
.user-selector__no-results{color:#aaa;text-align:center;padding:8px 0;font-size:14px}
.user-selector__avatar-unassigned{width:32px;height:32px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;border:1px dashed #3A4663}
</style>
