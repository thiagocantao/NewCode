<template>
    <div class="query-group">
        <div class="query-group__header">
            <select
                class="query-group__clause"
                :id="`clause-select-${group.id}`"
                :value="group.clause"
                @change="$emit('update-clause', { groupId: group.id, clause: $event.target.value })"
            >
                <option v-for="clause in clauses" :key="clause.value" :value="clause.value">{{ clause.label }}</option>
            </select>
            <button
                v-if="!isRoot"
                type="button"
                class="query-group__remove"
                :style="removeButtonStyles"
                aria-label="Remover grupo"
                title="Delete"
                @click="$emit('remove-group', { groupId: group.id, parentId })"
            >
                <span class="material-symbols-outlined" aria-hidden="true">delete</span>
            </button>
        </div>
        <div class="query-group__items">
            <div v-for="item in group.conditions" :key="item.id" class="query-group__item">
                <div v-if="item.type === 'condition'" class="query-condition">
                    <select
                        class="query-condition__field"
                        :value="item.fieldId"
                        @change="onFieldChange(item, $event.target.value)"
                    >
                        <option value="">Select field</option>
                        <option v-for="field in fields" :key="field.id" :value="field.id">{{ field.label }}</option>
                    </select>
                    <select
                        class="query-condition__operator"
                        :value="item.operator"
                        @change="onOperatorChange(item, $event.target.value)"
                    >
                        <option
                            v-for="operator in getOperatorsForCondition(item)"
                            :key="`${item.id}-${operator.value}`"
                            :value="operator.value"
                        >
                            {{ operator.label }}
                        </option>
                    </select>
                    <div v-if="shouldRenderValue(item)" class="query-condition__value-wrapper">
                        <template v-if="isRangeOperator(item)">
                            <div class="query-condition__value-range">
                                <template v-if="isDateLikeField(item)">
                                    <CustomDatePicker
                                        :model-value="getRangeValue(item, 0)"
                                        :show-time="isDateTimeField(item)"
                                        class="query-condition__value"
                                        @update:modelValue="onRangeDateValueChange(item, 0, $event)"
                                    />
                                </template>
                                <template v-else>
                                    <input
                                        class="query-condition__value"
                                        :type="resolveInputType(item)"
                                        :value="getRangeValue(item, 0)"
                                        :placeholder="resolvePlaceholder(item)"
                                        @input="onRangeValueChange(item, 0, $event.target.value)"
                                    />
                                </template>
                                <span class="query-condition__range-separator">e</span>
                                <template v-if="isDateLikeField(item)">
                                    <CustomDatePicker
                                        :model-value="getRangeValue(item, 1)"
                                        :show-time="isDateTimeField(item)"
                                        class="query-condition__value"
                                        @update:modelValue="onRangeDateValueChange(item, 1, $event)"
                                    />
                                </template>
                                <template v-else>
                                    <input
                                        class="query-condition__value"
                                        :type="resolveInputType(item)"
                                        :value="getRangeValue(item, 1)"
                                        :placeholder="resolvePlaceholder(item)"
                                        @input="onRangeValueChange(item, 1, $event.target.value)"
                                    />
                                </template>
                            </div>
                        </template>
                        <template v-else>
                            <select
                                v-if="isControlledList(item)"
                                class="query-condition__value"
                                :multiple="isMultiSelectionField(item) || isMultiValueOperator(item)"
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
                                >
                                    {{ option.label }}
                                </option>
                            </select>
                            <select
                                v-else-if="isBooleanField(item)"
                                class="query-condition__value"
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
                                class="query-condition__value"
                                @update:modelValue="onDateValueChange(item, $event)"
                            />
                            <input
                                v-else
                                class="query-condition__value"
                                :type="resolveInputType(item)"
                                :value="normalizeInputValue(item)"
                                :placeholder="resolvePlaceholder(item)"
                                @input="onInputValueChange(item, $event.target.value)"
                            />
                        </template>
                        <p v-if="hasFieldOptionsError(item.fieldId)" class="query-condition__error">
                            {{ getFieldOptionsError(item.fieldId) }}
                        </p>
                    </div>
                    <button
                        type="button"
                        class="query-condition__remove"
                        :style="removeButtonStyles"
                        aria-label="Remover condição"
                        title="Delete"
                        @click="$emit('remove-condition', { groupId: group.id, conditionId: item.id })"
                    >
                        <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                    </button>
                </div>
                <QueryGroup
                    v-else
                    :group="item"
                    :fields="fields"
                    :clauses="clauses"
                    :is-root="false"
                    :parent-id="group.id"
                    :action-button-background-color="actionButtonBackgroundColor"
                    :action-button-text-color="actionButtonTextColor"
                    :action-button-hover-background-color="actionButtonHoverBackgroundColor"
                    :action-button-hover-text-color="actionButtonHoverTextColor"
                    :remove-button-text-color="removeButtonTextColor"
                    :get-operators-for-field="getOperatorsForField"
                    :get-field-definition="getFieldDefinition"
                    :get-operator-definition="getOperatorDefinition"
                    :get-field-options-state="getFieldOptionsState"
                    :ensure-field-options-loaded="ensureFieldOptionsLoaded"
                    @add-condition="$emit('add-condition', $event)"
                    @add-group="$emit('add-group', $event)"
                    @remove-condition="$emit('remove-condition', $event)"
                    @remove-group="$emit('remove-group', $event)"
                    @update-condition="$emit('update-condition', $event)"
                    @update-clause="$emit('update-clause', $event)"
                />
            </div>
        </div>
        <div class="query-group__actions">
            <button
                type="button"
                class="query-group__action"
                :style="actionButtonStyles"
                @click="$emit('add-condition', { groupId: group.id })"
            >
                + Add condition
            </button>
            <button
                type="button"
                class="query-group__action"
                :style="actionButtonStyles"
                @click="$emit('add-group', { groupId: group.id })"
            >
                + Add group
            </button>
        </div>
    </div>
