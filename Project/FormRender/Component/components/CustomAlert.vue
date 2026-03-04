<template>
  <div v-if="visible && message && message !== t('Required field')" class="custom-alert">
    <div class="custom-alert-content">
      <div class="custom-alert-header">
        <span class="custom-alert-title">{{ t('Alert') }}</span>
        <span class="custom-alert-close" @click="close">&times;</span>
      </div>
      <div class="custom-alert-body">
        <slot>{{ message }}</slot>
      </div>
    </div>
  </div>
</template>

<script>
import { translateTerm } from '../translations';

export default {
  name: 'CustomAlert',
  props: {
    message: String,
    visible: Boolean
  },
  emits: ['close'],
  methods: {
    t(term) {
      return translateTerm(term);
    },
    close() {
      this.$emit('close');
    }
  }
}
</script>

<style scoped>
.custom-alert {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  background: rgba(0,0,0,0.08); /* leve overlay */
}
.custom-alert-content {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  border: 1px solid #e5e8eb;
  min-width: 300px;
  max-width: 400px;
  width: 100%;
  padding: 20px 24px 24px 24px;
}
.custom-alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.custom-alert-title {
  font-weight: 600;
  color: #3a4047;
  font-size: 18px;
}
.custom-alert-close {
  font-size: 20px;
  color: #888;
  cursor: pointer;
  font-weight: bold;
}
.custom-alert-body {
  color: #3a4047;
  font-size: 15px;
  min-height: 30px;
}
</style> 
