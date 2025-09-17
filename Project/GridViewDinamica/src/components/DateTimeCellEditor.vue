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
      aria-label="Abrir calendário"
    >
      <span class="material-symbols-outlined">calendar_month</span>
    </button>

    <!-- Teleport to body -->
    <teleport to="body">
      <div
        v-if="dpOpen"
        ref="dpPopRef"
        role="dialog"
        aria-modal="true"
        :style="popRootStyle"
      >
        <div :style="rowBetweenStyle">
          <button type="button" :style="navBtnStyle" @click="prevMonth" aria-label="Mês anterior">&lt;</button>
          <div :style="titleStyle">{{ monthLabel }}</div>
          <button type="button" :style="navBtnStyle" @click="nextMonth" aria-label="Próximo mês">&gt;</button>
        </div>

        <div :style="gridHeaderStyle">
          <div v-for="d in weekdayAbbrs" :key="d" :style="weekdayStyle">{{ d }}</div>
        </div>

        <div :style="gridDaysStyle">
          <button
            v-for="d in gridDays"
            :key="d.dateStr"
            type="button"
            :style="[dayBtnStyle, d.isSelected ? daySelectedStyle : null, d.isToday ? dayTodayStyle : null, !d.inMonth ? dayMutedStyle : null]"
            @click="selectDay(d)"
          >
            {{ d.label }}
          </button>
        </div>

        <div v-if="showTime" :style="timeWrapStyle">
          <input type="time" v-model="timePart" @input="onTimeInput" :style="timeInputStyle" />
        </div>

        <div :style="actionsRowStyle">
          <button type="button" :style="actionBtnStyle" @click="onPickToday">{{ labelToday }}</button>
          <button type="button" :style="actionBtnStyle" @click="onApply">{{ labelSelect }}</button>
          <button type="button" :style="actionBtnStyle" @click="onClear">{{ labelClear }}</button>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script>
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue';
import { readTypographyVariable, DEFAULT_FONT_FAMILY } from '../utils/fontFamily.js';

