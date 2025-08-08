<template>
  <div class="corporate-calendar">
    <div class="shift-config">
      <table class="shift-table">
        <thead>
          <tr>
            <th class="headerDias">{{ translateText('Dias Operacionais') }}</th>
            <th class="headerHoras" colspan="7">{{ translateText('Horas Operacionais') }}</th>
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
            <td style="border-left: 1px solid #acacad">
              <button
                v-if="index === 0"
                class="buttonFormat"
                @click="confirmCopy"
              >
                {{ translateText('Copiar') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="excluded-dates">
      <h3>{{ translateText('Excluir datas') }}</h3>
      <table>
      <thead>
          <tr>
            <th class="headerDias">{{ translateText('Data') }}</th>
            <th class="headerHoras">{{ translateText('Ação') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><input class="inputDate" type="date" v-model="newExcludedDate" /></td>
            <td><button class="buttonFormat" @click="addExcludedDate">{{ translateText('Adicionar') }}</button></td>
          </tr>
          <tr v-for="date in excludedDates" :key="date.toISOString()">
            <td>{{ formatDate(date) }}</td>
            <td><button class="buttonFormat" @click="removeExcluded(date)">{{ translateText('Excluir') }}</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showConfirm" class="popup-overlay">
      <div class="popup-content">
        <p>{{ translateText('Copiar configuração de horas para todos os dias?') }}</p>
        <div style="display:flex; gap:10px; justify-content:center;margin-top:15px">
          <button class="buttonFormat" @click="copyFirstRow">{{ translateText('Confirmar') }}</button>
          <button class="buttonFormat" @click="cancelCopy">{{ translateText('Cancelar') }}</button>
        </div>
      </div>
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
        label: translateText("Segunda-feira"),
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
      },
      {
        name: "tue",
        label: translateText("Terça-feira"),
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
      },
      {
        name: "wed",
        label: translateText("Quarta-feira"),
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
      },
      {
        name: "thu",
        label: translateText("Quinta-feira"),
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
      },
      {
        name: "fri",
        label: translateText("Sexta-feira"),
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
      },
      {
        name: "sat",
        label: translateText("Sábado"),
        active: false,
        shift1Start: "",
        shift1End: "",
        shift2Start: "",
        shift2End: "",
      },
      {
        name: "sun",
        label: translateText("Domingo"),
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
    const showConfirm = ref(false);

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

.shift-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #acacad;
}

.excluded-dates table {
  width: 300px;
  border-collapse: collapse;
  border: 1px solid #acacad;
}

.inputDate{
padding:3px;
font-family: "Roboto", sans-serif;
  font-size: 13px;
  color: #333;
  cursor: pointer;
}

.excluded-dates td {
  border: 1px solid #acacad;
  padding: 4px;
  text-align: center;
  height:38px;
}

.shift-table td {
border: 0px;
border-top: 1px solid #acacad !important;
padding: 4px;
text-align: center;
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
