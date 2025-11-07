<template>
    <div class="filter-group">
        <div class="filter-group__items">
            <div v-for="item in conditionItems" :key="item.id" class="filter-group__item">
                <div class="filter-condition">
                    <select
                        class="filter-condition__field"
                        :value="item.fieldId"
                        @change="onFieldChange(item, $event.target.value)"
                    >
                        <option
                            v-for="field in getAvailableFieldsForCondition(item)"
                            :key="field.id"
                            :value="field.id"
                        >
                            {{ field.label }}
                        </option>
                    </select>
                    <div v-if="shouldRenderValue(item)" class="filter-condition__value-wrapper">
                        <QueryMultiSelect
                            v-if="shouldUseCustomListSelect(item)"
                            class="filter-condition__value"
                            :model-value="normalizeListValue(item)"
                            :options="getFieldOptions(item.fieldId)"
                            :loading="isLoadingFieldOptions(item.fieldId)"
                            :placeholder="resolveListPlaceholder(item)"
                            :chip-background-color="actionButtonBackgroundColor"
                            :chip-text-color="actionButtonTextColor"
                            @update:modelValue="onMultiSelectValueChange(item, $event)"
                        />
                        <select
                            v-else-if="isControlledList(item)"
                            class="filter-condition__value"
                            :multiple="allowsMultipleSelection(item)"
                            :value="normalizeListValue(item)"
                            @change="onListValueChange(item, $event)"
                        >
                            <option v-if="isLoadingFieldOptions(item.fieldId)" disabled value="">
                                Carregando...
                            </option>
                            <option
                                v-for="option in getFieldOptions(item.fieldId)"
                                :key="`${item.fieldId}-${option.value}`"
                                :value="String(option.value)"
                                :selected="isOptionSelected(item, option.value)"
                            >
                                {{ option.label }}
                            </option>
                        </select>
                        <select
                            v-else-if="isBooleanField(item)"
                            class="filter-condition__value"
                            :value="normalizeBooleanValue(item.value)"
                            @change="onBooleanValueChange(item, $event.target.value)"
                        >
                            <option value="">Select value</option>
                            <option value="true">True</option>
                            <option value="false">False</option>
                        </select>
                        <CustomDatePicker
                            v-else-if="isDateLikeField(item)"
                            :model-value="normalizeDateValue(item)"
                            :show-time="isDateTimeField(item)"
                            class="filter-condition__value"
                            @update:modelValue="onDateValueChange(item, $event)"
                        />
                        <input
                            v-else
                            class="filter-condition__value"
                            :type="resolveInputType(item)"
                            :value="normalizeInputValue(item)"
                            :placeholder="resolvePlaceholder(item)"
                            @input="onInputValueChange(item, $event.target.value)"
                        />
                        <p v-if="hasFieldOptionsError(item.fieldId)" class="filter-condition__error">
                            {{ getFieldOptionsError(item.fieldId) }}
                        </p>
                    </div>
                    <button
                        type="button"
                        class="filter-condition__remove"
                        :style="removeButtonStyles"
                        aria-label="Remover condição"
                        title="Delete"
                        @click="$emit('remove-condition', { groupId: group.id, conditionId: item.id })"
                    >
                        <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                    </button>
                </div>
            </div>
        </div>
        <div class="filter-group__actions">
            <button
                type="button"
                class="filter-group__action"
                :style="actionButtonStyles"
                :disabled="isAddButtonDisabled"
                :aria-disabled="isAddButtonDisabled ? 'true' : 'false'"
                @click="$emit('add-condition', { groupId: group.id })"
            >
                + Add new line
            </button>
        </div>
    </div>
</template>

<script>
import CustomDatePicker from './CustomDatePicker.vue';
import QueryMultiSelect from './QueryMultiSelect.vue';

