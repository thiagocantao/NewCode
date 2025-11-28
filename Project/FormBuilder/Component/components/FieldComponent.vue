<template>
  <div
    class="field-component"
    :class="[`field-type-${(field.fieldType || '').toLowerCase()}`, { 'is-mandatory': isMandatory }]"
    :style="componentStyleVars"
  >
    <label v-if="!isLegendHidden" class="field-label">
      {{ field.name }}
      <span v-if="isMandatory" class="required-indicator">*</span>
    </label>

    <div class="field-input-container" @click="$refs.simpleText && $refs.simpleText.focus()">
      <template v-if="field.fieldType === 'DATE'">
        <CustomDatePicker
          v-model="localValue"
          :disabled="isReadOnly"
          :error="!!error && isMandatory"
          @mousedown.stop
          @touchstart.stop
          @update:modelValue="onDateChange"
          :class="['field-input', 'date-input', { error: !!error && isMandatory }, { 'readonly-field': isReadOnly }]"
        />
      </template>

      <template v-else-if="field.fieldType === 'DEADLINE'">
        <div style="position: relative;">
          <div
            class="deadline-visual"
            :class="[
              deadlineColorClass,
              { 'readonly-field': isReadOnly, 'deadline-empty': !deadlineHasValue }
            ]"
            :title="deadlineOriginalFormatted"
            role="button"
            :tabindex="isReadOnly ? -1 : 0"
            @mousedown.stop
            @touchstart.stop
            @click="openDeadlinePicker"
            @keydown.enter.prevent="openDeadlinePicker"
            @keydown.space.prevent="openDeadlinePicker"
          >
            <template v-if="deadlineHasValue">
              <span class="deadline-diff-display">{{ deadlineDiff }}</span>
            </template>
            <template v-else>
              <span class="material-symbols-outlined deadline-empty-icon">calendar_month</span>
              <span class="deadline-empty-text">{{ translateText('Select') }}</span>
            </template>
          </div>
          <CustomDatePicker
            ref="deadlineDatePicker"
            v-model="deadlineValue"
            :disabled="isReadOnly"
            :show-time="true"
            :open-up-offset="60"
            @mousedown.stop
            @touchstart.stop
            @update:modelValue="onDeadlineChange"
            :class="['field-input', 'date-input', { error: !!error && isMandatory }, { 'readonly-field': isReadOnly }]"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 0; overflow: hidden;"
          />
        </div>
      </template>

      <template v-else-if="field.fieldType === 'DECIMAL'">
        <input
          type="number"
          step="0.01"
          v-model="localValue"
          :disabled="isReadOnly"
          @mousedown.stop
          @touchstart.stop
          @blur="updateValue"
          :class="['field-input', 'decimal-input', { error: !!error && isMandatory }, { 'readonly-field': isReadOnly }]"
        />
      </template>

      <template v-else-if="field.fieldType === 'INTEGER'">
        <input
          type="number"
          step="1"
          v-model="localValue"
          :disabled="isReadOnly"
          @mousedown.stop
          @touchstart.stop
          @blur="updateValue"
          :class="['field-input', 'integer-input', { error: !!error && isMandatory }, { 'readonly-field': isReadOnly }]"
        />
      </template>

      <template v-else-if="field.fieldType === 'YES_NO'">
        <div class="yes-no-container">
          <label class="radio-label">
            <input
              type="radio"
              :name="field.id"
              value="true"
              :checked="localValue === true"
              :disabled="isReadOnly"
              @mousedown.stop
              @touchstart.stop
              @change="onYesNoChange(true)"
            />
            {{ translateText('Yes') }}
          </label>
          <label class="radio-label">
            <input
              type="radio"
              :name="field.id"
              value="false"
              :checked="localValue === false"
              :disabled="isReadOnly"
              @mousedown.stop
              @touchstart.stop
              @change="onYesNoChange(false)"
            />
            {{ translateText('No') }}
          </label>
        </div>
      </template>

      <template v-else-if="field.fieldType === 'FORMATED_TEXT'">
        <div class="formatted-text-wrapper">
          <div v-if="!isReadOnly" class="toolbar">
            <button type="button" @click="format('bold')" :title="translateText('Bold')"><span class="material-symbols-outlined">format_bold</span></button>
            <button type="button" @click="format('italic')" :title="translateText('Italic')"><span class="material-symbols-outlined">format_italic</span></button>
            <button type="button" @click="format('underline')" :title="translateText('Underline')"><span class="material-symbols-outlined">format_underlined</span></button>
            <button type="button" @click="format('insertUnorderedList')" :title="translateText('Bullet list')"><span class="material-symbols-outlined">format_list_bulleted</span></button>
            <button type="button" @click="format('insertOrderedList')" :title="translateText('Numbered list')"><span class="material-symbols-outlined">format_list_numbered</span></button>
            <button type="button" @click="format('removeFormat')" :title="translateText('Clear formatting')"><span class="material-symbols-outlined">format_clear</span></button>
            <button type="button" @click="insertLink" :title="translateText('Insert link')"><span class="material-symbols-outlined">link</span></button>
            <button type="button" @click="insertImage" :title="translateText('Insert image')"><span class="material-symbols-outlined">image</span></button>
            <button type="button" class="color-btn" :style="{ color: currentColor }" :title="translateText('Text color')">
              <span style="font-weight: bold; font-size: 16px;">A</span>
              <input type="color" @input="setColor($event)" :value="currentColor" class="color-input" :title="translateText('Text color')" />
            </button>
          </div>
          <div
            ref="rte"
            :contenteditable="!isReadOnly"
            dir="ltr"
            :class="['field-input', 'rich-text-input', { 'readonly-field': isReadOnly }]"
            :data-placeholder="field.placeholder || field.placeholder_translations?.pt_br || ''"
            @mousedown.stop
            @touchstart.stop
            @input="onContentEditableInput"
            @blur="updateValue"
          >
          </div>
        </div>
      </template>

      <template v-else-if="isListField">
        <div class="custom-dropdown-wrapper" :class="{ 'readonly-field': isReadOnly }">
          <div
            class="custom-dropdown-selected"
            :class="{
              open: dropdownOpen,
              'readonly-field': isReadOnly,
              error: !!error && isMandatory
            }"
            @click="onDropdownClick"
            @mousedown.stop
            @touchstart.stop
            tabindex="0"
            @keydown.enter.prevent="!isReadOnly && toggleDropdown()"
          >
            <span
              v-if="selectedOption"
              @click.stop="onDropdownClick"
              style="pointer-events: auto"
            >
              {{ selectedOption.label }}
            </span>
            <span
              v-else
              class="placeholder"
              @click.stop="onDropdownClick"
              style="pointer-events: auto"
            >
              {{ dropdownPlaceholder }}
            </span>
            <span
              class="material-symbols-outlined dropdown-arrow"
              @click.stop="onDropdownClick"
              style="pointer-events: auto"
            >
              expand_more
            </span>
          </div>
          <div
            v-if="dropdownOpen"
            :class="['custom-dropdown-list', { 'open-up': dropdownOpenUp }]"
            ref="dropdownList"
          >
            <div class="dropdown-search-wrapper">
              <span class="material-symbols-outlined search-icon">search</span>
              <input
                type="text"
                v-model="searchTerm"
                :placeholder="translateText('Search...')"
                class="list-search-input"
                @keydown.stop
                @mousedown.stop
                @touchstart.stop
                autofocus
              />
            </div>
            <div
              v-if="filteredListOptions.length === 0"
              class="custom-dropdown-no-options"
            >
              {{ translateText('No options found') }}
            </div>
            <div
              v-for="option in filteredListOptions"
              :key="option.value"
              class="custom-dropdown-option"
              :class="{ selected: localValue == option.value }"
              @click="selectDropdownOption(option)"
              @mousedown.stop
              @touchstart.stop
            >
              {{ option.label }}
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="field.fieldType === 'MULTILINE_TEXT'">
        <textarea
          v-model="localValue"
          :disabled="isReadOnly"
          @mousedown.stop
          @touchstart.stop
          @blur="updateValue"
          :class="['field-input', 'multiline-input', { error: !!error && isMandatory }, { 'readonly-field': isReadOnly }]"
          rows="4"
        ></textarea>
      </template>

      <template v-else>
        <input
          ref="simpleText"
          type="text"
          v-model="localValue"
          :disabled="isReadOnly"
          @blur="updateValue"
          :class="['field-input', 'text-input', { error: !!error && isMandatory }, { 'readonly-field': isReadOnly }]"
        />
      </template>
    </div>

    <div v-if="field.tip_translations?.[currentLang]" class="field-tooltip">
      <span class="tooltip-text">{{ field.tip_translations[currentLang] }}</span>
    </div>
    <div v-if="error" class="field-feedback error">{{ error }}</div>
  </div>
