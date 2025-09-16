import * as VueRuntimeModule from "vue";

/* CustomDatePicker + DeadlineFilterRenderer
   - Popup via Teleport para <body>
   - Anti-loop (syncLock)
   - Datas custom em UTC (Apply idempotente)
   - POSICIONAMENTO ROBUSTO (clamp + flip)
   - ESTILO INLINE (imune a resets / CSS faltando)
*/

//import "./list-filter.css"; // opcional para o resto do filtro, o calendário não depende disso

let cachedVueRuntime = null;
function getVueRuntime() {
  if (cachedVueRuntime) {
    return cachedVueRuntime;
  }

  const candidates = [];

  if (typeof window !== "undefined") {
    const winVue = window?.Vue;
    if (winVue) candidates.push(winVue);

    try {
      const parentWin = window.parent;
      if (parentWin && parentWin !== window && parentWin.Vue) {
        candidates.push(parentWin.Vue);
      }
    } catch (err) {
      /* ignore cross-origin access */
    }

    try {
      const frontWindow = window.wwLib?.getFrontWindow?.();
      if (frontWindow?.Vue) {
        candidates.push(frontWindow.Vue);
      }
    } catch (err) {
      /* ignore wwLib access issues */
    }
  }

  if (
    VueRuntimeModule &&
    typeof VueRuntimeModule.createApp === "function"
  ) {
    candidates.push(VueRuntimeModule);
  }

  const moduleDefault = VueRuntimeModule?.default;
  if (moduleDefault && typeof moduleDefault.createApp === "function") {
    candidates.push(moduleDefault);
  }

  cachedVueRuntime =
    candidates.find(
      (candidate) => candidate && typeof candidate.createApp === "function"
    ) || null;

  return cachedVueRuntime;
}

