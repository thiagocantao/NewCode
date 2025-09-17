<template>
  <CustomAlert
    :message="error" 
    :visible="!!error && showAlert"
    @close="showAlert = false"
  />
  <div
    class="field-component"
    :class="[`field-type-${field.fieldType.toLowerCase()}`, { 'is-mandatory': field.is_mandatory }]"
    :style="componentStyleVars"
  >
    <!-- Label do campo -->
    <label v-if="!field.is_hide_legend" class="field-label"> 
      {{ field.name }}
      <span v-if="field.is_mandatory" class="required-indicator">*</span>
    </label> 

    <!-- Campos de entrada baseados no tipo -->
    <div class="field-input-container">
      <template v-if="field.fieldType === 'DATE'">
        <CustomDatePicker
          v-model="localValue"
          :disabled="field.is_readonly"
          @update:modelValue="val => updateValue({ target: { value: val } })"
          :class="['field-input', 'date-input', { error: error && field.is_mandatory }, { 'readonly-field': field.is_readonly }]"
        />
      </template>
      <template v-else-if="field.fieldType === 'DEADLINE'">
        <CustomDatePicker
          v-model="deadlineValue"
          :disabled="field.is_readonly"
          :show-time="true"
          @update:modelValue="val => updateValue({ target: { value: val } })"
          :class="['field-input', 'date-input', { error: error && field.is_mandatory }, { 'readonly-field': field.is_readonly }]"
        />
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

      <!-- YES_NO -->
      <template v-else-if="field.fieldType === 'YES_NO'">
        <div class="yes-no-container">
          <label class="radio-label">
            <input
              type="radio"
              :name="field.id"
              :value="true"
              v-model="localValue"
              @change="updateValue"
              :disabled="field.is_readonly"
            />
            Sim
          </label>
          <label class="radio-label">
            <input
              type="radio"
              :name="field.id"
              :value="false"
              v-model="localValue"
              @change="updateValue"
              :disabled="field.is_readonly"
            />
            Não
          </label>
        </div>
      </template>

      <template v-else-if="field.fieldType === 'SIMPLE_LIST' || field.fieldType === 'CONTROLLED_LIST' || field.fieldType === 'LIST'">
        <div
          class="custom-dropdown-wrapper"
          :class="{ 'readonly-field': field.is_readonly, 'dropdown-open': dropdownOpen }"
          ref="dropdownWrapper"
        >
          <div
            class="custom-dropdown-selected"
            :class="{ 'open': dropdownOpen, 'readonly-field': field.is_readonly }"
            @click="onDropdownClick"
            tabindex="0"
            @keydown.enter.prevent="!field.is_readonly && toggleDropdown()"
          >
            <span
              v-if="selectedOption"
              @click.stop="onDropdownClick"
              style="pointer-events:auto"
            >
              {{ selectedOption.label }}
            </span>
            <span
              v-else
              class="placeholder"
              @click.stop="onDropdownClick"
              style="pointer-events:auto"
            >
              {{ dropdownPlaceholder }}
            </span>
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
            <div
              v-for="option in filteredListOptions"
              :key="option.value"
              class="custom-dropdown-option"
              :class="{ selected: localValue == option.value }"
              @click="selectDropdownOption(option)"
            >
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
              <input
                type="color"
                @mousedown="saveSelection"
                @input="setColor($event)"
                :value="currentColor"
                class="color-input"
                title="Cor do texto"
              />
            </button>
          </div>
          <div
            ref="rte"
            :contenteditable="!field.is_readonly"
            dir="ltr"
            :class="['field-input', 'rich-text-input', { 'readonly-field': field.is_readonly }]"
            :data-placeholder="field.placeholder || field.placeholder_translations?.pt_br || ''"
            @input="onContentEditableInput"
            @blur="updateValue"
          ></div>
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

