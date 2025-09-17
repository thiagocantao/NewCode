<template>
  <div class="field-properties-panel" :style="styleVars">
    <div class="panel-header" v-if="selectedField">
      <h3>{{ title }}</h3>
    </div>
    <div class="panel-body" v-if="selectedField">
      <div class="form-group">
        <label>{{ fieldNameLabel }}</label>
        <div class="field-value">{{ selectedField.name || 'Unnamed Field' }}</div>
      </div>

      <div class="form-group">
        <label>{{ columnsLabel }}</label>
        <div>
          <input
            type="range"
            min="1" max="4"
            :id="`columns-${uniqueId}`"
            v-model="columns"
            @change="updateFieldProperty('columns', columns)"
          />
        </div>
      </div>

      <div class="form-group toggle">
        <div class="toggle-container">
          <label>{{ requiredLabel }}</label>
          <div class="toggle-switch">
            <input
              type="checkbox"
              :id="`required-${uniqueId}`"
              v-model="isRequired"
              @change="updateFieldProperty('is_mandatory', isRequired)"
            />
            <label :for="`required-${uniqueId}`" class="toggle-label"></label>
          </div>
        </div>
      </div>

      <div class="form-group toggle">
        <div class="toggle-container">
          <label>{{ hideLegendLabel }}</label>
          <div class="toggle-switch">
            <input
              type="checkbox"
              :id="`hide-legend-${uniqueId}`"
              v-model="isHideLegend"
              @change="updateFieldProperty('is_hide_legend', isHideLegend)"
            />
            <label :for="`hide-legend-${uniqueId}`" class="toggle-label"></label>
          </div>
        </div>
      </div>

      <div class="form-group toggle">
        <div class="toggle-container">
          <label>{{ tipLabel }}</label>
          <div class="toggle-switch">
            <input
              type="checkbox"
              :id="`tip-${uniqueId}`"
              v-model="hasTip"
              @change="toggleTip"
            />
            <label :for="`tip-${uniqueId}`" class="toggle-label"></label>
          </div>
        </div>
      </div>

      <div class="form-group" v-if="hasTip">
        <textarea
          v-model="tipText"
          class="tip-textarea"
          @change="updateTip"
          :placeholder="tipPlaceholder"
        ></textarea>
      </div>

      <div class="form-group toggle">
        <div class="toggle-container">
          <label>{{ showOnlyLabel }}</label>
          <div class="toggle-switch">
            <input
              type="checkbox"
              :id="`show-only-${uniqueId}`"
              v-model="showOnly"
              @change="updateFieldProperty('show_only', showOnly)"
            />
            <label :for="`show-only-${uniqueId}`" class="toggle-label"></label>
          </div>
        </div>
      </div>
    </div>
    <div class="panel-body empty-state" v-else>
      <div class="empty-message">{{ noFieldSelectedMessage }}</div>
    </div>
  </div>
</template>

<script>
  import { ref, computed, watch, onMounted, nextTick } from 'vue';

