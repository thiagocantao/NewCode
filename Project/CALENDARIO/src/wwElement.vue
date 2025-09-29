<template>
  <div class="corporate-calendar">
    <div class="shift-config">
      <table class="shift-table">
        <thead>
          <tr>
            <th class="headerHoras">{{ translateText('Operating Days') }}</th>
            <th class="headerHoras" colspan="7">{{ translateText('Operating Hours') }}</th>
            <th class="headerHoras"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(day, index) in weekDays" :key="day.name">
            <td>
              <input type="checkbox" style="cursor:pointer" v-model="day.active" />
              {{ day.label }}
            </td>
            <td>
              <select v-model="day.shift1Start" :disabled="!day.active">
                <option value=""></option>
                <option v-for="hour in hours" :key="hour.value" :value="hour.value">
                  {{ hour.label }}
                </option>
              </select>
            </td>
            <td>-</td>
            <td>
              <select v-model="day.shift1End" :disabled="!day.active">
                <option value=""></option>
                <option v-for="hour in hours" :key="hour.value" :value="hour.value">
                  {{ hour.label }}
                </option>
              </select>
              <span
                v-if="isInconsistent(day, 'shift1End')"
                class="warning-icon"
                :title="translateText('There are incompatible times of the day')"
              >⚠️</span>
            </td>
            <td>,</td>
            <td>
              <select v-model="day.shift2Start" :disabled="!day.active">
                <option value=""></option>
                <option v-for="hour in hours" :key="hour.value" :value="hour.value">
                  {{ hour.label }}
                </option>
              </select>
              <span
                v-if="isInconsistent(day, 'shift2Start')"
                class="warning-icon"
                :title="translateText('There are incompatible times of the day')"
              >⚠️</span>
            </td>
            <td>-</td>
            <td>
              <select v-model="day.shift2End" :disabled="!day.active">
                <option value=""></option>
                <option v-for="hour in hours" :key="hour.value" :value="hour.value">
                  {{ hour.label }}
                </option>
              </select>
              <span
                v-if="isInconsistent(day, 'shift2End')"
                class="warning-icon"
                :title="translateText('There are incompatible times of the day')"
              >⚠️</span>
            </td>
            <td style="border-left: 1px solid #acacad">
              <button v-if="index === 0" class="buttonFormat" @click="confirmCopy">
                {{ translateText('Copy') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Excluded dates -->
    <div>
      <h3 class="h3">{{ translateText('Exclude dates') }}</h3>
      <div class="excluded-dates-wrapper">
        <div class="excluded-dates" ref="excludedRoot">
          <table>
            <thead>
              <tr>
                <th style="width:155px" class="headerDias">{{ translateText('Date') }}</th>
                <th class="headerHoras">{{ translateText('Action') }}</th>
              </tr>
            </thead>
            <tbody
              class="excluded-body"
              ref="excludedBodyEl"
              :style="{ maxHeight: excludedDatesHeight }"
            >
              <tr>
                <td style="width:155px">
                  <div class="dp-wrapper" ref="dpWrapper">
                    <input
                      class="inputDate dp-input"
                      type="text"
                      ref="dpInput"
                      :value="displayDate"
                      :placeholder="formatStyle === 'american' ? 'mm/dd/yyyy' : 'dd/mm/yyyy'"
                      readonly
                      @pointerdown.stop.prevent="openDp"
                      @mousedown.stop.prevent="openDp"
                      @click.stop.prevent="openDp"
                      @focus="openDp"
                      @keydown.enter.prevent="openDp"
                      aria-haspopup="dialog"
                      :aria-expanded="dpOpen ? 'true' : 'false'"
                    />
                    <button
                      type="button"
                      class="dp-icon"
                      title="Abrir calendário"
                      aria-label="Abrir calendário"
                      @pointerdown.stop.prevent="openDp"
                      @mousedown.stop.prevent="openDp"
                      @click.stop.prevent="openDp"
                    >
                      <span class="material-symbols-outlined">calendar_month</span>
                    </button>

                    <!-- POPUP (position: fixed; abre para cima) -->
                    <div v-if="dpOpen" class="datepicker-pop" :style="dpPopStyle">
                      <div class="dp-header">
                        <button type="button" class="dp-nav" @click="prevMonth">‹</button>
                        <div class="dp-title">{{ monthLabel }}</div>
                        <button type="button" class="dp-nav" @click="nextMonth">›</button>
                      </div>
                      <div class="dp-weekdays">
                        <div v-for="w in weekdayAbbrs" :key="w" class="dp-weekday">{{ w }}</div>
                      </div>
                      <div class="dp-grid">
                        <button
                          v-for="d in gridDays"
                          :key="d.key"
                          type="button"
                          class="dp-cell"
                          :class="{ 'is-muted': !d.inMonth, 'is-today': d.isToday, 'is-selected': d.isSelected }"
                          @click="selectDay(d)"
                        >
                          {{ d.label }}
                        </button>
                      </div>
                      <div class="dp-actions">
                        <button type="button" class="dp-action" @click="pickToday">{{ labelToday }}</button>
                        <button type="button" class="dp-action" @click="clearDate">{{ labelClear }}</button>
                      </div>
                    </div>

                    <input type="hidden" v-model="newExcludedDate" />
                  </div>
                </td>
                <td>
                  <button class="buttonFormat" @click="addExcludedDate">
                    {{ translateText('Add') }}
                  </button>
                </td>
              </tr>

              <tr v-for="date in excludedDates" :key="date">
                <td style="width:155px">{{ formatDate(date.date) }}</td>
                <td>
                  <button class="buttonFormat" @click="removeExcluded(date)">
                    {{ translateText('Delete') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="showDefaultCalendarMessage" class="default-calendar-message">
          {{ translateText(defaultCalendarMessage) }}
        </p>
      </div>
    </div>

    <div v-if="showConfirm" class="popup-overlay">
      <div class="popup-content">
        <p>{{ translateText('Copy hours configuration to all days?') }}</p>
        <div style="display:flex; gap:10px; justify-content:center;margin-top:15px">
          <button class="buttonFormat" @click="copyFirstRow">{{ translateText('Confirm') }}</button>
          <button class="buttonFormat" @click="cancelCopy">{{ translateText('Cancel') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from "vue";

export default {
  props: {
    content: { type: Object, required: true },
    uid: { type: String, required: true },
    dataSource: { type: [Object, String], default: null },
    excludedDatesHeight: { type: String, default: "150px" },
    showDefaultCalendarMessage: { type: Boolean, default: false },
    defaultCalendarMessage: {
      type: String,
      default:
        "No specific operating calendar is defined for this contract. The standard operating calendar is in use.",
    },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
  },
  setup(props) {
    const translateText = (text) => text;

    // ===== Configs WeWeb (IDs fornecidos) =====
    const ww = window.wwLib?.wwVariable;
    const lang =
      ww?.getValue("aa44dc4c-476b-45e9-a094-16687e063342") || navigator.language;
    const formatStyleRaw =
      ww?.getValue("21a41590-e7d8-46a5-af76-bb3542da1df3") || "european";
    const formatStyle =
      String(formatStyleRaw).toLowerCase() === "american" ? "american" : "european";
    const timeZone =
      ww?.getValue("7509df4b-d0bc-40c3-a542-bfe0e22f5ec6") || "America/Sao_Paulo";

    // ===== Locale/PT fallbacks =====
    const isPt = computed(() => String(lang || "").toLowerCase().startsWith("pt"));
    const PT_MONTHS = [
      "janeiro","fevereiro","março","abril","maio","junho",
      "julho","agosto","setembro","outubro","novembro","dezembro"
    ];
    const PT_WEEKDAYS_SHORT = ["dom","seg","ter","qua","qui","sex","sáb"];
    const labelToday = computed(() => (isPt.value ? "Hoje" : translateText("Today")));
    const labelClear = computed(() => (isPt.value ? "Limpar" : translateText("Clear")));

    // ===== Helpers de data =====
    function toYMD(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    function parseYMD(ymd) {
      if (!ymd) return null;
      const [y, m, d] = ymd.split("-").map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    }
    function formatDateByStyle(yyyyMmDd, style = formatStyle) {
      if (!yyyyMmDd) return "";
      const [y, m, d] = yyyyMmDd.split("-").map(Number);
      const DD = String(d).padStart(2, "0");
      const MM = String(m).padStart(2, "0");
      const YYYY = String(y);
      return style === "american" ? `${MM}/${DD}/${YYYY}` : `${DD}/${MM}/${YYYY}`;
    }

    // ===== Aliases de dias (para casar names do dataSource) =====
    const DAY_ALIASES = {
      Mon: ["Mon","Seg","Segunda","Segunda-feira"],
      Tue: ["Tue","Ter","Terca","Terça","Terça-feira"],
      Wed: ["Wed","Qua","Quarta","Quarta-feira"],
      Thu: ["Thu","Qui","Quinta","Quinta-feira"],
      Fri: ["Fri","Sex","Sexta","Sexta-feira"],
      Sat: ["Sat","Sab","Sáb","Sabado","Sábado"],
      Sun: ["Sun","Dom","Domingo"],
    };
    function norm(str) {
      return String(str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");
    }
    function matchKeyByName(name) {
      const n = norm(name);
      for (const [key, list] of Object.entries(DAY_ALIASES)) {
        if (list.some(alias => norm(alias) === n)) return key;
      }
      return null;
    }

    // ===== Normalização de horários e extras =====
    function normalizeTime(s) {
      if (s === null || s === undefined) return "";
      if (typeof s !== "string") s = String(s);
      s = s.trim();
      if (!s) return "";

      // AM/PM
      const ampm = s.match(/^(\d{1,2}):?(\d{2})(?::\d{2})?\s*([AaPp][Mm])$/);
      if (ampm) {
        let h = parseInt(ampm[1], 10);
        const m = parseInt(ampm[2], 10);
        const isPM = /p/i.test(ampm[3]);
        if (h === 12) h = 0;
        if (isPM) h += 12;
        if (h >= 0 && h < 24 && m >= 0 && m < 60) {
          return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        }
      }

      // HH:mm | H:mm | HH.mm | H.mm | HHmm
      let m = s.match(/^(\d{1,2})[:\.hH](\d{1,2})(?::\d{1,2})?$/);
      if (!m) m = s.match(/^(\d{1,2})(\d{2})$/);
      if (m) {
        const h = parseInt(m[1], 10);
        const mm = parseInt(m[2], 10);
        if (h >= 0 && h < 24 && mm >= 0 && mm < 60) {
          return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
        }
      }

      // HH:mm:ss
      const hms = s.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
      if (hms) {
        const h = parseInt(hms[1], 10);
        const mm = parseInt(hms[2], 10);
        if (h >= 0 && h < 24 && mm >= 0 && mm < 60) {
          return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
        }
      }
      return "";
    }

    function minutesFromHHMM(v) {
      const [h, m] = v.split(":").map(Number);
      return h * 60 + m;
    }
    function labelForTime(valueHHMM) {
      const [h, m] = valueHHMM.split(":").map(Number);
      if (formatStyle === "american") {
        const h12 = (h % 12) || 12;
        const period = h < 12 ? "AM" : "PM";
        return `${h12}:${String(m).padStart(2, "0")} ${period}`;
      }
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    const extraTimes = ref(new Set());
    function ensureExtraTimesFromWeekDays(days) {
      const fields = ["shift1Start", "shift1End", "shift2Start", "shift2End"];
      for (const d of days) {
        for (const f of fields) {
          const v = normalizeTime(d[f]);
          if (v) extraTimes.value.add(v);
        }
      }
    }

    // ===== Datepicker interno =====
    const dpWrapper = ref(null);
    const dpInput   = ref(null);
    const dpOpen    = ref(false);
    const dpPopStyle = ref({}); // estilo calculado (position: fixed)

    const newExcludedDate = ref("");

    const dpMonth = ref(0);
    const dpYear  = ref(0);
    const weekStart = computed(() => (formatStyle === "american" ? 0 : 1)); // 0=Dom, 1=Seg

    const weekdayAbbrs = computed(() => {
      if (isPt.value) {
        const base = [...PT_WEEKDAYS_SHORT];
        return weekStart.value === 1 ? base.slice(1).concat(base.slice(0, 1)) : base;
      }
      try {
        const base = Array.from({ length: 7 }, (_, i) =>
          new Intl.DateTimeFormat(lang, { weekday: "short" }).format(
            new Date(Date.UTC(2021, 7, 1 + i))
          )
        );
        return weekStart.value === 1 ? base.slice(1).concat(base.slice(0, 1)) : base;
      } catch {
        const en = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        return weekStart.value === 1 ? en.slice(1).concat(en.slice(0, 1)) : en;
      }
    });

    const monthLabel = computed(() => {
      if (isPt.value) return `${PT_MONTHS[dpMonth.value]} ${dpYear.value}`;
      try {
        return new Intl.DateTimeFormat(lang, { month: "long", year: "numeric" })
          .format(new Date(dpYear.value, dpMonth.value, 1));
      } catch {
        const EN_MONTHS = [
          "January","February","March","April","May","June",
          "July","August","September","October","November","December"
        ];
        return `${EN_MONTHS[dpMonth.value]} ${dpYear.value}`;
      }
    });

    function sameYMD(a, b) {
      return a && b &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
    }
    function makeCell(date, inMonth) {
      const today = new Date();
      const selected = parseYMD(newExcludedDate.value);
      return {
        key: toYMD(date) + (inMonth ? "" : "-o"),
        label: date.getDate(),
        dateStr: toYMD(date),
        inMonth,
        isToday: sameYMD(date, today),
        isSelected: sameYMD(date, selected),
      };
    }
    const gridDays = computed(() => {
      const first = new Date(dpYear.value, dpMonth.value, 1);
      const startWeekday = first.getDay();
      const lead = (startWeekday - weekStart.value + 7) % 7;

      const daysInCur = new Date(dpYear.value, dpMonth.value + 1, 0).getDate();
      const prevYear  = dpMonth.value === 0 ? dpYear.value - 1 : dpYear.value;
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
      const nextYear  = dpMonth.value === 11 ? dpYear.value + 1 : dpYear.value;
      const nextMonth = dpMonth.value === 11 ? 0 : dpMonth.value + 1;
      for (let i = 1; i <= tail; i++) {
        cells.push(makeCell(new Date(nextYear, nextMonth, i), false));
      }
      return cells;
    });

    function updatePopoverPosition() {
      const wrap = dpWrapper.value;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      // abre para cima: encosta a base do pop sobre o topo do input
      const left = Math.round(rect.left);
      const bottom = Math.round(window.innerHeight - rect.top + 4); // +4px gap
      dpPopStyle.value = {
        position: "fixed",
        left: `${left}px`,
        bottom: `${bottom}px`,
        minWidth: `${Math.max(rect.width, 230)}px`,
        zIndex: 2147483647,
      };
    }

    function openDp() {
      const base = parseYMD(newExcludedDate.value) || new Date();
      dpMonth.value = base.getMonth();
      dpYear.value  = base.getFullYear();
      dpOpen.value  = true;
      nextTick(() => {
        updatePopoverPosition();
        try { dpInput.value && dpInput.value.focus(); } catch(e) {}
        window.addEventListener("scroll", updatePopoverPosition, true);
        window.addEventListener("resize", updatePopoverPosition, true);
      });
    }
    function closeDp() {
      dpOpen.value = false;
      window.removeEventListener("scroll", updatePopoverPosition, true);
      window.removeEventListener("resize", updatePopoverPosition, true);
    }
    function prevMonth() { dpMonth.value = dpMonth.value === 0 ? 11 : dpMonth.value - 1; if (dpMonth.value === 11) dpYear.value--; nextTick(updatePopoverPosition); }
    function nextMonth() { dpMonth.value = dpMonth.value === 11 ? 0  : dpMonth.value + 1; if (dpMonth.value === 0)  dpYear.value++;  nextTick(updatePopoverPosition); }
    function selectDay(d) { if (!d.inMonth) return; newExcludedDate.value = d.dateStr; closeDp(); }
    function pickToday() { newExcludedDate.value = toYMD(new Date()); closeDp(); }
    function clearDate() { newExcludedDate.value = ""; closeDp(); }

    // Clique fora fecha
    function onDocClick(e) {
      if (!dpOpen.value) return;
      const inside = dpWrapper.value && dpWrapper.value.contains(e.target);
      if (!inside) closeDp();
    }
    onMounted(() => document.addEventListener("click", onDocClick, true));
    onBeforeUnmount(() => {
      document.removeEventListener("click", onDocClick, true);
      window.removeEventListener("scroll", updatePopoverPosition, true);
      window.removeEventListener("resize", updatePopoverPosition, true);
    });

    // Handlers nativos em CAPTURE (garantem abertura em builders)
    const cleanupFns = [];
    function attachNativeOpenHandlers() {
      const el = dpInput.value;
      if (!el) return;
      const handler = (e) => {
        try { e.preventDefault(); e.stopPropagation(); } catch(_) {}
        openDp();
      };
      ["pointerdown", "mousedown", "click", "focus"].forEach((evt) => {
        el.addEventListener(evt, handler, { capture: true });
        cleanupFns.push(() => el.removeEventListener(evt, handler, { capture: true }));
      });
    }
    onMounted(() => nextTick(attachNativeOpenHandlers));
    onBeforeUnmount(() => cleanupFns.forEach((fn) => { try { fn(); } catch(_) {} }));

    const displayDate = computed(() =>
      newExcludedDate.value ? formatDateByStyle(newExcludedDate.value, formatStyle) : ""
    );

    // ===== Lógica/estrutura de horários =====
    const defaultWeekDays = [
      { name: "Mon", label: translateText("Monday"),    active: false, shift1Start: "", shift1End: "", shift2Start: "", shift2End: "" },
      { name: "Tue", label: translateText("Tuesday"),   active: false, shift1Start: "", shift1End: "", shift2Start: "", shift2End: "" },
      { name: "Wed", label: translateText("Wednesday"), active: false, shift1Start: "", shift1End: "", shift2Start: "", shift2End: "" },
      { name: "Thu", label: translateText("Thursday"),  active: false, shift1Start: "", shift1End: "", shift2Start: "", shift2End: "" },
      { name: "Fri", label: translateText("Friday"),    active: false, shift1Start: "", shift1End: "", shift2Start: "", shift2End: "" },
      { name: "Sat", label: translateText("Saturday"),  active: false, shift1Start: "", shift1End: "", shift2Start: "", shift2End: "" },
      { name: "Sun", label: translateText("Sunday"),    active: false, shift1Start: "", shift1End: "", shift2Start: "", shift2End: "" },
    ];
    const weekDays = ref(defaultWeekDays.map((d) => ({ ...d })));

    // Grade base 15/15
    const baseQuarterHours = computed(() =>
      Array.from({ length: 96 }, (_, i) => {
        const h24 = Math.floor(i / 4);
        const m   = [0, 15, 30, 45][i % 4];
        return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      })
    );

    // Lista final de horas = base + extras do dataSource
    const hours = computed(() => {
      const all = new Set(baseQuarterHours.value);
      for (const v of extraTimes.value) all.add(v);
      const ordered = Array.from(all).sort((a, b) => minutesFromHHMM(a) - minutesFromHHMM(b));
      return ordered.map((value) => ({ value, label: labelForTime(value) }));
    });

    function timeToMinutes(time) { if (!time) return null; const [h, m] = time.split(":").map(Number); return h * 60 + m; }
    function isInconsistent(day, field) {
      const order = ["shift1Start", "shift1End", "shift2Start", "shift2End"];
      let last = null;
      for (const key of order) {
        const val = day[key];
        if (val) {
          const minutes = timeToMinutes(val);
          if (last !== null && minutes < last) { if (key === field) return true; }
          else { last = minutes; }
        }
      }
      return false;
    }

    const hasHourInconsistency = ref(false);
    watch(weekDays, (days) => {
      hasHourInconsistency.value = days.some((day) =>
        ["shift1Start", "shift1End", "shift2Start", "shift2End"].some((field) => isInconsistent(day, field))
      );
    }, { deep: true, immediate: true });

    const excludedDates = ref([]);
    const showConfirm = ref(false);

    const excludedDatesHeight = ref(props.content.excludedDatesHeight || props.excludedDatesHeight);
    watch(() => props.content.excludedDatesHeight, (v) => (excludedDatesHeight.value = v));
    watch(() => props.excludedDatesHeight, (v) => (excludedDatesHeight.value = v));

    const showDefaultCalendarMessage = ref(
      props.content.showDefaultCalendarMessage || props.showDefaultCalendarMessage
    );
    watch(() => props.content.showDefaultCalendarMessage, (v) => (showDefaultCalendarMessage.value = v));
    watch(() => props.showDefaultCalendarMessage, (v) => (showDefaultCalendarMessage.value = v));

    const defaultCalendarMessage = ref(
      props.content.defaultCalendarMessage ||
        props.defaultCalendarMessage ||
        "No specific operating calendar is defined for this contract. The standard operating calendar is in use."
    );
    watch(() => props.content.defaultCalendarMessage, (v) => (defaultCalendarMessage.value = v));
    watch(() => props.defaultCalendarMessage, (v) => (defaultCalendarMessage.value = v));

    function resetDataSource() {
      weekDays.value = defaultWeekDays.map((day) => ({ ...day }));
      excludedDates.value = [];
      extraTimes.value = new Set();
    }

    function normalizeWeekDaysArray(arr) {
      return arr.map((d) => {
        const nd = { ...d };
        nd.shift1Start = normalizeTime(nd.shift1Start) || "";
        nd.shift1End   = normalizeTime(nd.shift1End)   || "";
        nd.shift2Start = normalizeTime(nd.shift2Start) || "";
        nd.shift2End   = normalizeTime(nd.shift2End)   || "";
        return nd;
      });
    }

    function loadDataSource(ds) {
      let parsed = ds;
      if (!parsed || (typeof parsed === "string" && !parsed.trim())) {
        resetDataSource();
        return;
      }
      if (typeof parsed === "string") {
        try { parsed = JSON.parse(parsed); } catch { resetDataSource(); return; }
      }

      // limpa extras sempre que recarrega
      extraTimes.value = new Set();

      // excludedDates
      excludedDates.value = Array.isArray(parsed.excludedDates) ? [...parsed.excludedDates] : [];

      if (!Array.isArray(parsed.weekDays) || parsed.weekDays.length === 0) {
        resetDataSource();
        return;
      }

      // 1) Casar por nome com aliases
      const normalized = normalizeWeekDaysArray(parsed.weekDays);
      const mapByKey = new Map(); // Mon..Sun -> objeto normalizado
      for (const item of normalized) {
        const key = matchKeyByName(item?.name);
        if (!key) continue;
        mapByKey.set(key, {
          name: key,
          active: !!item.active,
          shift1Start: item.shift1Start || "",
          shift1End:   item.shift1End   || "",
          shift2Start: item.shift2Start || "",
          shift2End:   item.shift2End   || "",
        });
      }

      let updatedDays;
      if (mapByKey.size >= 5) {
        const orderKeys = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
        updatedDays = defaultWeekDays.map(day => {
          const hit = mapByKey.get(day.name);
          return {
            ...day,
            active: hit ? hit.active : false,
            shift1Start: hit?.shift1Start || "",
            shift1End:   hit?.shift1End   || "",
            shift2Start: hit?.shift2Start || "",
            shift2End:   hit?.shift2End   || "",
          };
        });
      } else if (normalized.length === 7) {
        // 2) Fallback por índice (assume ordem Seg..Dom)
        updatedDays = defaultWeekDays.map((day, i) => ({
          ...day,
          active: normalized[i]?.active ?? false,
          shift1Start: normalized[i]?.shift1Start || "",
          shift1End:   normalized[i]?.shift1End   || "",
          shift2Start: normalized[i]?.shift2Start || "",
          shift2End:   normalized[i]?.shift2End   || "",
        }));
      } else {
        resetDataSource();
        return;
      }

      weekDays.value = updatedDays;
      ensureExtraTimesFromWeekDays(updatedDays);
    }

    const calendarValues = ref({
      weekDays: weekDays.value.map((d) => ({ ...d })),
      excludedDates: [...excludedDates.value],
    });

    watch([weekDays, excludedDates], () => {
      calendarValues.value = {
        weekDays: weekDays.value.map((d) => ({ ...d })),
        excludedDates: [...excludedDates.value],
      };
    }, { deep: true });

    watch([() => props.content.dataSource, () => props.dataSource], ([contentDS, propDS]) => {
      const ds = propDS ?? contentDS;
      if (ds && (typeof ds !== "string" || ds.trim())) loadDataSource(ds);
      else resetDataSource();
    }, { deep: true, immediate: true });

    if (typeof wwLib !== "undefined" && wwLib.wwVariable && wwLib.wwVariable.useComponentVariable) {
      const { setValue: setCalendarValues } = wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: "calendarValues",
        type: "object",
        defaultValue: calendarValues.value,
      });
      watch(calendarValues, (val) => setCalendarValues(val), { deep: true, immediate: true });

      const { setValue: setHasHourInconsistency } = wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: "hasHourInconsistency",
        type: "boolean",
        defaultValue: hasHourInconsistency.value,
      });
      watch(hasHourInconsistency, (val) => setHasHourInconsistency(val), { immediate: true });
    }

    function addExcludedDate() {
      if (!newExcludedDate.value) return;
      if (!excludedDates.value.includes(newExcludedDate.value)) excludedDates.value.push({"date":newExcludedDate.value});
      newExcludedDate.value = "";
    }
    function removeExcluded(dateString) 
    { 
      excludedDates.value = excludedDates.value.filter((d) => d.date !== dateString.date); 
      }
    function formatDate(dateString) { return formatDateByStyle(dateString, formatStyle); }

    function confirmCopy() { showConfirm.value = true; }
    function copyFirstRow() {
      const first = weekDays.value[0];
      for (let i = 1; i < weekDays.value.length; i++) {
        weekDays.value[i].active = first.active;
        weekDays.value[i].shift1Start = first.shift1Start;
        weekDays.value[i].shift1End   = first.shift1End;
        weekDays.value[i].shift2Start = first.shift2Start;
        weekDays.value[i].shift2End   = first.shift2End;
      }
      showConfirm.value = false;
    }
    function cancelCopy() { showConfirm.value = false; }

    // ---------- Alinhamento/scroll ----------
    const excludedRoot = ref(null);
    const excludedBodyEl = ref(null);
    const excludedHasScroll = ref(false);
    let ro, mo;

    function measureScrollbarWidth() {
      const probe = document.createElement("div");
      probe.style.cssText = "width:100px;height:100px;overflow:scroll;position:absolute;top:-9999px";
      document.body.appendChild(probe);
      const sbw = probe.offsetWidth - probe.clientWidth;
      probe.remove();
      if (excludedRoot.value) {
        excludedRoot.value.style.setProperty("--sbw", (sbw || 6) + "px");
      }
    }
    function syncHeaderPadding() {
      if (!excludedBodyEl.value) return;
      const has = excludedBodyEl.value.scrollHeight > excludedBodyEl.value.clientHeight + 1;
      excludedHasScroll.value = has;
    }

    onMounted(async () => {
      await nextTick();
      measureScrollbarWidth();
      syncHeaderPadding();

      if (window.ResizeObserver && excludedBodyEl.value) {
        ro = new ResizeObserver(syncHeaderPadding);
        ro.observe(excludedBodyEl.value);
      }
      if (window.MutationObserver && excludedBodyEl.value) {
        mo = new MutationObserver(syncHeaderPadding);
        mo.observe(excludedBodyEl.value, { childList: true, subtree: false });
      }
    });

    onBeforeUnmount(() => {
      if (ro && excludedBodyEl.value) ro.unobserve(excludedBodyEl.value);
      if (mo) mo.disconnect();
    });

    watch([excludedDates, excludedDatesHeight], () => nextTick().then(syncHeaderPadding), { deep: true });

    return {
      // estado principal
      weekDays, hours,
      excludedDates, newExcludedDate,

      // datepicker
      dpWrapper, dpInput, dpOpen, dpPopStyle,
      openDp, closeDp, prevMonth, nextMonth, selectDay, pickToday, clearDate,
      weekdayAbbrs, monthLabel, gridDays, displayDate,
      labelToday, labelClear,

      // ações
      addExcludedDate, removeExcluded, formatDate,
      confirmCopy, copyFirstRow, cancelCopy,

      // derivados/flags
      showConfirm, calendarValues, excludedDatesHeight,
      showDefaultCalendarMessage, defaultCalendarMessage,
      translateText, isInconsistent, hasHourInconsistency,

      // configs
      lang, timeZone, formatStyle,

      // refs tabela excluídos
      excludedRoot, excludedBodyEl, excludedHasScroll,
    };
  },
};
</script>

<style scoped>
/* Roboto + Material Symbols (ícone) */
@import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@400&display=swap");

.material-symbols-outlined{
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  font-size: 20px;
  line-height: 1;
  display: inline-block;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}

.corporate-calendar { font-family: "Roboto", sans-serif; font-size: 13px; color: #333; font-weight: 400; max-width: 450px; }

.buttonFormat { padding: 5px; width: 80px; color: #ffffff; background-color: #689d8c; border-radius: 15px; cursor: pointer; }

.warning-icon { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); color: #d9534f; font-size: 10px; cursor: help; }

/* --------- Tabela de horários --------- */
.shift-table { width: 100%; border-collapse: collapse; border: 1px solid #acacad; }
.shift-table td { border: 0px; border-top: 1px solid #acacad !important; padding: 4px; padding-right: 16px; text-align: center; position: relative; }
.shift-table select { width: 80px; font-family: "Roboto", sans-serif; font-size: 13px; color: #333; padding: 2px; border: 1px solid #acacad !important; border-radius: 4px; cursor: pointer; }
.shift-table select:focus { border: 1px solid #acacad !important; outline: none; }
.shift-table th:first-child,
.shift-table td:first-child { text-align: left; border-right: 1px solid #acacad; border-left: 0px; border-top: 0px; display: flex; align-items: center; height: 35px; column-gap: 8px; }
.corporate-calendar th { font-weight: 400; }

/* --------- Tabela de datas excluídas --------- */
.excluded-dates { border: 1px solid #acacad; overflow: hidden; display: inline-block; margin-top: 0px; }
.excluded-dates-wrapper { display: flex; align-items: flex-start; gap: 10px; }
.default-calendar-message { font-family: "Roboto", sans-serif; font-size: 12px; color: red; font-style: italic; }
.h3 { font-weight: 400; margin-bottom: 1px; margin-top: 20px; font-family: "Roboto", sans-serif; font-size: 13px; color: #333; }

.excluded-dates table { width: 300px; border: 0; border-collapse: separate; border-spacing: 0; }
.excluded-dates thead,
.excluded-dates .excluded-body tr { display: table; width: 100%; table-layout: fixed; }
.excluded-dates thead { box-sizing: border-box; padding-right: 0; border-right: 0px; }

.inputDate { padding: 3px; font-family: "Roboto", sans-serif; font-size: 13px; color: #333; cursor: pointer; }

.excluded-dates td {
  border-top: 1px solid #acacad;
  border-right: 1px solid #acacad;
  padding: 4px;
  text-align: center;
  height: 38px;
  position: relative;
}

/* Corpo rolável */
.excluded-body { display: block; overflow-y: scroll; overflow-x: hidden; scrollbar-width: thin; scrollbar-color: #bdbdbd transparent; }
.excluded-body::-webkit-scrollbar { width: 6px; }
.excluded-body::-webkit-scrollbar-track { background: transparent; }
.excluded-body::-webkit-scrollbar-thumb { background-color: #bdbdbd; border-radius: 3px; border-right: 1px solid #acacad; }
.excluded-body:hover { scrollbar-color: #888 transparent; }
.excluded-body:hover::-webkit-scrollbar-thumb { background-color: #888; }

.headerHoras { padding: 10px; background-color: #f5f6fa; }

.popup-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; padding: 15px; }
.popup-content { background: #ffffff; padding: 20px; border-radius: 8px; text-align: center; }

/* ===== Datepicker ===== */
.dp-wrapper { position: relative; width: 100%; }

.dp-input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding-right: 30px;   /* espaço pro ícone */
  height: 28px;
}

/* Ícone Material: no extremo direito do input */
.dp-icon {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px; height: 24px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  color: #666;
}
.dp-icon:hover { color: #333; }

/* Popover fixo ao viewport (a posição vem de dpPopStyle) */
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

.dp-weekdays, .dp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.dp-weekday { text-align: center; font-size: 12px; color: #666; padding: 4px 0; }
.dp-cell { border: 0; background: transparent; border-radius: 6px; padding: 6px 0; cursor: pointer; }
.dp-cell:hover { background: #f0f0f0; }
.dp-cell.is-muted { color: #aaa; cursor: default; }
.dp-cell.is-selected { background: #689d8c; color: #fff; }
.dp-cell.is-today { outline: 1px dashed #689d8c; }

.dp-actions { display: flex; justify-content: space-between; margin-top: 6px; }
.dp-action { border: 1px solid #ccc; background: #f7f7f7; border-radius: 6px; padding: 4px 8px; cursor: pointer; }
</style>
