
import { createApp, h } from 'vue';
import CustomDatePicker from './CustomDatePicker.vue';

export default class DateFilterInput {
  init(params) {
    this.params = params;
    this.showTime = !!(params.filterParams && params.filterParams.showTime);

    this.eGui = document.createElement('div');
    this.eGui.style.width = '100%';
    // allow the filter option dropdown to retain its width
    this.eGui.style.minWidth = '0';

    const self = this;
    this.app = createApp({
      data() {
        return {
          value: self.toValue(params.value),
          disabled: false,
        };
      },
      render() {
        return h(CustomDatePicker, {
          modelValue: this.value,
          'onUpdate:modelValue': v => {
            this.value = v;
            params.onDateChanged();
          },
          showTime: self.showTime,
          disabled: this.disabled,
        });
      },
    });

    this.vm = this.app.mount(this.eGui);
  }

  toValue(date) {
    if (!date) return '';
    const d = date instanceof Date
      ? date
      : new Date(String(date).includes('T') ? date : `${date}T00:00`);
    if (isNaN(d.getTime())) return '';
    const pad = n => n.toString().padStart(2, '0');
    if (this.showTime) {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  getGui() {
    return this.eGui;
  }

  destroy() {
    if (this.app) {
      this.app.unmount();
    }
  }

  getDate() {
    const v = this.vm ? this.vm.value : null;
    if (!v) return null;
    const parsed = v.includes('T') ? new Date(v) : new Date(`${v}T00:00`);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  setDate(date) {
    if (this.vm) {
      this.vm.value = this.toValue(date);
    }
  }

  setDisabled(disabled) {
    if (this.vm) {
      this.vm.disabled = disabled;
    }
  }
}

