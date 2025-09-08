import { createApp, h } from 'vue';
import CustomDatePicker from './CustomDatePicker.vue';

export default class DateTimeCellEditor {
  init(params) {
    this.params = params;
    const tag = (params.colDef?.TagControl || params.colDef?.tagControl || '').toUpperCase();
    this.showTime = tag === 'DEADLINE';

    this.eGui = document.createElement('div');
    this.eGui.style.height = '100%';
    this.eGui.style.display = 'flex';
    this.eGui.style.alignItems = 'center';

    const initialValue = this.normalizeValue(params.value);
    const self = this;

    this.app = createApp({
      data() {
        return { value: initialValue };
      },
      render() {
        return h(CustomDatePicker, {
          ref: 'picker',
          modelValue: this.value,
          'onUpdate:modelValue': v => (this.value = v),
          showTime: self.showTime,
        });
      },
    });

    this.vm = this.app.mount(this.eGui);
  }

  normalizeValue(value) {
    if (!value) return '';

    if (this.showTime) {
      try {
        let dateStr = value;
        if (typeof dateStr === 'string') {
          dateStr = dateStr.replace(' ', 'T');
          dateStr = dateStr.replace(/([+\-]\d{2}):?\d{0,2}$/, '');
        }
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const pad = n => String(n).padStart(2, '0');
          return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
        }
      } catch (e) {}
      return value;
    }

    if (typeof value === 'string') {
      if (value.includes('T')) return value.split('T')[0];
      if (value.includes(' ')) return value.split(' ')[0];
    }
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        const pad = n => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      }
    } catch (e) {}
    return value;
  }

  getGui() {
    return this.eGui;
  }

  afterGuiAttached() {
    const picker = this.vm?.$refs?.picker;
    if (picker && typeof picker.openDp === 'function') {
      setTimeout(() => picker.openDp(), 0);
    }
  }


  getValue() {
    return this.vm?.value || '';
  }

  destroy() {
    if (this.app) {
      this.app.unmount();
    }
  }

  isCancelBeforeStart() {
    return false;
  }

  isCancelAfterEnd() {
    return false;
  }

  isPopup() {
    return true;
  }
}

