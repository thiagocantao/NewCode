<template>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
  <div class="form-builder-container">
    <div class="form-builder" :class="{ 'readonly-form': formReadOnly }">
      <div class="form-sections-container scrollable" ref="formSectionsContainer">
                <!-- Estado de carregamento -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Carregando formulário...</p>
        </div>


        <!-- Conteúdo quando carregado -->
        <template v-else>
          <div v-if="!formSections.length" class="no-sections">
            <p>Nenhuma seção encontrada</p>
          </div>
          <div v-else>
            <FormSection v-for="section in formSections" :key="`section-${section.id}-${renderKey}`" :section="section"
              :all-fields="allAvailableFields" :is-editing="isEditing" :api-url="apiUrl" :api-key="apiKey"
              :api-authorization="apiAuthorization" :ticket-id="ticketId" :company-id="companyId" :language="language"
              :read-only="formReadOnly"
              @update-section="updateFormState" @edit-section="editSection" @edit-field="editFormField"
              @remove-field="removeFormField" @select-field="selectFieldForProperties"
              @remove-section="handleRemoveSection" />
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
    readOnly: {
      type: Boolean,
      required: false
    }
  },
  setup(props) {
    
    const isEditing = computed(() => {
      return props.wwEditorState.isEditing;
    });

    const { value: formData, setValue: setFormData } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid,
      name: 'formData',
      type: 'object',
      defaultValue: {}
    });

 

    const formSections = ref([]);
    const formSectionsContainer = ref(null);
    const allAvailableFields = ref([]);
    const isLoading = ref(true); // Estado de carregamento global
    const renderKey = ref(0); // Chave para forçar re-renderização

    const apiKey = computed(() => props.apiKey || props.content.apiKey);
    const apiAuthorization = computed(() => props.apiAuthorization || props.content.apiAuthorization);
    const apiUrl = computed(() => props.apiUrl || props.content.apiUrl);
    const ticketId = computed(() => props.ticketId || props.content.ticketId);
    const companyId = computed(() => props.content.companyId);
    const language = computed(() => props.content.language);
    const formReadOnly = computed(() =>
      props.readOnly !== undefined ? props.readOnly : props.content.readOnly
    );

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
      const processedSections = (formData.sections || []).map(section => {
        return {
          ...section,
          id: section.id || `section-${Date.now()}`,
          title: section.title[window.wwLib.wwVariable.getValue('aa44dc4c-476b-45e9-a094-16687e063342')] || section.title || 'Nova Seção',
          fields: (section.fields || []).map(field => {
            let processedValue = field.value;
            if (field.fieldType === 'YES_NO') {
              if (typeof processedValue === 'string') {
                processedValue = processedValue === 'true' || processedValue === '1';
              } else {
                processedValue = Boolean(processedValue);
              }
            }
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
              is_readonly: Boolean(field.is_readonly || formReadOnly.value),
              is_hide_legend: Boolean(field.is_hide_legend),
              dataSource: field.dataSource || field.data_source,
              list_options: field.list_options || field.listOptions,
              value: processedValue
            };
            return processedField;
          })
        };
      });

      formSections.value = [...processedSections];
      
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

    const updateFormState = () => {
      try {
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
              is_readonly: Boolean(field.is_readonly || formReadOnly.value),
              is_hide_legend: Boolean(field.is_hide_legend)
            }))
          }))
        };
        setFormData(formState);
        
        // Forçar reatividade após setFormData
        setTimeout(() => {
          // Forçar re-renderização do formSections
          formSections.value = [...formSections.value];
          // Incrementar renderKey para forçar re-renderização dos componentes
          renderKey.value++;
        }, 50);
        
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
      }
    }, { deep: true });

    // Watch para formSections para debug
    watch(formSections, (newSections, oldSections) => {
    }, { deep: true });

    return {
      isEditing,
      formData,
      formSections,
      formSectionsContainer,
      allAvailableFields,
      editFormField,
      removeFormField,
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
      formReadOnly,
      isLoading,
      renderKey
    };
  }
};
</script>

<style scoped>
  .form-builder-container {
    display: flex;
    height: 100%;
    background-color: #f5f5f5;
  }

  .form-builder {
    flex: 1;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .form-sections-container {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
  }

  .no-sections {
    text-align: center;
    padding: 20px;
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

  .readonly-form {
    opacity: 0.8;
  }
</style>
