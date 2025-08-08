<template>
  <div class="corporate-calendar">
    <div class="shift-config">
      <table class="shift-table">
        <thead>
          <tr>
            <th rowspan="2">Dias Operacionais</th>
            <th colspan="2">Turno 1</th>
            <th colspan="2">Turno 2</th>
            <th colspan="2">Turno 3</th>
            <th colspan="2">Turno 4</th>
          </tr>
          <tr>
            <th>Entrada</th>
            <th>Saída</th>
            <th>Entrada</th>
            <th>Saída</th>
            <th>Entrada</th>
            <th>Saída</th>
            <th>Entrada</th>
            <th>Saída</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="day in weekDays" :key="day.name">
            <td>
              <input type="checkbox" v-model="day.active" />
              {{ day.label }}
            </td>
            <td>
              <select v-model="day.shift1Start" :disabled="!day.active">
                <option value=""></option>
                <option
                  v-for="hour in hours"
                  :key="hour.value"
                  :value="hour.value"
                >
                  {{ hour.label }}
                </option>
              </select>
            </td>
            <td>
              <select v-model="day.shift1End" :disabled="!day.active">
                <option value=""></option>
                <option
                  v-for="hour in hours"
                  :key="hour.value"
                  :value="hour.value"
                >
                  {{ hour.label }}
                </option>
              </select>
            </td>
            <td>
              <select v-model="day.shift2Start" :disabled="!day.active">
                <option value=""></option>
                <option
                  v-for="hour in hours"
                  :key="hour.value"
                  :value="hour.value"
                >
                  {{ hour.label }}
                </option>
              </select>
            </td>
            <td>
              <select v-model="day.shift2End" :disabled="!day.active">
                <option value=""></option>
                <option
                  v-for="hour in hours"
                  :key="hour.value"
                  :value="hour.value"
                >
                  {{ hour.label }}
                </option>
              </select>
            </td>
            <td>
              <select v-model="day.shift3Start" :disabled="!day.active">
                <option value=""></option>
                <option
                  v-for="hour in hours"
                  :key="hour.value"
                  :value="hour.value"
                >
                  {{ hour.label }}
                </option>
              </select>
            </td>
            <td>
              <select v-model="day.shift3End" :disabled="!day.active">
                <option value=""></option>
                <option
                  v-for="hour in hours"
                  :key="hour.value"
                  :value="hour.value"
                >
                  {{ hour.label }}
                </option>
              </select>
            </td>
            <td>
              <select v-model="day.shift4Start" :disabled="!day.active">
                <option value=""></option>
                <option
                  v-for="hour in hours"
                  :key="hour.value"
                  :value="hour.value"
                >
                  {{ hour.label }}
                </option>
              </select>
            </td>
            <td>
              <select v-model="day.shift4End" :disabled="!day.active">
                <option value=""></option>
                <option
                  v-for="hour in hours"
                  :key="hour.value"
                  :value="hour.value"
                >
                  {{ hour.label }}
                </option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="calendar">
      <div class="calendar-header">
        <button @click="prevMonth">&lt;</button>
        <span>{{ monthYear }}</span>
        <button @click="nextMonth">&gt;</button>
      </div>
      <table class="calendar-grid">
        <thead>
          <tr>
            <th v-for="d in shortWeekDays" :key="d">{{ d }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(week, i) in calendar" :key="i">
            <td
              v-for="day in week"
              :key="day.date"
              :class="{ 'other-month': day.otherMonth, excluded: isExcluded(day.date) }"
              @click="toggleExcluded(day.date)"
            >
              {{ day.date.getDate() }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="excluded-dates">
      <h3>Datas excluídas</h3>
      <table v-if="excludedDates.length">
        <tbody>
          <tr v-for="date in excludedDates" :key="date.toISOString()">
            <td>{{ formatDate(date) }}</td>
            <td><button @click="removeExcluded(date)">Remover</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else>Nenhuma data excluída</p>
    </div>
  </div>
</template>

<script>
import { ref, computed } from "vue";

export default {
  props: {
    content: { type: Object, required: true },
    uid: { type: String, required: true },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
  },
  setup() {
    const weekDays = ref([
      {
        name: "mon",
        label: "Segunda",
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
        shift3Start: "",
        shift3End: "",
        shift4Start: "",
        shift4End: "",
      },
      {
        name: "tue",
        label: "Terça",
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
        shift3Start: "",
        shift3End: "",
        shift4Start: "",
        shift4End: "",
      },
      {
        name: "wed",
        label: "Quarta",
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
        shift3Start: "",
        shift3End: "",
        shift4Start: "",
        shift4End: "",
      },
      {
        name: "thu",
        label: "Quinta",
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
        shift3Start: "",
        shift3End: "",
        shift4Start: "",
        shift4End: "",
      },
      {
        name: "fri",
        label: "Sexta",
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
        shift3Start: "",
        shift3End: "",
        shift4Start: "",
        shift4End: "",
      },
      {
        name: "sat",
        label: "Sábado",
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
        shift3Start: "",
        shift3End: "",
        shift4Start: "",
        shift4End: "",
      },
      {
        name: "sun",
        label: "Domingo",
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
        shift3Start: "",
        shift3End: "",
        shift4Start: "",
        shift4End: "",
      },
    ]);

    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = i % 12 || 12;
      const period = i < 12 ? "AM" : "PM";
      return {
        value: `${String(i).padStart(2, "0")}:00`,
        label: `${hour}:00 ${period}`,
      };
    });

    const currentDate = ref(new Date());
    const excludedDates = ref([]);

    const shortWeekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

    const monthYear = computed(() =>
      currentDate.value.toLocaleString("default", {
        month: "long",
        year: "numeric",
      })
    );

    const startOfMonth = computed(() => {
      const d = new Date(currentDate.value);
      d.setDate(1);
      return d;
    });

    const calendar = computed(() => {
      const start = new Date(startOfMonth.value);
      const startWeekDay = (start.getDay() + 6) % 7; // Monday = 0
      start.setDate(start.getDate() - startWeekDay);
      const weeks = [];
      for (let w = 0; w < 6; w++) {
        const week = [];
        for (let d = 0; d < 7; d++) {
          const date = new Date(start);
          const otherMonth = date.getMonth() !== currentDate.value.getMonth();
          week.push({ date, otherMonth });
          start.setDate(start.getDate() + 1);
        }
        weeks.push(week);
      }
      return weeks;
    });

    function prevMonth() {
      const d = new Date(currentDate.value);
      d.setMonth(d.getMonth() - 1);
      currentDate.value = d;
    }

    function nextMonth() {
      const d = new Date(currentDate.value);
      d.setMonth(d.getMonth() + 1);
      currentDate.value = d;
    }

    function isExcluded(date) {
      return excludedDates.value.some(
        (d) => d.toDateString() === date.toDateString()
      );
    }

    function toggleExcluded(date) {
      if (isExcluded(date)) {
        excludedDates.value = excludedDates.value.filter(
          (d) => d.toDateString() !== date.toDateString()
        );
      } else {
        excludedDates.value.push(new Date(date));
      }
    }

    function removeExcluded(date) {
      excludedDates.value = excludedDates.value.filter(
        (d) => d.toDateString() !== date.toDateString()
      );
    }

    function formatDate(date) {
      return date.toLocaleDateString();
    }

    return {
      weekDays,
      hours,
      shortWeekDays,
      calendar,
      monthYear,
      prevMonth,
      nextMonth,
      excludedDates,
      toggleExcluded,
      removeExcluded,
      isExcluded,
      formatDate,
    };
  },
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400&display=swap");

.corporate-calendar {
  font-family: "Roboto", sans-serif;
  font-size: 13px;
  font-weight: 400;
  max-width: 600px;
}

.shift-table,
.calendar-grid,
.excluded-dates table {
  width: 100%;
  border-collapse: collapse;
}

.shift-table td,
.calendar-grid th,
.calendar-grid td,
.excluded-dates td {
  border: 1px solid #ccc;
  padding: 4px;
  text-align: center;
}

.shift-table select {
  width: 100%;
}

.shift-table th:first-child,
.shift-table td:first-child {
  text-align: left;
}

.corporate-calendar th,
.corporate-calendar h3 {
  font-weight: 400;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0;
}

.calendar-grid td {
  cursor: pointer;
}

.calendar-grid td.other-month {
  color: #aaa;
}

.calendar-grid td.excluded {
  background-color: #ffcccc;
}

.excluded-dates {
  margin-top: 16px;
}
</style>

