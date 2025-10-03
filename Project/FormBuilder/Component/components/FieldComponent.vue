<template>
  <div
    class="field-component"
    :class="[`field-type-${(field.fieldType || '').toLowerCase()}`, { 'is-mandatory': field.is_mandatory }]"
  >
    <label v-if="!field.is_hide_legend" class="field-label">
      {{ field.name }}
      <span v-if="field.is_mandatory" class="required-mark">*</span>
    </label>

    <div class="field-input-container">
      <template v-if="field.fieldType === 'DATE'">
        <CustomDatePicker
          v-model="localValue"
          :disabled="field.is_readonly"
          :error="!!error && field.is_mandatory"
          @update:modelValue="onDateChange"
          class="field-input date-input"
        />
      </template>

      <template v-else-if="field.fieldType === 'DECIMAL'">
        <input
          type="number"
          step="0.01"
          v-model="localValue"
          :disabled="field.is_readonly"
          @blur="updateValue(localValue)"
          class="field-input decimal-input"
        />
      </template>

      <template v-else-if="field.fieldType === 'INTEGER'">
        <input
          type="number"
          step="1"
          v-model="localValue"
          :disabled="field.is_readonly"
          @blur="updateValue(localValue)"
          class="field-input integer-input"
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
              :disabled="field.is_readonly"
              @change="onYesNoChange(true)"
            />
            Sim
          </label>
          <label class="radio-label">
            <input
              type="radio"
              :name="field.id"
              value="false"
              :checked="localValue === false"
              :disabled="field.is_readonly"
              @change="onYesNoChange(false)"
            />
            Não
          </label>
        </div>
      </template>

      <template v-else-if="isListField">
        <div class="custom-dropdown-wrapper" :class="{ 'readonly-field': field.is_readonly }">
          <div
            class="custom-dropdown-selected"
            :class="{
              open: dropdownOpen,
              'readonly-field': field.is_readonly,
              error: !!error && field.is_mandatory
            }"
            @click="onDropdownClick"
            tabindex="0"
            @keydown.enter.prevent="!field.is_readonly && toggleDropdown()"
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
                placeholder="Pesquisar..."
                class="list-search-input"
                @keydown.stop
                autofocus
              />
            </div>
            <div
              v-if="filteredListOptions.length === 0"
              class="custom-dropdown-no-options"
            >
              Nenhuma opção encontrada
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

      <template v-else-if="field.fieldType === 'MULTILINE_TEXT'">
        <textarea
          v-model="localValue"
          :disabled="field.is_readonly"
          @input="updateValue(localValue)"
          class="field-input multiline-input"
          rows="4"
        ></textarea>
      </template>

      <template v-else>
        <input
          type="text"
          v-model="localValue"
          :disabled="field.is_readonly"
          @input="updateValue(localValue)"
          class="field-input text-input"
        />
      </template>
    </div>

    <div v-if="field.tip_translations?.[currentLang]" class="field-tooltip">
      <span class="tooltip-text">{{ field.tip_translations[currentLang] }}</span>
    </div>
    <div v-if="error" class="field-error">{{ error }}</div>
  </div>
</template>

