<template>
  <div ref="dropdownRoot" class="component-selector-dropdown">
    <div class="dropdown-container" :style="[containerStyle, readOnly ? { background: 'transparent', cursor: 'default' } : {}]" @click="handleDropdownClick">
      <input
        :value="inputDisplayValue"
        @input="onInput"
        @keydown.enter.prevent="handleEnter"
        :placeholder="''"
        class="dropdown-input"
        :style="[inputStyle, readOnly ? { background: 'transparent', cursor: 'default' } : {}]"
        @focus="!readOnly && openDropdown"
        :readonly="readOnly"
        :disabled="readOnly"
      />
      <span class="dropdown-arrow">&#9662;</span>
    </div>
    <div v-if="isOpen" class="component-selector__dropdown">
      <div
        v-for="(component, idx) in filteredComponents"
        :key="component[valueField] || ('title-' + idx)"
        class="component-selector__item"
        :class="[
          component.__isTitle ? 'component-selector__item--title' : '',
          component.isEnabled === false ? 'component-selector__item--disabled' : '',
          inputMode ? 'component-selector__item--not-clickable' : ''
        ]"
        @click.stop="!component.__isTitle && component.isEnabled !== false && !inputMode && selectComponent(component)"
      >
        <span class="component-selector__name" :style="nameStyle">{{ component?.[labelField] || '' }}</span>
      </div>
      <div
        v-if="filteredItems.length === 0 && search.trim() && !inputMode"
        class="component-selector__item"
        @click.stop="createNewOption"
        style="font-style: italic; color: #888;"
      >
        {{ search }} (create new)
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

