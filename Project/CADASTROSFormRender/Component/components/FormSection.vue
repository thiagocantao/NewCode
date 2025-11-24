<template>
  <div class="form-section">
    <div class="section-fields" :class="{ 'mobile-layout': isMobile }">
      <div v-for="(row, rowIndex) in fieldRows" :key="'row-' + rowIndex" class="form-row">
        <div
          v-for="field in row"
          :key="field.id"
          class="field-wrapper"
          :style="getFieldGridStyle(field)"
        >
          <FieldComponent
            ref="fieldComponents"
            :field="field"
            :api-url="apiUrl"
            :api-key="apiKey"
            :api-authorization="apiAuthorization"
            :ticket-id="ticketId"
            :options="getFieldOptions(field.id)"
            :user-id="userId"
            :is-form-readonly="isReadOnly"
            :is-mobile="isMobile"
            @update:value="value => updateFieldValue(field.id, value)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, onMounted, onUnmounted, toRef } from 'vue';
import FieldComponent from './FieldComponent.vue';

export default {
  name: 'FormSection',
  components: {
    FieldComponent
  },
  props: {
    section: {
      type: Object,
      required: true
    },
    allFields: {
      type: Array,
      default: () => []
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
    companyId: {
      type: String,
      required: false
    },
    language: {
      type: String,
      required: false
    },
    userId: {
      type: String,
      required: false
    },
    isMobile: {
      type: Boolean,
      default: false
    },
    isReadOnly: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:value'],
  setup(props, { emit }) {
    
    const isExpanded = ref(true);
    const isMobile = toRef(props, 'isMobile');
    const isReadOnly = toRef(props, 'isReadOnly');
    const loadingOptions = ref({});
    const fieldOptions = ref({});
    const options = ref({});
    const loading = ref({});
    const error = ref({});
    const hasAddedListener = ref(false);
    const fieldValues = ref({});
    const fieldComponents = ref([]);

    const toggleFields = () => {
      isExpanded.value = !isExpanded.value;
    };

    const sectionTitle = computed(() => {
      if (typeof props.section.title === 'object') {
        return props.section.title.pt_br || 'Section';
      }
      return props.section.title || 'Section';
    });

    const sectionFields = computed(() => {
      return props.section.fields.map(field => {
        const completeField = props.allFields.find(f => f.ID === field.field_id || f.id === field.field_id);
        // Mescla os dados, mas garante que o valor do JSON (field.value) prevaleça e as opções corretas
        return {
          ...completeField,
          ...field,
          tip_translations: field.tip_translations || completeField?.tip_translations,
          list_options: field.list_options || field.listOptions || completeField?.list_options || completeField?.listOptions,
          dataSource: field.dataSource || field.data_source || completeField?.dataSource || completeField?.data_source,
          value: field.value // força o valor do JSON
        };
      });
    });

    const fieldRows = computed(() => {
      const fields = [...sectionFields.value].sort((a, b) => (a.position || 0) - (b.position || 0));
      const rows = [];
      if (isMobile.value) {
        fields.forEach(field => {
          rows.push([field]);
        });
        return rows;
      }
      let currentRow = [];
      let currentSum = 0;
      fields.forEach(field => {
        const col = Math.min(Math.max(parseInt(field.columns) || 1, 1), 4);
        if (currentSum + col > 4) {
          if (currentRow.length) rows.push(currentRow);
          currentRow = [];
          currentSum = 0;
        }
        currentRow.push(field);
        currentSum += col;
      });
      if (currentRow.length) rows.push(currentRow);
      return rows;
    });

    const getFieldGridStyle = (field) => {
      if (isMobile.value) {
        return { gridColumn: '1 / -1' };
      }
      const col = Math.min(Math.max(parseInt(field.columns) || 1, 1), 4);
      return { gridColumn: 'span ' + col };
    };

    const getInputType = (fieldType) => {
      switch (fieldType) {
        case 'INTEGER':
          return 'number';
        case 'DATE':
          return 'date';
        default:
          return 'text';
      }
    };

    const parseListOptions = (listOptions) => {
      if (!listOptions || typeof listOptions !== 'string') {
        return [];
      }
      return listOptions
        .split(',')
        .map(opt => opt.trim())
        .filter(opt => opt.length)
        .map(opt => ({ value: opt, label: opt }));
    };

    const hasFetchableDataSource = (field) => {
      const dataSource = field?.dataSource;
      if (!dataSource) return false;

      if (typeof dataSource === 'string') {
        return dataSource.trim().length > 0;
      }

      if (typeof dataSource === 'object') {
        return Boolean(dataSource.url) || Boolean(dataSource.functionName);
      }

      return false;
    };

    const resolveStaticOptions = (field) => {
      const listOptions = field?.list_options || field?.listOptions;
      return parseListOptions(listOptions);
    };

    const getOptions = async (field) => {
      if (!field.dataSource) {
        return [];
      }

      try {
        let url = '';
        let method = 'POST';
        let fetchOptions = { method: 'POST', headers: {} };
        fetchOptions.headers['Content-Type'] = 'application/json';
        if (props.apiKey) fetchOptions.headers['apikey'] = props.apiKey;
        if (props.apiAuthorization) fetchOptions.headers['Authorization'] = props.apiAuthorization;
        
        fetchOptions.body = JSON.stringify({
          ...(props.companyId ? { p_idcompany: props.companyId } : {}),
          ...(props.language ? { p_language: props.language } : {})
        });
        if (typeof field.dataSource === 'string') {
          if (!field.dataSource) {
            return [];
          }
          url = (props.apiUrl || '') + field.dataSource;
        } else if (field.dataSource.url) {
          url = field.dataSource.url;
          if (field.dataSource.method && field.dataSource.method.toUpperCase() === 'GET') {
            method = 'GET';
            fetchOptions.method = 'GET';
            delete fetchOptions.body;
          }
        } else if (field.dataSource.functionName) {
          if (field.fieldType === 'CONTROLLED_LIST') {
          }
          url = (props.apiUrl || '') + field.dataSource.functionName;
        } else {
          return [];
        }

        if (field.fieldType === 'CONTROLLED_LIST') {
        }
        const response = await fetch(url, fetchOptions);
        if (field.fieldType === 'CONTROLLED_LIST') {
          let apiResult = '';
          try {
            apiResult = await response.clone().text();
          } catch (e) {
            apiResult = '[erro ao ler resposta da API]';
          }
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error('API response is not an array');
        }

        if (field.dataSource.transform) {
          const options = data
            .map(item => {
              let value = item[field.dataSource.transform?.value] ?? item.id;
              let label = item[field.dataSource.transform?.label] ?? item.name;
              if (value === undefined || label === undefined) {
                return null;
              }
              return { value, label };
            })
            .filter(item => item !== null)
            .sort((a, b) => a.label.localeCompare(b.label));
          return options;
        }

        return data
          .map(item => {
            const value = item[field.dataSource.valueField || 'id'];
            const label = item[field.dataSource.labelField || 'name'];

            if (value === undefined || label === undefined) {
              return null;
            }

            return { value, label };
          })
          .filter(item => item !== null)
          .sort((a, b) => a.label.localeCompare(b.label));
      } catch (err) {
        throw err;
      }
    };

    const loadOptions = async (field) => {
      const isListField =
        field.fieldType === 'LIST' ||
        field.fieldType === 'CONTROLLED_LIST' ||
        field.fieldType === 'SIMPLE_LIST';

      if (!isListField) {
        return;
      }

      const hasDataSource = hasFetchableDataSource(field);

      // If there is no usable dataSource, fall back to static list options
      if (!hasDataSource) {
        const staticOptions = resolveStaticOptions(field);
        if (staticOptions.length) {
          options.value[field.id] = staticOptions;
        }
        return;
      }

      loading.value[field.id] = true;
      error.value[field.id] = null;

      try {
        const result = await getOptions(field);
        const resolvedOptions = result?.length ? result : resolveStaticOptions(field);
        options.value[field.id] = resolvedOptions;
      } catch (err) {
        error.value[field.id] = err.message;
        const staticOptions = resolveStaticOptions(field);
        if (staticOptions.length) {
          options.value[field.id] = staticOptions;
        }
      } finally {
        loading.value[field.id] = false;
      }
    };

    const getFieldOptions = (fieldId) => {
      const field = sectionFields.value.find(f => f.id === fieldId);
      const fieldOptions = options.value[fieldId] || [];
      if (fieldOptions.length) {
        return fieldOptions;
      }

      if (field?.fieldType === 'SIMPLE_LIST' || field?.fieldType === 'LIST' || field?.fieldType === 'CONTROLLED_LIST') {
        return resolveStaticOptions(field);
      }

      return [];
    };

    const updateFieldValue = (fieldId, value) => {
      fieldValues.value[fieldId] = value;
      emit('update:value', { fieldId, value });
    };

    const validateFields = () => {
      let valid = true;
      fieldComponents.value.forEach(comp => {
        if (comp && typeof comp.validate === 'function') {
          const fieldValid = comp.validate();
          if (!fieldValid) {
            valid = false;
          }
        }
      });
      return valid;
    };

    onMounted(() => {
      // Load options for all LIST fields
      sectionFields.value.forEach(field => {
        if (field.fieldType === 'LIST' || field.fieldType === 'CONTROLLED_LIST' || field.fieldType === 'SIMPLE_LIST') {
          loadOptions(field);
        }
      });
    });

    onUnmounted(() => {
      if (hasAddedListener.value) {
        window.removeEventListener('ww-ready', loadListOptions);
        hasAddedListener.value = false;
      }
    });

    return {
      isMobile,
      isExpanded,
      toggleFields,
      sectionTitle,
      sectionFields,
      getInputType,
      loadingOptions,
      fieldOptions,
      updateFieldValue,
      options,
      loading,
      fieldValues,
      getFieldOptions,
      fieldRows,
      fieldComponents,
      validateFields,
      getFieldGridStyle,
      isReadOnly
    };
  }
};
</script>

<style scoped>
.form-section {
  margin-bottom: 16px;
  border: 0px;
  background-color: #fff;
  font-size: 14px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0px;
  cursor: pointer;
}

.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 400;
  color: #333;
  flex: 1;
}

.section-fields {
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  column-gap: 24px;
  row-gap: 16px;
  justify-items: start;
  align-items: stretch;
}

.section-fields.mobile-layout {
  grid-template-columns: 1fr;
  column-gap: 0;
}

.form-row {
  display: contents;
  margin: 0;
  padding: 0;
}

.field-wrapper {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  /* O gridColumn é definido inline via style */
}

.action-icon-section {
    cursor: pointer;
    font-size: 14px;
    opacity: .7;
    border-radius: 50%;
    background-color: #f5f5f5;
    border-color: #f5f5f5;
    width: 29px;
    height: 29px;
    padding: 2px;
    margin-right: 10px;
    align-items: center;
    justify-items: center;
}

/* Estilos para o placeholder de carregamento da seção */
.form-section-loading {
  margin-bottom: 24px;
  border: 0px;
  background-color: #fff;
  padding: 16px;
}

.section-loading-placeholder {
  height: 60px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 4px;
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
