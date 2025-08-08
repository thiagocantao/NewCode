<template>
  <div class="corporate-calendar">
    <div class="shift-config">
      <table class="shift-table">
        <thead>
          <tr>
            <th class="headerDias">{{ translateText('Operating Days') }}</th>
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
                <option
                  v-for="hour in hours"
                  :key="hour.value"
                  :value="hour.value"
                >
                  {{ hour.label }}
                </option>
              </select>
            </td>
            <td>-</td>
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
                <option
                  v-for="hour in hours"
                  :key="hour.value"
                  :value="hour.value"
                >
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
                <option
                  v-for="hour in hours"
                  :key="hour.value"
                  :value="hour.value"
                >
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
              <button
                v-if="index === 0"
                class="buttonFormat"
                @click="confirmCopy"
              >
                {{ translateText('Copy') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="excluded-dates">
      <h3>{{ translateText('Exclude dates') }}</h3>
      <table>
      <thead>
          <tr>
            <th class="headerDias">{{ translateText('Date') }}</th>
            <th class="headerHoras">{{ translateText('Action') }}</th>
          </tr>
        </thead>
        <tbody class="excluded-body" :style="{ maxHeight: excludedDatesHeight }">
          <tr>
            <td><input class="inputDate" type="date" v-model="newExcludedDate" /></td>
            <td><button class="buttonFormat" @click="addExcludedDate">{{ translateText('Add') }}</button></td>
          </tr>
          <tr v-for="date in excludedDates" :key="date">
            <td>{{ formatDate(date) }}</td>
            <td><button class="buttonFormat" @click="removeExcluded(date)">{{ translateText('Delete') }}</button></td>
          </tr>
        </tbody>
      </table>
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
import { ref, watch } from "vue";

export default {
  props: {
    content: { type: Object, required: true },
    uid: { type: String, required: true },
    dataSource: { type: [Object, String], default: null },
    excludedDatesHeight: { type: String, default: "150px" },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
  },
  setup(props) {
    const translateText = (text) => {
      return text;
    };

    const defaultWeekDays = [
      {
        name: "Mon",
        label: translateText("Monday"),
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
      },
      {
        name: "Tue",
        label: translateText("Tuesday"),
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
      },
      {
        name: "Wed",
        label: translateText("Wednesday"),
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
      },
      {
        name: "Thu",
        label: translateText("Thursday"),
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
      },
      {
        name: "Fri",
        label: translateText("Friday"),
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
      },
      {
        name: "Sat",
        label: translateText("Saturday"),
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
      },
      {
        name: "Sun",
        label: translateText("Sunday"),
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
      },
    ];

    const weekDays = ref(defaultWeekDays.map((day) => ({ ...day })));

    const hours = Array.from({ length: 96 }, (_, i) => {
      const hour24 = Math.floor(i / 4);
      const minutes = ["00", "15", "30", "45"][i % 4];
      const hour = hour24 % 12 || 12;
      const period = hour24 < 12 ? "AM" : "PM";
      return {
        value: `${String(hour24).padStart(2, "0")}:${minutes}`,
        label: `${hour}:${minutes} ${period}`,
      };
    });

    function timeToMinutes(time) {
      if (!time) return null;
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    }

    function isInconsistent(day, field) {
      const order = ["shift1Start", "shift1End", "shift2Start", "shift2End"];
      let last = null;
      for (const key of order) {
        const val = day[key];
        if (val) {
          const minutes = timeToMinutes(val);
          if (last !== null && minutes < last) {
            if (key === field) return true;
          } else {
            last = minutes;
          }
        }
      }
      return false;
    }

    const excludedDates = ref([]);
    const newExcludedDate = ref("");
    const showConfirm = ref(false);

    const excludedDatesHeight = ref(
      props.content.excludedDatesHeight || props.excludedDatesHeight
    );

    watch(
      () => props.content.excludedDatesHeight,
      (val) => (excludedDatesHeight.value = val)
    );

    watch(
      () => props.excludedDatesHeight,
      (val) => (excludedDatesHeight.value = val)
    );

    function resetDataSource() {
      weekDays.value = defaultWeekDays.map((day) => ({ ...day }));
      excludedDates.value = [];
    }

    function loadDataSource(ds) {
      let parsed = ds;
      if (!parsed || (typeof parsed === "string" && !parsed.trim())) {
        resetDataSource();
        return;
      }
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch (e) {
          resetDataSource();
          return;
        }
      }

      if (!Array.isArray(parsed.weekDays) || parsed.weekDays.length === 0) {
        resetDataSource();
      } else {
        const updatedDays = defaultWeekDays.map((day) => {
          const dayData = parsed.weekDays.find((d) => d.name === day.name) || {};
          return {
            ...day,
            active: !!dayData.active,
            shift1Start: dayData.shift1Start || "",
            shift1End: dayData.shift1End || "",
            shift2Start: dayData.shift2Start || "",
            shift2End: dayData.shift2End || "",
          };
        });
        weekDays.value = updatedDays;
      }
      excludedDates.value = Array.isArray(parsed.excludedDates)
        ? [...parsed.excludedDates]
        : [];
    }

    const calendarValues = ref({
      weekDays: weekDays.value.map((day) => ({ ...day })),
      excludedDates: [...excludedDates.value],
    });

    watch(
      [weekDays, excludedDates],
      () => {
        calendarValues.value = {
          weekDays: weekDays.value.map((day) => ({ ...day })),
          excludedDates: [...excludedDates.value],
        };
      },
      { deep: true }
    );

    watch(
      () => props.content.dataSource,
      (val) => loadDataSource(val),
      { deep: true, immediate: true }
    );

    watch(
      () => props.dataSource,
      (val) => loadDataSource(val),
      { deep: true, immediate: true }
    );

    if (
      typeof wwLib !== "undefined" &&
      wwLib.wwVariable &&
      wwLib.wwVariable.useComponentVariable
    ) {
      const { setValue } = wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: "calendarValues",
        type: "object",
        defaultValue: calendarValues.value,
      });
      watch(
        calendarValues,
        (val) => setValue(val),
        { deep: true, immediate: true }
      );
    }

    function addExcludedDate() {
      if (!newExcludedDate.value) return;
      const dateString = newExcludedDate.value;
      if (!excludedDates.value.includes(dateString)) {
        excludedDates.value.push(dateString);
      }
      newExcludedDate.value = "";
    }

    function removeExcluded(dateString) {
      excludedDates.value = excludedDates.value.filter(
        (d) => d !== dateString
      );
    }

    function formatDate(dateString) {
      const [year, month, day] = dateString.split("-");
      const date = new Date(year, month - 1, day);
      return isNaN(date) ? "" : date.toLocaleDateString();
    }

    function confirmCopy() {
      showConfirm.value = true;
    }

    function copyFirstRow() {
      const first = weekDays.value[0];
      for (let i = 1; i < weekDays.value.length; i++) {
        weekDays.value[i].active = first.active;
        weekDays.value[i].shift1Start = first.shift1Start;
        weekDays.value[i].shift1End = first.shift1End;
        weekDays.value[i].shift2Start = first.shift2Start;
        weekDays.value[i].shift2End = first.shift2End;
      }
      showConfirm.value = false;
    }

    function cancelCopy() {
      showConfirm.value = false;
    }

    return {
      weekDays,
      hours,
      excludedDates,
      newExcludedDate,
      addExcludedDate,
      removeExcluded,
      formatDate,
      confirmCopy,
      copyFirstRow,
      cancelCopy,
      showConfirm,
      calendarValues,
      excludedDatesHeight,
      translateText,
      isInconsistent,
    };
  },
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400&display=swap");

