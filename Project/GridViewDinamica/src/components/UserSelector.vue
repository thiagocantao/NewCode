<template>
  <div ref="dropdownRoot" class="user-selector-dropdown">
    <div
      class="user-selector__selected"
      @click="toggleDropdown"
      :style="containerStyle"
      :class="{ 'user-selector__selected--group-user': selectedGroup && selectedUser }"
    >

      <template v-if="!selectedGroup && !selectedUser">
        <div class="user-selector__avatar-unassigned">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="12" fill="#F3F4F6"/>
            <path d="M12 12c1.933 0 3.5-1.567 3.5-3.5S13.933 5 12 5s-3.5 1.567-3.5 3.5S10.067 12 12 12zm0 2c-2.33 0-7 1.167-7 3.5V20h14v-2.5c0-2.333-4.67-3.5-7-3.5z" fill="#BDBDBD"/>
          </svg>
        </div>
      </template>
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
            <div class="user-selector__group-tooltip-count">{{ selectedGroup.groupUsers?.length || 0 }} {{ (selectedGroup.groupUsers?.length || 0) === 1 ? 'member' : 'members' }}</div>
          </div>
        </div>
        <div class="avatar-outer selected-user-avatar">

          <div class="avatar-middle">
            <div class="user-selector__avatar">
              <template v-if="selectedUser.photoUrl || selectedUser.PhotoURL || selectedUser.PhotoUrl">
                <img :src="selectedUser.photoUrl || selectedUser.PhotoURL || selectedUser.PhotoUrl" alt="User Photo" />
              </template>
              <template v-else>
                <span class="user-selector__initial" :style="initialStyle">
                  {{ getInitial(selectedUser.name) }}
                </span>
              </template>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="avatar-outer group-avatar-wrapper" v-if="selectedGroup" @mouseenter="showGroupTooltip = true" @mouseleave="showGroupTooltip = false">
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
            <div class="user-selector__group-tooltip-count">{{ selectedGroup.groupUsers?.length || 0 }} {{ (selectedGroup.groupUsers?.length || 0) === 1 ? 'member' : 'members' }}</div>
          </div>
        </div>
        <div class="avatar-outer" v-else>
          <div class="avatar-middle">
            <div class="user-selector__avatar">
              <template v-if="selectedUser && (selectedUser.photoUrl || selectedUser.PhotoURL || selectedUser.PhotoUrl)">
                <img :src="selectedUser.photoUrl || selectedUser.PhotoURL || selectedUser.PhotoUrl" alt="User Photo" />
              </template>
              <template v-else>
                <span class="user-selector__initial" :style="initialStyle">
                  {{ selectedUser ? getInitial(selectedUser.name) : '' }}
                </span>
              </template>
            </div>
          </div>
        </div>
      </template>
      <span class="user-selector__name" :style="nameStyle">
        {{ selectedLabel }}
      </span>
    </div>

    <div v-if="isOpen" class="user-selector__dropdown">
      <template v-if="currentGroup">
        <div class="user-selector__group-header">
          <span
            class="material-symbols-outlined user-selector__back"

            @click.stop="backToRoot"

            >chevron_left</span
          >
          <span class="user-selector__group-title" :style="nameStyle">
            {{ currentGroup.name }}
          </span>
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
      </template>

      <div class="user-selector__list">
        <template v-if="groupBy && !currentGroup">
          <div
            class="user-selector__group"
            v-for="group in groupedUsers.groups"
            :key="group.label"
          >
            <div class="user-selector__group-label" :style="nameStyle">
              {{ group.label.toUpperCase() != "USERS" &&  group.label.toUpperCase() != "USER" && group.label.toUpperCase() != "USUARIOS" ? group.label : ""}}
            </div>

            <div class="user-selector__group-items">
              <div
                v-for="user in group.items"
                :key="user.id"
                class="user-selector__item"
                :class="{ disabled: user.isEnabled === false }"
                @click.stop="
                  user.isEnabled === false
                    ? null
                    : isGroupLabel(group.label)
                      ? openGroup(user)
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
                        <span
                          v-if="isGroupLabel(group.label)"
                          class="material-symbols-outlined user-selector__group-icon"
                        >
                          groups
                        </span>
                        <span
                          v-else
                          class="user-selector__initial"
                          :style="initialStyle"
                        >
                          {{ getInitial(user.name) }}
                        </span>
                      </template>
                    </div>
                  </div>
                </div>
                <span class="user-selector__name" :style="nameStyle">{{ user.name }}</span>
                <span
                  v-if="user.groupUsers?.length"
                  class="material-symbols-outlined user-selector__chevron"
                  @click.stop="openGroup(user)"
                  >chevron_right</span
                >
              </div>
            </div>
          </div>

          <div
            v-for="user in groupedUsers.ungrouped"
            :key="user.id"
            class="user-selector__item"
            :class="{ disabled: user.isEnabled === false }"
            @click.stop="user.isEnabled === false ? null : selectUser(user)"
          >
            <div class="avatar-outer">
              <div class="avatar-middle">
                <div class="user-selector__avatar">
                  <template v-if="user.photoUrl || user.PhotoURL || user.PhotoUrl">
                    <img :src="user.photoUrl || user.PhotoURL || user.PhotoUrl" alt="User Photo" />
                  </template>
                  <template v-else>
                    <span class="user-selector__initial" :style="initialStyle">
                      {{ getInitial(user.name) }}
                    </span>
                  </template>
                </div>
              </div>
            </div>
            <span class="user-selector__name" :style="nameStyle">{{ user.name }}</span>
            <span
              v-if="user.groupUsers?.length"
              class="material-symbols-outlined user-selector__chevron"
              @click.stop="openGroup(user)"
              >chevron_right</span
            >
          </div>
        </template>

        <template v-else>
          <div class="user-selector__current-group-items">
            <div
              v-for="user in filteredUsers"
              :key="user.id !== null ? user.id : 'assign'"
              class="user-selector__item"
              :class="{ disabled: user.isEnabled === false }"
              @click.stop="user.isEnabled === false || user.groupUsers?.length ? null : selectUser(user)"
            >
              <div class="avatar-outer">
                <div class="avatar-middle">
                  <div class="user-selector__avatar">
                    <template v-if="user.photoUrl || user.PhotoURL || user.PhotoUrl">
                      <img :src="user.photoUrl || user.PhotoURL || user.PhotoUrl" alt="User Photo" />
                    </template>
                    <template v-else>
                      <span v-if="user.isAssignToTeam" class="material-symbols-outlined user-selector__group-icon">groups</span>
                      <span v-else class="user-selector__initial" :style="initialStyle">
                        {{ getInitial(user.name) }}
                      </span>
                    </template>
                  </div>
                </div>
              </div>
              <span class="user-selector__name" :style="nameStyle">{{ user.name }}</span>
              <span
                v-if="user.groupUsers?.length"
                class="material-symbols-outlined user-selector__chevron"
                @click.stop="openGroup(user)"
                >chevron_right</span
              >
            </div>
          </div>
        </template>

        <div v-if="filteredUsers.length === 0" class="user-selector__no-results" :style="nameStyle">
          No user found
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UserSelector',
  emits: ['trigger-event', 'user-selected'],
  props: {
    datasource: { type: Array, default: () => [] },
    groupBy: String,
    nameFontFamily: String,
    nameFontSize: String,
    nameFontWeight: [String, Number],
    initialFontFamily: String,
    initialFontSize: String,
    initialFontWeight: [String, Number],
    inputFontFamily: String,
    inputFontSize: String,
    inputFontWeight: [String, Number],
    unassignedLabel: { type: String, default: 'Unassigned' },
    searchPlaceholder: { type: String, default: 'Search user...' },
    initialSelectedId: [String, Number, Object],
    initialGroupId: [String, Number],
    selectedUserId: [String, Number, Object],
    uid: String,
    maxWidth: [String, Number],
    supabaseUrl: String,
    apiKey: String,
    authToken: String
  },
  data() {
    return {
      search: '',
      isOpen: false,
      selectedUser: null,
      selectedGroup: null,
      currentGroup: null,
      currentGroupUsers: [],
      groupStack: [],
      showGroupTooltip: false

    };
  },
  computed: {
    filteredUsers() {
      const source = this.currentGroup ? this.currentGroupUsers || [] : this.datasource;
      const list = Array.isArray(source) ? source : [];
      if (!this.search) return list;
      const q = this.search.toLowerCase();
      if (this.currentGroup) {
        const assignItem = list[0];
        const rest = list.slice(1).filter(u => String(u.name || '').toLowerCase().includes(q));
        return [assignItem, ...rest];
      }
      return list.filter(u => String(u.name || '').toLowerCase().includes(q));
    },
    groupedUsers() {
      if (!this.groupBy) {
        return { groups: [], ungrouped: this.filteredUsers };
      }
      const groups = new Map();
      const ungrouped = [];
      for (const user of this.filteredUsers) {
        const key =
          (typeof wwLib !== 'undefined' && wwLib.resolveObjectPropertyPath)
            ? wwLib.resolveObjectPropertyPath(user, this.groupBy)
            : user?.[this.groupBy];
        if (key === undefined || key === null || key === '') {
          ungrouped.push(user);
        } else {
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(user);
        }
      }
      return { groups: Array.from(groups, ([label, items]) => ({ label, items })), ungrouped };
    },
    nameStyle() {
      const fallbackFont = "var(--grid-view-dinamica-font-family, inherit)";
      return {
        fontFamily: this.nameFontFamily || fallbackFont,
        fontSize: this.nameFontSize,
        fontWeight: this.nameFontWeight,
      };
    },
    initialStyle() {
      const fallbackFont = "var(--grid-view-dinamica-font-family, inherit)";
      return {
        fontFamily: this.initialFontFamily || fallbackFont,
        fontSize: this.initialFontSize,
        fontWeight: this.initialFontWeight,
      };
    },
    inputStyle() {
      const fallbackFont = "var(--grid-view-dinamica-font-family, inherit)";
      return {
        fontFamily: this.inputFontFamily || fallbackFont,
        fontSize: this.inputFontSize,
        fontWeight: this.inputFontWeight,
      };
    },
    containerStyle() {
      return this.maxWidth ? { maxWidth: typeof this.maxWidth === 'number' ? `${this.maxWidth}px` : this.maxWidth } : {};
    },
    currentGroupCountLabel() {
      const count = this.currentGroup?.groupUsers?.length || 0;
      return `${count} ${count === 1 ? 'member' : 'members'}`;
    },
    selectedLabel() {
      if (this.selectedGroup && this.selectedUser) return this.selectedUser.name;
      if (this.selectedGroup && !this.selectedUser) return this.selectedGroup.name;
      return this.selectedUser ? this.selectedUser.name : this.unassignedLabel;
    },
  },
  created() {
    if (
      this.uid &&
      typeof wwLib !== 'undefined' &&
      wwLib.wwVariable &&
      wwLib.wwVariable.useComponentVariable
    ) {
      this.selectedUserIdVar = wwLib.wwVariable.useComponentVariable({
        uid: this.uid,
        name: 'selectedUserId',
        type: 'text',
        defaultValue: ''
      });
    } else {
      this.selectedUserIdVar = null;

    }
  },
  mounted() {
    document.addEventListener('click', this.handleClickOutside);
    this.initializeSelectedUser();
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  },
  watch: {
    selectedUserId: {
      immediate: true,
      deep: true,
      handler(newVal) {
        this.setSelectedFromValue(newVal);
      }
    },
    initialSelectedId: {
      immediate: true,
      handler() {
        this.initializeSelectedUser(true);
      }
    },
    initialGroupId: {
      immediate: true,
      handler() {
        this.initializeSelectedUser(true);
      }

    },
    datasource: {
      handler() {
        this.initializeSelectedUser();
      },
      deep: true
    },
    selectedUser() {
      this.updateComponentVariable();
    },
    selectedGroup() {
      this.updateComponentVariable();
    }
  },
  methods: {
    toggleDropdown() {
      this.isOpen = !this.isOpen;
      if (!this.isOpen) {
        this.currentGroup = null;
        this.currentGroupUsers = [];
        this.groupStack = [];
        this.search = '';
      }
    },
    closeDropdown(event) {
      if (this.isOpen && !(this.$refs.dropdownRoot?.contains?.(event.target))) {
        this.isOpen = false;
        this.currentGroup = null;
        this.currentGroupUsers = [];
        this.groupStack = [];
        this.search = '';
      }
    },
    async selectUser(user) {
      let value;
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
      this.currentGroup = null;
      this.currentGroupUsers = [];
      this.groupStack = [];
      this.$emit('user-selected', value);
      this.$emit('trigger-event', {
        name: 'onChange',
        event: { value }
      });
    },
    openGroup(group) {
      if (group.groupUsers && group.groupUsers.length) {
        this.groupStack.push(this.currentGroup);
        this.currentGroup = group;
        this.currentGroupUsers = [{ id: null, name: 'Assign to team', isAssignToTeam: true }, ...group.groupUsers];
        this.search = '';
      }
    },
    backToRoot() {
      this.currentGroup = this.groupStack.pop() || null;
      this.currentGroupUsers = this.currentGroup ? [{ id: null, name: 'Assign to team', isAssignToTeam: true }, ...(this.currentGroup.groupUsers || [])] : [];
      this.search = '';
      this.isOpen = true;

    },
    handleClickOutside(event) {
      this.closeDropdown(event);
    },
    getInitial(name) {
      return name ? String(name).trim().charAt(0).toUpperCase() : '';
    },
    isGroupLabel(label) {
      const value = String(label || '').toUpperCase();
      return ['GROUP', 'GROUPS', 'GRUPO', 'GRUPOS'].includes(value);
    },
    findGroupById(id, list = this.datasource) {
      for (const item of list || []) {
        if (String(item.id) === String(id)) {
          return item;
        }
        if (Array.isArray(item.groupUsers) && item.groupUsers.length) {

          const found = this.findGroupById(id, item.groupUsers);
          if (found) return found;
        }
      }
      return null;
    },
    findUserById(id, list = this.datasource) {
      for (const item of list || []) {
        const hasGroup = Array.isArray(item.groupUsers) && item.groupUsers.length > 0;
        if (String(item.id) === String(id) && !hasGroup) {
          return item;
        }
        if (hasGroup) {

          const found = this.findUserById(id, item.groupUsers);
          if (found) return found;
        }
      }
      return null;
    },
    initializeSelectedUser(force = false) {
      let target = this.selectedUserId;
      const hasSelected =
        !force &&
        target !== undefined &&
        target !== null &&
        target !== '' &&
        !(typeof target === 'object' && Object.keys(target).length === 0);

      if (!hasSelected) {
        const groupId =
          this.initialGroupId !== undefined && this.initialGroupId !== null && this.initialGroupId !== ''
            ? this.initialGroupId
            : null;
        const userId =
          this.initialSelectedId !== undefined && this.initialSelectedId !== null && this.initialSelectedId !== ''
            ? this.initialSelectedId
            : null;

        target = groupId !== null ? { userid: userId, groupid: groupId } : userId;

      }
      this.setSelectedFromValue(target);
      this.updateComponentVariable();
      if (this.selectedGroup || this.selectedUser) {
        const value = {
          userid: this.selectedUser ? this.selectedUser.id : null,
          groupid: this.selectedGroup ? this.selectedGroup.id : null
        };
        this.$emit('user-selected', value);
        this.$emit('trigger-event', { name: 'onChange', event: { value } });
      }
    },
    setSelectedFromValue(value) {
      if (!value) {
        this.selectedUser = null;
        this.selectedGroup = null;
        return;
      }
      if (typeof value === 'object') {
        const hasGroupId = value.groupid !== undefined && value.groupid !== null && value.groupid !== '';

        const group = hasGroupId ? this.findGroupById(value.groupid) : null;

        this.selectedGroup = group || null;

        const hasUserId = value.userid !== undefined && value.userid !== null && value.userid !== '';
        if (group && hasUserId) {
          const user = this.findUserById(value.userid, group.groupUsers || []);

          this.selectedUser = user || null;
        } else if (group && !hasUserId) {
          this.selectedUser = null;
        } else if (hasUserId) {
          const user = this.findUserById(value.userid);

          this.selectedUser = user || null;
          this.selectedGroup = null;
        } else {
          this.selectedUser = null;
          this.selectedGroup = null;
        }
      } else {
        const user = this.findUserById(value);

        this.selectedUser = user || null;
        this.selectedGroup = null;
      }
    },
    updateComponentVariable() {
    if (!this.selectedUserIdVar) return;

    const val = {
      userid: this.selectedUser ? this.selectedUser.id : null,
      groupid: this.selectedGroup ? this.selectedGroup.id : null
    };
    this.selectedUserIdVar.setValue(JSON.stringify(val));
  },
  }
};
</script>