export default {
  name: 'ComponentSelector',
  emits: ['trigger-event', 'component-selected'],
  props: {
    datasource: {
      type: Array,
      default: () => []
    },
    nameFontFamily: String,
    nameFontSize: String,
    nameFontWeight: [String, Number],
    initialFontFamily: String,
    initialFontSize: String,
    initialFontWeight: [String, Number],
    inputFontFamily: String,
    inputFontSize: String,
    inputFontWeight: [String, Number],
    unassignedLabel: {
      type: String,
      default: 'Unassigned',
    },
    searchPlaceholder: {
      type: String,
      default: 'Search...',
    },
    initialSelectedId: [String, Number],
    selectedComponentId: [String, Number],
    valueField: {
      type: String,
      default: 'ID',
    },
    labelField: {
      type: String,
      default: 'Name',
    },
    uid: String,
    maxWidth: [String, Number],
    supabaseUrl: String,
    apiKey: String,
    authToken: String,
    ApiURL: String,
    ApiBody: Object,
    readOnly: {
      type: Boolean,
      default: false
    },
    inputMode: {
      type: Boolean,
      default: false
    },
    listTitle: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      search: '',
      isOpen: false,
      selectedComponent: null,
      localDatasource: [],
      isTyping: false
    };
  },
  computed: {
    normalizedDatasource() {
      // Usa localDatasource se houver, senão datasource
      return Array.isArray(this.localDatasource) && this.localDatasource.length > 0
        ? this.localDatasource
        : (Array.isArray(this.datasource) ? this.datasource : []);
    },
    filteredItems() {
      return this.normalizedDatasource.filter(component =>
        String(component[this.labelField] || '').toLowerCase().includes(this.search.toLowerCase())
      );
    },
    filteredComponents() {
      let filtered = [...this.filteredItems];
      if (this.listTitle) {
        filtered.unshift({ __isTitle: true, [this.labelField]: this.listTitle });
      }
      return filtered;
    },
    inputDisplayValue() {
      // Mostra o valor selecionado se não estiver digitando
      if (!this.isOpen || (!this.isTyping && !this.search)) {
        return this.selectedComponent?.[this.labelField] || '';
      }
      return this.search;
    },
    nameStyle() {
      return {
        fontFamily: this.nameFontFamily,
        fontSize: this.nameFontSize,
        fontWeight: this.nameFontWeight,
      };
    },
    initialStyle() {
      return {
        fontFamily: this.initialFontFamily,
        fontSize: this.initialFontSize,
        fontWeight: this.initialFontWeight,
      };
    },
    inputStyle() {
      return {
        fontFamily: this.inputFontFamily,
        fontSize: this.inputFontSize,
        fontWeight: this.inputFontWeight,
      };
    },
    containerStyle() {
      return this.maxWidth ? { maxWidth: typeof this.maxWidth === 'number' ? `${this.maxWidth}px` : this.maxWidth } : {};
    },
  },
  created() {
    if (typeof wwLib !== 'undefined' && wwLib.wwVariable && wwLib.wwVariable.useComponentVariable) {
      this.selectedComponentIdVar = wwLib.wwVariable.useComponentVariable({
        uid: this.uid,
        name: 'selectedComponentId',
        type: 'text',
        defaultValue: ''
      });
    }
  },
  mounted() {
    this.localDatasource = Array.isArray(this.datasource) ? [...this.datasource] : [];
    document.addEventListener('click', this.handleClickOutside);
    this.initializeSelectedComponent();
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  },
  watch: {
    datasource: {
      handler(newVal) {
        if (Array.isArray(newVal)) {
          this.localDatasource = [...newVal];
        } else {
          this.localDatasource = [];
        }
        this.initializeSelectedComponent();
      },
      immediate: true,
      deep: true
    },
    selectedComponentId: {
      immediate: true,
      handler(newId) {
        const component = this.normalizedDatasource.find(u => String(u?.[this.valueField] || '') === String(newId));
        this.selectedComponent = component || null;
      }
    },
    initialSelectedId: {
      immediate: true,
      handler(newId) {
        const component = this.normalizedDatasource.find(u => String(u?.[this.valueField] || '') === String(newId));
        this.selectedComponent = component || null;
      }
    },
    selectedComponent(newComponent) {
      if (this.selectedComponentIdVar?.setValue) {
        this.selectedComponentIdVar.setValue(newComponent?.[this.valueField] || '');
      }
    }
  },
  methods: {
    handleDropdownClick() {
      if (!this.readOnly) this.openDropdown();
    },
    toggleDropdown() {
      try {
        console.log('toggleDropdown called');
        this.isOpen = !this.isOpen;
      } catch (e) {
        console.error('Erro em toggleDropdown:', e);
      }
    },
    closeDropdown(event) {
      try {
        console.log('closeDropdown called', event);
        if (this.isOpen && this.$refs.dropdownRoot && !this.$refs.dropdownRoot.contains(event.target)) {
          this.isOpen = false;
        }
      } catch (e) {
        console.error('Erro em closeDropdown:', e);
      }
    },
    openDropdown() {
      this.isOpen = true;
      this.isTyping = false;
    },
    onInput(e) {
      this.search = e.target.value;
      this.isTyping = true;
    },
    handleEnter() {
      if (this.inputMode) return;
      if (this.filteredItems.length === 0 && this.search.trim()) {
        this.createNewOption();
      } else if (this.filteredItems.length === 1) {
        this.selectComponent(this.filteredItems[0]);
      }
    },
    replaceNewItemText(obj, value) {
      if (Array.isArray(obj)) {
        return obj.map(item => this.replaceNewItemText(item, value));
      } else if (obj && typeof obj === 'object') {
        const newObj = {};
        for (const key in obj) {
          if (typeof obj[key] === 'string' && obj[key] === '@NewItemText') {
            newObj[key] = value;
          } else {
            newObj[key] = this.replaceNewItemText(obj[key], value);
          }
        }
        return newObj;
      }
      return obj;
    },
    async createNewOption() {
      console.log('createNewOption chamada', this.ApiURL, this.ApiBody, this.search);
      if (!this.ApiURL) return;
      // ApiBody é um array, clona e substitui recursivamente '@NewItemText' pelo valor digitado
      let bodyArray = Array.isArray(this.ApiBody) ? JSON.parse(JSON.stringify(this.ApiBody)) : [];
      bodyArray = this.replaceNewItemText(bodyArray, this.search);
      try {
        console.log('apiKey:', this.apiKey);
        console.log('authToken:', this.authToken);
        console.log('ApiURL:', this.ApiURL);
        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) headers['apikey'] = this.apiKey;
        if (this.authToken) headers['Authorization'] = `${this.authToken}`;
        console.log('Headers enviados:', headers);
        const response = await fetch(this.ApiURL, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyArray)
        });
        if (!response.ok) throw new Error(await response.text());
        const result = await response.json();
        console.log('API result:', result);
        const item = Array.isArray(result) ? result[0] : result;
        // Tenta extrair o ID de várias formas
        let id = item && (item[this.valueField] || item.id || item.ID);
        if (!id && item) {
          for (const key in item) {
            if ((typeof item[key] === 'string' || typeof item[key] === 'number') && item[key]) {
              id = item[key];
              break;
            }
          }
          if (!id) {
            console.warn('Não foi possível determinar o ID do item retornado pela API:', item);
          }
        }
        const label = item && (item[this.labelField] || this.search);
        if (item && id) {
          const itemToAdd = { ...item, [this.valueField]: id, [this.labelField]: label };
          this.localDatasource.push(itemToAdd);
          // Ordena localDatasource pelo campo labelField
          this.localDatasource.sort((a, b) => {
            const la = (a[this.labelField] || '').toLowerCase();
            const lb = (b[this.labelField] || '').toLowerCase();
            return la.localeCompare(lb);
          });
          this.selectComponent(itemToAdd);
          this.selectedComponent = itemToAdd;
          this.search = '';
          this.isTyping = false;
          console.log('localDatasource após inserção:', this.localDatasource);
        } else {
          console.warn('Item inválido não adicionado:', item);
        }
      } catch (e) {
        console.error('Erro ao criar novo item:', e);
      }
      this.isOpen = false;
    },
    selectComponent(component) {
      this.selectedComponent = component;
      this.search = '';
      this.isTyping = false;
      this.isOpen = false;
      this.$emit('component-selected', component[this.valueField]);
      this.$emit('update:selectedComponentId', component[this.valueField]);
      this.$emit('trigger-event', {
        name: 'onChange',
        event: { value: component?.[this.valueField] || '' }
      });
    },
    handleClickOutside(event) {
      try {
        console.log('handleClickOutside called', event);
        this.closeDropdown(event);
      } catch (e) {
        console.error('Erro em handleClickOutside:', e);
      }
    },
    initializeSelectedComponent() {
      // Prioriza selectedComponentId, senão usa initialSelectedId
      let idToSelect = this.selectedComponentId != null && this.selectedComponentId !== ''
        ? this.selectedComponentId
        : this.initialSelectedId;
      const component = this.normalizedDatasource.find(u => String(u?.[this.valueField] || '') === String(idToSelect));
      this.selectedComponent = component || null;
    },
  }
};
</script>