export default {
    name: 'FieldsCriteriaList',
    components: {
        CustomDatePicker,
        QueryMultiSelect,
    },
    props: {
        group: { type: Object, required: true },
        fields: { type: Array, required: true },
        actionButtonBackgroundColor: { type: String, default: '#2563eb' },
        actionButtonTextColor: { type: String, default: '#ffffff' },
        actionButtonHoverBackgroundColor: { type: String, default: '#1d4ed8' },
        actionButtonHoverTextColor: { type: String, default: '#ffffff' },
        removeButtonTextColor: { type: String, default: '#ef4444' },
        getFieldDefinition: { type: Function, required: true },
        getOperatorDefinition: { type: Function, required: true },
        getFieldOptionsState: { type: Function, required: true },
        ensureFieldOptionsLoaded: { type: Function, default: null },
    },
    emits: ['add-condition', 'remove-condition', 'update-condition'],
    computed: {
        actionButtonStyles() {
            const disabled = this.isAddButtonDisabled;
            return {
                cursor: disabled ? 'not-allowed' : 'pointer',
                '--filter-group-action-bg': this.actionButtonBackgroundColor,
                '--filter-group-action-color': this.actionButtonTextColor,
                '--filter-group-action-border': this.actionButtonBackgroundColor,
                '--filter-group-action-hover-bg': this.actionButtonHoverBackgroundColor,
                '--filter-group-action-hover-color': this.actionButtonHoverTextColor,
                ...(disabled
                    ? {
                          opacity: '0.6',
                      }
                    : {}),
            };
        },
        removeButtonStyles() {
            return {
                color: this.removeButtonTextColor,
            };
        },
        conditionItems() {
            if (!this.group || !Array.isArray(this.group.conditions)) {
                return [];
            }
            return this.group.conditions.filter((item) => item && item.type === 'condition');
        },
        isAddButtonDisabled() {
            if (!Array.isArray(this.fields) || !this.fields.length) {
                return true;
            }
            const normalize = this.normalizeFieldId;
            const usedFieldIds = new Set(
                this.conditionItems
                    .map((item) => normalize(item?.fieldId))
                    .filter((fieldId) => Boolean(fieldId)),
            );
            const hasUnusedField = this.fields.some((field) => {
                if (!field || typeof field !== 'object') {
                    return false;
                }
                const normalizedFieldId = normalize(field.id);
                if (!normalizedFieldId) {
                    return false;
                }
                return !usedFieldIds.has(normalizedFieldId);
            });
            return !hasUnusedField;
        },
    },
    methods: {
        normalizeFieldId(value) {
            if (value === null || value === undefined) {
                return '';
            }
            return String(value);
        },
        getAvailableFieldsForCondition(condition) {
            if (!Array.isArray(this.fields)) {
                return [];
            }
            const normalize = this.normalizeFieldId;
            const usedFieldIds = new Set(
                this.conditionItems
                    .filter((item) => item && item.id !== condition.id && item.fieldId)
                    .map((item) => normalize(item.fieldId)),
            );
            return this.fields.filter((field) => {
                if (!field || typeof field !== 'object') {
                    return false;
                }
                if (!field.id) {
                    return false;
                }
                const normalizedFieldId = normalize(field.id);
                const normalizedConditionFieldId = normalize(condition.fieldId);
                if (normalizedConditionFieldId && normalizedFieldId === normalizedConditionFieldId) {
                    return true;
                }
                return !usedFieldIds.has(normalizedFieldId);
            });
        },
        onFieldChange(condition, newFieldId) {
            const normalize = this.normalizeFieldId;
            const matchedField = this.fields.find(
                (field) => normalize(field?.id) === normalize(newFieldId),
            );
            const valueToEmit = matchedField?.id ?? newFieldId;
            this.$emit('update-condition', {
                groupId: this.group.id,
                conditionId: condition.id,
                key: 'fieldId',
                value: valueToEmit,
            });
            if (typeof this.ensureFieldOptionsLoaded === 'function' && valueToEmit) {
                this.ensureFieldOptionsLoaded(valueToEmit);
            }
        },
        onInputValueChange(condition, value) {
            this.$emit('update-condition', {
                groupId: this.group.id,
                conditionId: condition.id,
                key: 'value',
                value,
            });
        },
        onBooleanValueChange(condition, rawValue) {
            let value = null;
            if (rawValue === 'true') {
                value = true;
            } else if (rawValue === 'false') {
                value = false;
            } else {
                value = '';
            }
            this.onInputValueChange(condition, value);
        },
        onListValueChange(condition, event) {
            const allowMultiple = this.allowsMultipleSelection(condition);
            if (allowMultiple) {
                const selected = Array.from(event.target.selectedOptions || []).map((option) => option.value);
                this.onInputValueChange(condition, selected);
            } else {
                this.onInputValueChange(condition, event.target.value);
            }
        },
        onMultiSelectValueChange(condition, values) {
            this.onInputValueChange(condition, values);
        },
        onDateValueChange(condition, value) {
            this.onInputValueChange(condition, value || '');
        },
        shouldRenderValue(condition) {
            const operator = this.getOperatorDefinition(condition.fieldId);
            if (!operator) {
                return true;
            }
            return operator.requiresValue !== false;
        },
        allowsMultipleSelection(condition) {
            const operator = this.getOperatorDefinition(condition.fieldId);
            if (this.isMultiSelectionField(condition)) {
                return true;
            }
            return Boolean(operator && operator.valueShape === 'array');
        },
        isControlledList(condition) {
            const field = this.getFieldDefinition(condition.fieldId);
            if (!field) {
                return false;
            }
            const normalizedType = String(field.type || '').toUpperCase();
            if (
                normalizedType === 'CONTROLLED_LIST' ||
                normalizedType === 'LIST' ||
                normalizedType === 'SIMPLE_LIST' ||
                normalizedType === 'MULTISELECTION'
            ) {
                if (typeof this.ensureFieldOptionsLoaded === 'function' && field.id) {
                    const state = this.getFieldOptionsState(field.id);
                    if (!state?.loaded && !state?.loading) {
                        this.ensureFieldOptionsLoaded(field.id);
                    }
                }
                return true;
            }
            return false;
        },
        isBooleanField(condition) {
            const field = this.getFieldDefinition(condition.fieldId);
            const normalizedType = String(field?.type || '').toUpperCase();
            return normalizedType === 'BOOLEAN';
        },
        isDateLikeField(condition) {
            const field = this.getFieldDefinition(condition.fieldId);
            const normalizedType = String(field?.type || '').toUpperCase();
            return normalizedType === 'DATE' || normalizedType === 'DATETIME' || normalizedType === 'DATE_TIME';
        },
        isDateTimeField(condition) {
            const field = this.getFieldDefinition(condition.fieldId);
            const normalizedType = String(field?.type || '').toUpperCase();
            return normalizedType === 'DATETIME' || normalizedType === 'DATE_TIME';
        },
        isMultiSelectionField(condition) {
            const field = this.getFieldDefinition(condition.fieldId);
            return String(field?.type || '').toUpperCase() === 'MULTISELECTION';
        },
        shouldUseCustomListSelect(condition) {
            return this.isControlledList(condition) && this.allowsMultipleSelection(condition);
        },
        resolvePlaceholder(condition) {
            const field = this.getFieldDefinition(condition.fieldId);
            return field?.placeholder || 'Enter value';
        },
        resolveListPlaceholder(condition) {
            const field = this.getFieldDefinition(condition.fieldId);
            return field?.placeholder || 'Selecione...';
        },
        resolveInputType(condition) {
            const field = this.getFieldDefinition(condition.fieldId);
            const normalizedType = String(field?.type || '').toUpperCase();
            switch (normalizedType) {
                case 'NUMBER':
                case 'NUMERIC':
                    return 'number';
                case 'DATE':
                    return 'date';
                case 'DATETIME':
                case 'DATE_TIME':
                    return 'datetime-local';
                case 'TIME':
                    return 'time';
                default:
                    return 'text';
            }
        },
        normalizeInputValue(condition) {
            const value = condition.value;
            const field = this.getFieldDefinition(condition.fieldId);
            const normalizedType = String(field?.type || '').toUpperCase();
            if (normalizedType === 'NUMBER' || normalizedType === 'NUMERIC') {
                return value === null || value === undefined ? '' : value;
            }
            if (this.isDateLikeField(condition)) {
                if (Array.isArray(value)) {
                    return value[0] ?? '';
                }
                return value ?? '';
            }
            return value ?? '';
        },
        normalizeBooleanValue(value) {
            if (value === true) {
                return 'true';
            }
            if (value === false) {
                return 'false';
            }
            return '';
        },
        normalizeDateValue(condition) {
            const field = this.getFieldDefinition(condition.fieldId);
            const normalizedType = String(field?.type || '').toUpperCase();
            if (normalizedType === 'DATE' || normalizedType === 'DATETIME' || normalizedType === 'DATE_TIME') {
                if (Array.isArray(condition.value)) {
                    return condition.value[0] ?? '';
                }
                return condition.value ?? '';
            }
            return this.normalizeInputValue(condition);
        },
        normalizeListValue(condition) {
            if (!condition) {
                return '';
            }
            const value = condition.value;
            const allowMultiple = this.allowsMultipleSelection(condition);
            if (allowMultiple) {
                if (Array.isArray(value)) {
                    return value.map((item) => String(item));
                }
                if (value === null || value === undefined || value === '') {
                    return [];
                }
                return [String(value)];
            }
            if (Array.isArray(value)) {
                return value.length ? String(value[0]) : '';
            }
            if (this.isMultiSelectionField(condition)) {
                if (value === null || value === undefined || value === '') {
                    return [];
                }
                return [String(value)];
            }
            if (value === null || value === undefined) {
                return this.allowsMultipleSelection(condition) ? [] : '';
            }
            return String(value);
        },
        isOptionSelected(condition, optionValue) {
            const normalized = this.normalizeListValue(condition);
            const stringValue = String(optionValue);
            if (Array.isArray(normalized)) {
                return normalized.includes(stringValue);
            }
            return normalized === stringValue;
        },
        getFieldOptions(fieldId) {
            const state = this.getFieldOptionsState(fieldId);
            return Array.isArray(state?.options) ? state.options : [];
        },
        isLoadingFieldOptions(fieldId) {
            const state = this.getFieldOptionsState(fieldId);
            return Boolean(state?.loading);
        },
        hasFieldOptionsError(fieldId) {
            const state = this.getFieldOptionsState(fieldId);
            return Boolean(state?.error);
        },
        getFieldOptionsError(fieldId) {
            const state = this.getFieldOptionsState(fieldId);
            return state?.error || '';
        },
    },
};
</script>

