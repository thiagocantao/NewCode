<template>
  <div ref="dropdownRoot" class="user-selector-dropdown">
    <div class="user-selector__selected" @click="toggleDropdown" :style="containerStyle">
      <div v-if="!selectedUser" class="user-selector__avatar-unassigned"> 
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="12" fill="#F3F4F6"/>
          <path d="M12 12c1.933 0 3.5-1.567 3.5-3.5S13.933 5 12 5s-3.5 1.567-3.5 3.5S10.067 12 12 12zm0 2c-2.33 0-7 1.167-7 3.5V20h14v-2.5c0-2.333-4.67-3.5-7-3.5z" fill="#BDBDBD"/>
        </svg>
      </div>
      <div v-else class="avatar-outer">
        <div class="avatar-middle">
          <div class="user-selector__avatar">
            <template v-if="selectedUser.PhotoURL">
              <img :src="selectedUser.PhotoURL" alt="User Photo" />
            </template>
            <template v-else>
              <span class="user-selector__initial" :style="initialStyle">
                {{ getInitial(selectedUser.Username) }}
              </span>
            </template>
          </div>
        </div>
      </div>
      <span class="user-selector__name" :style="nameStyle">
        {{ selectedUser ? selectedUser.Username : unassignedLabel }}
      </span>
    </div>
    <div v-if="isOpen" class="user-selector__dropdown">
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
      <div class="user-selector__list">
        <div
          v-for="user in filteredUsers"
          :key="user.userID"
          class="user-selector__item"
          @click.stop="selectUser(user)"
        >
          <div class="avatar-outer">
            <div class="avatar-middle">
              <div class="user-selector__avatar">
                <template v-if="user.PhotoURL">
                  <img :src="user.PhotoURL" alt="User Photo" />
                </template>
                <template v-else>
                  <span class="user-selector__initial" :style="initialStyle">
                    {{ getInitial(user.Username) }}
                  </span>
                </template>
              </div>
            </div>
          </div>
          <span class="user-selector__name" :style="nameStyle">{{ user.Username }}</span>
        </div>
        <div v-if="filteredUsers.length === 0" class="user-selector__no-results" :style="nameStyle">No user found</div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

export default {
  name: 'UserSelector',
  emits: ['trigger-event'],
  props: {
    datasource: Array,
    nameFontFamily: String,
    nameFontSize: String,
    nameFontWeight: [String, Number],
    initialFontFamily: String,
    initialFontSize: String,
    initialFontWeight: [String, Number],
    inputFontFamily: String,
    inputFontSize: String,
    inputFontWeight: [String, Number],
    unassignedLabel: {
      type: String,
      default: 'Unassigned',
    },
    searchPlaceholder: {
      type: String,
      default: 'Search user...',
    },
    initialSelectedId: [String, Number],
    selectedUserId: [String, Number],
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
    };
  },
  computed: {
    filteredUsers() {
      if (!this.search) return this.datasource;
      return this.datasource.filter(user => user.Username.toLowerCase().includes(this.search.toLowerCase()));
    },
    nameStyle() {
      return {
        fontFamily: this.nameFontFamily,
        fontSize: this.nameFontSize,
        fontWeight: this.nameFontWeight,
      };
    },
    initialStyle() {
      return {
        fontFamily: this.initialFontFamily,
        fontSize: this.initialFontSize,
        fontWeight: this.initialFontWeight,
      };
    },
    inputStyle() {
      return {
        fontFamily: this.inputFontFamily,
        fontSize: this.inputFontSize,
        fontWeight: this.inputFontWeight,
      };
    },
    containerStyle() {
      return this.maxWidth ? { maxWidth: typeof this.maxWidth === 'number' ? `${this.maxWidth}px` : this.maxWidth } : {};
    },
  },
  created() {
    if (typeof wwLib !== 'undefined' && wwLib.wwVariable && wwLib.wwVariable.useComponentVariable) {
      this.selectedUserIdVar = wwLib.wwVariable.useComponentVariable({
        uid: this.uid,
        name: 'selectedUserId',
        type: 'text',
        defaultValue: ''
      });
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
      handler(newId) {
        const user = this.datasource.find(u => String(u.userID) === String(newId));
        this.selectedUser = user || null;
      }
    },
    initialSelectedId(newId) {
      const user = this.datasource.find(u => String(u.userID) === String(newId));
      this.selectedUser = user || null;
    },
    datasource: {
      handler() {
        // Prioridade: selectedUserId > initialSelectedId
        const targetId = this.selectedUserId || this.initialSelectedId;
        const user = this.datasource.find(u => String(u.userID) === String(targetId));
        this.selectedUser = user || null;
      },
      deep: true
    },
    selectedUser(newUser) {
      if (this.selectedUserIdVar?.setValue) {
        this.selectedUserIdVar.setValue(newUser?.userID || '');
      }
    }
  },
  methods: {
    toggleDropdown() {
      this.isOpen = !this.isOpen;
    },
    closeDropdown(event) {
      if (this.isOpen && !this.$refs.dropdownRoot.contains(event.target)) {
        this.isOpen = false;
      }
    },
    async selectUser(user) {
      this.selectedUser = user;
      this.isOpen = false;
      this.$emit('user-selected', user.userID);
      this.$emit('trigger-event', {
        name: 'onChange',
        event: { value: user?.userID || '' }
      });
    },
    handleClickOutside(event) {
      this.closeDropdown(event);
    },
    getInitial(name) {
      return name ? name.trim().charAt(0).toUpperCase() : '';
    },
    initializeSelectedUser() {
      const targetId = this.selectedUserId || this.initialSelectedId;
      const user = this.datasource.find(u => String(u.userID) === String(targetId));
      this.selectedUser = user || null;
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
  /* max-width agora é controlado via style binding (containerStyle) */
  min-width: 0;
}
.user-selector__selected:hover, .user-selector__selected:focus {
  /* box-shadow: 0 2px 8px #0001; */
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
  max-height: 250px;
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
.user-selector__item:hover {
  background: #f5f5f5;
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