<style scoped>
/* Novo visual minimalista para o dropdown */
.dropdown-container {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  min-height: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  position: relative;
  padding: 0 36px 0 8px;
  box-shadow: none;
  transition: border 0.2s;
  width: 100%;
  box-sizing: border-box;
}
.dropdown-container:focus-within {
  border: 1px solid #e0e0e0;
  box-shadow: none;
}
.dropdown-input {
  border: none;
  outline: none;
  background: transparent;
  width: 100%;
  font-size: 16px;
  padding: 0;
  height: 36px;
  line-height: 36px;
  cursor: pointer;
  box-sizing: border-box;
}
.dropdown-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  font-size: 18px;
  color: #222;
}
/* Dropdown de opções: largura igual ao input/container, sem overflow */
.component-selector__dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  min-width: 0;
  background: #fff;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 4px 16px #0002;
  z-index: 10;
  padding: 0 0 4px 0;
  border: none;
  box-sizing: border-box;
  /* Removido margin-left e margin-right para não criar espaço */
}
.component-selector__item {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background 0.2s;
  gap: 10px;
  border: none;
  box-sizing: border-box;
}
.component-selector__item--disabled {
  pointer-events: none;
  opacity: 0.5;
}
.component-selector__item--not-clickable {
  pointer-events: none;
  cursor: default;
}
.component-selector__item--title {
  font-weight: bold;
  color: #888;
  cursor: default;
  pointer-events: none;
  border-bottom: 1px solid #e0e0e0;
  /* margin-bottom: 2px; removido para não criar espaço */
  padding: 4px 12px 4px 12px;
  border-radius: 0;
  min-height: 28px;
  background: #fff;
}
.component-selector__item:hover:not(.component-selector__item--title) {
  background: #f5f5f5;
}
.component-selector__name {
  font-size: 15px;
  font-weight: 500;
  color: #444;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 0;
  max-width: 100%;
}
</style> 