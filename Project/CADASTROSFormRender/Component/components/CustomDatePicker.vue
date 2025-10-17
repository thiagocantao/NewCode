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
    <div
      v-if="dpOpen"
      ref="dpPopover"
      :class="['datepicker-pop', { 'is-mobile': isMobile }]"
      :style="dpPopStyle"
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
    isMobile: { type: Boolean, default: false }
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
    const dpPopover = ref(null);
    const selectedDate = ref('');
    const timePart = ref('00:00');
    const isMobile = computed(() => !!props.isMobile);

    watch(
      () => props.modelValue,
      v => {
        if (props.showTime) {
          const [d, t] = (v || '').split('T');
          selectedDate.value = d || '';
          timePart.value = t ? t.slice(0,5) : '00:00';
        } else {
          selectedDate.value = v || '';
        }
      },
      { immediate: true }
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
      const val = props.showTime ? `${selectedDate.value}T${timePart.value}` : selectedDate.value;
      emit('update:modelValue', val);
    }

    function updatePopoverPosition() {
      const wrap = dpWrapper.value;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const margin = 6;
      const popEl = dpPopover.value;
      const popRect = popEl ? popEl.getBoundingClientRect() : null;
      const minWidth = isMobile.value ? 200 : 230;
      const maxWidth = isMobile.value ? 260 : Number.POSITIVE_INFINITY;
      const anchorWidth = rect.width;
      const spaceLimitedMaxWidth = isFinite(maxWidth)
        ? Math.min(maxWidth, Math.max(minWidth, viewportWidth - margin * 2))
        : Math.max(minWidth, viewportWidth - margin * 2);
      const baseWidth = isMobile.value
        ? spaceLimitedMaxWidth
        : Math.max(anchorWidth, minWidth);
      const popWidth = Math.min(
        popRect?.width || baseWidth,
        isMobile.value ? Math.max(minWidth, viewportWidth - margin * 2) : Number.POSITIVE_INFINITY
      );
      const popHeight = popRect?.height || (isMobile.value ? 260 : 300);

      let top;
      let left;

      if (isMobile.value) {
        const centeredTop = (viewportHeight - popHeight) / 2;
        const centeredLeft = (viewportWidth - popWidth) / 2;
        top = Math.max(margin, Math.min(centeredTop, viewportHeight - popHeight - margin));
        left = Math.max(margin, Math.min(centeredLeft, viewportWidth - popWidth - margin));
      } else {
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const shouldOpenUp = spaceBelow < popHeight + margin && spaceAbove > spaceBelow;
        top = shouldOpenUp
          ? Math.max(margin, rect.top - popHeight - margin)
          : Math.min(
              viewportHeight - popHeight - margin,
              Math.max(margin, rect.bottom + margin)
            );
        top = Math.max(margin, Math.min(top, viewportHeight - popHeight - margin));
        left = Math.max(margin, rect.left);
        if (left + popWidth + margin > viewportWidth) {
          left = Math.max(margin, viewportWidth - popWidth - margin);
        }
      }

      const style = {
        position: 'fixed',
        left: `${Math.round(left)}px`,
        top: `${Math.round(top)}px`,
        minWidth: `${Math.round(Math.max(minWidth, 0))}px`,
        width: `${Math.round(baseWidth)}px`,
        zIndex: 2147483647
      };
      if (isFinite(maxWidth)) {
        style.maxWidth = `${Math.round(Math.min(maxWidth, viewportWidth - margin * 2))}px`;
      }
      dpPopStyle.value = style;
    }

    function openDp(){
      const base = parseYMD(selectedDate.value) || new Date();
      dpMonth.value = base.getMonth();
      dpYear.value = base.getFullYear();
      if(props.showTime && !selectedDate.value){
        const pad = n => String(n).padStart(2,'0');
        timePart.value = `${pad(base.getHours())}:${pad(base.getMinutes())}`;
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
        const pad = n => String(n).padStart(2,'0');
        timePart.value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
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
      timePart.value = e.target.value;
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

    watch(isMobile, () => {
      if (dpOpen.value) {
        nextTick(updatePopoverPosition);
      }
    });

    const displayDate = computed(() => {
      if (!selectedDate.value) return '';
      const base = formatDateByStyle(selectedDate.value, formatStyle);
      return props.showTime ? `${base} ${timePart.value}` : base;
    });

    return {
      dpWrapper,
      dpInput,
      dpOpen,
      dpPopStyle,
      dpPopover,
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
      error: props.error,
      isMobile
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
  border: 1px solid #ccc; /* borda fina e cinza escura */
  border-radius: 4px;
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
  padding: 8px;
  z-index: 2147483647;
}
.dp-header { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 6px; }
.dp-title { font-weight: 500; text-transform: capitalize; }
.dp-nav { border: 1px solid #ccc; background: #f7f7f7; border-radius: 6px; padding: 2px 8px; cursor: pointer; }
.dp-weekdays, .dp-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 2px; }
.dp-weekday { text-align: center; font-size: 12px; color: #666; padding: 4px 0; }
.dp-cell { border: 0; background: transparent; border-radius: 6px; padding: 6px 0; cursor: pointer; align-items:center; text-align: center; justify-content: center;}
.dp-cell:hover { background: #f0f0f0; }
.dp-cell.is-muted { color: #aaa; cursor: default; }
.dp-cell.is-selected { background: #689d8c; color: #fff; }
.dp-cell.is-today { outline: 1px dashed #689d8c; }
.dp-actions { display: flex; justify-content: space-between; margin-top: 6px; }
.dp-action { border: 1px solid #ccc; background: #f7f7f7; border-radius: 6px; padding: 4px 8px; cursor: pointer; }

.datepicker-pop.is-mobile {
  padding: 6px 5px;
  border-radius: 6px;
  box-shadow: 0 6px 16px rgba(0,0,0,0.12);
}
.datepicker-pop.is-mobile .dp-header {
  margin-bottom: 3px;
}
.datepicker-pop.is-mobile .dp-title {
  font-size: 13px;
}
.datepicker-pop.is-mobile .dp-weekday {
  font-size: 11px;
  padding: 2px 0;
}
.datepicker-pop.is-mobile .dp-cell {
  padding: 4px 0;
  font-size: 13px;
}
.datepicker-pop.is-mobile .dp-actions {
  gap: 6px;
  margin-top: 4px;
}
.datepicker-pop.is-mobile .dp-action {
  flex: 1;
  font-size: 12px;
  padding: 3px 6px;
}
.datepicker-pop.is-mobile .dp-time input[type='time'] {
  font-size: 13px;
}
</style>
