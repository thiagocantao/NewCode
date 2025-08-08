<template>
  <div class="corporate-calendar">
    <div class="shift-config">
      <table class="shift-table">
        <thead>
          <tr>
            <th class="headerDias">Dias Operacionais</th>
            <th class="headerHoras" colspan="7">Horas Operacionais</th>
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
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="excluded-dates">
      <h3>Datas excluídas</h3>
      <table>
        <tbody>
          <tr>
            <td><input type="date" v-model="newExcludedDate" /></td>
            <td><button @click="addExcludedDate">Inserir</button></td>
          </tr>
          <tr v-for="date in excludedDates" :key="date.toISOString()">
            <td>{{ formatDate(date) }}</td>
            <td><button @click="removeExcluded(date)">Excluir</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { ref } from "vue";

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
      },
      {
        name: "tue",
        label: "Terça",
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
      },
      {
        name: "wed",
        label: "Quarta",
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
      },
      {
        name: "thu",
        label: "Quinta",
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
      },
      {
        name: "fri",
        label: "Sexta",
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
      },
      {
        name: "sat",
        label: "Sábado",
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
      },
      {
        name: "sun",
        label: "Domingo",
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
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

    const excludedDates = ref([]);
    const newExcludedDate = ref("");

    function addExcludedDate() {
      if (!newExcludedDate.value) return;
      const date = new Date(newExcludedDate.value);
      if (
        !excludedDates.value.some(
          (d) => d.toDateString() === date.toDateString()
        )
      ) {
        excludedDates.value.push(date);
      }
      newExcludedDate.value = "";
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
      excludedDates,
      newExcludedDate,
      addExcludedDate,
      removeExcluded,
      formatDate,
    };
  },
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400&display=swap");

.corporate-calendar {
  font-family: "Roboto", sans-serif;
  font-size: 12px;
  color: #333;
  font-weight: 400;
  max-width: 450px;
  
}

.shift-table,
.excluded-dates table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #acacad;
}

.excluded-dates td {
  border: 1px solid #acacad;
  padding: 4px;
  text-align: center;
}

.shift-table td {
border: 0px;
border-top: 1px solid #acacad !important;
padding: 4px;
text-align: center;
}

.shift-table select {
  width: 90px;
  font-family: "Roboto", sans-serif;
  font-size: 12px;
  color: #333;
  padding:2px;
  border: 1px solid #acacad !important;
  border-radius: 4px;
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

.corporate-calendar th,
.corporate-calendar h3 {
  font-weight: 400;
}

.excluded-dates {
  margin-top: 16px;
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
</style>