</template>

<script>
import CustomDatePicker from './CustomDatePicker.vue';
import dataSourceUtils, {
  LIST_FIELD_TYPES,
  normalizeFieldDataSource,
  fetchDataSourceOptions,
  hasFetchableDataSource as rawHasFetchableDataSource
} from '../utils/dataSource';
import { translateTerm } from '../translation.js';

const hasFetchableDataSource =
  typeof rawHasFetchableDataSource === 'function'
    ? rawHasFetchableDataSource
    : typeof (dataSourceUtils && dataSourceUtils.hasFetchableDataSource) === 'function'
      ? dataSourceUtils.hasFetchableDataSource.bind(dataSourceUtils)
      : () => false;

const TRUE_VALUES = new Set([
  'true',
  '1',
  1,
  true,
  'yes',
  'sim',
  'verdadeiro',
  'v',
  'on',
  'habilitado',
  'ativado',
  'ativo',
  'enabled'
]);
const FALSE_VALUES = new Set([
  'false',
  '0',
  0,
  false,
  'no',
  'nao',
  'não',
  'falso',
  'n',
  'off',
  'desabilitado',
  'desativado',
  'inativo',
  'disabled'
]);

function normalizeBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return defaultValue;
    }
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === '') {
      return defaultValue;
    }
    if (TRUE_VALUES.has(normalized)) {
      return true;
    }
    if (FALSE_VALUES.has(normalized)) {
      return false;
    }
    return defaultValue;
  }

  return defaultValue;
}

