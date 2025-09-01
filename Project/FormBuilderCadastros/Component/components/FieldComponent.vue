<template>
  <div class="field-component" :class="[`field-type-${field.fieldType.toLowerCase()}`, { 'is-mandatory': field.is_mandatory }]">
    <!-- Label do campo -->
    <label v-if="!field.is_hide_legend" class="field-label"> 
      {{ field.name }}
      <span v-if="field.is_mandatory" class="required-mark"></span>
    </label>

    

    <!-- Campos de entrada baseados no tipo -->
    <div class="field-input-container">
      <!-- DATE -->
      <input
        v-if="field.fieldType === 'DATE'"
        type="date"
        :value="field.value"
        :disabled="field.is_readonly"
        @input="updateValue"
        class="field-input date-input"
      />

      <!-- DECIMAL -->
      <input
        v-else-if="field.fieldType === 'DECIMAL'"
        type="number"
        step="0.01"
        :value="field.value"
        :disabled="field.is_readonly"
        @input="updateValue"
        class="field-input decimal-input"
      />

      <!-- INTEGER -->
      <input
        v-else-if="field.fieldType === 'INTEGER'"
        type="number"
        step="1"
        :value="field.value"
        :disabled="field.is_readonly"
        @input="updateValue"
        class="field-input integer-input"
      />

      <!-- YES_NO -->
      <div v-else-if="field.fieldType === 'YES_NO'" class="yes-no-container">
        <label class="radio-label">
          <input
            type="radio"
            :name="field.id"
            :value="true"
            :checked="field.value === true"
            :disabled="field.is_readonly"
            @change="updateValue"
          />
          Yes
        </label>
        <label class="radio-label">
          <input
            type="radio"
            :name="field.id"
            :value="false"
            :checked="field.value === false"
            :disabled="field.is_readonly"
            @change="updateValue"
          />
          No
        </label>
      </div>

      <!-- SIMPLE_LIST -->
      <select
        v-else-if="field.fieldType === 'SIMPLE_LIST'"
        :value="field.value"
        :disabled="field.is_readonly"
        @change="updateValue"
        class="field-input list-input"
      >
        <option value="">Select an option</option>
        <option v-for="option in field.options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <!-- MULTILINE_TEXT -->
      <textarea
        v-else-if="field.fieldType === 'MULTILINE_TEXT'"
        :value="field.value"
        :disabled="field.is_readonly"
        @input="updateValue"
        class="field-input multiline-input"
        rows="4"
      ></textarea>

      <!-- SIMPLE_TEXT e FORMATED_TEXT -->
      <input
        v-else
        type="text"
        :value="field.value"
        :disabled="field.is_readonly"
        @input="updateValue"
        class="field-input text-input"
      />
    </div>


    <!-- Tooltip -->
    <div v-if="field.tip_translations?.[this.currentLang]" class="field-tooltip">
      <span class="tooltip-text">{{ field.tip_translations[this.currentLang] }}</span>
    </div>
    <!-- Mensagem de erro -->
    <div v-if="error" class="field-error">{{ error }}</div>
  </div>
</template>

<script>
export default {
  name: 'FieldComponent',
  props: {
    field: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      error: null
    }
  },
  computed: {
    currentLang() {
      if (typeof window !== 'undefined' && window.wwLib && window.wwLib.wwVariable) {
        return window.wwLib.wwVariable.getValue('aa44dc4c-476b-45e9-a094-16687e063342') || 'pt-BR';
      }
      return 'pt-BR';
    }
  },
  methods: {
    // Função simples para tradução
    translateText(text) {
      return text;
    },
    
    updateValue(event) {
      let value = event.target.value;
      
      // Validação específica por tipo de campo
      switch (this.field.fieldType) {
        case 'DATE':
          this.validateDate(value);
          break;
        case 'DECIMAL':
          value = parseFloat(value);
          this.validateDecimal(value);
          break;
        case 'INTEGER':
          value = parseInt(value);
          this.validateInteger(value);
          break;
        case 'YES_NO':
          value = event.target.value === 'true';
          break;
        case 'SIMPLE_LIST':
          this.validateList(value);
          break;
        case 'MULTILINE_TEXT':
          this.validateMultilineText(value);
          break;
        case 'SIMPLE_TEXT':
        case 'FORMATED_TEXT':
          this.validateText(value);
          break;
      }

      if (!this.error) {
        this.$emit('update:value', value);
      }
    },

    validateDate(value) {
      if (!value) {
        this.error = this.field.is_mandatory ? this.translateText('Date is required') : null;
        return;
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        this.error = this.translateText('Invalid date');
      } else {
        this.error = null;
      }
    },

    validateDecimal(value) {
      if (isNaN(value)) {
        this.error = this.translateText('Invalid decimal value');
        return;
      }
      if (this.field.is_mandatory && value === '') {
        this.error = this.translateText('Required field');
      } else {
        this.error = null;
      }
    },

    validateInteger(value) {
      if (isNaN(value)) {
        this.error = this.translateText('Invalid integer value');
        return;
      }
      if (this.field.is_mandatory && value === '') {
        this.error = this.translateText('Required field');
      } else {
        this.error = null;
      }
    },

    validateList(value) {
      if (this.field.is_mandatory && !value) {
        this.error = this.translateText('Select an option');
      } else {
        this.error = null;
      }
    },

    validateMultilineText(value) {
      if (this.field.is_mandatory && !value.trim()) {
        this.error = this.translateText('Required field');
      } else {
        this.error = null;
      }
    },

    validateText(value) {
      if (this.field.is_mandatory && !value.trim()) {
        this.error = this.translateText('Required field');
      } else {
        this.error = null;
      }
    }
  }
}
</script>

<style scoped>
.field-component {
display: flex;
flex-direction: column;
width: 100%;
margin-bottom: 5px;
}

.field-label {
font-size: 13px;
font-weight: 400;
margin-bottom: 4px;
color: #333;
}

.required-indicator {
color: #e53935;
margin-left: 2px;
}

.field-row {
display: flex;
align-items: center;
width: 100%;
}

.field-input {
flex: 1;
min-width: 0; /* This prevents the input from overflowing its container */
padding: 8px 12px;
border: 1px solid #ddd;
border-radius: 4px;
font-size: 13px;
background-color: #fff;
width: 100%;
}

.field-input:focus {
outline: none;
border-color: #007bff;
box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.field-input[readonly] {
background-color: #f5f5f5;
cursor: not-allowed;
}

.field-tip {
font-size: 12px;
color: #666;
margin-top: 4px;
font-style: italic;
}

.is-required .field-label::after {
content: "*";
color: #e53935;
margin-left: 2px;
}

.tooltip-text {  
  color: rgb(120, 120, 120);
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1;
}

.field-tooltip:hover .tooltip-text {
  
}

/* Estilos específicos por tipo de campo */
.date-input {
  min-width: 150px;
}

.decimal-input,
.integer-input {
  text-align: right;
}

.yes-no-container {
  display: flex;
  gap: 16px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.list-input {
  min-width: 200px;
}

.multiline-input {
  resize: vertical;
  min-height: 100px;
}

/* Estilos para campos obrigatórios */
.is-mandatory .field-label {
  font-weight: 400;
}

/* Estilos para campos com erro */
.field-input.error {
  border-color: #ff0000;
}
</style> 