const CustomDatePicker = (() => {
  const VueGlobal = getVueRuntime();

  if (!VueGlobal) {
    console.warn("[CustomDatePicker] Vue global não encontrado.");
    return null;
  }

  const {
    ref,
    computed,
    watch,
    nextTick,
    h,
    Teleport,
    onBeforeUnmount,
  } = VueGlobal;

  return {
    props: {
      modelValue: { type: String, default: "" },
      disabled: { type: Boolean, default: false },
      showTime: { type: Boolean, default: false },
    },
    emits: ["update:modelValue"],
    setup(props, { emit }) {
      // ===== helpers de data/locale =====
      const translateText = (t) => t;
      const ww = window.wwLib?.wwVariable;
      const lang =
        ww?.getValue("aa44dc4c-476b-45e9-a094-16687e063342") ||
        navigator.language;
      const formatStyleRaw =
        ww?.getValue("21a41590-e7d8-46a5-af76-bb3542da1df3") || "european";
      const formatStyle =
        String(formatStyleRaw).toLowerCase() === "american"
          ? "american"
          : "european";

      const isPt = computed(() =>
        String(lang || "").toLowerCase().startsWith("pt")
      );
      const PT_MONTHS = [
        "janeiro",
        "fevereiro",
        "março",
        "abril",
        "maio",
        "junho",
        "julho",
        "agosto",
        "setembro",
        "outubro",
        "novembro",
        "dezembro",
      ];
      const labelToday = computed(() =>
        isPt.value ? "Hoje" : translateText("Today")
      );
      const labelClear = computed(() =>
        isPt.value ? "Limpar" : translateText("Clear")
      );

      const toYMD = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      };
      const parseYMD = (ymd) => {
        if (!ymd) return null;
        const [y, m, d] = ymd.split("-").map(Number);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
      };
      const formatDateByStyle = (yyyyMmDd, style = formatStyle) => {
        if (!yyyyMmDd) return "";
        const [y, m, d] = yyyyMmDd.split("-").map(Number);
        const DD = String(d).padStart(2, "0");
        const MM = String(m).padStart(2, "0");
        const YYYY = String(y);
        return style === "american"
          ? `${MM}/${DD}/${YYYY}`
          : `${DD}/${MM}/${YYYY}`;
      };
      const sameYMD = (a, b) => a && b && toYMD(a) === toYMD(b);

      // ===== refs =====
      const dpWrapper = ref(null);
      const dpOpen = ref(false);
      const dpPopRef = ref(null);
      const dpPopPos = ref({ left: 0, top: 0 });
      const selectedDate = ref("");
      const timePart = ref("00:00");

      // ===== anti-loop =====
      let syncLock = false;

      watch(
        () => props.modelValue,
        (v) => {
          if (syncLock) return;
          const prevDate = selectedDate.value || "";
          let nextDate = "";
          let nextTime = timePart.value;
          if (props.showTime) {
            const [d, t] = (v || "").split("T");
            nextDate = d || "";
            nextTime = t ? t.slice(0, 5) : "00:00";
          } else {
            nextDate = (v || "").split("T")[0] || "";
          }
          if (nextDate !== prevDate || nextTime !== timePart.value) {
            selectedDate.value = nextDate;
            timePart.value = nextTime;
          }
        },
        { immediate: true }
      );

      const dpMonth = ref(0);
      const dpYear = ref(0);
      const weekStart = computed(() =>
        formatStyle === "american" ? 0 : 1
      );

      const weekdayAbbrs = computed(() => {
        if (isPt.value) {
          const base = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
          return weekStart.value === 1
            ? base.slice(1).concat(base.slice(0, 1))
            : base;
        }
        try {
          const base = Array.from({ length: 7 }, (_, i) =>
            new Intl.DateTimeFormat(lang, { weekday: "short" }).format(
              new Date(Date.UTC(2021, 7, 1 + i))
            )
          );
          return weekStart.value === 1
            ? base.slice(1).concat(base.slice(0, 1))
            : base;
        } catch {
          const en = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          return weekStart.value === 1
            ? en.slice(1).concat(en.slice(0, 1))
            : en;
        }
      });

      const monthLabel = computed(() => {
        if (isPt.value) return `${PT_MONTHS[dpMonth.value]} ${dpYear.value}`;
        try {
          return new Intl.DateTimeFormat(lang, {
            month: "long",
            year: "numeric",
          }).format(new Date(dpYear.value, dpMonth.value, 1));
        } catch {
          const EN = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
          ];
          return `${EN[dpMonth.value]} ${dpYear.value}`;
        }
      });

      function makeCell(date, inMonth) {
        const label = date.getDate();
        const today = new Date();
        const sel = parseYMD(selectedDate.value);
        return {
          label,
          dateStr: toYMD(date),
          inMonth,
          isToday: sameYMD(date, today),
          isSelected: sel && sameYMD(date, sel),
        };
      }

      const gridDays = computed(() => {
        const first = new Date(dpYear.value, dpMonth.value, 1);
        const startWeekday = first.getDay();
        const lead = (startWeekday - weekStart.value + 7) % 7;
        const daysInCur = new Date(
          dpYear.value,
          dpMonth.value + 1,
          0
        ).getDate();
        const prevYear = dpMonth.value === 0 ? dpYear.value - 1 : dpYear.value;
        const prevMonth = dpMonth.value === 0 ? 11 : dpMonth.value - 1;
        const daysInPrev = new Date(
          prevYear,
          prevMonth + 1,
          0
        ).getDate();
        const cells = [];
        for (let i = daysInPrev - lead + 1; i <= daysInPrev; i++)
          cells.push(makeCell(new Date(prevYear, prevMonth, i), false));
        for (let i = 1; i <= daysInCur; i++)
          cells.push(makeCell(new Date(dpYear.value, dpMonth.value, i), true));
        const tail = 42 - cells.length;
        const nextYear = dpMonth.value === 11 ? dpYear.value + 1 : dpYear.value;
        const nextMonth = dpMonth.value === 11 ? 0 : dpMonth.value + 1;
        for (let i = 1; i <= tail; i++)
          cells.push(makeCell(new Date(nextYear, nextMonth, i), false));
        return cells;
      });

      // ===== estilos inline (críticos) =====
      const stylePopupBase = {
        position: "fixed",
        zIndex: 2147483647,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        boxShadow: "0 10px 30px rgba(0,0,0,.08)",
        width: "280px",
        padding: "8px",
        userSelect: "none",
        boxSizing: "border-box",
      };
      const styleBackdrop = {
        position: "fixed",
        inset: "0",
        zIndex: 2147483646,
        background: "transparent",
      };
      const sHeader = {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "4px 4px 8px",
      };
      const sTitle = { font: "600 14px/1.2 Inter, system-ui, Arial" };
      const sNav = {
        minWidth: "28px",
        minHeight: "28px",
        border: "1px solid #ccc",
        background: "#f7f7f7",
        borderRadius: "6px",
        padding: "2px 8px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        lineHeight: "1",
        color: "#424242",
      };
      const sWeek = {
        display: "grid",
        gridTemplateColumns: "repeat(7,1fr)",
        gap: "2px",
        padding: "4px 2px",
        color: "#6b7280",
        font: "600 11px/1 Inter, sans-serif",
        textTransform: "uppercase",
        letterSpacing: ".02em",
      };
      const sWeekday = { textAlign: "center" };
      const sGrid = {
        display: "grid",
        gridTemplateColumns: "repeat(7,1fr)",
        gap: "2px",
        padding: "6px 2px 4px",
      };
      const sCell = {
        border: "1px solid transparent",
        background: "transparent",
        borderRadius: "6px",
        padding: "6px 0",
        minHeight: "30px",
        width: "100%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        font: "500 13px/1 Inter, sans-serif",
        lineHeight: "1",
      };
      const sCellMuted = { color: "#9ca3af" };
      const sCellSel = { background: "#e7f0ff", borderColor: "#84a9ff" };
      const sCellToday = { outline: "1px dashed #aaa" };
      const sActions = {
        display: "flex",
        gap: "6px",
        justifyContent: "flex-end",
        paddingTop: "8px",
        flexWrap: "wrap",
      };
      const sAction = {
        flex: 1,
        border: "1px solid #ccc",
        background: "#f7f7f7",
        borderRadius: "6px",
        padding: "4px 8px",
        minHeight: "28px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        font: "600 12px/1 Inter",
      };

      // ===== posicionamento =====
      function computePosition() {
        const rect = dpWrapper.value?.getBoundingClientRect?.();
        const popEl = dpPopRef.value;
        if (!rect || !popEl) return;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const pw = popEl.offsetWidth || 280;
        const ph = popEl.offsetHeight || 320;
        const margin = 8;

        let left = rect.left;
        let top = rect.bottom;

        if (left + pw + margin > vw) left = rect.right - pw;
        if (left < margin) left = margin;
        if (left + pw > vw - margin) left = vw - margin - pw;

        if (top + ph + margin > vh) top = rect.top - ph;

        if (top < margin || top + ph > vh - margin) {
          const centerY = rect.top + rect.height / 2;
          top = Math.min(vh - margin - ph, Math.max(margin, centerY - ph / 2));
        }

        dpPopPos.value = { left: Math.round(left), top: Math.round(top + 80) };
      }

      function openDp() {
        if (dpOpen.value || props.disabled) return;

        const base = selectedDate.value
          ? parseYMD(selectedDate.value)
          : new Date();
        dpMonth.value = base.getMonth();
        dpYear.value = base.getFullYear();

        const rect = dpWrapper.value?.getBoundingClientRect?.();
        if (rect) {
          const vw = window.innerWidth,
            vh = window.innerHeight;
          const margin = 8,
            approxW = 280,
            approxH = 320;
          let left = rect.left,
            top = rect.bottom;

          if (left + approxW + margin > vw) left = rect.right - approxW;
          if (left < margin) left = margin;
          if (top + approxH + margin > vh) top = rect.top - approxH;
          if (top < margin) top = margin;

          dpPopPos.value = { left: Math.round(left), top: Math.round(top) };
        }

        dpOpen.value = true;

        nextTick(() => {
          computePosition();
          window.addEventListener("scroll", computePosition, true);
          window.addEventListener("resize", computePosition, true);
        });
      }

      function closeDp() {
        if (!dpOpen.value) return;
        dpOpen.value = false;
        window.removeEventListener("scroll", computePosition, true);
        window.removeEventListener("resize", computePosition, true);
      }

      onBeforeUnmount(() => {
        window.removeEventListener("scroll", computePosition, true);
        window.removeEventListener("resize", computePosition, true);
      });

      function prevMonth() {
        if (dpMonth.value === 0) {
          dpMonth.value = 11;
          dpYear.value -= 1;
        } else {
          dpMonth.value -= 1;
        }
        nextTick(computePosition);
      }
      function nextMonth() {
        if (dpMonth.value === 11) {
          dpMonth.value = 0;
          dpYear.value += 1;
        } else {
          dpMonth.value += 1;
        }
        nextTick(computePosition);
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
        selectedDate.value = toYMD(new Date());
        emitValue();
        closeDp();
      }
      function clearDate() {
        selectedDate.value = "";
        emitValue();
        closeDp();
      }
      function onTimeInput() {
        emitValue();
      }

      function emitValue() {
        let out = "";
        if (selectedDate.value) {
          out = props.showTime
            ? `${selectedDate.value}T${timePart.value}`
            : selectedDate.value;
        }
        if (out !== (props.modelValue || "")) {
          syncLock = true;
          emit("update:modelValue", out);
          Promise.resolve().then(() => {
            syncLock = false;
          });
        }
      }

      const displayDate = computed(() => {
        if (!selectedDate.value) return "";
        const base = formatDateByStyle(selectedDate.value, formatStyle);
        return props.showTime ? `${base} ${timePart.value}` : base;
      });

      // ===== render =====
      return () => {
        const localChildren = [
          h("input", {
            class: "dp-input",
            type: "text",
            value: displayDate.value,
            readonly: true,
            disabled: props.disabled,
            onClick: (e) => {
              e.stopPropagation();
              if (!props.disabled) openDp();
            },
            "aria-haspopup": "dialog",
            "aria-expanded": dpOpen.value ? "true" : "false",
            style: {
              width: "160px",
              padding: "8px 10px",
              border: "1px solid #d0d5dd",
              borderRadius: "8px",
              background: props.disabled ? "#f2f4f7" : "#fff",
              color: props.disabled ? "#98a2b3" : "inherit",
              cursor: props.disabled ? "not-allowed" : "pointer",
              font: "14px/1.2 Roboto, Arial, sans-serif",
              boxSizing: "border-box",
            },
          }),
          !props.disabled &&
            h(
              "button",
              {
                type: "button",
                class: "dp-icon",
                onClick: (e) => {
                  e.stopPropagation();
                  openDp();
                },
                style: {
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "6px",
                },
              },
              [h("span", { class: "material-symbols-outlined" }, "calendar_month")]
            ),
        ];

        const teleported = dpOpen.value
          ? h(Teleport, { to: "body" }, [
              h("div", {
                class: "dp-backdrop",
                onClick: () => closeDp(),
                style: styleBackdrop,
              }),
              h(
                "div",
                {
                  class: "datepicker-pop",
                  ref: dpPopRef,
                  style: {
                    ...stylePopupBase,
                    left: `${dpPopPos.value.left}px`,
                    top: `${dpPopPos.value.top}px`,
                  },
                },
                [
                  h("div", { class: "dp-header", style: sHeader }, [
                    h(
                      "button",
                      {
                        type: "button",
                        class: "dp-nav",
                        onClick: (e) => {
                          e.stopPropagation();
                          prevMonth();
                        },
                        style: sNav,
                      },
                      "<"
                    ),
                    h("div", { class: "dp-title", style: sTitle }, monthLabel.value),
                    h(
                      "button",
                      {
                        type: "button",
                        class: "dp-nav",
                        onClick: (e) => {
                          e.stopPropagation();
                          nextMonth();
                        },
                        style: sNav,
                      },
                      ">"
                    ),
                  ]),
                  h(
                    "div",
                    { class: "dp-weekdays", style: sWeek },
                    weekdayAbbrs.value.map((d) =>
                      h("div", { class: "dp-weekday", style: sWeekday }, d)
                    )
                  ),
                  h(
                    "div",
                    { class: "dp-grid", style: sGrid },
                    gridDays.value.map((d) =>
                      h(
                        "button",
                        {
                          key: d.dateStr,
                          type: "button",
                          class: "dp-cell",
                          onClick: (e) => {
                            e.stopPropagation();
                            selectDay(d);
                          },
                          style: {
                            ...sCell,
                            ...(d.inMonth ? null : sCellMuted),
                            ...(d.isSelected ? sCellSel : null),
                            ...(d.isToday ? sCellToday : null),
                          },
                        },
                        String(d.label)
                      )
                    )
                  ),
                  props.showTime &&
                    h("div", { class: "dp-time", style: { marginTop: "6px" } }, [
                      h("input", {
                        type: "time",
                        value: timePart.value,
                        onInput: (e) => {
                          e.stopPropagation();
                          timePart.value = e.target.value;
                          onTimeInput();
                        },
                        style: {
                          width: "100%",
                          height: "32px",
                          border: "1px solid #ccc",
                          borderRadius: "6px",
                          padding: "0 8px",
                          font: "13px/1 Inter, Arial",
                          boxSizing: "border-box",
                        },
                      }),
                    ]),
                  h("div", { class: "dp-actions", style: sActions }, [
                    h(
                      "button",
                      {
                        type: "button",
                        class: "dp-action",
                        onClick: (e) => {
                          e.stopPropagation();
                          pickToday();
                        },
                        style: sAction,
                      },
                      labelToday.value
                    ),
                    h(
                      "button",
                      {
                        type: "button",
                        class: "dp-action",
                        onClick: (e) => {
                          e.stopPropagation();
                          clearDate();
                        },
                        style: sAction,
                      },
                      labelClear.value
                    ),
                  ]),
                ]
              ),
            ])
          : null;

        return h(
          "div",
          {
            class: "dp-wrapper",
            ref: dpWrapper,
            style: {
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            },
          },
          teleported ? [...localChildren, teleported] : localChildren
        );
      };
    },
  };
})();