<style scoped>
.filter-group {
    border: 1px solid #d0d7de;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background-color: #ffffff;
}

.filter-group__items {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.filter-condition {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.filter-condition__field,
.filter-condition__value {
    padding: 0px 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    outline: 1px solid transparent;
    height:36px;
}

.filter-condition__field {
    padding-right: 10px;
}


.filter-condition__field:focus,
.filter-condition__value:focus {
    border-color: #e0e0e0;
    outline: 1px solid transparent;
    box-shadow: none;
}

.filter-condition__value-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 200px;
    flex: 1 1 220px;
}

.filter-condition__error {
    color: #ef4444;
    font-size: 12px;
    margin: 0;
}

.filter-condition__remove {
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    font-size: 13px;
}

.filter-condition__remove:hover {
    text-decoration: underline;
}

.filter-group__actions {
    display: flex;
    gap: 8px;
}

.filter-group__action {
    padding: 6px 12px;
    border: 1px solid var(--filter-group-action-border, transparent);
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
    background-color: var(--filter-group-action-bg, #2563eb);
    color: var(--filter-group-action-color, #ffffff);
}

.filter-group__action:not([disabled]):hover {
    background-color: var(--filter-group-action-hover-bg, #1d4ed8);
    color: var(--filter-group-action-hover-color, #ffffff);
    border-color: var(--filter-group-action-hover-bg, #1d4ed8);
}

.filter-group__action[disabled] {
    cursor: not-allowed;
    opacity: 0.6;
}

.filter-group__action[disabled]:hover {
    background-color: var(--filter-group-action-bg, #2563eb);
    color: var(--filter-group-action-color, #ffffff);
    border-color: var(--filter-group-action-border, transparent);
}
</style>
