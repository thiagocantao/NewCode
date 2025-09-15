const { createApp, ref, computed, watch, nextTick } = window.Vue || Vue;

const CustomDatePicker = {
  template: `
    <div class="dp-wrapper" ref="dpWrapper">
      <input
        class="dp-input"
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
      <div v-if="dpOpen" class="datepicker-pop" :style="dpPopStyle">
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
  `,
  props: {
    modelValue: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    showTime: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const translateText = t => t;
    const ww = window.wwLib?.wwVariable;
    const lang = ww?.getValue('aa44dc4c-476b-45e9-a094-16687e063342') || navigator.language;
    const formatStyleRaw = ww?.getValue('21a41590-e7d8-46a5-af76-bb3542da1df3') || 'european';
    const formatStyle = String(formatStyleRaw).toLowerCase() === 'american' ? 'american' : 'european';

    const isPt = computed(() => String(lang || '').toLowerCase().startsWith('pt'));
    const PT_MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
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
      const [y, m, d] = ymd.split('-').map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    }
    function formatDateByStyle(yyyyMmDd, style = formatStyle) {
      if (!yyyyMmDd) return '';
      const [y, m, d] = yyyyMmDd.split('-').map(Number);
      const DD = String(d).padStart(2, '0');
      const MM = String(m).padStart(2, '0');
      const YYYY = String(y);
      return style === 'american' ? `${MM}/${DD}/${YYYY}` : `${DD}/${MM}/${YYYY}`;
    }
    function sameYMD(a, b) {
      return a && b && toYMD(a) === toYMD(b);
    }

    const dpWrapper = ref(null);
    const dpOpen = ref(false);
    const dpPopStyle = ref({});
    const selectedDate = ref('');
    const timePart = ref('00:00');

    watch(
      () => props.modelValue,
      v => {
        if (props.showTime) {
          const [d, t] = (v || '').split('T');
          selectedDate.value = d || '';
          timePart.value = t ? t.slice(0, 5) : '00:00';
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

    function makeCell(date, inMonth) {
      const label = date.getDate();
      const today = new Date();
      const selected = parseYMD(selectedDate.value);
      return {
        label,
        dateStr: toYMD(date),
        inMonth,
        isToday: sameYMD(date, today),
        isSelected: selected && sameYMD(date, selected),
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

    function openDp() {
      const base = selectedDate.value ? parseYMD(selectedDate.value) : new Date();
      dpMonth.value = base.getMonth();
      dpYear.value = base.getFullYear();
      dpOpen.value = true;
      nextTick(() => {
        const rect = dpWrapper.value.getBoundingClientRect();
        dpPopStyle.value = { left: `${rect.left}px`, top: `${rect.bottom + window.scrollY}px` };
      });
      document.addEventListener('click', handleClickOutside);
    }

    function closeDp() {
      dpOpen.value = false;
      document.removeEventListener('click', handleClickOutside);
    }

    function handleClickOutside(e) {
      if (!dpWrapper.value.contains(e.target)) {
        closeDp();
      }
    }

    function prevMonth() {
      if (dpMonth.value === 0) {
        dpMonth.value = 11;
        dpYear.value--;
      } else {
        dpMonth.value--;
      }
    }

    function nextMonth() {
      if (dpMonth.value === 11) {
        dpMonth.value = 0;
        dpYear.value++;
      } else {
        dpMonth.value++;
      }
    }

    function selectDay(d) {
      if (!d.inMonth) return;
      selectedDate.value = d.dateStr;
      if (!props.showTime) {
        emitValue();
        closeDp();
      }
    }

    function pickToday() {
      const today = new Date();
      selectedDate.value = toYMD(today);
      emitValue();
      closeDp();
    }

    function clearDate() {
      selectedDate.value = '';
      emitValue();
      closeDp();
    }

    function onTimeInput() {
      emitValue();
    }

    function emitValue() {
      if (!selectedDate.value) {
        emit('update:modelValue', '');
        return;
      }
      if (props.showTime) {
        emit('update:modelValue', `${selectedDate.value}T${timePart.value}`);
      } else {
        emit('update:modelValue', selectedDate.value);
      }
    }

    const displayDate = computed(() => {
      if (!selectedDate.value) return '';
      const base = formatDateByStyle(selectedDate.value, formatStyle);
      return props.showTime ? `${base} ${timePart.value}` : base;
    });

    return {
      dpWrapper,
      dpOpen,
      dpPopStyle,
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
    };
  },
};

export default class DeadlineFilterRenderer {
  constructor() {
    this.selected = null;
    this.customFrom = '';
    this.customTo = '';
    this.customMode = 'equals';
    this.searchText = '';
    this.fromPickerApp = null;
    this.toPickerApp = null;
    this.options = [
      { label: 'Today', value: 'today' },
      { label: 'Yesterday', value: 'yesterday' },
      { label: 'This week', value: 'this_week' },
      { label: 'This month', value: 'this_month' },
      { label: 'Last 30 days', value: 'last_30_days' },
      { label: 'Customize', value: 'custom' },
      { label: 'Clear', value: 'clear' },
    ];
  }

  init(params) {
    this.params = params;
    this.filteredOptions = [...this.options];
    this.eGui = document.createElement('div');
    this.eGui.className = 'list-filter deadline-filter';
    this.eGui.innerHTML = `
      <div class="field-search">
        <input type="text" placeholder="Search..." class="search-input" />
        <span class="search-icon">
          <i class="material-symbols-outlined-search">search</i>
        </span>
      </div>
      <div class="filter-list"></div>
    `;
    this.searchInput = this.eGui.querySelector('.search-input');
    this.listEl = this.eGui.querySelector('.filter-list');
    this.searchInput.addEventListener('input', e => {
      this.searchText = e.target.value.toLowerCase();
      this.filteredOptions = this.options.filter(o =>
        o.label.toLowerCase().includes(this.searchText)
      );
      this.render();
    });
    this.render();
  }

  getGui() {
    return this.eGui;
  }

  render() {
    this.destroyCustomPickers();
    this.listEl.innerHTML = this.filteredOptions
      .map(opt => {
        const selected = this.selected === opt.value ? ' selected' : '';
        const custom = opt.value === 'custom' ? ' custom' : '';
        return `<div class="filter-item${selected}${custom}" data-value="${opt.value}">
          <span class="filter-label">${opt.label}</span>
          ${opt.value === 'custom' ? '<span class="arrow-icon">arrow_forward_ios</span>' : ''}
        </div>`;
      })
      .join('');
    this.listEl.querySelectorAll('.filter-item').forEach(el => {
      el.addEventListener('click', () => {
        const value = el.getAttribute('data-value');
        if (value === 'custom') {
          this.selected = value;
          this.showCustomInputs();
          return;
        }
        if (value === 'clear') {
          this.selected = null;
          this.customFrom = '';
          this.customTo = '';
          this.customMode = 'equals';
          this.params.filterChangedCallback();
          this.render();
          this.closePopup();
          return;
        }
        this.selected = value;
        this.params.filterChangedCallback();
        this.render();
        this.closePopup();
      });
    });
  }

  showCustomInputs() {
    this.destroyCustomPickers();
    this.listEl.innerHTML = `
      <div class="custom-header">
        <span class="back-icon material-symbols-outlined">arrow_back_ios</span>
        <span class="custom-title">Customize</span>
      </div>
      <select class="custom-select">
        <option value="equals">Equals</option>
        <option value="before">Before</option>
        <option value="after">After</option>
        <option value="between">Between</option>
      </select>
      <div class="custom-range"></div>
      <button type="button" class="apply-btn">Apply</button>
    `;
    const backBtn = this.listEl.querySelector('.back-icon');
    backBtn.addEventListener('click', () => this.render());
    const select = this.listEl.querySelector('.custom-select');
    select.value = this.customMode;
    select.addEventListener('change', e => {
      this.customMode = e.target.value;
      this.updateCustomRange();
    });
    this.customRangeEl = this.listEl.querySelector('.custom-range');
    this.updateCustomRange();
    const applyBtn = this.listEl.querySelector('.apply-btn');
    applyBtn.addEventListener('click', () => {
      if (this.customMode === 'equals') this.customTo = this.customFrom;
      if (this.customMode === 'before') this.customFrom = '';
      if (this.customMode === 'after') this.customTo = '';
      this.params.filterChangedCallback();
    });
  }

  updateCustomRange() {
    this.destroyCustomPickers();
    let rangeHtml = '';
    switch (this.customMode) {
      case 'before':
        rangeHtml = `<div class="to-date"></div>`;
        break;
      case 'after':
        rangeHtml = `<div class="from-date"></div>`;
        break;
      case 'between':
        rangeHtml = `<div class="from-date"></div><div class="to-date"></div>`;
        break;
      case 'equals':
      default:
        rangeHtml = `<div class="from-date"></div>`;
    }
    this.customRangeEl.innerHTML = rangeHtml;
    this.customRangeEl.className = 'custom-range' + (this.customMode === 'between' ? ' between-mode' : '');
    const fromContainer = this.customRangeEl.querySelector('.from-date');
    const toContainer = this.customRangeEl.querySelector('.to-date');
    if (fromContainer) {
      this.fromPickerApp = createApp(CustomDatePicker, {
        modelValue: this.customFrom,
        'onUpdate:modelValue': val => {
          this.customFrom = val;
        },
      });
      this.fromPickerApp.mount(fromContainer);
    }
    if (toContainer) {
      this.toPickerApp = createApp(CustomDatePicker, {
        modelValue: this.customTo,
        'onUpdate:modelValue': val => {
          this.customTo = val;
        },
      });
      this.toPickerApp.mount(toContainer);
    }
  }

  getSelectedRange() {
    const now = window.gridDeadlineNow instanceof Date ? new Date(window.gridDeadlineNow) : new Date();
    const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    const todayStart = startOfDay(now);
    switch (this.selected) {
      case 'today':
        return { from: todayStart, to: endOfDay(todayStart) };
      case 'yesterday': {
        const y = new Date(todayStart);
        y.setDate(y.getDate() - 1);
        return { from: y, to: endOfDay(y) };
      }
      case 'this_week': {
        const day = todayStart.getDay();
        const diff = day === 0 ? -6 : 1 - day; // week starts Monday
        const start = new Date(todayStart);
        start.setDate(start.getDate() + diff);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { from: start, to: endOfDay(end) };
      }
      case 'this_month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { from: start, to: endOfDay(end) };
      }
      case 'last_30_days': {
        const start = new Date(todayStart);
        start.setDate(start.getDate() - 29);
        return { from: start, to: endOfDay(todayStart) };
      }
      case 'custom': {
        let from = this.customFrom ? startOfDay(new Date(this.customFrom)) : null;
        let to = this.customTo ? endOfDay(new Date(this.customTo)) : null;
        switch (this.customMode) {
          case 'equals':
            if (!from) return null;
            to = endOfDay(new Date(this.customFrom));
            break;
          case 'before':
            if (!to) return null;
            from = null;
            break;
          case 'after':
            if (!from) return null;
            to = null;
            break;
          case 'between':
            if (!from && !to) return null;
            break;
        }
        return { from, to };
      }
      default:
        return null;
    }
  }

  doesFilterPass(params) {
    const value = params.data ? params.data[this.params.colDef.field] : undefined;
    if (!value) return false;
    const dateValue = new Date(value);
    if (isNaN(dateValue.getTime())) return false;
    const range = this.getSelectedRange();
    if (!range) return true;
    const { from, to } = range;
    if (from && dateValue < from) return false;
    if (to && dateValue > to) return false;
    return true;
  }

  isFilterActive() {
    return !!this.getSelectedRange();
  }

  getModel() {
    const range = this.getSelectedRange();
    if (!range) return null;
    const { from, to } = range;
    return {
      option: this.selected,
      from: from ? from.toISOString() : null,
      to: to ? to.toISOString() : null,
      mode: this.customMode,
    };
  }

  setModel(model) {
    if (!model) {
      this.selected = null;
      this.customFrom = '';
      this.customTo = '';
      this.render();
      return;
    }
    this.selected = model.option;
    this.customFrom = model.from ? model.from.slice(0, 10) : '';
    this.customTo = model.to ? model.to.slice(0, 10) : '';
    this.customMode = model.mode || 'equals';
    this.render();
  }

  afterGuiAttached(params) {
    this.hidePopup = params?.hidePopup;
  }

  destroy() {
    this.destroyCustomPickers();
  }

  closePopup() {
    if (typeof this.hidePopup === 'function') {
      this.hidePopup();
    } else if (this.params?.api?.hidePopupMenu) {
      this.params.api.hidePopupMenu();
    }
  }

  destroyCustomPickers() {
    if (this.fromPickerApp) {
      this.fromPickerApp.unmount();
      this.fromPickerApp = null;
    }
    if (this.toPickerApp) {
      this.toPickerApp.unmount();
      this.toPickerApp = null;
    }
  }
}