export default class DeadlineFilterRenderer {
  constructor() {
    this.selected = null;
    this.customFrom = "";
    this.customTo = "";
    this.customMode = "equals";

    this.searchText = "";
    this.options = [
      { label: "Today", value: "today" },
      { label: "Yesterday", value: "yesterday" },
      { label: "This week", value: "this_week" },
      { label: "This month", value: "this_month" },
      { label: "Last 30 days", value: "last_30_days" },
      { label: "Customize", value: "custom" },
      { label: "Clear", value: "clear" },
    ];

    this.eGui = null;
    this.listEl = null;
    this.searchContainer = null;
    this.filteredOptions = [...this.options];

    this._Vue = getVueRuntime();
    this.fromApp = null;
    this.toApp = null;
  }

  _unmountPickers() {
    try { this.fromApp?.unmount?.(); } catch {}
    try { this.toApp?.unmount?.(); } catch {}
    this.fromApp = null;
    this.toApp = null;
  }
  _closeAndNotify() {
    this._setSearchVisibility(true);
    this.params?.filterChangedCallback?.();
    this.closePopup();
  }

  init(params) {
    this.params = params;

    this.eGui = document.createElement("div");
    this.eGui.className = "list-filter deadline-filter";
    this.eGui.innerHTML = `
      <div class="field-search">
        <input type="text" placeholder="Search..." class="search-input" />
      </div>
      <div class="filter-list"></div>
    `;

    const searchInput = this.eGui.querySelector(".search-input");
    this.searchContainer = this.eGui.querySelector(".field-search");
    this.listEl = this.eGui.querySelector(".filter-list");

    searchInput.addEventListener("input", (e) => {
      this.searchText = (e.target.value || "").toLowerCase();
      this.filteredOptions = this.options.filter((o) =>
        o.label.toLowerCase().includes(this.searchText)
      );
      this.render();
    });

    this.render();
  }

