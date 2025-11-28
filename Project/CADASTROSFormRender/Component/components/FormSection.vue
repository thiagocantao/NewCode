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
import { computed, ref, onMounted, toRef } from 'vue';
import FieldComponent from './FieldComponent.vue';
import {
  LIST_FIELD_TYPES,
  normalizeFieldDataSource,
  hasFetchableDataSource,
  fetchDataSourceOptions,
  parseListOptions,
  mapOptionsFromData
} from './listDataSource';

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
    listRequestBody: {
      type: [Object, String],
      required: false,
      default: null
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
    const options = ref({});
    const loading = ref({});
    const error = ref({});
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

    const resolvePlatformContext = () => {
      if (typeof window === 'undefined') {
        return { workspaceId: null, userId: props.userId || null };
      }

      const safeGet = key => {
        try {
          return window?.wwLib?.wwVariable?.getValue?.(key);
        } catch (err) {
          console.warn('[CADASTROSFormRender] Failed to read variable', key, err);
          return null;
        }
      };

      return {
        workspaceId: safeGet('744511f1-3309-41da-a9fd-0721e7dd2f99') || null,
        userId: safeGet('fc54ab80-1a04-4cfe-a504-793bdcfce5dd') || props.userId || null
      };
    };

    const loadOptions = async (field) => {
      const normalizedType = String(field?.fieldType || '').toUpperCase();
      if (!LIST_FIELD_TYPES.includes(normalizedType)) {
        return;
      }

      const normalizedDataSource = normalizeFieldDataSource(field.dataSource || field.data_source);
      const fallbackOptions = parseListOptions(field?.list_options || field?.listOptions);

      if (!hasFetchableDataSource(normalizedDataSource)) {
        if (fallbackOptions.length) {
          options.value[field.id] = fallbackOptions;
        }
        return;
      }

      loading.value[field.id] = true;
      error.value[field.id] = null;

      try {
        const context = {
          apiUrl: props.apiUrl,
          apiKey: props.apiKey,
          apiAuthorization: props.apiAuthorization,
          listRequestBody: props.listRequestBody,
          ticketId: props.ticketId || null,
          companyId: props.companyId || null,
          language: props.language || null,
          ...resolvePlatformContext()
        };

        const result = await fetchDataSourceOptions(normalizedDataSource, context);
        const normalizedOptions = Array.isArray(result)
          ? result
          : mapOptionsFromData(result, normalizedDataSource) || [];

        options.value[field.id] = normalizedOptions.length ? normalizedOptions : fallbackOptions;
      } catch (err) {
        error.value[field.id] = err.message;
        if (fallbackOptions.length) {
          options.value[field.id] = fallbackOptions;
        }
      } finally {
        loading.value[field.id] = false;
      }
    };

    const getFieldOptions = (fieldId) => {
      const existing = options.value[fieldId];
      if (Array.isArray(existing) && existing.length) {
        return existing;
      }

      const field = sectionFields.value.find(f => f.id === fieldId);
      if (!field) return [];

      const fallbackOptions = parseListOptions(field?.list_options || field?.listOptions);
      return fallbackOptions;
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
        if (LIST_FIELD_TYPES.includes(String(field?.fieldType || '').toUpperCase())) {
          loadOptions(field);
        }
      });
    });

    return {
      isMobile,
      isExpanded,
      toggleFields,
      sectionTitle,
      sectionFields,
      getInputType,
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