<script>
import CustomDatePicker from './CustomDatePicker.vue';

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
  data() {
    return {
      error: null,
      dropdownOpen: false,
      dropdownOpenUp: false,
      searchTerm: '',
      localValue: this.field?.value ?? '',
      remoteOptions: [],
      isLoadingOptions: false
    };
  },
  computed: {
    currentLang() {
      if (typeof window !== 'undefined' && window.wwLib?.wwVariable) {
        return window.wwLib.wwVariable.getValue('aa44dc4c-476b-45e9-a094-16687e063342') || 'pt-BR';
      }
      return 'pt-BR';
    },
    dataSourceConfig() {
      return this.normalizeDataSource(this.field);
    },
    isListField() {
      return ['SIMPLE_LIST', 'LIST', 'CONTROLLED_LIST'].includes(this.field.fieldType);
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
    }
  },
  watch: {
    field: {
      handler(newField, oldField) {
        this.localValue = newField?.value ?? '';
        const newSource = JSON.stringify(this.normalizeDataSource(newField));
        const oldSource = JSON.stringify(this.normalizeDataSource(oldField));
        if (newSource !== oldSource) {
          this.loadDataSourceOptions();
        }
      },
      deep: true
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
  },
  methods: {
    translateText(text) {
      return text;
    },
    normalizeDataSource(field) {
      if (!field) return null;
      const rawDataSource = field.dataSource ?? field.DataSource ?? null;
      if (!rawDataSource) return null;

      if (typeof rawDataSource !== 'object') {
        return rawDataSource;
      }

      const transform = rawDataSource.transform ?? rawDataSource.Transform ?? null;
      const method = rawDataSource.method ?? rawDataSource.Method ?? undefined;
      const valueField = rawDataSource.valueField ?? rawDataSource.ValueField ?? undefined;
      const labelField = rawDataSource.labelField ?? rawDataSource.LabelField ?? undefined;
      const functionName = rawDataSource.functionName ?? rawDataSource.FunctionName ?? undefined;

      return {
        ...rawDataSource,
        ...(transform ? { transform } : {}),
        ...(method ? { method } : {}),
        ...(valueField ? { valueField } : {}),
        ...(labelField ? { labelField } : {}),
        ...(functionName ? { functionName } : {}),
      };
    },
    extractArrayFromResponse(payload, visited = new WeakSet()) {
      if (Array.isArray(payload)) {
        return payload;
      }

      if (!payload || typeof payload !== 'object') {
        return null;
      }

      if (visited.has(payload)) {
        return null;
      }

      visited.add(payload);

      const priorityKeys = [
        'items',
        'data',
        'results',
        'value',
        'values',
        'options',
        'records',
        'list',
        'rows',
        'collection',
      ];

      for (const key of priorityKeys) {
        if (Array.isArray(payload?.[key])) {
          return payload[key];
        }
      }

      for (const key of Object.keys(payload)) {
        const value = payload[key];
        const result = this.extractArrayFromResponse(value, visited);
        if (Array.isArray(result)) {
          return result;
        }
      }

      return null;
    },
    mapOptionsFromData(dataArray, dataSource) {
      if (!Array.isArray(dataArray)) {
        return [];
      }

      const transform = dataSource && typeof dataSource === 'object'
        ? (dataSource.transform ?? null)
        : null;

      if (transform && (transform.value || transform.label)) {
        return dataArray
          .map(item => {
            if (!item || typeof item !== 'object') return null;
            const value = item?.[transform.value] ?? item?.id ?? item?.ID;
            const label = item?.[transform.label] ?? item?.name ?? item?.Name;
            if (value === undefined || label === undefined) {
              return null;
            }
            return { value, label };
          })
          .filter(option => option !== null);
      }

      const valueField =
        (dataSource && typeof dataSource === 'object' && (dataSource.valueField ?? dataSource.ValueField)) ||
        'id';
      const labelField =
        (dataSource && typeof dataSource === 'object' && (dataSource.labelField ?? dataSource.LabelField)) ||
        'name';

      return dataArray
        .map(item => {
          if (!item || typeof item !== 'object') {
            const primitiveValue = item;
            if (primitiveValue === undefined || primitiveValue === null) {
              return null;
            }
            const normalized = String(primitiveValue);
            return { value: primitiveValue, label: normalized };
          }

          const value = item?.[valueField] ?? item?.id ?? item?.ID;
          const label = item?.[labelField] ?? item?.name ?? item?.Name;

          if (value === undefined || label === undefined) {
            return null;
          }

          return { value, label };
        })
        .filter(option => option !== null);
    },
    async loadDataSourceOptions() {
      if (typeof window === 'undefined') {
        this.remoteOptions = [];
        return;
      }

      const dataSource = this.dataSourceConfig;

      if (!dataSource) {
        this.remoteOptions = [];
        return;
      }

      const lang = window.wwLib?.wwVariable?.getValue('aa44dc4c-476b-45e9-a094-16687e063342');
      const companyId = window.wwLib?.wwVariable?.getValue('5d099f04-cd42-41fd-94ad-22d4de368c3a');
      const apiUrl = window.wwLib?.wwVariable?.getValue('1195995b-34c3-42a5-b436-693f0f4f8825') || '';
      const apiKey = window.wwLib?.wwVariable?.getValue('d180be98-8926-47a7-b7f1-6375fbb95fa3');
      const apiAuth = window.wwLib?.wwVariable?.getValue('dfcde09f-42f3-4b5c-b2e8-4314650655db');

      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers.apikey = apiKey;
      if (apiAuth) headers.Authorization = apiAuth;

      let url = '';
      let method = 'POST';

      if (typeof dataSource === 'string') {
        if (!dataSource.trim()) {
          this.remoteOptions = [];
          return;
        }
        url = this.combineUrl(apiUrl, dataSource);
      } else if (dataSource.url) {
        url = this.combineUrl(apiUrl, dataSource.url);
        const rawMethod = dataSource.method ?? dataSource.Method;
        if (rawMethod && rawMethod.toUpperCase() === 'GET') {
          method = 'GET';
        }
      } else if (dataSource.functionName) {
        url = this.combineUrl(apiUrl, dataSource.functionName);
      } else {
        this.remoteOptions = [];
        return;
      }

      const fetchOptions = { method, headers };
      if (method !== 'GET') {
        fetchOptions.body = JSON.stringify({
          ...(companyId ? { p_idcompany: companyId } : {}),
          ...(lang ? { p_language: lang } : {})
        });
      }

      this.isLoadingOptions = true;
      try {
        const response = await fetch(url, fetchOptions);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const dataArray = this.extractArrayFromResponse(data);

        if (!Array.isArray(dataArray)) {
          this.remoteOptions = [];
          return;
        }

        const options = this.mapOptionsFromData(dataArray, dataSource);

        this.remoteOptions = options.sort((a, b) => {
          if (typeof a.label === 'string' && typeof b.label === 'string') {
            return a.label.localeCompare(b.label);
          }
          return 0;
        });
      } catch (err) {
        console.error('Failed to load data source options', err);
        this.remoteOptions = [];
      } finally {
        this.isLoadingOptions = false;
      }
    },
    combineUrl(baseUrl, path) {
      if (!path) return baseUrl || '';
      if (/^https?:\/\//i.test(path)) {
        return path;
      }

      const sanitizedBase = (baseUrl || '').replace(/\/+$/, '');
      const sanitizedPath = path.replace(/^\/+/, '');

      if (!sanitizedBase) {
        return `/${sanitizedPath}`;
      }

      return `${sanitizedBase}/${sanitizedPath}`;
    },
    onDateChange(value) {
      this.updateValue(value);
    },
    onYesNoChange(value) {
      this.localValue = value;
      this.updateValue(value);
    },
    onDropdownClick() {
      if (this.field.is_readonly) return;
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
            const dropdownHeight = 220;
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
      const rawValue = eventOrValue && eventOrValue.target ? eventOrValue.target.value : eventOrValue;
      let value = rawValue;

      switch (this.field.fieldType) {
        case 'DATE':
          this.validateDate(value);
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
        case 'MULTILINE_TEXT':
          this.validateMultilineText(typeof value === 'string' ? value : '');
          break;
        case 'SIMPLE_TEXT':
        case 'FORMATED_TEXT':
        case 'TEXT':
        case 'EMAIL':
        case 'PHONE':
        default:
          this.validateText(typeof value === 'string' ? value : value != null ? String(value) : '');
          break;
      }

      if (!this.error) {
        this.$emit('update:value', value);
      }
    },
    validateDate(value) {
      if (!value) {
        this.error = this.field.is_mandatory ? this.translateText('Campo obrigatório') : null;
        return;
      }
      const date = new Date(`${value}T00:00:00`);
      this.error = isNaN(date.getTime()) ? this.translateText('Data inválida') : null;
    },
    validateDecimal(value) {
      if (value === null || isNaN(value)) {
        this.error = this.field.is_mandatory ? this.translateText('Campo obrigatório') : null;
        return;
      }
      this.error = null;
    },
    validateInteger(value) {
      if (value === null || isNaN(value)) {
        this.error = this.field.is_mandatory ? this.translateText('Campo obrigatório') : null;
        return;
      }
      this.error = null;
    },
    validateList(value) {
      if (this.field.is_mandatory && !value) {
        this.error = this.translateText('Campo obrigatório');
      } else {
        this.error = null;
      }
    },
    validateMultilineText(value) {
      if (this.field.is_mandatory && !value.trim()) {
        this.error = this.translateText('Campo obrigatório');
      } else {
        this.error = null;
      }
    },
    validateText(value) {
      if (this.field.is_mandatory && !value.trim()) {
        this.error = this.translateText('Campo obrigatório');
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

.field-label {
  font-size: 13px;
  font-weight: 400;
  margin-bottom: 4px;
  color: #333;
}

.required-mark {
  color: #e53935;
  margin-left: 2px;
}

.field-input-container {
  width: 100%;
}

.field-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  background-color: #fff;
  box-sizing: border-box;
}

.field-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.field-input[readonly],
.field-input.readonly-field {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.field-tooltip {
  margin-top: 4px;
}

.tooltip-text {
  color: rgb(120, 120, 120);
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}

.field-error {
  margin-top: 4px;
  color: #e53935;
  font-size: 12px;
}

.yes-no-container {
  display: flex;
  gap: 16px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #333;
}

.custom-dropdown-wrapper {
  position: relative;
  width: 100%;
}

.custom-dropdown-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #ffffff;
  cursor: pointer;
  transition: border-color 0.2s ease;
  min-height: 36px;
  gap: 8px;
}

.custom-dropdown-selected.open {
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.2);
}

.custom-dropdown-selected.error {
  border-color: #e53935;
}

.custom-dropdown-selected.readonly-field {
  background-color: #f5f5f5;
  cursor: not-allowed;
  color: #999;
}

.custom-dropdown-list {
  position: absolute;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.15);
  min-width: 180px;
  max-height: 320px;
  overflow-y: auto;
  z-index: 999;
}

.custom-dropdown-list.open-up {
  bottom: calc(100% + 4px);
  top: auto;
}

.dropdown-search-wrapper {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #e5e7eb;
  gap: 8px;
}

.search-icon {
  font-size: 18px;
  color: #6b7280;
}

.list-search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
}

.custom-dropdown-option {
  padding: 10px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  display: flex;
  align-items: center;
}

.custom-dropdown-option.selected {
  background: #eff6ff;
  color: #1d4ed8;
}

.custom-dropdown-option:hover {
  background: #f3f4f6;
}

.custom-dropdown-no-options {
  padding: 12px;
  text-align: center;
  color: #6b7280;
  font-size: 13px;
}

.custom-dropdown-selected .dropdown-arrow {
  font-size: 20px;
  color: #6b7280;
}

.custom-dropdown-selected .placeholder {
  color: #9ca3af;
}

.multiline-input {
  resize: vertical;
  min-height: 100px;
}
</style>
