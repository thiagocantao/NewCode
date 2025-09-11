<template>
  <DateTimeCellEditor
    :model-value="value"
    :params="params"
    :showTime="showTime"
    :autoOpen="false"
    :disabled="disabled"
    @update:modelValue="onModelChange"
  />
</template>

<script>
import { ref, watch, defineComponent } from 'vue';
import DateTimeCellEditor from './DateTimeCellEditor.vue';

export default defineComponent({
  name: 'DateTimeFilter',
  components: { DateTimeCellEditor },
  props: {
    params: { type: Object, default: () => ({}) }
  },
  setup(props, { expose }) {
    const value = ref('');
    const disabled = ref(false);
    const showTime = !!(props.params && props.params.filterParams && props.params.filterParams.showTime);

    function toValue(date) {
      if (!date) return '';
      const d = date instanceof Date
        ? date
        : new Date(String(date).includes('T') ? date : `${date}T00:00`);
      if (isNaN(d.getTime())) return '';
      const pad = n => n.toString().padStart(2, '0');
      if (showTime) {
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    function onModelChange(v) {
      value.value = v;
      const cb = props.params && props.params.onDateChanged;
      if (typeof cb === 'function') {
        cb();
      }
    }

    const getDate = () => {
      if (!value.value) return null;
      const v = value.value.includes('T') ? value.value : `${value.value}T00:00`;
      const parsed = new Date(v);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    const setDate = date => {
      value.value = toValue(date);
    };

    const setDisabled = d => {
      disabled.value = !!d;
    };

    watch(() => props.params && props.params.value, v => {
      setDate(v);
    }, { immediate: true });

    expose({ getDate, setDate, setDisabled });

    return { value, disabled, showTime, onModelChange };
  }
});
</script>