export default {
  name: 'DateTimeCellEditor',
  props: {
    params: { type: Object, default: null },
    modelValue: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    showTime: { type: Boolean, default: false },
    autoOpen: { type: Boolean, default: true }
  },
  emits: ['update:modelValue'],
  setup(props, { emit, expose }) {
    const getFontFamily = () => readTypographyVariable() || DEFAULT_FONT_FAMILY;
    const BASE_FONT_SIZE = '12px';
    const colDef = (props.params && props.params.colDef) ? props.params.colDef : {};
    const tag = String(colDef.TagControl || colDef.tagControl || (colDef.context && colDef.context.TagControl) || '').toUpperCase();
    const fieldName = String(colDef.field || '').toLowerCase();
    const cellType = String(colDef.cellDataType || colDef.cellType || '').toLowerCase();
    const isShowTime = ref(tag === 'DEADLINE' || fieldName === 'deadline' || cellType === 'datetime' || props.showTime === true);

    const ww = window.wwLib?.wwVariable;
    const lang = ww?.getValue('aa44dc4c-476b-45e9-a094-16687e063342') || navigator.language;
    const formatStyleRaw = ww?.getValue('21a41590-e7d8-46a5-af76-bb3542da1df3') || 'european';
    const formatStyle = String(formatStyleRaw).toLowerCase() === 'american' ? 'american' : 'european';
    const isPt = computed(() => String(lang || '').toLowerCase().startsWith('pt'));
    const PT_MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const labelToday = computed(() => (isPt.value ? 'Hoje' : 'Today'));
    const labelSelect = computed(() => (isPt.value ? 'Selecionar' : 'Select'));
    const labelClear = computed(() => (isPt.value ? 'Limpar' : 'Clear'));

    const dpWrapper = ref(null);
    const dpInput   = ref(null);
    const dpPopRef  = ref(null);

    const dpOpen = ref(false);
    const dpPopStyle = ref({});
    const selectedDate = ref('');
    const timePart = ref('00:00');
    const originalValue = ref('');
    const anchorPoint = ref(null);
    // evita validação imediata ao entrar em edição
    const readyToEmit = ref(false);

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
    function sameYMD(a,b){ return a && b && toYMD(a) === toYMD(b); }

    function applyValue(val){
      const v = val || '';
      originalValue.value = String(v);

      if (!v) {
        selectedDate.value = '';
        timePart.value = '00:00';
        return;
      }
      if (isShowTime.value) {
        if (typeof v === 'string' && v.includes('T')) {
          const [d, t] = v.split('T');
          selectedDate.value = d || '';
          timePart.value = t ? t.slice(0,5) : '00:00';
          return;
        }
        const d = new Date(v);
        if (!isNaN(d.getTime())) {
          selectedDate.value = toYMD(d);
          const hh = String(d.getHours()).padStart(2,'0');
          const mm = String(d.getMinutes()).padStart(2,'0');
          timePart.value = `${hh}:${mm}`;
          return;
        }
      }
      selectedDate.value = String(v);
    }
    // defina o valor inicial de forma síncrona para evitar campo vazio ao montar

    const initVal =
      props.modelValue !== undefined &&
      props.modelValue !== null &&
      props.modelValue !== ''
        ? props.modelValue
        : (
            props.params &&
            (props.params.value !== undefined && props.params.value !== null
              ? props.params.value
              : props.params.colDef && props.params.data
                ? props.params.data[props.params.colDef.field]
                : undefined)
          );
    applyValue(initVal);


    watch(
      () => {
        const mv = props.modelValue;
        const p = props.params || {};
        const pv =
          p.value !== undefined && p.value !== null
            ? p.value
            : p.colDef && p.data
              ? p.data[p.colDef.field]
              : undefined;
        return mv !== undefined && mv !== null && mv !== '' ? mv : pv;
      },
      v => {
        applyValue(v);
      }

    );

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
      if(!readyToEmit.value) return;

      let newVal = '';
      if(selectedDate.value){
        if(!isShowTime.value){
          newVal = selectedDate.value;
        } else {
          const orig = originalValue.value || '';
          if(/t/i.test(orig)){
            newVal = `${selectedDate.value}T${timePart.value}`;
          } else {
            const baseDate = new Date(`${selectedDate.value}T${timePart.value}`);
            const mm = String(baseDate.getMonth() + 1).padStart(2,'0');
            const dd = String(baseDate.getDate()).padStart(2,'0');
            const yyyy = baseDate.getFullYear();
            const min = String(baseDate.getMinutes()).padStart(2,'0');
            if(/am|pm/i.test(orig)){
              let hh = baseDate.getHours();
              const ampm = hh >= 12 ? 'PM' : 'AM';
              hh = hh % 12; if(hh === 0) hh = 12;
              const hh12 = String(hh).padStart(2,'0');
              newVal = `${mm}/${dd}/${yyyy} ${hh12}:${min} ${ampm}`;
            } else if(orig.includes('/')){
              const hh = String(baseDate.getHours()).padStart(2,'0');
              newVal = `${mm}/${dd}/${yyyy} ${hh}:${min}`;
            } else {
              newVal = `${selectedDate.value} ${timePart.value}`;
            }
          }
        }

      }

      if(newVal === originalValue.value) return;
      emit('update:modelValue', newVal);
      originalValue.value = newVal;
    }

    function finalizeEditing(){
      const p = props.params || {};
      try {
        if (p.api && typeof p.api.stopEditing === 'function') p.api.stopEditing();
        else if (typeof p.stopEditing === 'function') p.stopEditing();
      } catch (e) {}
    }

    function clampToViewport(x, y, w, h, margin = 8) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let nx = Math.min(Math.max(margin, x), Math.max(margin, vw - w - margin));
      let ny = Math.min(Math.max(margin, y), Math.max(margin, vh - h - margin));
      return { x: nx, y: ny };
    }

    function updatePopoverPosition() {
      const pop = dpPopRef.value;
      if (!pop) return;
      let baseLeft = 0;
      let baseTop = 0;

      if (anchorPoint.value) {
        baseLeft = anchorPoint.value.x - 130;
        baseTop = anchorPoint.value.y - 100;
      } else if (dpWrapper.value) {
        const rect = dpWrapper.value.getBoundingClientRect();
        baseLeft = rect.left;
        baseTop = rect.bottom;
      }

      const prevVis = pop.style.visibility;
      const prevDisp = pop.style.display;
      pop.style.visibility = 'hidden';
      pop.style.display = 'block';
      const w = pop.offsetWidth || 200;
      const h = pop.offsetHeight || 200;
      pop.style.visibility = prevVis || '';
      pop.style.display = prevDisp || '';

      const { x, y } = clampToViewport(baseLeft, baseTop, w, h, 8);

      dpPopStyle.value = {
        left: `${Math.round(x)}px`,
        top: `${Math.round(y)}px`
      };
    }

    function onDocClick(e){
      if(!dpOpen.value) return;
      const insideWrapper = dpWrapper.value && dpWrapper.value.contains(e.target);
      const insidePop = dpPopRef.value && dpPopRef.value.contains(e.target);
      if(!insideWrapper && !insidePop) {
        closeDp();
        finalizeEditing(); // fechar fora = finalizar edição
      }
    }

    function openDp(e){
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
      // Apenas seleciona o dia e mantém o calendário aberto
      selectedDate.value = d.dateStr;
      readyToEmit.value = true;
      emitValue();
    }
    function onPickToday(){
      const now = new Date();
      selectedDate.value = toYMD(now);
      if(isShowTime.value){
        const p = n=>String(n).padStart(2,'0');
        timePart.value = `${p(now.getHours())}:${p(now.getMinutes())}`;
      }
      readyToEmit.value = true;
      emitValue();
      closeDp();
      finalizeEditing(); // Today => finaliza
    }
    function onClear(){
      selectedDate.value = '';
      if(isShowTime.value) timePart.value = '00:00';
      readyToEmit.value = true;
      emitValue();

      closeDp();
      finalizeEditing(); // Clear => finaliza
    }
    function onApply(){
      readyToEmit.value = true;
      emitValue();
      closeDp();
      finalizeEditing(); // Select => finaliza
    }
    function onTimeInput(e){
      timePart.value = e.target.value;
      readyToEmit.value = true;
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
          // define o valor inicial do editor com o conteúdo da célula
          const initVal = params?.value ?? (params?.colDef?.field ? params?.data?.[params.colDef.field] : undefined);
          applyValue(initVal);

          const ev = params && params.event;
          if (props.autoOpen) {
            openDp(ev);
          }
        } catch (e) {}
      },
      getValue(){
        return originalValue.value || '';
      },
      isPopup(){ return true; },
      isCancelBeforeStart(){ return false; },
      isCancelAfterEnd(){ return false; }
    });

    const displayDate = computed(() => {
      if (!selectedDate.value) return '';
      return isShowTime.value
        ? `${selectedDate.value} ${timePart.value}`
        : selectedDate.value;

    });

    // === Inline CSS objects (to defeat external overrides) ===
    const popRootStyle = computed(() => ({
      position: 'fixed',
      left: dpPopStyle.value.left || '0px',
      top: dpPopStyle.value.top || '0px',
      zIndex: 2147483647,
      background: '#fff',
      border: '1px solid #acacad',
      borderRadius: '8px',
      boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
      padding: '8px',
      minWidth: '260px',
      maxWidth: '320px',
      fontFamily: getFontFamily(),
      fontSize: BASE_FONT_SIZE,
      userSelect: 'none'
    }));
    const rowBetweenStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '6px' };
    const titleStyle = { fontWeight: 500, textTransform: 'capitalize', whiteSpace: 'nowrap' };
    const navBtnStyle = { border: '1px solid #ccc', background: '#f7f7f7', borderRadius: '6px', padding: '2px 8px', minWidth: '28px', minHeight: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', lineHeight: '1' };
    const gridHeaderStyle = { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' };
    const weekdayStyle = { textAlign: 'center', fontSize: BASE_FONT_SIZE, color: '#666', padding: '4px 0' };
    const gridDaysStyle = { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' };
    const dayBtnStyle = { border: '1px solid transparent', background: 'transparent', borderRadius: '6px', padding: '6px 0', minHeight: '30px', textAlign: 'center', lineHeight: '1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', cursor: 'pointer' };
    const daySelectedStyle = { background: '#e7f0ff', borderColor: '#84a9ff' };
    const dayTodayStyle = { outline: '1px dashed #aaa' };
    const dayMutedStyle = { color: '#bbb' };
    const timeWrapStyle = { marginTop: '6px' };
    const timeInputStyle = {
      width: '100%',
      padding: '6px',
      border: '1px solid #ccc',
      borderRadius: '6px',
      fontSize: BASE_FONT_SIZE,
      fontFamily: getFontFamily()
    };
    const actionsRowStyle = { marginTop: '8px', display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' };
    const actionBtnStyle = {
      border: '1px solid #ccc',
      background: '#f7f7f7',
      borderRadius: '6px',
      padding: '4px 8px',
      minHeight: '28px',
      cursor: 'pointer',
      fontSize: BASE_FONT_SIZE,
      fontFamily: getFontFamily()
    };

    return {
      dpWrapper, dpInput, dpPopRef,
      dpOpen, dpPopStyle,
      openDp, prevMonth, nextMonth,
      selectDay, onPickToday, onClear, onApply,
      weekdayAbbrs, monthLabel, gridDays,
      displayDate, labelToday, labelSelect, labelClear,
      timePart, onTimeInput,
      showTime: isShowTime.value, disabled: props.disabled,

      popRootStyle, rowBetweenStyle, titleStyle, navBtnStyle,
      gridHeaderStyle, weekdayStyle, gridDaysStyle,
      dayBtnStyle, daySelectedStyle, dayTodayStyle, dayMutedStyle,
      timeWrapStyle, timeInputStyle, actionsRowStyle, actionBtnStyle
    };
  }
};
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@400&display=swap');

.dp-wrapper {
  position: relative;
  width: 100%;
  font-family: var(--grid-view-dinamica-font-family, Roboto, sans-serif);
  font-size: var(--grid-view-dinamica-font-size, 12px);
  z-index: 1;
}
.dp-input {
  display: block;
  width: 100%;
  padding-left: 5px;
  padding-right: 30px;
  height: 35px;
  cursor: pointer;
  font-family: var(--grid-view-dinamica-font-family, Roboto, sans-serif);
  font-size: var(--grid-view-dinamica-font-size, 12px);
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  outline: transparent;
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
  color: #888;
}
.dp-icon:hover { color: #555; }
</style>
