
import { createApp, h } from 'vue';
import CustomDatePicker from './CustomDatePicker.vue';

export default class DateFilterInput {
  init(params) {
    this.params = params;
    this.showTime = !!(params.filterParams && params.filterParams.showTime);

    this.eGui = document.createElement('div');

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
    const d = date instanceof Date ? date : new Date(date);
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
    const v = this.vm?.value;
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  setDate(date) {
    this.vm.value = this.toValue(date);
  }

  setDisabled(disabled) {
    if (this.vm) {
      this.vm.disabled = disabled;
    }
  }
}

