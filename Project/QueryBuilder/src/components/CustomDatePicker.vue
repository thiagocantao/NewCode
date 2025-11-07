<template>
  <div class="dp-wrapper" ref="dpWrapper">
    <input
      ref="dpInput"
      :class="['dp-input', { error }]"
      type="text"
      :value="displayDate"
      readonly
      :disabled="disabled"
      @pointerdown.stop.prevent="!disabled && openDp()"
      @mousedown.stop.prevent="!disabled && openDp()"
      @click.stop.prevent="!disabled && openDp()"
      @focus="!disabled && openDp()"
      aria-haspopup="dialog"
      :aria-expanded="dpOpen ? 'true' : 'false'"
    />
    <button
      v-if="!disabled"
      type="button"
      class="dp-icon"
      @pointerdown.stop.prevent="openDp()"
      @mousedown.stop.prevent="openDp()"
      @click.stop.prevent="openDp()"
    >
      <span class="material-symbols-outlined">calendar_month</span>
    </button>
    <div v-if="dpOpen" class="datepicker-pop" :style="dpPopStyle" ref="dpPop">
      <div class="dp-header">
        <button type="button" class="dp-nav" @click="prevMonth">&lt;</button>
        <div class="dp-title">{{ monthLabel }}</div>
        <button type="button" class="dp-nav" @click="nextMonth">&gt;</button>
      </div>
      <div class="dp-weekdays">
        <div class="dp-weekday" v-for="d in weekdayAbbrs" :key="d">{{ d }}</div>
      </div>
      <div class="dp-grid">
        <button
          v-for="d in gridDays"
          :key="d.dateStr"
          type="button"
          class="dp-cell"
          :class="{ 'is-muted': !d.inMonth, 'is-selected': d.isSelected, 'is-today': d.isToday }"
          @click="selectDay(d)"
        >
          {{ d.label }}
        </button>
      </div>
      <div v-if="showTime" class="dp-time">
        <input type="time" v-model="timePart" @input="onTimeInput" />
      </div>
      <div class="dp-actions">
        <button type="button" class="dp-action" @click="pickToday">{{ labelToday }}</button>
        <button type="button" class="dp-action" @click="clearDate">{{ labelClear }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';

export default {
  name: 'CustomDatePicker',
  props: {
    modelValue: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    showTime: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
    openUpOffset: { type: Number, default: 0 }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const translateText = (t) => t;
    const ww = window.wwLib?.wwVariable;
    const lang = ww?.getValue('aa44dc4c-476b-45e9-a094-16687e063342') || navigator.language;
    const formatStyleRaw = ww?.getValue('21a41590-e7d8-46a5-af76-bb3542da1df3') || 'european';
    const formatStyle = String(formatStyleRaw).toLowerCase() === 'american' ? 'american' : 'european';

    const isPt = computed(() => String(lang || '').toLowerCase().startsWith('pt'));
    const PT_MONTHS = [
      'janeiro','fevereiro','março','abril','maio','junho',
      'julho','agosto','setembro','outubro','novembro','dezembro'
    ];
    const labelToday = computed(() => (isPt.value ? 'Hoje' : translateText('Today')));
    const labelClear = computed(() => (isPt.value ? 'Limpar' : translateText('Clear')));

    function toYMD(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    function parseYMD(ymd) {
      if (!ymd) return null;
      const [y,m,d] = ymd.split('-').map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    }
    function formatDateByStyle(yyyyMmDd, style = formatStyle) {
      if (!yyyyMmDd) return '';
      const [y,m,d] = yyyyMmDd.split('-').map(Number);
      const DD = String(d).padStart(2,'0');
      const MM = String(m).padStart(2,'0');
      const YYYY = String(y);
      return style === 'american' ? `${MM}/${DD}/${YYYY}` : `${DD}/${MM}/${YYYY}`;
    }
    function sameYMD(a,b){ return a && b && toYMD(a) === toYMD(b); }

    const dpWrapper = ref(null);
    const dpInput = ref(null);
    const dpOpen = ref(false);
    const dpPopStyle = ref({});
    const dpPop = ref(null);
    const POPUP_Z_INDEX = 2147483647;
    const selectedDate = ref('');
    const timePart = ref('00:00');

    const sanitizeDateOnly = (raw) => {
      if (!raw) return '';
      if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        return toYMD(raw);
      }
      const str = String(raw).trim();
      if (!str) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
      }
      if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
        return str.slice(0, 10);
      }
      const parsed = new Date(str);
      if (Number.isNaN(parsed.getTime())) {
        return '';
      }
      return toYMD(parsed);
    };

    const sanitizeTime = (raw) => {
      if (!raw) return '';
      if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(raw.getHours())}:${pad(raw.getMinutes())}`;
      }
      const match = String(raw).match(/([0-9]{1,2}):([0-9]{2})/);
      if (!match) {
        return '';
      }
      const clamp = (value, min, max) => {
        const num = Number.parseInt(value, 10);
        if (Number.isNaN(num)) {
          return min;
        }
        return Math.min(Math.max(num, min), max);
      };
      const hours = clamp(match[1], 0, 23);
      const minutes = clamp(match[2], 0, 59);
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(hours)}:${pad(minutes)}`;
    };

    const splitModelValue = (raw) => {
      if (raw === null || raw === undefined || raw === '') {
        return { date: '', time: '' };
      }
      if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        return {
          date: toYMD(raw),
          time: sanitizeTime(raw),
        };
      }
      const str = String(raw).trim();
      if (!str) {
        return { date: '', time: '' };
      }
      const [dateCandidate, timeCandidate] = str.split('T');
      const date = sanitizeDateOnly(dateCandidate || str);
      const time = sanitizeTime(timeCandidate || '');
      if (date) {
        return { date, time };
      }
      const parsed = new Date(str);
      if (Number.isNaN(parsed.getTime())) {
        return { date: '', time: '' };
      }
      return {
        date: toYMD(parsed),
        time: sanitizeTime(parsed),
      };
    };

    const ensureTime = (value) => (value && value.length ? value : '00:00');

    watch(
      () => props.modelValue,
      (v) => {
        const { date, time } = splitModelValue(v);
        selectedDate.value = date;
        if (props.showTime) {
          timePart.value = ensureTime(time);
        } else {
          timePart.value = '00:00';
        }
      },
      { immediate: true }
    );

    watch(
      () => props.showTime,
      (showTime) => {
        const { date, time } = splitModelValue(props.modelValue);
        if (!showTime) {
          selectedDate.value = date;
          timePart.value = '00:00';
          const dateOnly = date || '';
          if (props.modelValue && props.modelValue !== dateOnly) {
            emit('update:modelValue', dateOnly);
          }
          return;
        }
        selectedDate.value = date;
        const normalizedTime = ensureTime(time);
        timePart.value = normalizedTime;
        if (date && (!props.modelValue || !time)) {
          emit('update:modelValue', `${date}T${normalizedTime}`);
        }
      }
    );

    const dpMonth = ref(0);
    const dpYear = ref(0);
    const weekStart = computed(() => (formatStyle === 'american' ? 0 : 1));

    const weekdayAbbrs = computed(() => {
      if (isPt.value) {
        const base = ['dom','seg','ter','qua','qui','sex','sáb'];
        return weekStart.value === 1 ? base.slice(1).concat(base.slice(0,1)) : base;
      }
      try {
        const base = Array.from({ length: 7 }, (_, i) =>
          new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(
            new Date(Date.UTC(2021,7,1+i))
          )
        );
        return weekStart.value === 1 ? base.slice(1).concat(base.slice(0,1)) : base;
      } catch {
        const en = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        return weekStart.value === 1 ? en.slice(1).concat(en.slice(0,1)) : en;
      }
    });

    const monthLabel = computed(() => {
      if (isPt.value) return `${PT_MONTHS[dpMonth.value]} ${dpYear.value}`;
      try {
        return new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(new Date(dpYear.value, dpMonth.value, 1));
      } catch {
        const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        return `${EN_MONTHS[dpMonth.value]} ${dpYear.value}`;
      }
    });

    function makeCell(date, inMonth){
      const label = date.getDate();
      const today = new Date();
      const selected = parseYMD(selectedDate.value);
      return {
        label,
        dateStr: toYMD(date),
        inMonth,
        isToday: sameYMD(date,today),
        isSelected: selected && sameYMD(date, selected)
      };
    }

    const gridDays = computed(() => {
      const first = new Date(dpYear.value, dpMonth.value, 1);
      const startWeekday = first.getDay();
      const lead = (startWeekday - weekStart.value + 7) % 7;
      const daysInCur = new Date(dpYear.value, dpMonth.value + 1, 0).getDate();
      const prevYear = dpMonth.value === 0 ? dpYear.value - 1 : dpYear.value;
      const prevMonth = dpMonth.value === 0 ? 11 : dpMonth.value - 1;
      const daysInPrev = new Date(prevYear, prevMonth + 1, 0).getDate();
      const cells = [];
      for (let i = daysInPrev - lead + 1; i <= daysInPrev; i++) {
        cells.push(makeCell(new Date(prevYear, prevMonth, i), false));
      }
      for (let i = 1; i <= daysInCur; i++) {
        cells.push(makeCell(new Date(dpYear.value, dpMonth.value, i), true));
      }
      const tail = 42 - cells.length;
      const nextYear = dpMonth.value === 11 ? dpYear.value + 1 : dpYear.value;
      const nextMonth = dpMonth.value === 11 ? 0 : dpMonth.value + 1;
      for (let i = 1; i <= tail; i++) {
        cells.push(makeCell(new Date(nextYear, nextMonth, i), false));
      }
      return cells;
    });

    function emitValue(){
      if(!selectedDate.value){
        emit('update:modelValue', '');
        return;
      }
      const val = props.showTime
        ? `${selectedDate.value}T${ensureTime(sanitizeTime(timePart.value))}`
        : selectedDate.value;
      emit('update:modelValue', val);
    }

    function updatePopoverPosition() {
      const wrap = dpWrapper.value;
      const pop = dpPop.value;
      if (!wrap || !pop) return;

      const rect = wrap.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const desiredMinWidth = Math.max(rect.width, 230);
      const popRect = pop.getBoundingClientRect();
      const popHeight = popRect.height;
      let left = Math.round(rect.left);

      if (left + desiredMinWidth > viewportWidth) {
        left = Math.max(0, Math.round(viewportWidth - desiredMinWidth - 4));
      }

      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;
      let openUp;

      if (spaceBelow >= popHeight) {
        openUp = false;
      } else if (spaceAbove >= popHeight) {
        openUp = true;
      } else {
        openUp = spaceAbove > spaceBelow;
      }

      const gap = 4;
      const offset = typeof props.openUpOffset === 'number' ? props.openUpOffset : 0;
      const style = {
        position: 'fixed',
        left: `${left}px`,
        minWidth: `${desiredMinWidth}px`,
        zIndex: POPUP_Z_INDEX,
        top: 'auto',
        bottom: 'auto'
      };

      if (openUp) {
        const bottomValue = viewportHeight - rect.top + gap - offset;
        style.bottom = `${Math.max(0, Math.round(bottomValue))}px`;
      } else {
        style.top = `${Math.round(rect.bottom + gap)}px`;
      }

      dpPopStyle.value = style;
    }

    function openDp(){
      const base = parseYMD(selectedDate.value) || new Date();
      dpMonth.value = base.getMonth();
      dpYear.value = base.getFullYear();
      if(props.showTime && !selectedDate.value){
        timePart.value = ensureTime(sanitizeTime(base));
      }
      dpOpen.value = true;
      nextTick(() => {
        updatePopoverPosition();
        try { dpInput.value && dpInput.value.focus(); } catch(e){}
        window.addEventListener('scroll', updatePopoverPosition, true);
        window.addEventListener('resize', updatePopoverPosition, true);
      });
    }
    function closeDp(){
      dpOpen.value = false;
      window.removeEventListener('scroll', updatePopoverPosition, true);
      window.removeEventListener('resize', updatePopoverPosition, true);
    }
    function prevMonth(){ dpMonth.value = dpMonth.value === 0 ? 11 : dpMonth.value - 1; if (dpMonth.value === 11) dpYear.value--; nextTick(updatePopoverPosition); }
    function nextMonth(){ dpMonth.value = dpMonth.value === 11 ? 0 : dpMonth.value + 1; if (dpMonth.value === 0) dpYear.value++; nextTick(updatePopoverPosition); }
    function selectDay(d){
      if(!d.inMonth) return;
      selectedDate.value = d.dateStr;
      emitValue();
      if(!props.showTime) closeDp();
    }
    function pickToday(){
      const now = new Date();
      selectedDate.value = toYMD(now);
      if(props.showTime){
        timePart.value = sanitizeTime(now);
      }
      emitValue();
      closeDp();
    }
    function clearDate(){
      selectedDate.value = '';
      if(props.showTime) timePart.value = '00:00';
      emit('update:modelValue', '');
      closeDp();
    }

    function onTimeInput(e){
      timePart.value = ensureTime(sanitizeTime(e.target.value));
      emitValue();
    }

    function onDocClick(e){
      if(!dpOpen.value) return;
      const inside = dpWrapper.value && dpWrapper.value.contains(e.target);
      if(!inside) closeDp();
    }
    onMounted(() => document.addEventListener('click', onDocClick, true));
    onBeforeUnmount(() => {
      document.removeEventListener('click', onDocClick, true);
      window.removeEventListener('scroll', updatePopoverPosition, true);
      window.removeEventListener('resize', updatePopoverPosition, true);
    });

    const displayDate = computed(() => {
      if (!selectedDate.value) return '';
      const base = formatDateByStyle(selectedDate.value, formatStyle);
      return props.showTime ? `${base} ${ensureTime(timePart.value)}` : base;
    });

    return {
      dpWrapper,
      dpInput,
      dpOpen,
      dpPopStyle,
      dpPop,
      openDp,
      prevMonth,
      nextMonth,
      selectDay,
      pickToday,
      clearDate,
      weekdayAbbrs,
      monthLabel,
      gridDays,
      displayDate,
      labelToday,
      labelClear,
      timePart,
      onTimeInput,
      showTime: props.showTime,
      disabled: props.disabled,
      error: props.error
    };
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@400&display=swap');

