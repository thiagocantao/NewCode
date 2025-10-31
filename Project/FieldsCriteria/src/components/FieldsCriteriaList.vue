<template>
    <div class="filter-group">
        <div class="filter-group__items">
            <div v-for="item in conditionItems" :key="item.id" class="filter-group__item">
                <div class="filter-condition">
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
                    <input
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
            </div>
        </div>
        <div class="filter-group__actions">
            <button
                type="button"
                class="filter-group__action"
                :style="actionButtonStyles"
                @click="$emit('add-condition', { groupId: group.id })"
            >
                + Add new line
            </button>
        </div>
    </div>
</template>

<script>
export default {
    name: 'FieldsCriteriaList',
    props: {
        group: { type: Object, required: true },
        fields: { type: Array, required: true },
        actionButtonBackgroundColor: { type: String, default: '#2563eb' },
        actionButtonTextColor: { type: String, default: '#ffffff' },
        actionButtonHoverBackgroundColor: { type: String, default: '#1d4ed8' },
        actionButtonHoverTextColor: { type: String, default: '#ffffff' },
        removeButtonTextColor: { type: String, default: '#ef4444' },
    },
    emits: ['add-condition', 'remove-condition', 'update-condition'],
    computed: {
        actionButtonStyles() {
            return {
                cursor: 'pointer',
                '--filter-group-action-bg': this.actionButtonBackgroundColor,
                '--filter-group-action-color': this.actionButtonTextColor,
                '--filter-group-action-border': this.actionButtonBackgroundColor,
                '--filter-group-action-hover-bg': this.actionButtonHoverBackgroundColor,
                '--filter-group-action-hover-color': this.actionButtonHoverTextColor,
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
    flex: 1 1 160px;
    padding: 6px 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    outline: 1px solid transparent;
}

.filter-condition__field {
    padding-right: 10px;
}

.filter-condition__value {
    flex-basis: 220px;
}

.filter-condition__field:focus,
.filter-condition__value:focus {
    border-color: #e0e0e0;
    outline: 1px solid transparent;
    box-shadow: none;
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

.filter-group__action:hover {
    background-color: var(--filter-group-action-hover-bg, #1d4ed8);
    color: var(--filter-group-action-hover-color, #ffffff);
    border-color: var(--filter-group-action-hover-bg, #1d4ed8);
}
</style>
