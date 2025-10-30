<template>
    <div class="filter-group">
        <div class="filter-group__header">
            <select
                class="filter-group__clause"
                :id="`clause-select-${group.id}`"
                :value="group.clause"
                @change="$emit('update-clause', { groupId: group.id, clause: $event.target.value })"
            >
                <option v-for="clause in clauses" :key="clause.value" :value="clause.value">{{ clause.label }}</option>
            </select>
            <button
                v-if="!isRoot"
                type="button"
                class="filter-group__remove"
                :style="removeButtonStyles"
                aria-label="Remover grupo"
                title="Delete"
                @click="$emit('remove-group', { groupId: group.id, parentId })"
            >
                <span class="material-symbols-outlined" aria-hidden="true">delete</span>
            </button>
        </div>
        <div class="filter-group__items">
            <div v-for="item in group.conditions" :key="item.id" class="filter-group__item">
                <div v-if="item.type === 'condition'" class="filter-condition">
                    <select
                        class="filter-condition__field"
                        :value="item.field"
                        @change="$emit('update-condition', {
                            groupId: group.id,
                            conditionId: item.id,
                            key: 'field',
                            value: $event.target.value,
                        })"
                    >
                        <option v-if="!fields.length" value="">Select field</option>
                        <option v-for="field in fields" :key="field" :value="field">{{ field }}</option>
                    </select>
                    <select
                        class="filter-condition__operator"
                        :value="item.operator"
                        @change="$emit('update-condition', {
                            groupId: group.id,
                            conditionId: item.id,
                            key: 'operator',
                            value: $event.target.value,
                        })"
                    >
                        <option v-for="operator in operators" :key="operator.value" :value="operator.value">
                            {{ operator.label }}
                        </option>
                    </select>
                    <input
                        v-if="requiresValue(item.operator)"
                        type="text"
                        class="filter-condition__value"
                        :value="item.value"
                        placeholder="Enter value"
                        @input="$emit('update-condition', {
                            groupId: group.id,
                            conditionId: item.id,
                            key: 'value',
                            value: $event.target.value,
                        })"
                    />
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
                <FilterGroup
                    v-else
                    :group="item"
                    :fields="fields"
                    :operators="operators"
                    :clauses="clauses"
                    :is-root="false"
                    :parent-id="group.id"
                    :action-button-background-color="actionButtonBackgroundColor"
                    :action-button-text-color="actionButtonTextColor"
                    :action-button-hover-background-color="actionButtonHoverBackgroundColor"
                    :action-button-hover-text-color="actionButtonHoverTextColor"
                    :remove-button-text-color="removeButtonTextColor"
                    @add-condition="$emit('add-condition', $event)"
                    @add-group="$emit('add-group', $event)"
                    @remove-condition="$emit('remove-condition', $event)"
                    @remove-group="$emit('remove-group', $event)"
                    @update-condition="$emit('update-condition', $event)"
                    @update-clause="$emit('update-clause', $event)"
                />
            </div>
        </div>
        <div class="filter-group__actions">
            <button
                type="button"
                class="filter-group__action"
                :style="actionButtonStyles"
                @click="$emit('add-condition', { groupId: group.id })"
            >
                + Add condition
            </button>
            <button
                type="button"
                class="filter-group__action"
                :style="actionButtonStyles"
                @click="$emit('add-group', { groupId: group.id })"
            >
                + Add group
            </button>
        </div>
    </div>
</template>

<script>
export default {
    name: 'FilterGroup',
    props: {
        group: { type: Object, required: true },
        fields: { type: Array, required: true },
        operators: { type: Array, required: true },
        clauses: { type: Array, required: true },
        isRoot: { type: Boolean, default: false },
        parentId: { type: String, default: null },
        actionButtonBackgroundColor: { type: String, default: '#2563eb' },
        actionButtonTextColor: { type: String, default: '#ffffff' },
        actionButtonHoverBackgroundColor: { type: String, default: '#1d4ed8' },
        actionButtonHoverTextColor: { type: String, default: '#ffffff' },
        removeButtonTextColor: { type: String, default: '#ef4444' },
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
                backgroundColor: this.actionButtonBackgroundColor,
                borderColor: this.actionButtonBackgroundColor,
                color: this.actionButtonTextColor,
                cursor: 'pointer',
                '--filter-group-action-hover-bg': this.actionButtonHoverBackgroundColor,
                '--filter-group-action-hover-color': this.actionButtonHoverTextColor,
            };
        },
        removeButtonStyles() {
            return {
                color: this.removeButtonTextColor,
            };
        },
    },
    methods: {
        requiresValue(operatorValue) {
            const operator = this.operators.find((item) => item.value === operatorValue);
            return operator ? operator.requiresValue !== false : true;
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

.filter-group__header {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.filter-group__label {
    font-weight: 600;
    font-size: 14px;
    color: #374151;
}

.filter-group__clause {
    min-width: 80px;
    padding: 6px 10px 6px 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background-color: #f9fafb;
    outline: 1px solid transparent;
}

.filter-group__remove {
    margin-left: auto;
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    font-size: 13px;
}

.filter-group__remove:hover {
    text-decoration: underline;
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
.filter-condition__operator,
.filter-condition__value {
    flex: 1 1 160px;
    padding: 6px 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    outline: 1px solid transparent;
}

.filter-condition__field,
.filter-condition__operator {
    padding-right: 10px;
}

.filter-group__clause:focus,
.filter-condition__field:focus,
.filter-condition__operator:focus,
.filter-condition__value:focus {
    border-color: #e0e0e0;
    outline: 1px solid transparent;
    box-shadow: none;
}

.filter-condition__value {
    flex-basis: 220px;
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
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.filter-group__action:hover {
    background-color: var(--filter-group-action-hover-bg, #1d4ed8);
    color: var(--filter-group-action-hover-color, #ffffff);
    border-color: var(--filter-group-action-hover-bg, #1d4ed8);
}
</style>
