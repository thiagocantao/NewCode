export default class DeadlineFilterRenderer {
  constructor() {
    this.selected = null;
    this.customFrom = '';
    this.customTo = '';
    this.searchText = '';
    this.options = [
      { label: 'Today', value: 'today' },
      { label: 'Yesterday', value: 'yesterday' },
      { label: 'This week', value: 'this_week' },
      { label: 'This month', value: 'this_month' },
      { label: 'Last 30 days', value: 'last_30_days' },
      { label: 'Customize', value: 'custom' },
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
        return `<div class="filter-item${selected}${custom}" data-value="${opt.value}"><span class="filter-label">${opt.label}</span></div>`;
      })
      .join('');
    this.listEl.querySelectorAll('.filter-item').forEach(el => {
      el.addEventListener('click', () => {
        this.selected = el.getAttribute('data-value');
        if (this.selected === 'custom') {
          this.showCustomInputs();
        } else {
          this.params.filterChangedCallback();
          this.render();
        }
      });
    });
  }

  showCustomInputs() {
    this.listEl.innerHTML = `
      <div class="custom-range">
        <input type="date" class="from-date" />
        <span style="margin:0 4px;">-</span>
        <input type="date" class="to-date" />
        <button type="button" class="apply-btn">Apply</button>
      </div>
    `;
    const fromInput = this.listEl.querySelector('.from-date');
    const toInput = this.listEl.querySelector('.to-date');
    const applyBtn = this.listEl.querySelector('.apply-btn');
    fromInput.value = this.customFrom;
    toInput.value = this.customTo;
    applyBtn.addEventListener('click', () => {
      this.customFrom = fromInput.value;
      this.customTo = toInput.value;
      this.params.filterChangedCallback();
    });
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
        const from = this.customFrom ? startOfDay(new Date(this.customFrom)) : null;
        const to = this.customTo ? endOfDay(new Date(this.customTo)) : null;
        if (!from && !to) return null;
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
    this.render();
  }

  afterGuiAttached() {}
  destroy() {}
}
