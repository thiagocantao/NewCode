<template>
  <CustomAlert
    :message="error" 
    :visible="!!error && showAlert"
    @close="showAlert = false"
  />
  <div class="field-component" :class="[`field-type-${field.fieldType.toLowerCase()}`, { 'is-mandatory': field.is_mandatory }]">
    <!-- Label do campo -->
    <label v-if="!field.is_hide_legend" class="field-label"> 
      {{ field.name }}
      <span v-if="field.is_mandatory" class="required-indicator">*</span>
    </label> 

    <!-- Campos de entrada baseados no tipo -->
    <div class="field-input-container">
      <template v-if="field.fieldType === 'DATE'">
        <input
          type="date"
          v-model="localValue"
          :disabled="field.is_readonly"
          @blur="updateValue"
          :class="['field-input', 'date-input', { error: error && field.is_mandatory }, { 'readonly-field': field.is_readonly }]"
        />
      </template>
      <template v-else-if="field.fieldType === 'DEADLINE'">
        <div style="position:relative;">
          <input
            type="text"
            :value="deadlineDiff"
            readonly
            :class="[
              'field-input',
              'date-input',
              'deadline-visual',
              deadlineColorClass,
              { 'readonly-field': field.is_readonly }
            ]"
            :title="deadlineOriginalFormatted"
            @click="openDeadlinePicker"
            style="cursor:pointer;"
          />
          <input
            v-if="showDeadlinePicker"
            ref="visibleDeadlineInput"
            type="datetime-local"
            v-model="deadlineValue"
            @change="updateValue"
            @blur="closeDeadlinePicker"
            class="field-input date-input deadline-picker-popup"
            style="margin-top: 6px; width: 220px; display: block; z-index: 10;"
          />
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

      <!-- YES_NO -->
      <template v-else-if="field.fieldType === 'YES_NO'">
        <div class="yes-no-container">
          <label class="radio-label">
            <input
              type="radio"
              :name="field.id"
              :checked="localValue === true"
              @change="localValue = true; updateValue({ target: { value: true } })"
              :disabled="field.is_readonly"
            />
            Sim
          </label>
          <label class="radio-label">
            <input
              type="radio"
              :name="field.id"
              :checked="localValue === false"
              @change="localValue = false; updateValue({ target: { value: false } })"
              :disabled="field.is_readonly"
            />
            Não
          </label>
        </div>
      </template>

      <template v-else-if="field.fieldType === 'SIMPLE_LIST' || field.fieldType === 'CONTROLLED_LIST' || field.fieldType === 'LIST'">
        <div class="custom-dropdown-wrapper" :class="{ 'readonly-field': field.is_readonly }">
          <div
            class="custom-dropdown-selected"
            :class="{ 'open': dropdownOpen, 'readonly-field': field.is_readonly }"
            @click="onDropdownClick"
            tabindex="0"
            @keydown.enter.prevent="!field.is_readonly && toggleDropdown()"
          >
            <span v-if="selectedOption" @click.stop="onDropdownClick" style="pointer-events:auto">{{ selectedOption.label }}</span>
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
              <input type="color" @input="setColor($event)" :value="currentColor" class="color-input" title="Cor do texto" />
            </button>
          </div>
          <div
            ref="rte"
            :contenteditable="!field.is_readonly"
            dir="ltr"
            :class="['field-input', 'rich-text-input', { 'readonly-field': field.is_readonly }]"
            @input="onContentEditableInput"
            @blur="updateValue"
            style="min-height: 100px; border: 1px solid #ccc; border-radius: 0 0 6px 6px; padding: 8px; background: #fff;"
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

export default {
  name: 'FieldComponent',
  components: { CustomAlert },
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
      deadlineTimer: null,
      dataNow: new Date(),
      showDeadlinePicker: false,
      currentColor: '#699d8c',
      isUserInput: false,
    };
  },
  computed: { /* (sem alterações) */ },
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
    /* Demais métodos sem alteração */
  },
  mounted() { /* Sem alteração */ },
  beforeDestroy() { /* Sem alteração */ }
};
</script>
