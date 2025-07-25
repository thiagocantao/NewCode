<template>
  <div v-if="name" class="user-cell">
    <div class="avatar-outer">
      <div class="avatar-middle">
        <div class="user-cell__avatar">
          <template v-if="photo">
            <img :src="photo" alt="User Photo" />
          </template>
          <template v-else>
            <span class="user-cell__initial">{{ initial }}</span>
          </template>
        </div>
      </div>
    </div>
    <span class="user-cell__name">{{ name }}</span>
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
  computed: {
    name() {
      const direct =
        this.params?.data?.ResponsibleUser ||
        this.params?.data?.Username ||
        this.params?.data?.UserName ||
        '';
      if (direct) return direct;
      const value = this.params?.value;
      const opts = this.params?.options || [];
      if (Array.isArray(opts)) {
        const match = opts.find(o => String(o.value) === String(value));
        if (match && match.label) return match.label;
      }
      return '';
    },
    photo() {
      const direct =
        this.params?.data?.PhotoUrl ||
        this.params?.data?.PhotoURL ||
        this.params?.data?.UserPhoto ||
        '';
      if (direct) return direct;
      const value = this.params?.value;
      const opts = this.params?.options || [];
      if (Array.isArray(opts)) {
        const match = opts.find(o => String(o.value) === String(value));
        if (match) return match.photo || match.image || match.img || '';
      }
      return '';
    },
    initial() {
      const n = this.name;
      return n ? n.trim().charAt(0).toUpperCase() : '';
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
.user-cell__name {
  font-size: 12px;
  font-weight: 400;
  color: #444;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
