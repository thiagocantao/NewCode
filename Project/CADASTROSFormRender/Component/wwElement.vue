<template>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
  <div class="form-builder-container" :class="{ 'has-custom-height': hasCustomFormHeight }" :style="formHeightStyle">
    <div class="form-builder">
      <div :class="['form-sections-container', { scrollable: hasCustomFormHeight }]" ref="formSectionsContainer">
        <!-- Estado de carregamento -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>loading form...</p>
        </div>


        <!-- Conteúdo quando carregado -->
        <template v-else>
          <div v-if="!formSections.length" class="no-sections">
            <p>No data to display</p>
          </div>
          <div v-else>
            <FormSection v-for="section in formSections" :key="`section-${section.id}-${renderKey}`" :section="section"
              ref="sectionComponents"
              :all-fields="allAvailableFields" :is-editing="isEditing" :api-url="apiUrl" :api-key="apiKey"
              :api-authorization="apiAuthorization" :ticket-id="ticketId" :company-id="companyId" :language="language"
              :is-mobile="isMobile" :is-read-only="isFormReadonly"
              @update-section="updateFormState" @edit-section="editSection" @edit-field="editFormField"
              @remove-field="removeFormField" @select-field="selectFieldForProperties"
              @remove-section="handleRemoveSection" @update:value="updateFieldValue" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
  import { ref, computed, onMounted, watch } from 'vue';
import FormSection from './components/FormSection.vue';