export default {
  name: 'FieldComponent',
  components: { CustomAlert, CustomDatePicker },
  props: {
    field: { type: Object, required: true },
    apiUrl: { type: String, required: false },
    apiKey: { type: String, required: false },
    apiAuthorization: { type: String, required: false },
    ticketId: { type: String, required: false },
    options: { type: Array, default: () => [] },
    userId: { type: String, required: false }
  },
  data() {
    return {
      searchTerm: '',
      dropdownOpen: false,
      dropdownOpenUp: false,
      error: null,
      feedback: null,
      feedbackType: null,
      localValue: this.parseInitialValue(this.field),
      originalValue: this.parseInitialValue(this.field),
      showAlert: false,
      currentColor: '#699d8c',
      savedSelection: null,
      isUserInput: false,
      outsideClickHandler: null,
    };
  },
  computed: {
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
      const tokens = this.themeTokens || {};
      return {
        '--text-input-bg': tokens.inputBG || '#FFFFFF',
        '--text-input-border': tokens.inputBorder || '#d1d5db',
        '--text-input-border-focus': tokens.inputBorderInFocus || tokens.inputBorder || '#d1d5db'
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
      if (this.options && this.options.length > 0) {
        return this.options;
      }
      if (
        (this.field.fieldType === 'SIMPLE_LIST' ||
          this.field.fieldType === 'LIST' ||
          this.field.fieldType === 'CONTROLLED_LIST') &&
        typeof this.field.list_options === 'string' &&
        this.field.list_options.trim() !== ''
      ) {
        return this.field.list_options
          .split(',')
          .map(opt => {
            const trimmed = opt.trim();
            return { value: trimmed, label: trimmed };
          })
          .sort((a, b) => a.label.localeCompare(b.label));
      }
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
      return this.listOptions.filter(opt =>
        opt.label.toLowerCase().includes(term)
      );
    },
    deadlineValue: {
      get() {
        if (this.field.fieldType !== 'DEADLINE') return this.localValue;
        const val = this.localValue || this.field.value;
        if (!val) return '';
        let match = val.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
        if (match) {
          return `${match[1]}T${match[2]}`;
        }
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          const pad = n => String(n).padStart(2, '0');
          return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
        return '';
      },
      set(v) {
        this.localValue = v;
      }
    }
  },
  watch: {
    field: {
      handler(newField) {
        const parsed = this.parseInitialValue(newField);
        this.localValue = parsed;
        this.originalValue = parsed;
      },
      deep: true,
      immediate: true
    },
    'field.value': {
      handler(newVal) {
        if (this.field.fieldType === 'YES_NO') {
          const parsed = this.parseBoolean(newVal);
          this.localValue = parsed;
          this.originalValue = parsed;
        }
      },
      immediate: true
    },
    error(val) { this.showAlert = !!val; },
    localValue(newVal) {
      if (this.field.fieldType === 'FORMATED_TEXT' && this.$refs.rte && this.$refs.rte.innerHTML !== newVal) {
        this.$refs.rte.innerHTML = newVal || '';
      }
    },
    searchTerm() { if (this.dropdownOpen) this.$nextTick(this.updateDropdownDirection); },
    'field.options': {
      handler() { if (this.dropdownOpen) this.$nextTick(this.updateDropdownDirection); },
      deep: true
    },
    options: {
      handler() { if (this.dropdownOpen) this.$nextTick(this.updateDropdownDirection); },
      deep: true
    }
  },
  methods: {
    parseBoolean(val) {
      if (typeof val === 'string') {
        const low = val.toLowerCase();
        if (['true', '1', 'yes', 'sim', 's', 'y'].includes(low)) return true;
        if (['false', '0', 'no', 'nao', 'não', 'n'].includes(low)) return false;
      }
      return Boolean(val);
    },
    parseInitialValue(field) {
      if (!field) return '';
      let val = field.value;
      if (field.fieldType === 'YES_NO') {
        return this.parseBoolean(val);
      }
      return val ?? '';
    },
    updateValue(event) {
      let value;
      if (this.field.fieldType === 'FORMATED_TEXT') {
        value = this.localValue;
      } else {
        value = event.target.value;
      }
      switch (this.field.fieldType) {
        case 'DECIMAL':
          value = value === '' ? null : parseFloat(value);
          break;
        case 'INTEGER':
          value = value === '' ? null : parseInt(value, 10);
          break;
        case 'YES_NO':
          value = this.parseBoolean(value);
          break;
        default:
          break;
      }
      this.localValue = value;
      this.$emit('update:value', value);
    },
    onContentEditableInput(event) {
      this.localValue = event.target.innerHTML;
    },
    format(cmd) {
      if (this.$refs.rte) {
        this.$refs.rte.focus();
        document.execCommand(cmd, false, null);
        this.localValue = this.$refs.rte.innerHTML;
        this.$emit('update:value', this.localValue);
      }
    },
    saveSelection() {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        this.savedSelection = sel.getRangeAt(0);
      }
    },
    setColor(event) {
      if (this.$refs.rte) {
        this.$refs.rte.focus();
      }
      const sel = window.getSelection();
      if (this.savedSelection && sel) {
        sel.removeAllRanges();
        sel.addRange(this.savedSelection);
      }
      document.execCommand('foreColor', false, event.target.value);
      this.currentColor = event.target.value;
      if (this.$refs.rte) {
        this.localValue = this.$refs.rte.innerHTML;
        this.$emit('update:value', this.localValue);
      }
    },
    insertLink() {
      if (this.$refs.rte) {
        this.$refs.rte.focus();
        const url = prompt('Digite a URL do link:');
        if (url) {
          document.execCommand('createLink', false, url);
          this.localValue = this.$refs.rte.innerHTML;
          this.$emit('update:value', this.localValue);
        }
      }
    },
    insertImage() {
      if (this.$refs.rte) {
        this.$refs.rte.focus();
        const url = prompt('Digite a URL da imagem:');
        if (url) {
          document.execCommand('insertImage', false, url);
          this.localValue = this.$refs.rte.innerHTML;
          this.$emit('update:value', this.localValue);
        }
      }
    },
    toggleDropdown() {
      if (this.field.is_readonly) return;
      if (this.dropdownOpen) {
        this.closeDropdown();
      } else {
        this.dropdownOpen = true;
        this.$nextTick(() => {
          this.updateDropdownDirection();
          this.addOutsideClickListeners();
        });

      }
    },
    onDropdownClick() {
      this.toggleDropdown();
    },
    selectDropdownOption(option) {
      this.localValue = option.value;
      this.$emit('update:value', option.value);
      this.closeDropdown();
    },
    closeDropdown() {
      if (!this.dropdownOpen) {
        this.removeOutsideClickListeners();
        return;
      }
      this.dropdownOpen = false;
      this.dropdownOpenUp = false;
      if (this.$refs.dropdownList) {
        this.$refs.dropdownList.style.maxHeight = '';
      }
      this.removeOutsideClickListeners();
    },
    addOutsideClickListeners() {
      if (this.outsideClickHandler) return;
      this.outsideClickHandler = event => {
        const wrapper = this.$refs.dropdownWrapper;
        if (!wrapper || !this.dropdownOpen) return;
        if (wrapper.contains(event.target)) return;
        this.closeDropdown();
      };
      document.addEventListener('mousedown', this.outsideClickHandler);
      document.addEventListener('touchstart', this.outsideClickHandler);
    },
    removeOutsideClickListeners() {
      if (!this.outsideClickHandler) return;
      document.removeEventListener('mousedown', this.outsideClickHandler);
      document.removeEventListener('touchstart', this.outsideClickHandler);
      this.outsideClickHandler = null;
    },
    updateDropdownDirection() {
      if (typeof window === 'undefined') return;
      const list = this.$refs.dropdownList;
      const wrapper = this.$refs.dropdownWrapper;
      if (!list || !wrapper) return;

      const DEFAULT_MAX_HEIGHT = 220;
      const wrapperRect = wrapper.getBoundingClientRect();
      list.style.maxHeight = '';

      let spaceBelow = window.innerHeight - wrapperRect.bottom;
      let spaceAbove = wrapperRect.top;

      let currentAncestor = wrapper.parentElement;
      while (currentAncestor) {
        const style = window.getComputedStyle(currentAncestor);
        const overflowY = style.overflowY;
        const overflow = style.overflow;

        if (
          ['auto', 'scroll', 'hidden'].includes(overflowY) ||
          ['auto', 'scroll', 'hidden'].includes(overflow)
        ) {
          const ancestorRect = currentAncestor.getBoundingClientRect();
          spaceBelow = Math.min(spaceBelow, ancestorRect.bottom - wrapperRect.bottom);
          spaceAbove = Math.min(spaceAbove, wrapperRect.top - ancestorRect.top);
        }

        if (currentAncestor === document.documentElement) {
          break;
        }

        currentAncestor = currentAncestor.parentElement;
      }

      spaceBelow = Math.max(spaceBelow, 0);
      spaceAbove = Math.max(spaceAbove, 0);

      const naturalHeight = Math.min(list.scrollHeight, DEFAULT_MAX_HEIGHT);
      const shouldOpenUp = spaceBelow < naturalHeight && spaceAbove > spaceBelow;
      this.dropdownOpenUp = shouldOpenUp;

      const availableSpace = shouldOpenUp ? spaceAbove : spaceBelow;
      const finalHeight = availableSpace > 0
        ? Math.min(naturalHeight, availableSpace)
        : naturalHeight;

      list.style.maxHeight = `${finalHeight}px`;
    }
  },
  mounted() {
    console.log(wwLib);
    if (this.field.fieldType === 'FORMATED_TEXT' && this.$refs.rte) {
      this.$refs.rte.innerHTML = this.localValue || '';
    }
    if (this.field.fieldType === 'YES_NO') {
      const parsed = this.parseBoolean(this.field.value);
      this.localValue = parsed;
      this.originalValue = parsed;
    }
  },
  beforeDestroy() {
    this.removeOutsideClickListeners();
  }
};
</script>

