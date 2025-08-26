<template>
  <div v-if="selectedLabel" class="user-cell" :class="{ 'user-cell--group-user': selectedGroup && selectedUser }" :style="pointerStyle">
    <template v-if="selectedGroup && selectedUser">
      <div class="avatar-outer group-avatar-wrapper selected-group-avatar">
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
    <template v-else-if="selectedGroup">
      <div class="avatar-outer group-avatar-wrapper">
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
      </div>
    </template>
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
      optionsCache: []
    };
  },
  async created() {
    if (!this.params.options || !this.params.options.length) {
      this.optionsCache = await this.fetchOptions();
    }
  },
  computed: {
    options() {
      return (this.params.options && this.params.options.length) ? this.params.options : this.optionsCache;
    },
    selectedGroup() {
      const val = this.params.value;
      if (val && typeof val === 'object' && val.groupid) {
        return this.findGroupById(val.groupid);
      }
      const name = this.params.data?.AssignedGroupName;
      if (name) {
        const photo = this.params.data?.AssignedGroupPhoto || this.params.data?.GroupPhotoURL || this.params.data?.GroupPhotoUrl;
        return { name, photo };
      }
      return null;
    },
    selectedUser() {
      const val = this.params.value;
      if (val && typeof val === 'object') {
        if (val.userid && val.groupid) {
          const grp = this.findGroupById(val.groupid);
          if (grp) return (grp.groupUsers || []).find(u => String(u.id) === String(val.userid)) || null;
        } else if (val.userid) {
          return this.findUserById(val.userid);
        }
      } else if (val) {
        return this.findUserById(val);
      }
      const name = this.params.data?.ResponsibleUser || this.params.data?.Username || this.params.data?.UserName;
      if (name) {
        const photo = this.params.data?.PhotoURL || this.params.data?.PhotoUrl || this.params.data?.UserPhoto;
        return { name, photo };
      }
      return null;
    },
    selectedLabel() {
      if (this.selectedGroup && this.selectedUser) return this.selectedUser.name;
      if (this.selectedGroup) return this.selectedGroup.name;
      return this.selectedUser ? this.selectedUser.name : '';
    },
    userPhoto() {
      return this.selectedUser?.PhotoURL || this.selectedUser?.PhotoUrl || this.selectedUser?.photo || '';
    },
    groupPhoto() {
      return this.selectedGroup?.PhotoURL || this.selectedGroup?.PhotoUrl || this.selectedGroup?.photo || '';
    },

    userInitial() {
      return this.selectedUser ? this.getInitial(this.selectedUser.name) : '';
    },
    isEditable() {
      const editable = this.params.colDef?.editable;
      if (typeof editable === 'function') {
        try {
          return !!editable(this.params);
        } catch (e) {
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
      } catch (e) {
        return [];
      }
    },
    findGroupById(id, list = this.options) {
      for (const item of list || []) {
        if (String(item.id) === String(id) && Array.isArray(item.groupUsers)) {
          return item;
        }
        if (Array.isArray(item.groupUsers) && item.groupUsers.length) {
          const found = this.findGroupById(id, item.groupUsers);
          if (found) return found;
        }
      }
      return null;
    },
    findUserById(id, list = this.options) {
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
    getInitial(name) {
      return name ? String(name).trim().charAt(0).toUpperCase() : '';
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
  margin-right: -8px;
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
  font-size: 15px;
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
  font-size: 12px;
  font-weight: 400;
  color: #444;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