<style scoped>
.user-selector-dropdown {
  position: relative;
  width: auto;
  display: inline-block;
  font-family: inherit;
}
.user-selector__selected {
  display: flex;
  align-items: center;
  cursor: pointer;
  border-radius: 24px;
  padding: 6px 16px 6px 8px;
  background: transparent;
  min-height: 44px;
  transition: box-shadow 0.2s;
  gap: 10px;
  border: none;
  width: auto;
  min-width: 0;
}
.user-selector__selected:hover, .user-selector__selected:focus {
  box-shadow: none;
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
.group-avatar-wrapper {
  position: relative;
}
.user-selector__selected--group-user {
  gap: 0;
}
.user-selector__selected--group-user .selected-group-avatar {
  margin-right: -8px;
  position: relative;
  z-index: 1;
}
.user-selector__selected--group-user .selected-user-avatar {
  position: relative;
  z-index: 2;
}

.user-selector__group-tooltip {
  position: absolute;
  top: 35px;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: #fff;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 16px;
  white-space: nowrap;
  z-index: 101;
  text-align: center;
}
.user-selector__group-tooltip-count {
  font-size: 12px;
  color: #ddd;
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
.user-selector__initial {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 400;
  background: transparent;
  color: #fff;
  border-radius: 50%;
  letter-spacing: 0.5px;
}
.user-selector__group-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #fff;
}
.user-selector__name {
  font-size: 15px;
  font-weight: 500;
  color: #444;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 0;
  max-width: 100%;
  padding-left: 3px;
}
.user-selector__placeholder {
  color: #aaa;
  font-size: 15px;
}
.user-selector__arrow {
  margin-left: auto;
  font-size: 16px;
  color: #888;
}
.user-selector__dropdown {
  position: absolute;
  top: 110%;
  left: 0;
  width: 220px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px #0002;
  z-index: 10;
  padding: 8px 0 4px 0;
  border: none;
  display: flex;
  flex-direction: column;
}
.user-selector__list {
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #bdbdbd transparent;
}
.user-selector__list::-webkit-scrollbar {
  width: 6px;
  background: transparent;
  border-radius: 12px;
}
.user-selector__list::-webkit-scrollbar-thumb {
  background: #bdbdbd;
  border-radius: 12px;
}
.user-selector__list::-webkit-scrollbar-corner {
  background: transparent;
}
.user-selector__list::-webkit-scrollbar-button {
  display: none;
  height: 0;
}
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
  font-size: 15px;
  border: 1px solid #E0E0E0 !important;
  background: #fff;
  outline: none !important;
  box-shadow: none !important;
  transition: border 0.2s;
  box-sizing: border-box;
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
  font-size: 22px;
  color: #888;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
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
.user-selector__item.disabled {
  pointer-events: none;
  opacity: 0.5;
}
.user-selector__item:hover {
  background: #f5f5f5;
}
.user-selector__chevron {
  margin-left: auto;
  font-size: 20px;
  color: #888;
  cursor: pointer;
}
.user-selector__group-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px 4px;
}
.user-selector__back {
  cursor: pointer;
  font-size: 20px;
  color: #444;
}
.user-selector__group-title {
  flex: 1;
}
.user-selector__group-count {
  font-size: 12px;
  padding: 0 12px 8px;
  color: #888;
}
.user-selector__group-label {
  padding: 4px 12px;
  font-weight: 600;
  color: #444;
}

.user-selector__group-items {
  max-height: 130px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #bdbdbd transparent;
}

.user-selector__current-group-items {
  max-height: 200px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #bdbdbd transparent;
}

.user-selector__group-items::-webkit-scrollbar {
  width: 6px;
  background: transparent;
  border-radius: 12px;
}

.user-selector__group-items::-webkit-scrollbar-thumb {
  background: #bdbdbd;
  border-radius: 12px;
}

.user-selector__group-items::-webkit-scrollbar-corner {
  background: transparent;
}

.user-selector__group-items::-webkit-scrollbar-button {
  display: none;
  height: 0;
}

.user-selector__current-group-items::-webkit-scrollbar {
  width: 6px;
  background: transparent;
  border-radius: 12px;
}

.user-selector__current-group-items::-webkit-scrollbar-thumb {
  background: #bdbdbd;
  border-radius: 12px;
}

.user-selector__current-group-items::-webkit-scrollbar-corner {
  background: transparent;
}

.user-selector__current-group-items::-webkit-scrollbar-button {
  display: none;
  height: 0;
}
.user-selector__no-results {
  color: #aaa;
  text-align: center;
  padding: 8px 0;
  font-size: 14px;
}
.user-selector__avatar-unassigned {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #3A4663;
}
</style>
