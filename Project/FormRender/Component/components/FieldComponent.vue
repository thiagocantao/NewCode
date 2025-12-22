<template>
  <CustomAlert v-if="autoSaveEnabled" :message="error" :visible="!!error && showAlert" @close="showAlert = false" />
  <div class="field-component"
    :class="[`field-type-${field.fieldType.toLowerCase()}`, { 'is-mandatory': field.is_mandatory }]"
    :style="componentStyleVars">
    <!-- Label do campo -->
    <label v-if="!field.is_hide_legend" class="field-label">
      {{ field.name }}
      <span v-if="field.is_mandatory" class="required-indicator">*</span>
    </label>

    <!-- Campos de entrada baseados no tipo -->
    <div class="field-input-container">
      <template v-if="field.fieldType === 'DATE'">
        <CustomDatePicker v-model="localValue" :disabled="field.is_readonly" @update:modelValue="onDateChange"
          :error="error && field.is_mandatory"
          :class="['field-input', 'date-input', { error: error && field.is_mandatory }, { 'readonly-field': field.is_readonly }]" />
      </template>
      <template v-else-if="field.fieldType === 'DEADLINE'">
        <div style="position:relative;">
          <div class="deadline-visual" :class="[
              deadlineColorClass,
              { 'readonly-field': field.is_readonly, 'deadline-empty': !deadlineHasValue }
            ]" :title="deadlineOriginalFormatted" role="button" :tabindex="field.is_readonly ? -1 : 0"
            @click="openDeadlinePicker" @keydown.enter.prevent="openDeadlinePicker"
            @keydown.space.prevent="openDeadlinePicker">
            <template v-if="deadlineHasValue">
              <span class="deadline-diff-display">{{ deadlineDisplay }}</span>
            </template>
            <template v-else>
              <span class="material-symbols-outlined deadline-empty-icon">calendar_month</span>
              <span class="deadline-empty-text">Select</span>
            </template>
          </div>
          <CustomDatePicker ref="deadlineDatePicker" v-model="deadlineValue" :disabled="field.is_readonly"
            :show-time="true" :open-up-offset="60" @update:modelValue="onDeadlineChange"
            :class="['field-input', 'date-input', { error: error && field.is_mandatory }, { 'readonly-field': field.is_readonly }]"
            style="position:absolute;top:0;left:0;width:100%;height:0;overflow:hidden;" />

        </div>
      </template>
      <template v-else-if="field.fieldType === 'DECIMAL'">
        <input
          type="number"
          step="0.01"
          v-model="localValue"
          :disabled="field.is_readonly"
          @blur="updateValue"
          :class="['field-input', 'decimal-input', { error: error && field.is_mandatory }, { 'readonly-field': field.is_readonly }]"
        />
      </template>
      <template v-else-if="field.fieldType === 'INTEGER'">
        <input
          type="number"
          step="1"
          v-model="localValue"
          :disabled="field.is_readonly"
          @blur="updateValue"
          :class="['field-input', 'integer-input', { error: error && field.is_mandatory }, { 'readonly-field': field.is_readonly }]"
        />
      </template>
      <template v-else-if="field.fieldType === 'YES_NO'">
        <div class="yes-no-container">
          <label class="radio-label">
            <input
              type="radio"
              :name="field.id"
              :value="true"
              :checked="localValue === true"
              :disabled="field.is_readonly"
              @change="updateValue"
            />
            Sim
          </label>
          <label class="radio-label">
            <input
              type="radio"
              :name="field.id"
              :value="false"
              :checked="localValue === false"
              :disabled="field.is_readonly"
              @change="updateValue"
            />
            Não
          </label>
        </div>
      </template>
      <template
        v-else-if="field.fieldType === 'SIMPLE_LIST' || field.fieldType === 'CONTROLLED_LIST' || field.fieldType === 'LIST'">
        <div class="custom-dropdown-wrapper" :class="{ 'readonly-field': field.is_readonly }">
          <div class="custom-dropdown-selected"
            :class="{ open: dropdownOpen, 'readonly-field': field.is_readonly, error: error && field.is_mandatory }"
            @click="onDropdownClick" tabindex="0" @keydown.enter.prevent="!field.is_readonly && toggleDropdown()">
            <span v-if="selectedOption" @click.stop="onDropdownClick" style="pointer-events:auto">{{ selectedOption.label }}</span>
            <span v-else class="placeholder" @click.stop="onDropdownClick" style="pointer-events:auto">{{ dropdownPlaceholder }}</span>
            <span class="material-symbols-outlined dropdown-arrow" @click.stop="onDropdownClick" style="pointer-events:auto">expand_more</span>
          </div>
          <div v-if="dropdownOpen" :class="['custom-dropdown-list', { 'open-up': dropdownOpenUp } ]" ref="dropdownList">
            <div class="dropdown-search-wrapper">
              <span class="material-symbols-outlined search-icon">search</span>
              <input
                type="text"
                v-model="searchTerm"
                placeholder="Pesquisar..."
                class="list-search-input"
                @keydown.stop
                autofocus
              />
            </div>
            <div v-for="option in filteredListOptions" :key="option.value" class="custom-dropdown-option"
              :class="{ selected: localValue == option.value }" @click="selectDropdownOption(option)">
              {{ option.label }}
            </div>
          </div>
        </div>
      </template>
      <template v-else-if="field.fieldType === 'FORMATED_TEXT'">
        <div class="formatted-text-wrapper">
          <div v-if="!field.is_readonly" class="toolbar">
            <button type="button" @click="format('bold')" title="Negrito"><span class="material-symbols-outlined">format_bold</span></button>
            <button type="button" @click="format('italic')" title="Itálico"><span class="material-symbols-outlined">format_italic</span></button>
            <button type="button" @click="format('underline')" title="Sublinhado"><span class="material-symbols-outlined">format_underlined</span></button>
            <button type="button" @click="format('insertUnorderedList')" title="Lista"><span class="material-symbols-outlined">format_list_bulleted</span></button>
            <button type="button" @click="format('insertOrderedList')" title="Lista numerada"><span class="material-symbols-outlined">format_list_numbered</span></button>
            <button type="button" @click="format('removeFormat')" title="Limpar formatação"><span class="material-symbols-outlined">format_clear</span></button>
            <button type="button" @click="insertLink" title="Inserir link"><span class="material-symbols-outlined">link</span></button>
            <button type="button" @click="insertImage" title="Inserir imagem"><span class="material-symbols-outlined">image</span></button>
            <button type="button" class="color-btn" :style="{ color: currentColor }" title="Cor do texto">
              <span style="font-weight:bold; font-size:16px;">A</span>
              <input type="color" @input="setColor($event)" :value="currentColor" class="color-input" title="Cor do texto" />
            </button>
          </div>
          <div ref="rte" :contenteditable="!field.is_readonly" dir="ltr"
            :class="['field-input', 'rich-text-input', { 'readonly-field': field.is_readonly }]"
            :data-placeholder="field.placeholder || field.placeholder_translations?.pt_br || ''"
            @input="onContentEditableInput" @blur="updateValue">
          </div>
        </div>
      </template>
      <template v-else-if="field.fieldType === 'MULTILINE_TEXT'">
        <textarea
          v-model="localValue"
          :disabled="field.is_readonly"
          @blur="updateValue"
          :class="['field-input', 'multiline-input', { error: error && field.is_mandatory }, { 'readonly-field': field.is_readonly }]"
          rows="4"
        ></textarea>
      </template>
      <template v-else>
        <input
          type="text"
          v-model="localValue"
          :disabled="field.is_readonly"
          @blur="updateValue"
          :class="['field-input', 'text-input', { error: error && field.is_mandatory }, { 'readonly-field': field.is_readonly }]"
        />
      </template>
    </div>

    <!-- Tooltip -->
    <div v-if="field.tip_translations?.pt_br" class="field-tooltip">
      <span class="tooltip-text">{{ field.tip_translations.pt_br }}</span>
    </div>
  </div>
