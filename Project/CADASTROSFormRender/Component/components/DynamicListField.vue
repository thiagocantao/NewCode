<template>
  <div class="dynamic-list-field">
    <label v-if="!field.is_hide_legend" class="field-label">
      {{ field.name }}
      <span v-if="field.is_mandatory" class="required-mark">*</span>
    </label>
    <select
      :id="field.id"
      :name="field.id"
      :value="modelValue"
      @input="updateValue"
      :required="field.is_mandatory"
      :disabled="isLoading"
      class="field-input"
    >
      <option value="" disabled selected>{{ isLoading ? 'Carregando...' : 'Selecione uma opção' }}</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  name: 'DynamicListField',
  props: {
    field: {
      type: Object,
      required: true
    },
    modelValue: {
      type: [String, Number],
      default: ''
    },
    options: {
      type: Array,
      default: () => []
    },
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:value'],
  setup(props, { emit }) {
    console.log('DynamicListField setup - Props:', props);

    const updateValue = (event) => {
      console.log('Updating value:', event.target.value);
      emit('update:value', event.target.value);
    };

    onMounted(() => {
      console.log('DynamicListField mounted');
      console.log('Options received:', props.options);
    });

    return {
      updateValue
    };
  }
};
</script>

<style scoped>
.dynamic-list-field {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-bottom: 16px;
}

.field-label {
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.required-mark {
  color: #ff0000;
  margin-left: 4px;
}

.field-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: #fff;
}

.field-input:focus {
  outline: none;
  border-color: #4a90e2;
}

.field-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}
</style> 