export default {
  name: 'FieldPropertiesPanel',
  props: {
    selectedField: {
      type: Object,
      default: null
    },
    title: {
      type: String,
      default: 'Propriedades do campo'
    },
    fieldNameLabel: {
      type: String,
      default: 'Nome do campo'
    },
    requiredLabel: {
      type: String,
      default: 'Obrigatório'
    },
    hideLegendLabel: {
      type: String,
      default: 'Legenda oculta'
    },
    tipLabel: {
      type: String,
      default: 'Dica'
    },
    columnsLabel: {
      type: String,
      default: 'Tamanho do campo'
    },
    tipPlaceholder: {
      type: String,
      default: 'Digite a dica para este campo...'
    },
    showOnlyLabel: {
      type: String,
      default: 'Exibir apenas'
    },
    noFieldSelectedMessage: {
      type: String,
      default: 'Selecione um campo para editar suas propriedades'
    }
  },
  emits: ['update-field'],
  setup(props, { emit }) {
    // Generate a unique ID for this instance
    const uniqueId = ref(`fp-${Date.now()}`);

    const themeTokens = computed(() => {
      if (typeof window !== 'undefined' && window.wwLib?.wwVariable?.getValue) {
        const value = window.wwLib.wwVariable.getValue('61c1b425-10e8-40dc-8f1f-b117c08b9726');
        if (value && typeof value === 'object') {
          return value;
        }
      }
      return {};
    });

    const styleVars = computed(() => ({
      '--placeholder-color': themeTokens.value.normal || themeTokens.value.inputText || '#787878'
    }));
    
    // Field properties
    const isRequired = ref(false);
    const isHideLegend = ref(false);
    const hasTip = ref(false);    
    const columns = ref(1);
    const tipText = ref('');
    const showOnly = ref(false);

    // Watch for changes in the selected field
    watch(() => props.selectedField, (newField) => {
      if (newField) {
        isRequired.value = Boolean(newField.is_mandatory);
        isHideLegend.value = Boolean(newField.is_hide_legend);
        showOnly.value = Boolean(newField.show_only);
        columns.value = parseInt(newField.columns) || 1;
        
        // Atualiza o gradiente do range
        nextTick(() => {
          const rangeInput = document.getElementById(`columns-${uniqueId.value}`);
          if (rangeInput) {
            const percentage = ((columns.value - 1) / 3) * 100;
            rangeInput.style.background = `linear-gradient(to right, rgb(105, 157, 140) 0%, rgb(105, 157, 140) ${percentage}%, #f5f5f5 ${percentage}%, #f5f5f5 100%)`;
          }
        });
        
        // Handle tip
        const tipTranslations = newField.tip_translations || {};
        const tip = tipTranslations[window.wwLib.wwVariable.getValue('aa44dc4c-476b-45e9-a094-16687e063342')] || newField.tip || '';
        hasTip.value = Boolean(tip);
        tipText.value = tip;
      } else {
        resetForm();
      }
    }, { immediate: true, deep: true });
    
    // Reset form values
    const resetForm = () => {
      isRequired.value = false;
      isHideLegend.value = false;
      hasTip.value = false;
      tipText.value = '';
      showOnly.value = false;
      columns.value = 1;
    };
    
    // Update field property
    const updateFieldProperty = (property, value) => {
      if (!props.selectedField) return;
      
      // Se for a propriedade columns, atualiza o gradiente do range
      if (property === 'columns') {
        const rangeInput = document.getElementById(`columns-${uniqueId.value}`);
        if (rangeInput) {
          const percentage = ((value - 1) / 3) * 100; // Converte o valor 1-4 para porcentagem 0-100
          rangeInput.style.background = `linear-gradient(to right, rgb(105, 157, 140) 0%, rgb(105, 157, 140) ${percentage}%, #f5f5f5 ${percentage}%, #f5f5f5 100%)`;
        }
      }
      
      emit('update-field', {
        ...props.selectedField,
        [property]: value
      });
    };
    
    // Toggle tip
    const toggleTip = () => {
      if (!hasTip.value) {
        tipText.value = '';
      }
      updateTip();
    };
    
    // Update tip
    const updateTip = () => {
      if (!props.selectedField) return;
      
      const updatedField = {
        ...props.selectedField,
        tip_translations: {
          ...(props.selectedField.tip_translations || {}),
          [window.wwLib.wwVariable.getValue('aa44dc4c-476b-45e9-a094-16687e063342')]: hasTip.value ? tipText.value : ''
        }
      };
      
      emit('update-field', updatedField);
    };
    
    return {
      uniqueId,
      isRequired,
      isHideLegend,
      hasTip,
      columns,
      tipText,
      showOnly,
      updateFieldProperty,
      toggleTip,
      updateTip,
      styleVars
    };
  }
};
</script>

<style scoped>
  .field-properties-panel {
    width: 100%;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    font-family: Roboto-Regular, "Open Sans", Arial, sans-serif !important;
    height: calc(100vh - 150px);
    font-size: 14px;
  }

  .panel-header {
    padding: 10px 15px;
  }

  .panel-header h3 {
    line-height: 24px;
    color: rgb(48, 48, 48);
    font-size: 14px;
    font-weight: 400;
    margin-bottom: 4px;
  }

  .panel-body {
    padding: 15px 20px;
  }

  .form-group {
    margin-bottom: 15px;
  }

  .form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 400;
    font-size: 14px;
    color: #333;
  }

  input[type="range"] {
    accent-color: rgb(105, 157, 140);
    background: #f5f5f5;
    width: 100%;
    height: 6px;
    border-radius: 3px;
    appearance: none;
    margin: 0;
    background: linear-gradient(to right, rgb(105, 157, 140) 0%, rgb(105, 157, 140) 50%, #f5f5f5 50%, #f5f5f5 100%);
  }

  input[type="range"]::-webkit-slider-runnable-track {
    background: transparent;
    border-radius: 3px;
    height: 6px;
  }

  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    background: rgb(105, 157, 140);
    border-radius: 50%;
    margin-top: -5px;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  input[type="range"]::-moz-range-track {
    background: transparent;
    border-radius: 3px;
    height: 6px;
  }

  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: rgb(105, 157, 140);
    border-radius: 50%;
    cursor: pointer;
    border: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .range-value {
    text-align: center;
    margin-top: 5px;
    font-size: 14px;
    color: rgb(105, 157, 140);
    font-weight: 500;
  }

  .toggle-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .toggle-container label {
    margin-bottom: 0;
    flex: 1;
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 20px;
    flex-shrink: 0;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-label {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .4s;
    border-radius: 20px;
  }

  .toggle-label:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
  }

  input:checked+.toggle-label {
    background-color: rgb(105, 157, 140);
  }

  input:checked+.toggle-label:before {
    transform: translateX(20px);
  }

  .tip-textarea {
    width: 100%;
    min-height: 80px;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: vertical;
  }

  .tip-textarea::placeholder {
    color: var(--placeholder-color, #787878);
    opacity: 1;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  .empty-message {
    color: #666;
    font-size: 14px;
    text-align: center;
  }
</style>