export default {
  name: 'FormBuilder',
  components: {
    FormSection
  },
  props: {
    uid: {
      type: String,
      required: true
    },
    content: {
      type: Object,
      required: true
    },
    wwEditorState: { 
      type: Object, 
      required: true 
    },
    apiKey: {
      type: String,
      required: false
    },
    apiAuthorization: {
      type: String,
      required: false
    },
    apiUrl: {
      type: String,
      required: false
    },
    ticketId: {
      type: String,
      required: false
    },
    autoSave: {
      type: Boolean,
      default: true
    },
    readonly: {
      type: [Boolean, String, Number],
      default: undefined
    },
    isMobile: {
      type: [Boolean, Object],
      default: undefined
    }
  },
  setup(props) {

    const isEditing = computed(() => {
      return props.wwEditorState?.isEditing || false;
    });

    const coerceBoolean = (value) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'sim', 's', 'y', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'nao', 'não', 'n', 'off'].includes(normalized)) return false;
      }
      if (typeof value === 'number') return value !== 0;
      return Boolean(value);
    };

    const { value: formData, setValue: setFormData } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid,
      name: 'formData',
      type: 'object',
      defaultValue: {}
    });

 

    const formSections = ref([]);
    const formReadOnly = ref(false);
    const formSectionsContainer = ref(null);
    const allAvailableFields = ref([]);
    const isLoading = ref(true); // Estado de carregamento global
    const renderKey = ref(0); // Chave para forçar re-renderização
    const sectionComponents = ref([]);

    const apiKey = computed(() => props.apiKey || props.content.apiKey);
    const apiAuthorization = computed(() => props.apiAuthorization || props.content.apiAuthorization);
    const apiUrl = computed(() => props.apiUrl || props.content.apiUrl);
    const ticketId = computed(() => props.ticketId || props.content.ticketId);
    const companyId = computed(() => props.content.companyId);
    const language = computed(() => props.content.language);
    const resolveResponsiveBoolean = (value) => {
      if (typeof value === 'boolean') return value;
      if (!value || typeof value !== 'object') return false;

      const getResponsiveValue = wwLib?.wwResponsive?.getValue;
      if (typeof getResponsiveValue === 'function') {
        try {
          const resolved = getResponsiveValue(value, props.wwEditorState);
          if (typeof resolved === 'boolean') return resolved;
        } catch (error) {
        }
      }

      if (typeof value.value === 'boolean') return value.value;

      const breakpoint = props?.wwEditorState?.deviceId || props?.wwEditorState?.device?.id || props?.wwEditorState?.device;
      if (breakpoint && typeof value[breakpoint] === 'boolean') {
        return value[breakpoint];
      }

      if (breakpoint && value[breakpoint] && typeof value[breakpoint].value === 'boolean') {
        return value[breakpoint].value;
      }

      const fallbackKeys = ['desktop', 'tablet', 'mobile', 'default'];
      for (const key of fallbackKeys) {
        if (typeof value[key] === 'boolean') return value[key];
        if (value[key] && typeof value[key].value === 'boolean') return value[key].value;
      }

      const firstBoolean = Object.values(value).find(entry => typeof entry === 'boolean');
      if (typeof firstBoolean === 'boolean') return firstBoolean;

      const nestedBoolean = Object.values(value).find(entry => entry && typeof entry === 'object' && typeof entry.value === 'boolean');
      if (nestedBoolean && typeof nestedBoolean.value === 'boolean') return nestedBoolean.value;

      return false;
    };

    const isMobile = computed(() => {
      if (typeof props.isMobile === 'boolean') return props.isMobile;
      return resolveResponsiveBoolean(props.content.isMobile);
    });
    const autoSave = computed(() => {
      if (typeof props.autoSave === 'boolean') return props.autoSave;
      if (typeof props.content.autoSave === 'boolean') return props.content.autoSave;
      return true;
    });

    const isFormReadonly = computed(() => {
      if (props.readonly !== undefined && props.readonly !== null) {
        return coerceBoolean(props.readonly);
      }
      const contentValue = props.content?.isReadonly;
      if (contentValue !== undefined && contentValue !== null) {
        return coerceBoolean(contentValue);
      }
      return false;
    });

    const componentFontFamily = ref('');

    const updateComponentFontFamily = () => {
      try {
        if (typeof window !== 'undefined' && window.wwLib?.wwVariable?.getValue) {
          const typographySettings = window.wwLib.wwVariable.getValue('5e429bf8-2fe3-42e4-a41d-e3b4ac1b52fa');
          componentFontFamily.value = typographySettings?.fontFamily || '';
        } else {
          componentFontFamily.value = '';
        }
      } catch (error) {
        componentFontFamily.value = '';
      }
    };

    const hasCustomFormHeight = computed(() => {
      const height = props.content.formHeight;
      if (typeof height === 'number') {
        return true;
      }
      if (typeof height === 'string') {
        return height.trim() !== '';
      }
      return false;
    });

    const formHeightStyle = computed(() => {
      const style = {};
      if (hasCustomFormHeight.value) {
        style.height = props.content.formHeight;
      }
      style.fontFamily = componentFontFamily.value || 'inherit';
      return style;
    });

    const loadFormData = () => {
      let formData = null;

      if (props.content.formJson) {
        try {
          formData = typeof props.content.formJson === 'string' 
            ? JSON.parse(props.content.formJson)
            : props.content.formJson;
        } catch (error) {
        }
      }

      // Se não temos dados válidos, criar uma estrutura inicial
      if (!formData || !formData.form || !formData.sections) {
        formData = {
          form: {
            id: null,
            name: { [window.wwLib.wwVariable.getValue('aa44dc4c-476b-45e9-a094-16687e063342')]: "Formulário Criado" },
            workspace_id: "00000000-0000-0000-0000-000000000000",
            company_id: null,
            is_current: true
          },
          sections: []
        };
      }

      // Processar as seções com verificações de segurança
      const normalizedFormReadonly = coerceBoolean(isFormReadonly.value);

      const processedSections = (formData.sections || []).map(section => {
        return {
          ...section,
          id: section.id || `section-${Date.now()}`,
          title: section.title[window.wwLib.wwVariable.getValue('aa44dc4c-476b-45e9-a094-16687e063342')] || section.title || 'Nova Seção',
          fields: (section.fields || []).map(field => {
            let processedValue = field.value;

            const hasDefaultValue = Object.prototype.hasOwnProperty.call(field, 'default_value');
            if (
              hasDefaultValue &&
              (processedValue === undefined || processedValue === null || processedValue === '')
            ) {
              processedValue = field.default_value;
            }

            if (field.fieldType === 'YES_NO') {
              if (typeof processedValue === 'string') {
                processedValue = processedValue === 'true' || processedValue === '1';
              } else if (processedValue === undefined || processedValue === null) {
                processedValue = false;
              } else {
                processedValue = Boolean(processedValue);
              }
            }
            const originalReadonly = coerceBoolean(field.is_readonly);
            // FORMATED_TEXT mantém como string
            // Outros tipos mantêm valor original
            const processedField = {
              ...field,
              id: field.id || field.ID || field.field_id || `field-${Date.now()}`,
              field_id: field.field_id || field.ID || field.id,
              name: field.name || field.Name || 'Campo sem nome',
              fieldType: field.fieldType || 'text',
              columns: parseInt(field.columns) || 1,
              is_mandatory: Boolean(field.is_mandatory),
              original_readonly: originalReadonly,
              is_readonly: Boolean(originalReadonly || normalizedFormReadonly),
              is_hide_legend: Boolean(field.is_hide_legend),
              dataSource: field.dataSource || field.data_source,
              list_options: field.list_options || field.listOptions,
              default_value: field.default_value,
              value: processedValue
            };
            return processedField;
          })
        };
      });

      formSections.value = [...processedSections];
      formReadOnly.value = normalizedFormReadonly;

      // Atualizar o estado do formulário
      updateFormState();
    };

    const loadFieldsData = () => {
      let fields = [];
      
      if (props.content.fieldsJson) {
        try {
          const parsedFields = typeof props.content.fieldsJson === 'string' 
            ? JSON.parse(props.content.fieldsJson)
            : props.content.fieldsJson;
          fields = Array.isArray(parsedFields) ? parsedFields : [];
        } catch (error) {
          if (typeof props.content.fieldsJson === 'object') {
            fields = Array.isArray(props.content.fieldsJson) ? props.content.fieldsJson : [];
          } else {
            fields = [];
          }
        }
      } else if (props.content.defaultFields) {
        fields = Array.isArray(props.content.defaultFields) ? props.content.defaultFields : [];
      } else {
        fields = [];
      }
      allAvailableFields.value = [...fields];
    };

    const updateFormState = (options) => {
      const { forceRerender = true } = options || {};
      try {
        const normalizedFormReadonly = coerceBoolean(formReadOnly.value ?? isFormReadonly.value);
        const formState = {
          sections: formSections.value.map(section => ({
            ...section,
            fields: section.fields.map(field => ({
              ...field,
              id: field.id || field.ID || field.field_id,
              field_id: field.field_id || field.ID || field.id,
              name: field.name || field.Name,
              fieldType: field.fieldType || 'text',
              columns: parseInt(field.columns) || 1,
              is_mandatory: Boolean(field.is_mandatory),
              is_readonly: Boolean(field.is_readonly),
              is_hide_legend: Boolean(field.is_hide_legend),
              default_value: field.default_value,
              value: field.value
            }))
          }))
        };
        setFormData(formState);

        // Forçar reatividade após setFormData
        if (forceRerender) {
          setTimeout(() => {
            // Forçar re-renderização do formSections
            formSections.value = [...formSections.value];
            // Incrementar renderKey para forçar re-renderização dos componentes
            renderKey.value++;
          }, 50);
        }

      } catch (error) {
      }
    };

    const editSection = (section) => {
      const sectionIndex = formSections.value.findIndex(s => s.id === section.id);
      if (sectionIndex !== -1) {
        formSections.value[sectionIndex] = {
          ...formSections.value[sectionIndex],
          ...section
        };
        updateFormState();
      }
    };

    const handleRemoveSection = (section) => {
      const sectionIndex = formSections.value.findIndex(s => s.id === section.id);
      if (sectionIndex !== -1) {
        formSections.value.splice(sectionIndex, 1);
        updateFormState();
      }
    };

    const editFormField = (field) => {
      const section = formSections.value.find(s => s.fields.some(f => f.id === field.id));
      if (section) {
        const fieldIndex = section.fields.findIndex(f => f.id === field.id);
        if (fieldIndex !== -1) {
          section.fields[fieldIndex] = {
            ...section.fields[fieldIndex],
            ...field
          };
          updateFormState();
        }
      }
    };

    const removeFormField = ({ sectionId, field }) => {
      const section = formSections.value.find(s => s.id === sectionId);
      if (section) {
        const fieldIndex = section.fields.findIndex(f => f.id === field.id);
        if (fieldIndex !== -1) {
          section.fields.splice(fieldIndex, 1);
          updateFormState();
        }
      }
    };

    const updateFieldValue = ({ fieldId, value }) => {
      const section = formSections.value.find(s =>
        s.fields.some(f => f.id === fieldId || f.field_id === fieldId || f.ID === fieldId)
      );
      if (section) {
        const field = section.fields.find(
          f => f.id === fieldId || f.field_id === fieldId || f.ID === fieldId
        );
        if (field) {
          field.value = value;
          if (autoSave.value) {
            updateFormState({ forceRerender: false });
          }
        }
      }
    };

    const selectFieldForProperties = (field) => {
    };

    // Watch for changes in formJson
    watch(() => props.content.formJson, (newValue) => {
      loadFormData();
    });

    onMounted(() => {
      const finishLoading = () => {
        try {
          isLoading.value = false;
        } catch (error) {
        }
      };
      const initializeComponent = async () => {
        try {
          updateComponentFontFamily();
          loadFormData();
          loadFieldsData();
          await new Promise(resolve => setTimeout(resolve, 100));
          finishLoading();
        } catch (error) {
          finishLoading();
        }
      };
      initializeComponent();
    });

   

    // Watch para detectar mudanças nos props e forçar re-renderização
    watch(() => props.content, (newContent, oldContent) => {
      if (newContent !== oldContent) {
        loadFormData();
        loadFieldsData();
        updateComponentFontFamily();
      }
    }, { deep: true });

    watch(() => props.wwEditorState, () => {
      updateComponentFontFamily();
    }, { deep: true });

    watch(
      isFormReadonly,
      newVal => {
        const normalized = coerceBoolean(newVal);
        formReadOnly.value = normalized;
        formSections.value.forEach(section => {
          section.fields.forEach(field => {
            if (field.original_readonly === undefined) {
              field.original_readonly = coerceBoolean(field.is_readonly);
            }
            field.original_readonly = coerceBoolean(field.original_readonly);
            field.is_readonly = field.original_readonly || normalized;
          });
        });
        updateFormState();
      },
      { immediate: true }
    );

    // Watch para formSections para debug
    watch(formSections, (newSections, oldSections) => {
    }, { deep: true });

    const validateRequiredFields = () => {
      let valid = true;
      sectionComponents.value.forEach(section => {
        if (section && typeof section.validateFields === 'function') {
          const sectionValid = section.validateFields();
          if (!sectionValid) {
            valid = false;
          }
        }
      });
      return valid;
    };

    return {
      isEditing,
      formData,
      formSections,
      formSectionsContainer,
      allAvailableFields,
      editFormField,
      removeFormField,
      updateFieldValue,
      selectFieldForProperties,
      editSection,
      handleRemoveSection,
      updateFormState,
      apiKey,
      apiAuthorization,
      apiUrl,
      ticketId,
      companyId,
      language,
      isMobile,
      isLoading,
      renderKey,
      formHeightStyle,
      hasCustomFormHeight,
      sectionComponents,
      validateRequiredFields,
      isFormReadonly
    };
  }
};
</script>

<style scoped>
  .form-builder-container {
    display: flex;
    background-color: #f5f5f5;
    width: 100%;
  }

  .form-builder-container.has-custom-height {
    overflow-y: auto;
  }

  .form-builder {
    flex: 1;
    background-color: #fff;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    overflow: visible;
    font-size: 14px;
  }

  .form-sections-container {
    flex: 1;
  }

  .no-sections {
    text-align: center;
    color: #666;
    font-style: italic;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .add-section-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
  }

  .add-section-btn:hover {
    background-color: #45a049;
  }

  .add-section-btn i {
    font-size: 20px;
  }

  .scrollable {
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #ccc #f5f5f5;
  }

  .scrollable::-webkit-scrollbar {
    width: 8px;
  }

  .scrollable::-webkit-scrollbar-track {
    background: #f5f5f5;
  }

  .scrollable::-webkit-scrollbar-thumb {
    background-color: #ccc;
    border-radius: 4px;
  }

  /* Estilos para o estado de carregamento */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    text-align: center;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }

    100% {
      transform: rotate(360deg);
    }
  }

  .loading-container p {
    color: #666;
    font-size: 14px;
    margin: 0;
  }
</style>