.dp-wrapper {
  position: relative;
  max-width: 180px;
  width: 100%;
  font-size: 14px;
}

.dp-input {
    display: flex;
    width: 100%;
    padding-left: 5px;
    padding-right: 30px;
    height: 35px;
    cursor: pointer;
    font-family: "Roboto",sans-serif;
    font-size: 13px;
    border-bottom: 1px solid #ccc !important;
    border: 0px;
    border-radius: 4px;
    outline: 1px solid transparent;
}

.dp-input.error {
  border-color: #ff0000;
  box-shadow: 0 0 0 1px #ff0000;
}

.dp-icon {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  color: #ddd; /* ícone cinza escuro */
}

.dp-icon:hover {
  color: #ccc; /* um tom mais escuro ao passar o mouse */
}


.datepicker-pop {
  position: fixed;
  background: #fff;
  border: 1px solid #acacad;
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.15);
  padding: 6px;
  z-index: 2147483647;
}
.dp-header { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px; }
.dp-title { font-weight: 500; text-transform: capitalize; }
.dp-nav { border: 1px solid #ccc; background: #f7f7f7; border-radius: 6px; padding: 2px 8px; cursor: pointer; }
.dp-weekdays, .dp-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 2px; }
.dp-weekday { text-align: center; font-size: 12px; color: #666; padding: 3px 0; }
.dp-cell { border: 0; background: transparent; border-radius: 6px; padding: 5px 0; cursor: pointer; align-items:center; text-align: center; justify-content: center;}
.dp-cell:hover { background: #f0f0f0; }
.dp-cell.is-muted { color: #aaa; cursor: default; }
.dp-cell.is-selected { background: #689d8c; color: #fff; }
.dp-cell.is-today { outline: 1px dashed #689d8c; }
.dp-actions { display: flex; justify-content: space-between; margin-top: 6px; }
.dp-action { border: 1px solid #ccc; background: #f7f7f7; border-radius: 6px; padding: 4px 8px; cursor: pointer; }
</style>