  getGui() { return this.eGui; }
  afterGuiAttached(params) { this.hidePopup = params?.hidePopup; }
  destroy() { this._unmountPickers(); }
  closePopup() {
    if (typeof this.hidePopup === "function") this.hidePopup();
    else if (this.params?.api?.hidePopupMenu) this.params.api.hidePopupMenu();
  }

  _setSearchVisibility(show) {
    if (!this.searchContainer) return;
    this.searchContainer.style.display = show ? "" : "none";
  }

  render() {
    this._setSearchVisibility(true);
    this._unmountPickers();

    this.listEl.innerHTML = this.filteredOptions
      .map((opt) => {
        const selected = this.selected === opt.value ? " selected" : "";
        const custom = opt.value === "custom" ? " custom" : "";
        return `<div class="filter-item${selected}${custom}" data-value="${opt.value}">
          <span class="filter-label">${opt.label}</span>
          ${opt.value === "custom" ? '<span class="arrow-icon">›</span>' : ""}
        </div>`;
      })
      .join("");

    this.listEl.querySelectorAll(".filter-item").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const value = el.getAttribute("data-value");

        if (value === "custom") {
          this.selected = value;
          this.showCustomInputs();
          return;
        }

        if (value === "clear") {
          this.selected = null;
          this.customFrom = "";
          this.customTo = "";
          this.customMode = "equals";
          this._closeAndNotify();
          return;
        }

        this.selected = value;
        this._closeAndNotify();
      });
    });
  }

  showCustomInputs() {
    this._setSearchVisibility(false);
    this._unmountPickers();

    this.listEl.innerHTML = `
      <div class="custom-header">
        <button class="back-btn" type="button" aria-label="Back">‹</button>
        <span class="custom-title">Customize</span>
      </div>

      <label class="custom-row">
        <span class="custom-label">Mode</span>
        <select class="custom-select">
          <option value="equals">Equals</option>
          <option value="before">Before</option>
          <option value="after">After</option>
          <option value="between">Between</option>
        </select>
      </label>

      <div class="custom-range"></div>

      <div class="custom-actions">
        <button type="button" class="apply-btn" disabled>Apply</button>
        <button type="button" class="cancel-btn">Cancel</button>
      </div>
    `;

    const backBtn = this.listEl.querySelector(".back-btn");
    const select = this.listEl.querySelector(".custom-select");
    const rangeHost = this.listEl.querySelector(".custom-range");
    const applyBtn = this.listEl.querySelector(".apply-btn");
    const cancelBtn = this.listEl.querySelector(".cancel-btn");

    backBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.render();
    });
    select.value = this.customMode;
    select.addEventListener("change", (e) => {
      e.stopPropagation();
      this.customMode = e.target.value;
      this._renderRangePickers(rangeHost, applyBtn);
    });
    cancelBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.render();
    });

    this._renderRangePickers(rangeHost, applyBtn);
  }

  _renderRangePickers(rangeHost, applyBtn) {
    this._unmountPickers();
    rangeHost.innerHTML = "";

    const needFrom =
      this.customMode === "equals" ||
      this.customMode === "after" ||
      this.customMode === "between";
    const needTo =
      this.customMode === "before" || this.customMode === "between";

    if (needFrom) {
      const fromWrap = document.createElement("div");
      fromWrap.className = "picker-row";
      fromWrap.innerHTML = `<div class="picker-label">From</div><div class="picker-mount from-mount"></div>`;
      rangeHost.appendChild(fromWrap);
    } else {
      this.customFrom = "";
    }

    if (needTo) {
      const toWrap = document.createElement("div");
      toWrap.className = "picker-row";
      toWrap.innerHTML = `<div class="picker-label">To</div><div class="picker-mount to-mount"></div>`;
      rangeHost.appendChild(toWrap);
    } else {
      this.customTo = "";
    }

    const mountPicker = (mountEl, initial, onChange) => {
      const runtime = this._Vue || getVueRuntime();
      if (runtime && runtime !== this._Vue) {
        this._Vue = runtime;
      }

      if (!runtime || !CustomDatePicker) {
        mountEl.innerHTML =
          `<div class="dp-fallback" title="Vue indisponível">Select date</div>`;
        return { unmount: () => {} };
      }
      const { createApp, h } = runtime;
      const app = createApp({
        data: () => ({ val: initial || "" }),
        render() {
          return h(CustomDatePicker, {
            modelValue: this.val,
            "onUpdate:modelValue": (v) => {
              const only = (v || "").split("T")[0] || "";
              if (only !== this.val) {
                this.val = only;
                onChange(only);
              }
            },
            showTime: false,
          });
        },
      });
      return app.mount(mountEl);
    };

    if (needFrom) {
      const fromMount = rangeHost.querySelector(".from-mount");
      const initFrom = this.customFrom || "";
      this.fromApp = mountPicker(fromMount, initFrom, (v) => {
        if (v !== this.customFrom) {
          this.customFrom = v;
          this._refreshApplyState(applyBtn);
        }
      });
    }

    if (needTo) {
      const toMount = rangeHost.querySelector(".to-mount");
      const initTo = this.customTo || "";
      this.toApp = mountPicker(toMount, initTo, (v) => {
        if (v !== this.customTo) {
          this.customTo = v;
          this._refreshApplyState(applyBtn);
        }
      });
    }

    applyBtn.onclick = (e) => {
      e.stopPropagation();
      if (applyBtn.disabled) return;
      if (this.customMode === "equals") this.customTo = this.customFrom;
      if (this.customMode === "before") this.customFrom = "";
      if (this.customMode === "after") this.customTo = "";
      this.selected = "custom";
      this._closeAndNotify();
    };

    this._refreshApplyState(applyBtn);
  }

  _refreshApplyState(applyBtn) {
    const valid = (() => {
      switch (this.customMode) {
        case "equals":
          return !!this.customFrom;
        case "before":
          return !!this.customTo;
        case "after":
          return !!this.customFrom;
        case "between":
          return !!this.customFrom || !!this.customTo;
        default:
          return false;
      }
    })();
    applyBtn.disabled = !valid;
  }

  // Presets em horário local
  _startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  _endOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }

  // Custom em UTC
  _ymdToUTC(ymd) {
    if (!ymd) return null;
    const [y, m, d] = ymd.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d));
  }
  _startOfDayUTC(dUTC) {
    return new Date(
      Date.UTC(
        dUTC.getUTCFullYear(),
        dUTC.getUTCMonth(),
        dUTC.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );
  }
  _endOfDayUTC(dUTC) {
    return new Date(
      Date.UTC(
        dUTC.getUTCFullYear(),
        dUTC.getUTCMonth(),
        dUTC.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );
  }

  _parseDateValue(raw) {
    if (raw instanceof Date) {
      return isNaN(raw.getTime()) ? null : new Date(raw.getTime());
    }
    if (typeof raw === "number") {
      const fromNumber = new Date(raw);
      return isNaN(fromNumber.getTime()) ? null : fromNumber;
    }
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      let candidate = trimmed;
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(trimmed) && !/[\+\-]\d{2}$/.test(trimmed)) {
        candidate = trimmed.replace(" ", "T");
      } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[\+\-]\d{2}$/.test(trimmed)) {
        candidate = trimmed.replace(" ", "T").replace(/([\+\-]\d{2})$/, "$1:00");
      }
      const fromString = new Date(candidate);
      return isNaN(fromString.getTime()) ? null : fromString;
    }
    return null;
  }

  getSelectedRange() {
    const now =
      window.gridDeadlineNow instanceof Date
        ? new Date(window.gridDeadlineNow)
        : new Date();
    const todayStart = this._startOfDay(now);

    switch (this.selected) {
      case "today":
        return { from: todayStart, to: this._endOfDay(todayStart) };
      case "yesterday": {
        const y = new Date(todayStart);
        y.setDate(y.getDate() - 1);
        return { from: y, to: this._endOfDay(y) };
      }
      case "this_week": {
        const day = todayStart.getDay(),
          diff = day === 0 ? -6 : 1 - day;
        const start = new Date(todayStart);
        start.setDate(start.getDate() + diff);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { from: start, to: this._endOfDay(end) };
      }
      case "this_month": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { from: start, to: this._endOfDay(end) };
      }
      case "last_30_days": {
        const start = new Date(todayStart);
        start.setDate(start.getDate() - 29);
        return { from: start, to: this._endOfDay(todayStart) };
      }
      case "custom": {
        let fromUTC = this.customFrom
          ? this._startOfDayUTC(this._ymdToUTC(this.customFrom))
          : null;
        let toUTC = this.customTo
          ? this._endOfDayUTC(this._ymdToUTC(this.customTo))
          : null;

        switch (this.customMode) {
          case "equals":
            if (!fromUTC) return null;
            toUTC = this._endOfDayUTC(this._ymdToUTC(this.customFrom));
            break;
          case "before":
            if (!toUTC) return null;
            fromUTC = null;
            break;
          case "after":
            if (!fromUTC) return null;
            toUTC = null;
            break;
          case "between":
            if (!fromUTC && !toUTC) return null;
            break;
        }
        return { from: fromUTC, to: toUTC };
      }
      default:
        return null;
    }
  }

  doesFilterPass(params) {
    const field = this.params?.colDef?.field;
    const rawValue = params?.data ? params.data[field] : undefined;
    const dateValue = this._parseDateValue(rawValue);
    if (!dateValue) return false;
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
      this.customFrom = "";
      this.customTo = "";
      this.customMode = "equals";
      this.render();
      return;
    }
    this.selected = model.option || null;
    this.customFrom = model.from ? model.from.slice(0, 10) : "";
    this.customTo = model.to ? model.to.slice(0, 10) : "";
    this.customMode = model.mode || "equals";
    if (this.selected === "custom") this.showCustomInputs();
    else this.render();
  }
}