</template>

<script>
import CustomDatePicker from './CustomDatePicker.vue';

export default {
    name: 'QueryGroup',
    components: {
        CustomDatePicker,
    },
    props: {
        group: { type: Object, required: true },
        fields: { type: Array, required: true },
        clauses: { type: Array, required: true },
        isRoot: { type: Boolean, default: false },
        parentId: { type: String, default: null },
        actionButtonBackgroundColor: { type: String, default: '#2563eb' },
        actionButtonTextColor: { type: String, default: '#ffffff' },
        actionButtonHoverBackgroundColor: { type: String, default: '#1d4ed8' },
        actionButtonHoverTextColor: { type: String, default: '#ffffff' },
        removeButtonTextColor: { type: String, default: '#ef4444' },
        getOperatorsForField: { type: Function, required: true },
        getFieldDefinition: { type: Function, required: true },
        getOperatorDefinition: { type: Function, required: true },
        getFieldOptionsState: { type: Function, required: true },
        ensureFieldOptionsLoaded: { type: Function, default: null },
    },
    emits: [
        'add-condition',
        'add-group',
        'remove-condition',
        'remove-group',
        'update-condition',
        'update-clause',
    ],
    computed: {
        actionButtonStyles() {
            return {
                cursor: 'pointer',
                '--query-group-action-bg': this.actionButtonBackgroundColor,
                '--query-group-action-color': this.actionButtonTextColor,
                '--query-group-action-border': this.actionButtonBackgroundColor,
                '--query-group-action-hover-bg': this.actionButtonHoverBackgroundColor,
                '--query-group-action-hover-color': this.actionButtonHoverTextColor,
            };
        },
        removeButtonStyles() {
            return {
                color: this.removeButtonTextColor,
            };
        },
    },
    methods: {
        onFieldChange(condition, newFieldId) {
            this.$emit('update-condition', {
                groupId: this.group.id,
                conditionId: condition.id,
                key: 'fieldId',
                value: newFieldId,
            });
            if (typeof this.ensureFieldOptionsLoaded === 'function' && newFieldId) {
                this.ensureFieldOptionsLoaded(newFieldId);
            }
        },
        onOperatorChange(condition, newOperator) {
            this.$emit('update-condition', {
                groupId: this.group.id,
                conditionId: condition.id,
                key: 'operator',
                value: newOperator,
            });
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
            const operator = this.getOperatorDefinition(condition.fieldId, condition.operator);
            const allowMultiple =
                this.isMultiSelectionField(condition) || (operator && operator.valueShape === 'array');
            if (allowMultiple) {
                const selected = Array.from(event.target.selectedOptions || []).map((option) => option.value);
                this.onInputValueChange(condition, selected);
            } else {
                this.onInputValueChange(condition, event.target.value);
            }
        },
        getOperatorsForCondition(condition) {
            return this.getOperatorsForField(condition.fieldId);
        },
        shouldRenderValue(condition) {
            const operator = this.getOperatorDefinition(condition.fieldId, condition.operator);
            if (!operator) {
                return true;
            }
            return operator.requiresValue !== false;
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
        isRangeOperator(condition) {
            const operator = this.getOperatorDefinition(condition.fieldId, condition.operator);
            return Boolean(operator && operator.valueShape === 'range');
        },
        getRangeValue(condition, index) {
            if (!Array.isArray(condition.value)) {
                return '';
            }
            return condition.value[index] ?? '';
        },
        onRangeValueChange(condition, index, value) {
            const current = Array.isArray(condition.value) ? condition.value.slice() : ['', ''];
            while (current.length < 2) {
                current.push('');
            }
            current[index] = value;
            this.onInputValueChange(condition, current);
        },
        onRangeDateValueChange(condition, index, value) {
            this.onRangeValueChange(condition, index, value || '');
        },
        onDateValueChange(condition, value) {
            this.onInputValueChange(condition, value || '');
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
        resolvePlaceholder(condition) {
            const field = this.getFieldDefinition(condition.fieldId);
            return field?.placeholder || 'Enter value';
        },
        normalizeInputValue(condition) {
            const field = this.getFieldDefinition(condition.fieldId);
            const normalizedType = String(field?.type || '').toUpperCase();
            if (normalizedType === 'NUMBER' || normalizedType === 'NUMERIC') {
                return condition.value === null || condition.value === undefined ? '' : condition.value;
            }
            if (this.isDateLikeField(condition)) {
                if (Array.isArray(condition.value)) {
                    return condition.value[0] ?? '';
                }
                return condition.value ?? '';
            }
            return condition.value ?? '';
        },
        normalizeDateValue(condition) {
            if (!this.isDateLikeField(condition)) {
                return this.normalizeInputValue(condition);
            }
            if (Array.isArray(condition.value)) {
                return condition.value[0] ?? '';
            }
            return condition.value ?? '';
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
        isMultiValueOperator(condition) {
            const operator = this.getOperatorDefinition(condition.fieldId, condition.operator);
            return operator && operator.valueShape === 'array';
        },
        normalizeListValue(condition) {
            if (!condition) {
                return '';
            }
            const value = condition.value;
            if (Array.isArray(value)) {
                return value.map((item) => String(item));
            }
            if (this.isMultiSelectionField(condition)) {
                if (value === null || value === undefined || value === '') {
                    return [];
                }
                return [String(value)];
            }
            if (value === null || value === undefined) {
                return this.isMultiValueOperator(condition) ? [] : '';
            }
            return String(value);
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
.query-group {
    border: 1px solid #d0d7de;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background-color: #ffffff;
}

.query-group__header {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.query-group__clause {
    min-width: 80px;
    height: 36px;
    min-height: 36px;
    padding: 0 10px 0 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background-color: #f9fafb;
    outline: 1px solid transparent;
    box-sizing: border-box;
}

.query-group__remove {
    margin-left: auto;
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    font-size: 13px;
}

.query-group__remove:hover {
    text-decoration: underline;
}

.query-group__items {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.query-condition {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.query-condition__field,
.query-condition__operator,
.query-condition__value {
    padding: 0 8px;
    height: 36px;
    min-height: 36px;
    box-sizing: border-box;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    outline: 1px solid transparent;
}

.query-condition__field {
    flex: 0 1 auto;
    min-width: 140px;
    padding-right: 10px;
}

.query-condition__operator {
    flex: 0 1 auto;
    min-width: 120px;
    padding-right: 10px;
}

.query-condition__value {
    flex: 1 1 160px;
}

.query-group__clause:focus,
.query-condition__field:focus,
.query-condition__operator:focus,
.query-condition__value:focus {
    border-color: #e0e0e0;
    outline: 1px solid transparent;
    box-shadow: none;
}

.query-condition__value-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 200px;
    flex: 1 1 220px;
}

.query-condition__value-range {
    display: flex;
    align-items: center;
    gap: 8px;
}

.query-condition__range-separator {
    font-size: 12px;
    color: #6b7280;
}

.query-condition__error {
    color: #ef4444;
    font-size: 12px;
    margin: 0;
}

.query-condition__remove {
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    font-size: 13px;
}

.query-condition__remove:hover {
    text-decoration: underline;
}

.query-group__actions {
    display: flex;
    gap: 8px;
}

.query-group__action {
    padding: 6px 12px;
    border: 1px solid var(--query-group-action-border, transparent);
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
    background-color: var(--query-group-action-bg, #2563eb);
    color: var(--query-group-action-color, #ffffff);
}

.query-group__action:hover {
    background-color: var(--query-group-action-hover-bg, #1d4ed8);
    color: var(--query-group-action-hover-color, #ffffff);
    border-color: var(--query-group-action-hover-bg, #1d4ed8);
}
</style>
