<template>
  <div class="dp-wrapper" ref="dpWrapper">
    <input
      ref="dpInput"
      class="dp-input"
      type="text"
      :value="displayDate"
      readonly
      :disabled="disabled"
      @pointerdown.stop.prevent="!disabled && openDp($event)"
      @mousedown.stop.prevent="!disabled && openDp($event)"
      @click.stop.prevent="!disabled && openDp($event)"
      aria-haspopup="dialog"
      :aria-expanded="dpOpen ? 'true' : 'false'"
    />
    <button
      v-if="!disabled"
      type="button"
      class="dp-icon"
      @pointerdown.stop.prevent="openDp($event)"
      @mousedown.stop.prevent="openDp($event)"
      @click.stop.prevent="openDp($event)"
    >
      <span class="material-symbols-outlined">calendar_month</span>
    </button>

    <div
      v-if="dpOpen"
      class="datepicker-pop"
      :style="dpPopStyle"
      ref="dpPopRef"
    >
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
        <button type="button" class="dp-action" @click="applyDate">{{ labelSelect }}</button>
        <button type="button" class="dp-action" @click="clearDate">{{ labelClear }}</button>
      </div>
    </div>
  </div>
</template>

<script>

import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue';

export default {
  name: 'DateTimeCellEditor',
  props: {
    params: { type: Object, default: null } ,
    modelValue: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    showTime: { type: Boolean, default: false },
    autoOpen: { type: Boolean, default: true }
  },
  emits: ['update:modelValue'],
  setup(props, { emit, expose }) {
    // === AG Grid heuristics for showTime when used as cell editor ===
    const colDef = (props.params && props.params.colDef) ? props.params.colDef : {};
    const tag = String(colDef.TagControl || colDef.tagControl || (colDef.context && colDef.context.TagControl) || '').toUpperCase();
    const fieldName = String(colDef.field || '').toLowerCase();
    const cellType = String(colDef.cellDataType || colDef.cellType || '').toLowerCase();
    const isShowTime = ref(tag === 'DEADLINE' || fieldName === 'deadline' || cellType === 'datetime' || props.showTime === true);

    const translateText = (t) => t;
    const ww = window.wwLib?.wwVariable;
    const lang = ww?.getValue('aa44dc4c-476b-45e9-a094-16687e063342') || navigator.language;
    const formatStyleRaw = ww?.getValue('21a41590-e7d8-46a5-af76-bb3542da1df3') || 'european';
    const formatStyle = String(formatStyleRaw).toLowerCase() === 'american' ? 'american' : 'european';

    const isPt = computed(() => String(lang || '').toLowerCase().startsWith('pt'));
    const PT_MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const labelToday = computed(() => (isPt.value ? 'Hoje' : translateText('Today')));
    const labelSelect = computed(() => (isPt.value ? 'Selecionar' : translateText('Select')));
    const labelClear = computed(() => (isPt.value ? 'Limpar' : translateText('Clear')));

    const dpWrapper = ref(null);
    const dpInput   = ref(null);
    const dpPopRef  = ref(null);

    const dpOpen = ref(false);
    const dpPopStyle = ref({});
    const selectedDate = ref('');
    const timePart = ref('00:00');

    // Guarda a posição exata do clique (clientX/Y)
    const anchorPoint = ref(null); // { x, y } quando abrir por clique

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

    watch(() => props.modelValue, v => {
      if (isShowTime.value) {
        const [d, t] = (v || '').split('T');
        selectedDate.value = d || '';
        timePart.value = t ? t.slice(0,5) : '00:00';
      } else {
        selectedDate.value = v || '';
      }
    }, { immediate: true });

    const dpMonth = ref(0);
    const dpYear  = ref(0);
    const weekStart = computed(() => (formatStyle === 'american' ? 0 : 1));

    const weekdayAbbrs = computed(() => {
      if (isPt.value) {
        const base = ['dom','seg','ter','qua','qui','sex','sáb'];
        return weekStart.value === 1 ? base.slice(1).concat(base.slice(0,1)) : base;
      }
      try {
        const base = Array.from({ length: 7 }, (_, i) =>
          new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(new Date(Date.UTC(2021,7,1+i)))
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
      return { label, dateStr: toYMD(date), inMonth, isToday: sameYMD(date,today), isSelected: selected && sameYMD(date, selected) };
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
      for (let i = daysInPrev - lead + 1; i <= daysInPrev; i++) cells.push(makeCell(new Date(prevYear, prevMonth, i), false));
      for (let i = 1; i <= daysInCur; i++) cells.push(makeCell(new Date(dpYear.value, dpMonth.value, i), true));
      const tail = 42 - cells.length;
      const nextYear = dpMonth.value === 11 ? dpYear.value + 1 : dpYear.value;
      const nextMonth = dpMonth.value === 11 ? 0 : dpMonth.value + 1;
      for (let i = 1; i <= tail; i++) cells.push(makeCell(new Date(nextYear, nextMonth, i), false));
      return cells;
    });

    function emitValue(){
      if(!selectedDate.value){ emit('update:modelValue', ''); return; }
      const val = isShowTime.value ? `${selectedDate.value}T${timePart.value}` : selectedDate.value;
      emit('update:modelValue', val);
    }

    function updatePopoverPosition() {
      const wrap = dpWrapper.value;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const left = Math.round(rect.left - 300);
      const bottom = Math.round(window.innerHeight - rect.top - 185);
      dpPopStyle.value = {
        position: 'fixed',
        left: `${left}px`,
        bottom: `${bottom}px`,
        minWidth: `${Math.max(rect.width, 230)}px`,
        zIndex: 2147483647
      };
    }

    function onDocClick(e){
      if(!dpOpen.value) return;
      const insideWrapper = dpWrapper.value && dpWrapper.value.contains(e.target);
      const insidePop = dpPopRef.value && dpPopRef.value.contains(e.target);
      if(!insideWrapper && !insidePop) closeDp();
    }

    function openDp(e){
      // captura coords do clique (pointer/mouse). Se veio de focus, anchorPoint será null.
      anchorPoint.value = (e && typeof e.clientX === 'number') ? { x: e.clientX, y: e.clientY } : null;

      const base = parseYMD(selectedDate.value) || new Date();
      dpMonth.value = base.getMonth();
      dpYear.value  = base.getFullYear();
      if(isShowTime.value && !selectedDate.value){
        const pad2 = n => String(n).padStart(2,'0');
        timePart.value = `${pad2(base.getHours())}:${pad2(base.getMinutes())}`;
      }
      dpOpen.value = true;

      nextTick(() => {
        updatePopoverPosition();
        try { dpInput.value && dpInput.value.focus(); } catch {}
        document.addEventListener('click', onDocClick, false);
        window.addEventListener('scroll', updatePopoverPosition, true);
        window.addEventListener('resize', updatePopoverPosition, true);
      });
    }

    function closeDp(){
      dpOpen.value = false;
      anchorPoint.value = null;
      document.removeEventListener('click', onDocClick, false);
      window.removeEventListener('scroll', updatePopoverPosition, true);
      window.removeEventListener('resize', updatePopoverPosition, true);
    }

    function prevMonth(){
      dpMonth.value = dpMonth.value === 0 ? 11 : dpMonth.value - 1;
      if (dpMonth.value === 11) dpYear.value--;
      nextTick(updatePopoverPosition);
    }
    function nextMonth(){
      dpMonth.value = dpMonth.value === 11 ? 0 : dpMonth.value + 1;
      if (dpMonth.value === 0) dpYear.value++;
      nextTick(updatePopoverPosition);
    }
    function selectDay(d){
      if(!d.inMonth) return;
      selectedDate.value = d.dateStr;
      emitValue();
      if(!isShowTime.value) closeDp();
    }
    function pickToday(){
      const now = new Date();
      selectedDate.value = toYMD(now);
      if(isShowTime.value){
        const p = n=>String(n).padStart(2,'0');
        timePart.value = `${p(now.getHours())}:${p(now.getMinutes())}`;
      }
      emitValue();
      closeDp();
    }
    function clearDate(){
      selectedDate.value = '';
      if(isShowTime.value) timePart.value = '00:00';
      emit('update:modelValue','');
      closeDp();
    }
    function applyDate(){
      emitValue();
      closeDp();
      const p = props.params || {};
      if(p.api && typeof p.api.stopEditing === 'function'){
        p.api.stopEditing();
      } else if(typeof p.stopEditing === 'function'){
        p.stopEditing();
      }
    }
    function onTimeInput(e){
      timePart.value = e.target.value;
      emitValue();
    }

    onBeforeUnmount(() => {
      document.removeEventListener('click', onDocClick, false);
      window.removeEventListener('scroll', updatePopoverPosition, true);
      window.removeEventListener('resize', updatePopoverPosition, true);
    });

    // === AG Grid cell editor API ===
    expose({
      openDp,
      afterGuiAttached(params){
        try {
          const ev = params && params.event;
          const t = ev && ev.type;
          if (
            props.autoOpen &&
            (t === 'click' || t === 'mousedown' || t === 'dblclick' || t === 'pointerdown' || t === 'touchstart')
          ) {
            openDp(ev);
          }
        } catch (e) {}
      },
      getValue(){
        if(!selectedDate.value) return '';
        return isShowTime.value ? (selectedDate.value + 'T' + timePart.value) : selectedDate.value;
      },
      isPopup(){ return false; },
      isCancelBeforeStart(){ return false; },
      isCancelAfterEnd(){ return false; }
    });

    const displayDate = computed(() => {
      if (!selectedDate.value) return '';
      const base = formatDateByStyle(selectedDate.value, formatStyle);
      return isShowTime.value ? `${base} ${timePart.value}` : base;
    });

    return {
      dpWrapper, dpInput, dpPopRef,
      dpOpen, dpPopStyle,
      openDp, prevMonth, nextMonth,
      selectDay, pickToday, clearDate, applyDate,
      weekdayAbbrs, monthLabel, gridDays,
      displayDate, labelToday, labelSelect, labelClear,
      timePart, onTimeInput,
      showTime: isShowTime.value, disabled: props.disabled
    };
  }
};

</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@400&display=swap');

.dp-wrapper {
  position: relative;
  width: 100%;
  font-family: 'Roboto', sans-serif;
  font-size: 14px;
  z-index: 99999;
}

.dp-input {
  display: block;
  width: 100%;
  padding-left: 5px;
  padding-right: 30px;
  height: 35px;
  cursor: pointer;
  font-family: 'Roboto', sans-serif;
  font-size: 13px;
  border: 1px solid #ccc;
  border-radius: 4px;
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
  color: #ddd;
}
.dp-icon:hover { color: #ccc; }

.datepicker-pop {
  position: fixed;
  background: #fff;
  border: 1px solid #acacad;
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.15);
  padding: 8px;
  z-index: 2147483647 !important;
}

.dp-header { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 6px; }
.dp-title  { font-weight: 500; text-transform: capitalize; }
.dp-nav    { border: 1px solid #ccc; background: #f7f7f7; border-radius: 6px; padding: 2px 8px; cursor: pointer; }
.dp-weekdays, .dp-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 2px; }
.dp-weekday { text-align: center; font-size: 12px; color: #666; padding: 4px 0; }
.dp-cell { border: 0; background: transparent; border-radius: 6px; padding: 6px 0; cursor: pointer; align-items:center; text-align: center; justify-content: center;}

</style>