</template>

<script>
import CustomAlert from './CustomAlert.vue';
import CustomDatePicker from './CustomDatePicker.vue';
import { SUPABASE_IMAGE_BUCKET } from './supabaseBuckets';

export default {
  name: 'FieldComponent',
  components: {
    CustomAlert,
    CustomDatePicker
  },
  props: {
    field: {
      type: Object,
      required: true
    },
    apiUrl: {
      type: String,
      required: false
    },
    apiKey: {
      type: String,
      required: false
    },
    apiAuthorization: {
      type: String,
      required: false
    },
    ticketId: {
      type: String,
      required: false
    },
    options: {
      type: Array,
      default: () => []
    },
    userId: {
      type: String,
      required: false
    },
    autoSave: {
      type: [Boolean, String],
      default: true
    },
    ticketClosed: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      searchTerm: '',
      dropdownOpen: false,
      dropdownOpenUp: false,
      error: null,
      feedback: null,
      feedbackType: null, // 'success' ou 'error'
      localValue: this.field.value ?? '', // será sobrescrito pelo computed se DEADLINE
      originalValue: this.field.value ?? '',
      showAlert: false,
      deadlineTimer: null,
      dataNow: new Date(),
      currentColor: '#699d8c',
      isUserInput: false,
      privateTicketImageCache: new Map(),
    }
  },
  computed: {
    autoSaveEnabled() {
      if (typeof this.autoSave === 'string') {
        return this.autoSave.toLowerCase() === 'true';
      }
      return this.autoSave;
    },
    themeTokens() {
      if (typeof window !== 'undefined' && window.wwLib?.wwVariable?.getValue) {
        const value = window.wwLib.wwVariable.getValue('61c1b425-10e8-40dc-8f1f-b117c08b9726');
        if (value && typeof value === 'object') {
          return value;
        }
      }
      return {};
    },
    componentStyleVars() {
      if (this.field && this.field.fieldType === 'DEADLINE') {
        return {};
      }

      const tokens = this.themeTokens || {};
      return {
        '--text-input-bg': tokens.inputBG || '#FFFFFF',
        '--text-input-border': tokens.inputBorder || '#d1d5db',
        '--text-input-border-focus': tokens.inputBorderInFocus || tokens.inputBorder || '#d1d5db',
        '--placeholder-color': tokens.normal || tokens.inputText || '#787878'
      };
    },
    dropdownPlaceholder() {
      return (
        this.field.placeholder ||
        this.field.placeholder_translations?.pt_br ||
        'Select an option'
      );
    },
    listOptions() {
      // Se temos opções passadas via prop (da API), usa essas
      if (this.options && this.options.length > 0) {
        return this.options;
      }
      // Gera as opções para listas a partir de list_options para qualquer tipo de lista
      if (
        (this.field.fieldType === 'SIMPLE_LIST' ||
         this.field.fieldType === 'LIST' ||
         this.field.fieldType === 'CONTROLLED_LIST') &&
        typeof this.field.list_options === 'string' &&
        this.field.list_options.trim() !== ''
      ) {
        return this.field.list_options.split(',')
          .map(opt => {
            const trimmed = opt.trim();
            return { value: trimmed, label: trimmed };
          })
          .sort((a, b) => a.label.localeCompare(b.label));
      }
      // Se já vier como array
      if (Array.isArray(this.field.options)) {
        return [...this.field.options].sort((a, b) => {
          if (typeof a.label === 'string' && typeof b.label === 'string') {
            return a.label.localeCompare(b.label);
          }
          return 0;
        });
      }
      return [];
    },
    selectedOption() {
      return this.listOptions.find(opt => opt.value == this.localValue) || null;
    },
    filteredListOptions() {
      if (!this.searchTerm) return this.listOptions;
      const term = this.searchTerm.toLowerCase();
      return this.listOptions.filter(opt => opt.label.toLowerCase().includes(term));
    },
    deadlineHasValue() {
      if (this.field.fieldType !== 'DEADLINE') return false;
      const val = this.localValue || this.field.value;
      return !!(val && String(val).trim());
    },
    // Computed para DEADLINE: faz a conversão entre formatos
    deadlineValue: {
      get() {
        if (this.field.fieldType !== 'DEADLINE') return this.localValue;
        const val = this.localValue || this.field.value;
        if (!val) return '';
        // Espera formato: '2025-06-30 00:00:00+00' ou similar
        // Converte para '2025-06-30T00:00'
        // Remove timezone e segundos
        let match = val.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
        if (match) {
          return `${match[1]}T${match[2]}`;
        }
        // fallback: tenta converter para Date
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          // Ajusta para local
          const pad = n => n.toString().padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
        return '';
      },
      set(v) {
        // v: '2025-06-30T00:00'
        this.localValue = v;
      }
    },
    deadlineDiff() {
      if (this.field.fieldType !== 'DEADLINE') return '';
      const val = this.localValue || this.field.value;
      if (!val) return '';
      // Normaliza para formato aceito pelo Date
      let dateStr = val;
      if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
        dateStr = val;
      } else if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+\d{2}/.test(val)) {
        // '2025-06-30 00:00:00+00' => '2025-06-30T00:00:00+00:00'
        dateStr = val.replace(' ', 'T').replace(/([\+\-]\d{2})$/, '$1:00');
      }
      const deadline = new Date(dateStr);
      if (isNaN(deadline.getTime())) return '';
      let diffMs = deadline - this.dataNow;
      if (isNaN(diffMs)) return '';
      const abs = Math.abs(diffMs);
      const isPast = diffMs < 0;
      let str = '';
      if (abs < 60 * 1000) {
        // Segundos
        const s = Math.floor(abs / 1000);
        str = `${isPast ? '-' : ''}${s}s`;
      } else if (abs < 60 * 60 * 1000) {
        // Minutos
        const m = Math.floor(abs / (60 * 1000));
        str = `${isPast ? '-' : ''}${m}m`;
      } else if (abs < 24 * 60 * 60 * 1000) {
        // Horas e minutos
        const h = Math.floor(abs / (60 * 60 * 1000));
        const m = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000));
        str = `${isPast ? '-' : ''}${h}h`;
        if (m > 0) str += ` ${m}m`;
      } else {
        // Dias, horas, minutos
        const d = Math.floor(abs / (24 * 60 * 60 * 1000));
        const h = Math.floor((abs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const m = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000));
        str = `${isPast ? '-' : ''}${d}d`;
        if (h > 0) str += ` ${h}h`;
        if (m > 0) str += ` ${m}m`;
      }
      return str;
    },
    deadlineDisplay() {
      if (this.field.fieldType !== 'DEADLINE') return '';
      if (!this.deadlineHasValue) return '';
      if (this.ticketClosed) {
        return this.deadlineOriginalFormatted || '';
      }
      return this.deadlineDiff;
    },
    deadlineIsNegative() {
      if (this.field.fieldType !== 'DEADLINE') return false;
      const val = this.localValue || this.field.value;
      if (!val) return false;
      let dateStr = val;
      if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
        dateStr = val;
      } else if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+\d{2}/.test(val)) {
        dateStr = val.replace(' ', 'T').replace(/([\+\-]\d{2})$/, '$1:00');
      }
      const deadline = new Date(dateStr);
      if (isNaN(deadline.getTime())) return false;
      const now = new Date();
      return (deadline - now) < 0;
    },
    deadlineColorClass() {
      if (this.field.fieldType !== 'DEADLINE') return '';
      const val = this.localValue || this.field.value;
      if (!val) return '';
      if (this.ticketClosed) return 'deadline-closed';
      let dateStr = val;
      if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
        dateStr = val;
      } else if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+\d{2}/.test(val)) {
        dateStr = val.replace(' ', 'T').replace(/([\+\-]\d{2})$/, '$1:00');
      }
      const deadline = new Date(dateStr);
      if (isNaN(deadline.getTime())) return '';
      let diffMs = deadline - this.dataNow;
      if (isNaN(diffMs)) return '';
      const diffDays = diffMs / (24 * 60 * 60 * 1000);
      if (diffDays > 5) return 'deadline-green';
      if (diffDays > 0) return 'deadline-yellow';
      return 'deadline-red';
    },
    deadlineOriginalFormatted() {
      if (this.field.fieldType !== 'DEADLINE') return '';
      const val = this.localValue || this.field.value;
      if (!val) return '';

      // normaliza a string de data
      let dateStr = val;
      if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
        dateStr = val;
      } else if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+\d{2}/.test(val)) {
        dateStr = val.replace(' ', 'T').replace(/([\+\-]\d{2})$/, '$1:00');
      }

      // idioma (usa variável do WeWeb se existir, senão navigator.language)
      const lang =
        window.wwLib?.wwVariable?.getValue('aa44dc4c-476b-45e9-a094-16687e063342') ||
        navigator.language;

      if (!this.ticketClosed) {
        try {
          // 1) pega o resolver e transforma o ID em mapping
          const formulaApi = window.wwLib?.wwFormula;
          const use = formulaApi?.useFormula?.();
          const resolveMappingFormula = use?.resolveMappingFormula;

          const mapping = resolveMappingFormula
            ? resolveMappingFormula('95a5a105-48b6-48d4-95c5-7179a664451d')
            : null;

          // 2) se tiver mapping, avalia a fórmula passando os args
          if (mapping && typeof formulaApi?.getValue === 'function') {
            const res = formulaApi.getValue(mapping, /* context */ {}, { args: [dateStr, lang] });

            // se a fórmula for síncrona
            if (!(res instanceof Promise)) {
              if (res !== undefined && res !== null) return String(res);
            }
            // se for assíncrona, não dá pra await aqui (computed não é async); cai no fallback
          }
        } catch (e) {
          // silencia e usa fallback
        }
      }

      // Fallback caso fórmula não esteja disponível ou seja assíncrona
      const deadline = new Date(dateStr);
      if (isNaN(deadline.getTime())) return val;
      if (this.ticketClosed) {
        return deadline.toLocaleDateString(lang);
      }
      return deadline.toLocaleString(lang);
    }
  },
  watch: {
    field: {
      handler(newField) {
        this.localValue = newField.value ?? '';
        this.originalValue = newField.value ?? '';
        this.updateDeadlineTimer();
      },
      deep: true,
      immediate: true
    },
    error(val) {
      this.showAlert = this.autoSaveEnabled && !!val;
    },
    localValue(newVal) {
      if (this.field.fieldType === 'FORMATED_TEXT' && this.$refs.rte) {
        this.renderFormattedTextContent(newVal || '');
      }
    },
    ticketClosed: {
      immediate: true,
      handler() {
        this.updateDeadlineTimer();
      }
    }
  },
  methods: {
    updateDeadlineTimer() {
      if (this.field.fieldType !== 'DEADLINE') {
        this.clearDeadlineTimer();
        return;
      }
      if (this.ticketClosed) {
        this.clearDeadlineTimer();
        return;
      }
      if (!this.deadlineTimer) {
        this.dataNow = new Date();
        this.deadlineTimer = setInterval(() => {
          this.dataNow = new Date();
        }, 1000);
      }
    },
    clearDeadlineTimer() {
      if (this.deadlineTimer) {
        clearInterval(this.deadlineTimer);
        this.deadlineTimer = null;
      }
    },
    onDateChange(value) {
      this.updateValue({ target: { value } });
    },
    async updateValue(event) {
      const eventValue = event?.target?.value ?? event?.value;
      const rawValue = this.field.fieldType === 'FORMATED_TEXT'
        ? this.localValue
        : (eventValue !== undefined ? eventValue : this.localValue);

      let value = rawValue;
      let apiValue = value;

      switch (this.field.fieldType) {
        case 'DECIMAL':
          value = rawValue === '' || rawValue === null || rawValue === undefined
            ? null
            : parseFloat(rawValue);
          apiValue = value;
          break;
        case 'INTEGER':
          value = rawValue === '' || rawValue === null || rawValue === undefined
            ? null
            : parseInt(rawValue, 10);
          apiValue = value;
          break;
        case 'YES_NO':
          value = rawValue === 'true';
          apiValue = value;
          break;
        case 'SIMPLE_LIST':
        case 'LIST':
        case 'CONTROLLED_LIST':
          value = rawValue !== null && rawValue !== undefined ? String(rawValue) : rawValue;
          apiValue = value;
          break;
        default:
          apiValue = value;
      }

      const isValid = this.validateValue(value);

      if (isValid) {
        if (this.field.fieldType === 'DATE' && value) {
          const dt = new Date(`${value}T00:00:00`);
          apiValue = dt.toISOString();
        } else if (this.field.fieldType === 'DEADLINE' && value) {
          apiValue = value;
        }

        // Só salva se o valor realmente mudou (comparação robusta)
        let isChanged = false;
        if (this.field.fieldType === 'DECIMAL' || this.field.fieldType === 'INTEGER') {
          isChanged = String(value) !== String(this.originalValue);
        } else if (this.field.fieldType === 'DEADLINE') {
          // Comparar ignorando segundos/timezone
          const orig = (this.originalValue || '').replace('T', ' ').replace(/:..\+..$/, '');
          const curr = (value || '').replace('T', ' ').replace(/:..\+..$/, '');
          isChanged = curr !== orig;
        } else {
          isChanged = value !== this.originalValue;
        }
        if (isChanged) {
          this.localValue = value;
          this.$emit('update:value', value);
          if (this.autoSaveEnabled) {
            await this.saveFieldValueToApi(apiValue);
          }
          this.originalValue = value;
        }
      }
    },
    async saveFieldValueToApi(value) {
      if (!this.apiUrl || !this.apiKey || !this.apiAuthorization || !this.ticketId) {
        const missing = [];
        if (!this.apiUrl) missing.push('apiUrl');
        if (!this.apiKey) missing.push('apiKey');
        if (!this.apiAuthorization) missing.push('apiAuthorization');
        if (!this.ticketId) missing.push('ticketId');
        const msg = 'API info missing: ' + missing.join(', ');
        this.error = msg;
        return;
      }
      try {
        const requestBody = {
          p_fieldid: this.field.field_id || this.field.id,
          p_fieldvalue: value,
          p_ticketid: this.ticketId,
          p_userid: window.wwLib?.wwVariable?.getValue("fc54ab80-1a04-4cfe-a504-793bdcfce5dd")
        };
        
        const response = await fetch(`${this.apiUrl.replace(/\/$/, '')}/postTicketFieldValue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey,
            'Authorization': this.apiAuthorization
          },
          body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
          const errorText = await response.text();
          const errorMsg = 'Erro ao salvar valor do campo: ' + errorText;
          this.error = errorMsg;
        } else {
          this.error = null;
        }
      } catch (err) {
        this.error = 'Erro ao salvar valor do campo: ' + err.message;
      }
    },
    showFeedback(message, type) {
      this.feedback = message;
      this.feedbackType = type;
      setTimeout(() => {
        this.feedback = null;
        this.feedbackType = null;
      }, 2000);
    },
    validateDate(value) {
      if (!value) {
        this.error = this.field.is_mandatory ? 'Campo obrigatório' : null;
        return;
      }
      const date = new Date(value + 'T00:00:00');
      if (isNaN(date.getTime())) {
        this.error = 'Data inválida';
      } else {
        this.error = null;
      }
    },
    validateDeadline(value) {
      if (!value) {
        this.error = this.field.is_mandatory ? 'Campo obrigatório' : null;
        return;
      }
      // O input datetime-local retorna 'YYYY-MM-DDTHH:mm', que é válido para Date
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        this.error = 'Data e hora inválidas';
      } else {
        this.error = null;
      }
    },
    validateDecimal(value) {
      if (value === null || isNaN(value)) {
        this.error = this.field.is_mandatory ? 'Campo obrigatório' : null;
        return;
      }
      this.error = null;
    },
    validateInteger(value) {
      if (value === null || isNaN(value)) {
        this.error = this.field.is_mandatory ? 'Campo obrigatório' : null;
        return;
      }
      this.error = null;
    },
    validateList(value) {
      if (this.field.is_mandatory && !value) {
        this.error = 'Campo obrigatório';
      } else {
        this.error = null;
      }
    },
    validateMultilineText(value) {
      if (this.field.is_mandatory && !value.trim()) {
        this.error = 'Campo obrigatório';
      } else {
        this.error = null;
      }
    },
    validateText(value) {
      if (this.field.is_mandatory && !value.trim()) {
        this.error = 'Campo obrigatório';
      } else {
        this.error = null;
      }
    },
    openDeadlinePicker() {
      if (this.field.fieldType === 'DEADLINE' && !this.field.is_readonly) {
        const dp = this.$refs.deadlineDatePicker;
        dp && dp.openDp && dp.openDp();
      }
    },
    onDeadlineChange(value) {
      this.updateValue({ target: { value } });
    },
    onContentEditableInput(event) {
      this.localValue = event.target.innerHTML;
    },
    format(cmd) {
      this.$refs.rte && this.$refs.rte.focus();
      document.execCommand(cmd, false, null);
    },
    setColor(event) {
      this.$refs.rte && this.$refs.rte.focus();
      document.execCommand('foreColor', false, event.target.value);
      this.currentColor = event.target.value;
    },
    getSupabaseClient() {
      const pluginClient = window?.wwLib?.wwPlugins?.supabase;
      const globalClient = window?.supabase?.client || window?.supabase || null;
      return pluginClient?.instance || pluginClient?.client || globalClient || null;
    },
    extractInboundTicketPath(src) {
      if (!src || typeof src !== 'string') return null;
      try {
        const parsedUrl = new URL(src, window.location.origin);
        const path = parsedUrl.searchParams.get('path');
        if (!path || !path.toLowerCase().startsWith('inbound/')) return null;
        return path.replace(/^\/+/, '');
      } catch (e) {
        return null;
      }
    },
    async getSignedTicketImage(path) {
      if (!path) return null;
      if (this.privateTicketImageCache.has(path)) {
        return this.privateTicketImageCache.get(path);
      }

      const supabase = this.getSupabaseClient();
      if (!supabase?.storage) return null;

      try {
        const { data, error } = await supabase
          .storage
          .from(SUPABASE_IMAGE_BUCKET)
          .createSignedUrl(path, 60 * 60);

        if (error || !data?.signedUrl) return null;

        this.privateTicketImageCache.set(path, data.signedUrl);
        return data.signedUrl;
      } catch (e) {
        return null;
      }
    },
    async processInboundTicketImages(htmlContent) {
      if (!htmlContent || typeof htmlContent !== 'string') return htmlContent || '';
      if (typeof document === 'undefined') return htmlContent;

      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      const images = Array.from(container.querySelectorAll('img'));
      if (!images.length) return htmlContent;

      await Promise.all(images.map(async (img) => {
        const src = img.getAttribute('src') || '';
        const inboundPath = this.extractInboundTicketPath(src);
        if (!inboundPath) return;

        const signedUrl = await this.getSignedTicketImage(inboundPath);
        if (signedUrl) {
          img.setAttribute('src', signedUrl);
        }
      }));

      return container.innerHTML;
    },
    convertFormattedTextToHtml(content) {
      if (!content) return '';

      const containsHtml = /<\/?[a-z][\s\S]*>/i.test(content);
      if (containsHtml) return content;

      let html = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/__(.+?)__/g, '<u>$1</u>');
      html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
      html = html.replace(/_(.+?)_/g, '<em>$1</em>');
      html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
      html = html.replace(/\n/g, '<br>');

      return html;
    },
    async renderFormattedTextContent(htmlContent) {
      if (!this.$refs.rte) return;
      const formattedHtml = this.convertFormattedTextToHtml(htmlContent);
      const processed = await this.processInboundTicketImages(formattedHtml);
      if (this.$refs.rte.innerHTML !== processed) {
        this.$refs.rte.innerHTML = processed;
      }
    },
    insertLink() {
      this.$refs.rte && this.$refs.rte.focus();
      const url = prompt('Digite a URL do link:');
      if (url) {
        document.execCommand('createLink', false, url);
      }
    },
    insertImage() {
      this.$refs.rte && this.$refs.rte.focus();
      const url = prompt('Digite a URL da imagem:');
      if (url) {
        document.execCommand('insertImage', false, url);
      }
    },
    toggleDropdown() {
      this.dropdownOpen = !this.dropdownOpen;
      if (this.dropdownOpen) {
        this.$nextTick(() => {
          if (this.$refs.dropdownList) {
            const input = this.$refs.dropdownList.querySelector('input');
            if (input) input.focus();
          }
          setTimeout(() => {
            const trigger = this.$el.querySelector('.custom-dropdown-selected');
            const dropdown = this.$refs.dropdownList;
            if (trigger && dropdown) {
              const scrollParent = this.getScrollParent(trigger);
              const triggerRect = trigger.getBoundingClientRect();
          const dropdownHeight = 320; // max-height do dropdown
              let spaceBelow;
              if (scrollParent === document.body) {
                spaceBelow = window.innerHeight - triggerRect.bottom;
              } else {
                const parentRect = scrollParent.getBoundingClientRect();
                spaceBelow = parentRect.bottom - triggerRect.bottom;
              }
              // Se não cabe abaixo, abre para cima
              this.dropdownOpenUp = spaceBelow < dropdownHeight;
            }
          }, 0);
          document.addEventListener('click', this.handleClickOutsideDropdown);
        });
      } else {
        document.removeEventListener('click', this.handleClickOutsideDropdown);
      }
    },
    selectDropdownOption(option) {
      this.localValue = option.value;
      this.updateValue({ target: { value: option.value } });
      this.dropdownOpen = false;
    },
    handleClickOutsideDropdown(e) {
      if (!this.$refs.dropdownList) return;
      if (!this.$refs.dropdownList.contains(e.target) && !e.target.classList.contains('custom-dropdown-selected')) {
        this.dropdownOpen = false;
        document.removeEventListener('click', this.handleClickOutsideDropdown);
      }
    },
    // Função utilitária para encontrar o container scrollável mais próximo
    getScrollParent(element) {
      let style = getComputedStyle(element);
      const excludeStaticParent = style.position === "absolute";
      const overflowRegex = /(auto|scroll|overlay)/;
      if (style.position === "fixed") return document.body;
      for (let parent = element; (parent = parent.parentElement);) {
        style = getComputedStyle(parent);
        if (excludeStaticParent && style.position === "static") {
          continue;
        }
        if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX)) return parent;
      }
      return document.body;
    },
    validateValue(value) {

      switch (this.field.fieldType) {
        case 'DATE':
          this.validateDate(value);
          break;
        case 'DEADLINE':
          this.validateDeadline(value);
          break;
        case 'DECIMAL': {
          const numericValue =
            typeof value === 'number'
              ? value
              : value === '' || value === null || value === undefined
                ? null
                : parseFloat(value);
          this.validateDecimal(numericValue);
          break;
        }
        case 'INTEGER': {
          const numericValue =
            typeof value === 'number'
              ? value
              : value === '' || value === null || value === undefined
                ? null
                : parseInt(value, 10);
          this.validateInteger(numericValue);
          break;
        }
        case 'SIMPLE_LIST':
        case 'LIST':
        case 'CONTROLLED_LIST': {
          const listValue = value !== null && value !== undefined ? String(value) : value;
          this.validateList(listValue);
          break;
        }

        case 'MULTILINE_TEXT':
          this.validateMultilineText(
            typeof value === 'string' ? value : value != null ? String(value) : ''
          );
          break;
        case 'FORMATED_TEXT':
        case 'SIMPLE_TEXT':
        case 'TEXT':
        case 'EMAIL':
        case 'PHONE':
          this.validateText(
            typeof value === 'string' ? value : value != null ? String(value) : ''
          );
          break;
        case 'YES_NO':
          if (this.field.is_mandatory && (value === null || value === undefined || value === '')) {
            this.error = 'Campo obrigatório';
          } else {
            this.error = null;
          }
          break;
        default: {
          const hasValue = !(
            value === null ||
            value === undefined ||
            (typeof value === 'string' && value.trim() === '')
          );
          if (this.field.is_mandatory && !hasValue) {
            this.error = 'Campo obrigatório';
          } else {
            this.error = null;
          }
        }
          break;
      }

      return !this.error;
    },
    validate() {
      return this.validateValue(this.localValue);

    },
    onDropdownClick(e) {
      if (!this.field.is_readonly) {
        this.toggleDropdown();
      }
    },
  },
  mounted() {
    if (this.field.fieldType === 'FORMATED_TEXT' && this.$refs.rte) {
      this.renderFormattedTextContent(this.localValue || '');
    }
    if (this.field.fieldType === 'DEADLINE') {
      this.updateDeadlineTimer();
    }
  },
  beforeDestroy() {
    this.clearDeadlineTimer();
  },
  beforeUnmount() {
    this.clearDeadlineTimer();
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

  .field-component:not(.field-type-deadline) {
    --text-input-bg: #ffffff;
    --text-input-border: #d1d5db;
    --text-input-border-focus: #bdbdbd;
  }

  .field-label {
    font-size: 12px;
    font-weight: 400;
    margin-bottom: 4px;
    color: #787878;
    padding-left: 8px;
  }

  .required-indicator {
    color: #e53935;
    margin-left: 2px;
    font-weight: bold;
  }

  .field-row {
    display: flex;
    align-items: center;
    width: 100%;
  }

  .field-input {
    flex: 1;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
    color: #787878;
    font-size: 0.845rem;
    letter-spacing: 0px;
    text-overflow: ellipsis;
  }

  input.field-input,
  textarea.field-input {
    padding: 8px;
    border: 1px solid var(--text-input-border);
    border-radius: 4px;
    background-color: var(--text-input-bg);
  }

  input.field-input {
    height: 34px;
  }

  .text-input,
  .decimal-input,
  .integer-input {
    background-color: var(--text-input-bg);
  }

  input.field-input:focus,
  textarea.field-input:focus {
    border-color: var(--text-input-border-focus);
    box-shadow: none;
    background-color: #ffffff;
    color: #787878;
  }

  input.field-input::placeholder,
  textarea.field-input::placeholder {
    color: #787878;
    opacity: 1;
  }

  .field-component input.field-input:disabled,
  .field-component textarea.field-input:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
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

  .field-tooltip:hover .tooltip-text {}

  /* Estilos específicos por tipo de campo */
  .date-input {
    min-width: 150px;
    padding: 0;
    border: 1px solid var(--text-input-border);
    border-radius: 4px;
    height: 34px;
    display: flex;
    align-items: center;
    background-color: var(--text-input-bg);
    box-sizing: border-box;
  }

  .date-input:focus-within {
    border-color: var(--text-input-border-focus);
    background-color: #ffffff;
  }

  .date-input :deep(.dp-input) {
    border: none;
    background: transparent;
    padding: 0 32px 0 8px;
    height: 100%;
    color: #787878;
    font-size: 0.845rem;
    letter-spacing: 0px;
    text-overflow: ellipsis;
    box-sizing: border-box;
  }

  .date-input :deep(.dp-input::placeholder) {
    color: #787878;
    opacity: 1;
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
    height: auto;
  }

  /* Estilos para campos obrigatórios */
  .is-mandatory .field-label {
    font-weight: 400;
  }

  /* Estilos para campos com erro */
  .field-input.error {
    border-color: #ff0000;
    box-shadow: 0 0 0 1px #ff0000;
  }

  .field-feedback {
    margin-top: 6px;
    font-size: 0.845rem;
    letter-spacing: 0px;
    text-overflow: ellipsis;
    font-weight: 400;
    border-radius: 4px;
    padding: 4px 8px;
    display: inline-block;
  }

  .field-feedback.success {
    color: #155724;
    background: #d4edda;
    border: 1px solid #c3e6cb;
  }

  .field-feedback.error {
    color: #721c24;
    background: #f8d7da;
    border: 1px solid #f5c6cb;
  }

  .deadline-diff {
    font-size: 12px;
    color: #007bff;
    margin-top: 4px;
  }

  .deadline-visual {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: 20px !important;
    font-size: 12px;
    transition: background .3s, color .3s, border-color .3s;
    width: 130px !important;
    height: 30px !important;
    border: 1.5px solid transparent;
    background: transparent;
    cursor: pointer;
    user-select: none;
  }

  .deadline-visual:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(55, 111, 208, 0.2);
  }

  .deadline-empty {
    border-color: #d1d5db !important;
    background: #ffffff !important;
    color: #6b7280 !important;
    font-weight: 500;
  }

  .deadline-empty-icon {
    font-size: 18px;
    line-height: 1;
  }

  .deadline-empty-text {
    line-height: 1;
  }

  .deadline-diff-display {
    font-weight: bold;
  }

  .deadline-green {
    background: rgb(131, 176, 244) !important;
    color: #ffffff !important;
    border: 1.5px solid rgb(131, 176, 244) !important;
    font-weight: bold;
  }

  .deadline-yellow {
    background: #fffbe6 !important;
    color: #b59f00 !important;
    border: 1.5px solid #b59f00 !important;
    font-weight: bold;
  }

  .deadline-red {
    background: #ffdddd !important;
    color: #b71c1c !important;
    border: 1.5px solid #b71c1c !important;
    font-weight: bold;
  }

  .deadline-closed {
    background: #666666 !important;
    color: #ffffff !important;
    border: 1.5px solid #666666 !important;
    font-weight: bold;
  }

  .deadline-picker-popup {
    position: absolute;
    left: 0;
    top: 100%;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    padding: 4px 8px;
    margin-top: 4px;
    z-index: 1000;
  }

  .readonly-field {
    background-color: #f0f0f0 !important;
    color: #888 !important;
    cursor: not-allowed !important;
    border-style: dashed !important;
    opacity: 1 !important;
  }

  .formatted-text-wrapper {
    width: 100%;
  }

  .toolbar {
    margin-bottom: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    row-gap: 6px;
    background: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 6px 6px 0 0;
    padding: 6px 8px 4px 8px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  }

  .toolbar button {
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 3px 10px;
    cursor: pointer;
    font-size: 15px;
    color: #333;
    transition: background 0.2s, border 0.2s;
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.01);
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .toolbar button:hover,
  .toolbar button:focus {
    background: #e3eafc;
    border-color: #90b4f8;
    color: #1a237e;
  }

  .toolbar button:active {
    background: #dbeafe;
    border-color: #60a5fa;
  }

  .rich-text-input {
    max-width: 100%;
    overflow-x: auto;
    word-break: break-word;
    box-sizing: border-box;
    min-height: 100px;
    padding: 8px;
    border: 1px solid var(--text-input-border);
    border-radius: 4px;
    background-color: var(--text-input-bg);
    color: #787878;
    font-size: 0.845rem;
    letter-spacing: 0px;
    text-overflow: ellipsis;
    white-space: pre-wrap;
    transition: background .3s, border-color .3s, color .3s;
    outline: none !important;
  }

  .rich-text-input:focus {
    border-color: var(--text-input-border-focus);
    background-color: #ffffff;
    color: #787878;
  }

  .rich-text-input[data-placeholder]:empty::before {
    content: attr(data-placeholder);
    color: #787878;
    opacity: 1;
    pointer-events: none;
  }

  .rich-text-input img,
  .rich-text-input table,
  .rich-text-input iframe {
    max-width: 100%;
    height: auto;
    box-sizing: border-box;
    display: block;
  }

  .rich-text-input table {
    width: 100% !important;
    table-layout: auto;
    overflow-x: auto;
    display: block;
  }

  .toolbar {
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
  }

  .toolbar .material-symbols-outlined {
    font-size: 18px !important;
    color: rgb(105, 157, 140) !important;
    vertical-align: middle;
  }

  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined');

  .color-btn {
    position: relative;
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 3px 10px;
    cursor: pointer;
    font-size: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, border 0.2s;
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.01);
    margin-left: 2px;
  }

  .color-btn:hover,
  .color-btn:focus {
    background: #e3eafc;
    border-color: #90b4f8;
  }

  .color-btn:active {
    background: #dbeafe;
    border-color: #60a5fa;
  }

  .color-btn .color-input {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    border: none;
    padding: 0;
    margin: 0;
  }

  .dropdown-search-wrapper {
    position: relative;
    width: 96%;
    margin: 10px auto 10px auto;
    display: flex;
    align-items: center;
    background-color: #FFFFFF !important;
  }

  .dropdown-search-wrapper .search-icon {
    position: absolute;
    right: 12px;
    font-size: 20px;
    color: #bdbdbd;
    pointer-events: none;
    top: 50%;
    transform: translateY(-50%);
  }

  .list-search-input {
    border: 1.5px solid #bdbdbd !important;
    border-radius: 20px;
    padding: 7px 38px 7px 12px;
    font-size: 0.845rem;
    letter-spacing: 0px;
    text-overflow: ellipsis;
    width: 100%;
    box-sizing: border-box;
    background: #f8f9fa;
    transition: border 0.2s;
    outline: none;
  }

  .list-search-input:focus,
  .list-search-input:active,
  .list-search-input:hover {
    border-color: #bdbdbd !important;
    background: #fff;
  }

  .custom-dropdown-wrapper {
    position: relative;
    width: 100%;
  }

  .custom-dropdown-selected {
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 6px 12px;
    background: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 34px;
    font-size: 0.845rem;
    letter-spacing: 0px;
    text-overflow: ellipsis;
    transition: border .2s;
    color: #787878 !important;
  }

  .custom-dropdown-selected.open {
    border-color: #699d8c;
    box-shadow: 0 2px 8px rgba(105, 157, 140, 0.08);
  }

  .custom-dropdown-selected.error {
    border-color: #ff0000;
    box-shadow: 0 0 0 1px #ff0000;
  }

  .custom-dropdown-selected.readonly-field {
    background: #f0f0f0;
    color: #888;
    cursor: not-allowed;
    border-style: dashed;
  }

  .custom-dropdown-list {
    position: absolute;
    left: 0;
    right: 0;
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 0 0 6px 6px;
    box-shadow: 0 4px 16px rgba(105, 157, 140, 0.10);
    z-index: 100;
    max-height: 320px;
    min-width: 180px;
    overflow-y: auto;
    margin-top: 2px;
    padding-bottom: 4px;
  }

  .custom-dropdown-option {
    padding: 8px 12px;
    cursor: pointer;
    font-size: 0.845rem;
    letter-spacing: 0px;
    text-overflow: ellipsis;
    transition: background 0.15s;
  }

  .custom-dropdown-option.selected {
    background: #e3eafc;
    color: #699d8c;
    font-weight: bold;
  }

  .custom-dropdown-option:hover {
    background: #f5f5f5;
  }

  .custom-dropdown-no-options {
    padding: 8px 12px;
    color: #888;
    font-size: 13px;
    text-align: center;
  }

  .custom-dropdown-selected .dropdown-arrow {
    font-size: 20px;
    color: #bdbdbd;
    margin-left: 8px;
  }

  .custom-dropdown-selected .placeholder {
    color: var(--placeholder-color, #787878);
  }

  .custom-dropdown-list.open-up {
    top: auto !important;
    bottom: 100%;
    border-radius: 6px 6px 0 0;
    box-shadow: 0 -4px 16px rgba(105, 157, 140, 0.10);
    margin-top: 0;
    margin-bottom: 2px;
  }

  /* Estilos para o placeholder de carregamento */
  .field-component-loading {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin-bottom: 5px;
  }

  .loading-placeholder {
    height: 34px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    border-radius: 4px;
    margin-top: 4px;
  }

  @keyframes loading {
    0% {
      background-position: 200% 0;
    }

    100% {
      background-position: -200% 0;
    }
  }
</style>