.corporate-calendar {
  font-family: "Roboto", sans-serif;
  font-size: 13px;
  color: #333;
  font-weight: 400;
  max-width: 450px;
  
}

.buttonFormat{
  padding:5px;
  width:80px;
  color: #ffffff;
  background-color: #689d8c;
  border-radius: 15px;
  cursor:pointer;
}

.warning-icon {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  color: #d9534f;
  font-size: 10px;
  cursor: help;
}

.shift-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #acacad;
}

.excluded-dates table {
  width: 300px;
  border-collapse: collapse;  
  border-bottom: 1px solid #acacad;
}

.inputDate{
padding:3px;
font-family: "Roboto", sans-serif;
  font-size: 13px;
  color: #333;
  cursor: pointer;
}

.excluded-dates td {
  border-bottom: 0px !important;
  border: 1px solid #acacad;
  padding: 4px;
  text-align: center;
  height:38px;
}

.excluded-dates thead,
.excluded-dates .excluded-body tr {
  display: table;
  width: 100%;
  table-layout: fixed;
}

.excluded-dates thead {
  width: calc(100% - 6px);
}

.excluded-body {
  display: block;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
  scrollbar-gutter: stable;
}

.excluded-body::-webkit-scrollbar {
  width: 6px;
}

.excluded-body::-webkit-scrollbar-track {
  background: transparent;
}

.excluded-body::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 3px;
}

.excluded-body:hover::-webkit-scrollbar-thumb {
  background-color: #888;
}

.excluded-body:hover {
  scrollbar-color: #888 transparent;
}

.shift-table td {
border: 0px;
border-top: 1px solid #acacad !important;
padding: 4px;
padding-right: 16px;
text-align: center;
position: relative;
}

.shift-table select {
  width: 80px;
  font-family: "Roboto", sans-serif;
  font-size: 13px;
  color: #333;
  padding:2px;
  border: 1px solid #acacad !important;
  border-radius: 4px;
  cursor: pointer;
}

.shift-table select:focus {
  border: 1px solid #acacad !important;
  outline: none;
}

.shift-table th:first-child,
.shift-table td:first-child {
  text-align: left;  
  border-right: 1px solid #acacad;
  border-left: 0px;  
  border-top: 0px;
  display: flex;
  align-items: center;    /* alinha verticalmente */
  height: 40px;
  column-gap: 8px;
}

.corporate-calendar th {
  font-weight: 400;
}

.corporate-calendar h3 {
  font-weight: 400;  
  margin-bottom: 1px;
  margin-top: 25px;
  font-family: "Roboto", sans-serif;
  font-size: 13px;
  color: #333;
}

.excluded-dates {
  margin-top: 0px;
}

.headerDias {
  padding:10px;
  background-color: #f5f6fa;
  border-right: 1px solid #acacad;
  border-top: 1px solid #acacad;
  border-left: 1px solid #acacad;
}

.headerHoras {
padding:10px;
background-color: #f5f6fa;
  border-right: 1px solid #acacad;
  border-top: 1px solid #acacad;
}

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 15px;
}

.popup-content {
  background: #ffffff;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}
</style>