function computeInitialValue(field) {
  if (!field) return '';

  const baseValue =
    field.value !== undefined && field.value !== null && field.value !== ''
      ? field.value
      : field.default_value !== undefined
        ? field.default_value
        : field.defaultValue !== undefined
          ? field.defaultValue
          : field.DefaultValue !== undefined
            ? field.DefaultValue
            : '';

  switch (field.fieldType) {
    case 'YES_NO': {
      if (baseValue === '' || baseValue === undefined) {
        return null;
      }
      if (TRUE_VALUES.has(baseValue) || (typeof baseValue === 'string' && TRUE_VALUES.has(baseValue.toLowerCase()))) {
        return true;
      }
      if (FALSE_VALUES.has(baseValue) || (typeof baseValue === 'string' && FALSE_VALUES.has(baseValue.toLowerCase()))) {
        return false;
      }
      return Boolean(baseValue);
    }
    case 'DECIMAL':
    case 'INTEGER':
    case 'DATE':
    case 'DEADLINE':
    case 'SIMPLE_LIST':
    case 'LIST':
    case 'CONTROLLED_LIST':
    case 'FORMATED_TEXT':
    case 'MULTILINE_TEXT':
    case 'SIMPLE_TEXT':
    case 'TEXT':
    case 'EMAIL':
    case 'PHONE':
    default:
      return baseValue ?? '';
  }
}