<style scoped>
.field-component {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 5px;
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
  font-size: 14px;
}

input.field-input,
textarea.field-input {
  padding: 8px;
  border: 1px solid var(--text-input-border);
  border-radius: 4px;
  background-color: var(--text-input-bg);

}

input.field-input {
  height: 36px;
}

.text-input,
.decimal-input,
.integer-input {
  background-color: var(--text-input-bg);
}

input.field-input:focus,
textarea.field-input:focus {
  outline: none;
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

.field-tooltip:hover .tooltip-text {

}

/* Estilos específicos por tipo de campo */
.date-input {
  min-width: 150px;
  padding: 0;
  border: 1px solid var(--text-input-border);
  border-radius: 4px;
  height: 36px;
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
  font-size: 14px;
  box-sizing: border-box;
}


.date-input :deep(.dp-input:focus) {
  outline: none;
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
  font-size: 13px;
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
  border-radius: 20px !important;
  text-align: center;
  font-size: 12px;
  transition: background 0.3s, color 0.3s;
}
.deadline-green {
  background: #e6ffed !important;
  color: #1b5e20 !important;
  border: 1.5px solid #1b5e20 !important;
}
.deadline-yellow {
  background: #fffbe6 !important;
  color: #b59f00 !important;
  border: 1.5px solid #b59f00 !important;
}
.deadline-red {
  background: #ffdddd !important;
  color: #b71c1c !important;
  border: 1.5px solid #b71c1c !important;
}

.deadline-picker-popup {
  position: absolute;
  left: 0;
  top: 100%;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
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
  gap: 6px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 6px 6px 0 0;
  padding: 6px 8px 4px 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
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
  box-shadow: 0 1px 1px rgba(0,0,0,0.01);
  display: flex;
  align-items: center;
  gap: 2px;
}

.toolbar button:hover, .toolbar button:focus {
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
  font-size: 14px;
  white-space: pre-wrap;
  transition: background 0.3s, border-color 0.3s, color 0.3s;  
  outline: none !important;
}

.rich-text-input:focus {
  border-color: var(--text-input-border-focus);
  background-color: #ffffff;
  color: #787878;
  outline: none !important;
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
  box-shadow: 0 1px 1px rgba(0,0,0,0.01);
  margin-left: 2px;
}

.color-btn:hover, .color-btn:focus {
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
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  background: #f8f9fa;
  transition: border 0.2s;
  outline: none !important;
  color: #787878;
}

.list-search-input:focus,
.list-search-input:active,
.list-search-input:hover {
  border-color: #bdbdbd !important;
  background: #fff;
}

.list-search-input::placeholder {
  color: #787878;
  opacity: 1;
}

.list-search-input::placeholder {
  color: #787878;
  opacity: 1;
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
  font-size: 13px;
  transition: border 0.2s;
  color: #787878;
}

.custom-dropdown-selected.open {
  border-color: #699d8c;
  box-shadow: 0 2px 8px rgba(105,157,140,0.08);
}

.custom-dropdown-selected.readonly-field {
  background: #f0f0f0;
  color: #888;
  cursor: not-allowed;
  border-style: dashed;
}

.custom-dropdown-wrapper.dropdown-open {
  z-index: 99999;
}

.custom-dropdown-list {
  position: absolute;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 16px rgba(105,157,140,0.10);
  z-index: 99999;
  max-height: 220px;
  overflow-y: auto;
  margin-top: 2px;
  padding-bottom: 4px;
}

.custom-dropdown-option {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
  color: #787878;
}

.custom-dropdown-option.selected {
  background: #e3eafc;
  color: #787878;
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
  color: #aaa;
}

.custom-dropdown-list.open-up {
  top: auto !important;
  bottom: 100%;
  border-radius: 6px 6px 0 0;
  box-shadow: 0 -4px 16px rgba(105,157,140,0.10);
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
