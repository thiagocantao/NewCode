export default class DeadlineFilterRenderer {
  constructor() {
    this.selected = null;
    this.customFrom = '';
    this.customTo = '';
    this.customMode = 'equals';

    this.searchText = '';
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
      const fromInput = this.customRangeEl.querySelector('.from-date');
      const toInput = this.customRangeEl.querySelector('.to-date');
      this.customFrom = fromInput ? fromInput.value : '';
      this.customTo = toInput ? toInput.value : '';
      if (this.customMode === 'equals') this.customTo = this.customFrom;
      if (this.customMode === 'before') this.customFrom = '';
      if (this.customMode === 'after') this.customTo = '';

      this.params.filterChangedCallback();
    });
  }

  updateCustomRange() {
    let rangeHtml = '';
    switch (this.customMode) {
      case 'before':
        rangeHtml = `<input type="date" class="to-date" />`;
        break;
      case 'after':
        rangeHtml = `<input type="date" class="from-date" />`;
        break;
      case 'between':
        rangeHtml = `<input type="date" class="from-date" /> <input type="date" class="to-date" />`;

        break;
      case 'equals':
      default:
        rangeHtml = `<input type="date" class="from-date" />`;
    }
    this.customRangeEl.innerHTML = rangeHtml;
    this.customRangeEl.className = 'custom-range' + (this.customMode === 'between' ? ' between-mode' : '');

    const fromInput = this.customRangeEl.querySelector('.from-date');
    const toInput = this.customRangeEl.querySelector('.to-date');
    if (fromInput) fromInput.value = this.customFrom;
    if (toInput) toInput.value = this.customTo;
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

  destroy() {}

  closePopup() {
    if (typeof this.hidePopup === 'function') {
      this.hidePopup();
    } else if (this.params?.api?.hidePopupMenu) {
      this.params.api.hidePopupMenu();
    }
  }

}