export default {
  name: 'FieldComponent',
  components: {
    CustomDatePicker
  },
  props: {
    field: {
      type: Object,
      required: true
    }
  },
  emits: ['update:value', 'field-value-change'],
  data() {
    return {
      error: null,
      dropdownOpen: false,
      dropdownOpenUp: false,
      searchTerm: '',
      localValue: computeInitialValue(this.field),
      remoteOptions: [],
      isLoadingOptions: false,
      deadlineTimer: null,
      dataNow: new Date(),
      currentColor: '#699d8c'
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
    currentLang() {
      if (typeof window !== 'undefined' && window.wwLib?.wwVariable) {
        return window.wwLib.wwVariable.getValue('aa44dc4c-476b-45e9-a094-16687e063342') || 'pt-BR';
      }
      return 'pt-BR';
    },
    dataSourceConfig() {
      return normalizeFieldDataSource(this.field);
    },
    isReadOnly() {
      const type = (this.field?.fieldType || '').toString().toUpperCase();
      if (type === 'DEADLINE') return true;

      const raw =
        this.field?.is_readonly ??
        this.field?.isReadOnly ??
        this.field?.readonly ??
        null;
      return normalizeBoolean(raw, false);
    },
    isMandatory() {
      const raw =
        this.field?.is_mandatory ??
        this.field?.isMandatory ??
        this.field?.mandatory ??
        null;
      return normalizeBoolean(raw, false);
    },
    isLegendHidden() {
      const raw =
        this.field?.is_hide_legend ??
        this.field?.isHideLegend ??
        this.field?.hideLegend ??
        null;
      return normalizeBoolean(raw, false);
    },
    isListField() {
      const rawType =
        this.field?.fieldType ?? this.field?.FieldType ?? this.field?.type ?? '';
      const normalizedType = String(rawType).trim().toUpperCase();
      return LIST_FIELD_TYPES.includes(normalizedType);
    },
    dropdownPlaceholder() {
      return (
        this.field.placeholder ||
        this.field.placeholder_translations?.[this.currentLang] ||
        'Selecione uma opção'
      );
    },
    listOptions() {
      if (Array.isArray(this.remoteOptions) && this.remoteOptions.length) {
        return this.remoteOptions;
      }

      if (Array.isArray(this.field.options) && this.field.options.length) {
        return [...this.field.options].sort((a, b) => {
          if (typeof a.label === 'string' && typeof b.label === 'string') {
            return a.label.localeCompare(b.label);
          }
          return 0;
        });
      }

      const rawOptions =
        this.field.list_options ||
        this.field.listOptions ||
        this.field.ListOptions ||
        null;

      if (typeof rawOptions === 'string' && rawOptions.trim() !== '') {
        return rawOptions
          .split(',')
          .map(opt => {
            const trimmed = opt.trim();
            return { value: trimmed, label: trimmed };
          })
          .sort((a, b) => a.label.localeCompare(b.label));
      }

      if (Array.isArray(rawOptions)) {
        return [...rawOptions].map(opt => ({
          value: opt.value ?? opt.id ?? opt,
          label: opt.label ?? opt.name ?? String(opt.value ?? opt)
        }));
      }

      return [];
    },
    selectedOption() {
      return this.listOptions.find(opt => opt.value == this.localValue) || null;
    },
    filteredListOptions() {
      if (!this.searchTerm) return this.listOptions;
      const term = this.searchTerm.toLowerCase();
      return this.listOptions.filter(opt => String(opt.label).toLowerCase().includes(term));
    },
    deadlineHasValue() {
      if (this.field.fieldType !== 'DEADLINE') return false;
      const val = this.localValue || this.field.value;
      return !!(val && String(val).trim());
    },
    deadlineValue: {
      get() {
        if (this.field.fieldType !== 'DEADLINE') return this.localValue;
        const val = this.localValue || this.field.value;
        if (!val) return '';
        const match = String(val).match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
        if (match) {
          return `\${match[1]}T\${match[2]}`;
        }
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          const pad = n => String(n).padStart(2, '0');
          return `\${d.getFullYear()}-\${pad(d.getMonth() + 1)}-\${pad(d.getDate())}T\${pad(d.getHours())}:\${pad(d.getMinutes())}`;
        }
        return '';
      },
      set(v) {
        this.localValue = v;
      }
    },
    deadlineDiff() {
      if (this.field.fieldType !== 'DEADLINE') return '';
      const val = this.localValue || this.field.value;
      if (!val) return '';
      let dateStr = val;
      if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
        dateStr = val;
      } else if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+\d{2}/.test(val)) {
        dateStr = val.replace(' ', 'T').replace(/([\+\-]\d{2})$/, '$1:00');
      }
      const deadline = new Date(dateStr);
      if (isNaN(deadline.getTime())) return '';
      const diffMs = deadline - this.dataNow;
      if (isNaN(diffMs)) return '';
      const abs = Math.abs(diffMs);
      const isPast = diffMs < 0;
      if (abs < 60 * 1000) {
        const s = Math.floor(abs / 1000);
        return `\${isPast ? '-' : ''}\${s}s`;
      }
      if (abs < 60 * 60 * 1000) {
        const m = Math.floor(abs / (60 * 1000));
        return `\${isPast ? '-' : ''}\${m}m`;
      }
      if (abs < 24 * 60 * 60 * 1000) {
        const h = Math.floor(abs / (60 * 60 * 1000));
        const m = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000));
        return `\${isPast ? '-' : ''}\${h}h\${m > 0 ? \` \${m}m\` : ''}`;
      }
      const d = Math.floor(abs / (24 * 60 * 60 * 1000));
      const h = Math.floor((abs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const m = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000));
      let str = `\${isPast ? '-' : ''}\${d}d`;
      if (h > 0) str += ` \${h}h`;
      if (m > 0) str += ` \${m}m`;
      return str;
    },
    deadlineColorClass() {
      if (this.field.fieldType !== 'DEADLINE') return '';
      const val = this.localValue || this.field.value;
      if (!val) return '';
      let dateStr = val;
      if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
        dateStr = val;
      } else if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+\d{2}/.test(val)) {
        dateStr = val.replace(' ', 'T').replace(/([\+\-]\d{2})$/, '$1:00');
      }
      const deadline = new Date(dateStr);
      if (isNaN(deadline.getTime())) return '';
      const diffMs = deadline - this.dataNow;
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
      let dateStr = val;
      if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
        dateStr = val;
      } else if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+\d{2}/.test(val)) {
        dateStr = val.replace(' ', 'T').replace(/([\+\-]\d{2})$/, '$1:00');
      }
      const lang =
        (typeof window !== 'undefined' && window.wwLib?.wwVariable?.getValue('aa44dc4c-476b-45e9-a094-16687e063342')) ||
        (typeof navigator !== 'undefined' ? navigator.language : 'pt-BR');
      try {
        const formulaApi = window.wwLib?.wwFormula;
        const use = formulaApi?.useFormula?.();
        const resolveMappingFormula = use?.resolveMappingFormula;
        const mapping = resolveMappingFormula ? resolveMappingFormula('95a5a105-48b6-48d4-95c5-7179a664451d') : null;
        if (mapping && typeof formulaApi?.getValue === 'function') {
          const res = formulaApi.getValue(mapping, {}, { args: [dateStr, lang] });
          if (!(res instanceof Promise) && res !== undefined && res !== null) {
            return String(res);
          }
        }
      } catch (e) {
        // ignore and fallback
      }
      const deadline = new Date(dateStr);
      if (isNaN(deadline.getTime())) return val;
      return deadline.toLocaleString(lang);
    }
  },
  watch: {
    field: {
      handler(newField, oldField) {
        this.localValue = computeInitialValue(newField);
        if (newField?.fieldType === 'FORMATED_TEXT' && this.$refs.rte) {
          this.$nextTick(() => {
            if (this.$refs.rte) {
              this.$refs.rte.innerHTML = this.localValue || '';
            }
          });
        }
        if (newField?.fieldType === 'DEADLINE' && !this.deadlineTimer) {
          this.deadlineTimer = setInterval(() => {
            this.dataNow = new Date();
          }, 1000);
        } else if (oldField?.fieldType === 'DEADLINE' && newField?.fieldType !== 'DEADLINE' && this.deadlineTimer) {
          clearInterval(this.deadlineTimer);
          this.deadlineTimer = null;
        }
        const newSource = JSON.stringify(normalizeFieldDataSource(newField));
        const oldSource = JSON.stringify(normalizeFieldDataSource(oldField));
        if (newSource !== oldSource) {
          this.loadDataSourceOptions();
        }
      },
      deep: true
    },
    localValue(newVal) {
      if (this.field.fieldType === 'FORMATED_TEXT' && this.$refs.rte && this.$refs.rte.innerHTML !== newVal) {
        this.$refs.rte.innerHTML = newVal || '';
      }
    },
    dataSourceConfig: {
      handler() {
        this.loadDataSourceOptions();
      },
      deep: true,
      immediate: true
    },
    dropdownOpen(val) {
      if (!val) {
        this.searchTerm = '';
        document.removeEventListener('click', this.handleClickOutsideDropdown);
      }
    }
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutsideDropdown);
    if (this.deadlineTimer) {
      clearInterval(this.deadlineTimer);
      this.deadlineTimer = null;
    }
  },
  mounted() {
    if (this.field.fieldType === 'FORMATED_TEXT' && this.$refs.rte) {
      this.$refs.rte.innerHTML = this.localValue || '';
    }
    if (this.field.fieldType === 'DEADLINE' && !this.deadlineTimer) {
      this.deadlineTimer = setInterval(() => {
        this.dataNow = new Date();
      }, 1000);
    }
  },
  methods: {
    normalizeDataSource(fieldLike) {
      return normalizeFieldDataSource(fieldLike);
    },
    translateText(text) {
      return translateTerm(text);
    },
    async loadDataSourceOptions() {
      const dataSource = this.dataSourceConfig;

      if (!hasFetchableDataSource(dataSource)) {
        this.remoteOptions = [];
        this.isLoadingOptions = false;
        return;
      }

      this.isLoadingOptions = true;
      try {
        const options = await fetchDataSourceOptions(dataSource);
        const normalizedOptions = Array.isArray(options)
          ? options
              .map(option => {
                if (!option || typeof option !== 'object') {
                  const value = option;
                  const label = option === null || option === undefined ? '' : String(option);
                  return { value, label };
                }
                const value = option.value ?? option.Value ?? option.id ?? option.ID ?? null;
                const label = option.label ?? option.Label ?? option.name ?? option.Name ?? null;
                if (value === null || label === null) {
                  return null;
                }
                return { value, label };
              })
              .filter(Boolean)
          : [];

        this.remoteOptions = normalizedOptions;

        if (this.field) {
          const clonedOptions = normalizedOptions.map(option => ({ ...option }));
          this.field.options = clonedOptions;
          this.field.list_options = clonedOptions;
          this.field.listOptions = clonedOptions;
        }
      } catch (err) {
        console.error('Failed to load data source options', err);
        this.remoteOptions = [];
        if (this.field) {
          this.field.options = [];
          this.field.list_options = [];
          this.field.listOptions = [];
        }
      } finally {
        this.isLoadingOptions = false;
      }
    },
    onDateChange(value) {
      this.updateValue(value);
    },
    onYesNoChange(value) {
      this.localValue = value;
      this.updateValue(value);
    },
    onDeadlineChange(value) {
      this.updateValue(value);
    },
    openDeadlinePicker() {
      if (this.field.fieldType === 'DEADLINE' && !this.isReadOnly) {
        const dp = this.$refs.deadlineDatePicker;
        if (dp && typeof dp.openDp === 'function') {
          dp.openDp();
        }
      }
    },
    onContentEditableInput(event) {
      this.localValue = event.target.innerHTML;
    },
    format(cmd) {
      if (this.$refs.rte) {
        this.$refs.rte.focus();
      }
      document.execCommand(cmd, false, null);
    },
    setColor(event) {
      if (this.$refs.rte) {
        this.$refs.rte.focus();
      }
      document.execCommand('foreColor', false, event.target.value);
      this.currentColor = event.target.value;
    },
    insertLink() {
      if (this.$refs.rte) {
        this.$refs.rte.focus();
      }
      const url = typeof window !== 'undefined' ? window.prompt('Digite a URL do link:') : null;
      if (url) {
        document.execCommand('createLink', false, url);
      }
    },
    insertImage() {
      if (this.$refs.rte) {
        this.$refs.rte.focus();
      }
      const url = typeof window !== 'undefined' ? window.prompt('Digite a URL da imagem:') : null;
      if (url) {
        document.execCommand('insertImage', false, url);
      }
    },
    onDropdownClick() {
      if (this.isReadOnly) return;
      this.toggleDropdown();
    },
    toggleDropdown() {
      this.dropdownOpen = !this.dropdownOpen;
      if (this.dropdownOpen) {
        this.$nextTick(() => {
          const trigger = this.$el.querySelector('.custom-dropdown-selected');
          const dropdown = this.$refs.dropdownList;
          if (trigger && dropdown) {
            const scrollParent = this.getScrollParent(trigger);
            const triggerRect = trigger.getBoundingClientRect();
            const dropdownHeight = 320;
            let spaceBelow;
            if (scrollParent === document.body) {
              spaceBelow = window.innerHeight - triggerRect.bottom;
            } else {
              const parentRect = scrollParent.getBoundingClientRect();
              spaceBelow = parentRect.bottom - triggerRect.bottom;
            }
            this.dropdownOpenUp = spaceBelow < dropdownHeight;
          }
          document.addEventListener('click', this.handleClickOutsideDropdown);
        });
      }
    },
    handleClickOutsideDropdown(event) {
      if (!this.dropdownOpen) return;
      const dropdown = this.$refs.dropdownList;
      if (!dropdown) return;
      if (!dropdown.contains(event.target) && !event.target.closest('.custom-dropdown-selected')) {
        this.dropdownOpen = false;
      }
    },
    selectDropdownOption(option) {
      this.localValue = option.value;
      this.updateValue(option.value);
      this.dropdownOpen = false;
    },
    getScrollParent(element) {
      let style = getComputedStyle(element);
      const excludeStaticParent = style.position === 'absolute';
      const overflowRegex = /(auto|scroll|overlay)/;
      if (style.position === 'fixed') return document.body;
      for (let parent = element; (parent = parent.parentElement);) {
        style = getComputedStyle(parent);
        if (excludeStaticParent && style.position === 'static') {
          continue;
        }
        if (overflowRegex.test(style.overflow + style.overflowY + style.overflowX)) return parent;
      }
      return document.body;
    },
    updateValue(eventOrValue) {
      const rawValue = this.field.fieldType === 'FORMATED_TEXT'
        ? this.localValue
        : eventOrValue && eventOrValue.target
          ? eventOrValue.target.value
          : eventOrValue;
      let value = rawValue;

      switch (this.field.fieldType) {
        case 'DATE':
          this.validateDate(value);
          break;
        case 'DEADLINE':
          this.validateDeadline(value);
          break;
        case 'DECIMAL': {
          const numericValue =
            value === '' || value === null || value === undefined ? null : parseFloat(value);
          value = numericValue;
          this.validateDecimal(numericValue);
          break;
        }
        case 'INTEGER': {
          const numericValue =
            value === '' || value === null || value === undefined ? null : parseInt(value, 10);
          value = numericValue;
          this.validateInteger(numericValue);
          break;
        }
        case 'YES_NO':
          value = Boolean(value);
          break;
        case 'SIMPLE_LIST':
        case 'LIST':
        case 'CONTROLLED_LIST':
          value = value !== null && value !== undefined ? String(value) : value;
          this.validateList(value);
          break;
        case 'FORMATED_TEXT':
          this.validateText(typeof value === 'string' ? value : value != null ? String(value) : '');
          break;
        case 'MULTILINE_TEXT':
          this.validateMultilineText(typeof value === 'string' ? value : '');
          break;
        case 'SIMPLE_TEXT':
        case 'TEXT':
        case 'EMAIL':
        case 'PHONE':
        default:
          this.validateText(typeof value === 'string' ? value : value != null ? String(value) : '');
          break;
      }

      if (!this.error) {
        if (this.field) {
          this.field.default_value = value;
          this.field.defaultValue = value;
          this.field.value = value;
        }
        this.$emit('update:value', value);
        const fieldId = this.field?.id || this.field?.field_id || this.field?.ID || null;
        this.$emit('field-value-change', {
          fieldId,
          value,
          fieldType: this.field?.fieldType || null
        });
      }
    },
    validateDate(value) {
      if (!value) {
        this.error = this.isMandatory ? this.translateText('Required field') : null;
        return;
      }
      const date = new Date(`${value}T00:00:00`);
      this.error = isNaN(date.getTime()) ? this.translateText('Invalid date') : null;
    },
    validateDeadline(value) {
      if (!value) {
        this.error = this.isMandatory ? this.translateText('Required field') : null;
        return;
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        this.error = this.translateText('Invalid date and time');
      } else {
        this.error = null;
      }
    },
    validateDecimal(value) {
      if (value === null || isNaN(value)) {
        this.error = this.isMandatory ? this.translateText('Required field') : null;
        return;
      }
      this.error = null;
    },
    validateInteger(value) {
      if (value === null || isNaN(value)) {
        this.error = this.isMandatory ? this.translateText('Required field') : null;
        return;
      }
      this.error = null;
    },
    validateList(value) {
      if (this.isMandatory && !value) {
        this.error = this.translateText('Required field');
      } else {
        this.error = null;
      }
    },
    validateMultilineText(value) {
      if (this.isMandatory && !value.trim()) {
        this.error = this.translateText('Required field');
      } else {
        this.error = null;
      }
    },
    validateText(value) {
      if (this.isMandatory && !value.trim()) {
        this.error = this.translateText('Required field');
      } else {
        this.error = null;
      }
    }
  }
};
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
    color: var(--placeholder-color, #787878);
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
    color: var(--placeholder-color, #787878);
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

  .is-mandatory .field-label {
    font-weight: 400;
  }

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

  .deadline-diff {
    font-size: 12px;
    color: #007bff;
    margin-top: 4px;
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
    color: var(--placeholder-color, #787878);
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
    color: #1a237e;
  }

  .color-input {
    position: absolute;
    inset: 0;
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

  .field-component-loading {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin-bottom: 5px;
  }

  .loading-placeholder {
    height: 34px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f00f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    border-radius: 4px;
    margin-top: 4px;
  }

  @keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* ==== Patch mínimo e específico para SIMPLE_TEXT ==== */
  .field-component.field-type-simple_text {
    position: relative;
    isolation: isolate;
  }
  .field-component.field-type-simple_text .field-input-container {
    position: relative;
    z-index: 5;
  }
  .field-component.field-type-simple_text .field-input.text-input {
    position: relative;
    z-index: 9999;
    pointer-events: auto;
  }
  .field-component.field-type-simple_text::before,
  .field-component.field-type-simple_text::after {
    pointer-events: none;
  }

  /* Remove o outline preto apenas no SIMPLE_TEXT */
.field-component.field-type-simple_text .field-input.text-input:focus,
.field-component.field-type-simple_text .field-input.text-input:focus-visible {
  outline: none;
}

</style>
