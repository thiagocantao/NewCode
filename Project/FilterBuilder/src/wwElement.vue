<template>
    <div class="filter-builder">
        <FilterGroup
            v-if="localRootGroup"
            :group="localRootGroup"
            :fields="availableFields"
            :operators="operatorOptions"
            :clauses="clauseOptions"
            :is-root="true"
            :action-button-background-color="actionButtonBackgroundColor"
            :action-button-text-color="actionButtonTextColor"
            :remove-button-text-color="removeButtonTextColor"
            @add-condition="handleAddCondition"
            @add-group="handleAddGroup"
            @remove-condition="handleRemoveCondition"
            @remove-group="handleRemoveGroup"
            @update-condition="handleUpdateCondition"
            @update-clause="handleUpdateClause"
        />
        <div v-else class="filter-builder__empty">No filter configuration available.</div>
    </div>
</template>

<script>
import FilterGroup from './components/FilterGroup.vue';

const CLAUSE_OPTIONS = [
    { value: 'AND', label: 'AND' },
    { value: 'OR', label: 'OR' },
];

const OPERATOR_OPTIONS = [
    { value: 'equals', label: 'Equals', requiresValue: true },
    { value: 'not_equals', label: 'Does not equal', requiresValue: true },
    { value: 'contains', label: 'Contains', requiresValue: true },
    { value: 'not_contains', label: 'Does not contain', requiresValue: true },
    { value: 'is_empty', label: 'Is empty', requiresValue: false },
];

export default {
    name: 'FilterBuilder',
    components: { FilterGroup },
    props: {
        content: { type: Object, required: true },
        wwElementState: { type: Object, required: true },
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
    },
    emits: ['update:content:effect', 'update:content', 'element-event'],
    data() {
        return {
            localRootGroup: null,
        };
    },
    computed: {
        availableFields() {
            if (!this.content || !Array.isArray(this.content.fields)) {
                return [];
            }
            return this.content.fields.filter((field) => typeof field === 'string' && field.trim().length);
        },
        operatorOptions() {
            return OPERATOR_OPTIONS;
        },
        clauseOptions() {
            return CLAUSE_OPTIONS;
        },
        actionButtonBackgroundColor() {
            return (this.content && this.content.actionButtonBackgroundColor) || '#2563eb';
        },
        actionButtonTextColor() {
            return (this.content && this.content.actionButtonTextColor) || '#ffffff';
        },
        removeButtonTextColor() {
            return (this.content && this.content.removeButtonTextColor) || '#ef4444';
        },
    },
    created() {
        this.initializeRootGroup();
    },
    watch: {
        'content.rootGroup': {
            handler(newGroup) {
                this.onExternalRootGroupChange(newGroup);
            },
            deep: true,
        },
        availableFields(newFields, oldFields) {
            if (this.fieldsChanged(newFields, oldFields)) {
                this.onFieldsChange(newFields);
            }
        },
    },
    methods: {
        initializeRootGroup() {
            const normalized = this.normalizeGroup(this.content.rootGroup);
            this.localRootGroup = normalized;
            if (!this.groupsAreEqual(this.content.rootGroup, normalized)) {
                this.emitRootGroup(normalized);
            }
        },
        onExternalRootGroupChange(newGroup) {
            const normalized = this.normalizeGroup(newGroup);
            if (!this.groupsAreEqual(normalized, this.localRootGroup)) {
                this.localRootGroup = normalized;
            }
            if (!this.groupsAreEqual(newGroup, normalized)) {
                this.emitRootGroup(normalized);
            }
        },
        onFieldsChange(fields) {
            if (!this.localRootGroup) {
                return;
            }
            const updated = this.cloneGroup(this.localRootGroup);
            let changed = false;
            this.iterateConditions(updated, (condition) => {
                if (!fields.length) {
                    if (condition.field !== '') {
                        condition.field = '';
                        changed = true;
                    }
                } else if (!fields.includes(condition.field)) {
                    condition.field = fields[0];
                    changed = true;
                }
            });
            if (changed) {
                this.updateRootGroup(updated);
            }
        },
        handleAddCondition({ groupId }) {
            if (!this.localRootGroup) {
                return;
            }
            const updated = this.cloneGroup(this.localRootGroup);
            const targetGroup = this.findGroupById(updated, groupId);
            if (!targetGroup) {
                return;
            }
            targetGroup.conditions.push(this.createCondition());
            this.updateRootGroup(updated);
        },
        handleAddGroup({ groupId }) {
            if (!this.localRootGroup) {
                return;
            }
            const updated = this.cloneGroup(this.localRootGroup);
            const targetGroup = this.findGroupById(updated, groupId);
            if (!targetGroup) {
                return;
            }
            targetGroup.conditions.push(this.createGroup());
            this.updateRootGroup(updated);
        },
        handleRemoveCondition({ groupId, conditionId }) {
            if (!this.localRootGroup) {
                return;
            }
            const updated = this.cloneGroup(this.localRootGroup);
            const targetGroup = this.findGroupById(updated, groupId);
            if (!targetGroup) {
                return;
            }
            targetGroup.conditions = targetGroup.conditions.filter((item) => item.id !== conditionId);
            if (!targetGroup.conditions.length) {
                targetGroup.conditions.push(this.createCondition());
            }
            this.updateRootGroup(updated);
        },
        handleRemoveGroup({ groupId, parentId }) {
            if (!this.localRootGroup) {
                return;
            }
            const updated = this.cloneGroup(this.localRootGroup);
            const parentGroup = this.findGroupById(updated, parentId);
            if (!parentGroup) {
                return;
            }
            parentGroup.conditions = parentGroup.conditions.filter((item) => item.id !== groupId);
            if (!parentGroup.conditions.length) {
                parentGroup.conditions.push(this.createCondition());
            }
            this.updateRootGroup(updated);
        },
        handleUpdateClause({ groupId, clause }) {
            if (!this.isValidClause(clause)) {
                return;
            }
            const updated = this.cloneGroup(this.localRootGroup);
            const targetGroup = this.findGroupById(updated, groupId);
            if (!targetGroup) {
                return;
            }
            targetGroup.clause = clause;
            this.updateRootGroup(updated);
        },
        handleUpdateCondition({ groupId, conditionId, key, value }) {
            if (!['field', 'operator', 'value'].includes(key)) {
                return;
            }
            if (!this.localRootGroup) {
                return;
            }
            const updated = this.cloneGroup(this.localRootGroup);
            const targetGroup = this.findGroupById(updated, groupId);
            if (!targetGroup) {
                return;
            }
            const condition = targetGroup.conditions.find((item) => item.id === conditionId && item.type === 'condition');
            if (!condition) {
                return;
            }
            if (key === 'operator') {
                if (!this.isValidOperator(value)) {
                    return;
                }
                condition.operator = value;
                if (!this.operatorRequiresValue(value)) {
                    condition.value = '';
                }
            } else if (key === 'field') {
                condition.field = value;
            } else {
                condition.value = value;
            }
            this.updateRootGroup(updated);
        },
        updateRootGroup(group) {
            this.localRootGroup = group;
            this.emitRootGroup(group);
        },
        emitRootGroup(group) {
            this.$emit('update:content', { ...this.content, rootGroup: group });
            this.$emit('update:content:effect', { rootGroup: group });
        },
        normalizeGroup(group) {
            const clause = this.isValidClause(group?.clause) ? group.clause : 'AND';
            const normalizedGroup = {
                id: typeof group?.id === 'string' && group.id ? group.id : this.createId(),
                type: 'group',
                clause,
                conditions: [],
            };
            const items = Array.isArray(group?.conditions) ? group.conditions : [];
            items.forEach((item) => {
                if (item && item.type === 'group') {
                    normalizedGroup.conditions.push(this.normalizeGroup(item));
                } else {
                    normalizedGroup.conditions.push(this.normalizeCondition(item));
                }
            });
            if (!normalizedGroup.conditions.length) {
                normalizedGroup.conditions.push(this.createCondition());
            }
            return normalizedGroup;
        },
        normalizeCondition(condition = {}) {
            const safeCondition = condition && typeof condition === 'object' ? condition : {};
            const operator = this.isValidOperator(safeCondition.operator)
                ? safeCondition.operator
                : this.operatorOptions[0].value;
            const requiresValue = this.operatorRequiresValue(operator);
            let field = '';
            if (typeof safeCondition.field === 'string' && safeCondition.field.trim().length) {
                field = safeCondition.field;
            } else if (this.availableFields.length) {
                field = this.availableFields[0];
            }
            return {
                id:
                    typeof safeCondition.id === 'string' && safeCondition.id
                        ? safeCondition.id
                        : this.createId(),
                type: 'condition',
                field,
                operator,
                value: requiresValue ? safeCondition.value ?? '' : '',
            };
        },
        createCondition() {
            const defaultOperator = this.operatorOptions[0].value;
            return {
                id: this.createId(),
                type: 'condition',
                field: this.availableFields[0] || '',
                operator: defaultOperator,
                value: '',
            };
        },
        createGroup() {
            const group = {
                id: this.createId(),
                type: 'group',
                clause: 'AND',
                conditions: [],
            };
            group.conditions.push(this.createCondition());
            return group;
        },
        createId() {
            return `node_${Math.random().toString(36).slice(2, 10)}`;
        },
        cloneGroup(group) {
            if (!group) {
                return null;
            }
            return JSON.parse(JSON.stringify(group));
        },
        findGroupById(group, id) {
            if (!group) {
                return null;
            }
            if (group.id === id) {
                return group;
            }
            for (const item of group.conditions || []) {
                if (item && item.type === 'group') {
                    const match = this.findGroupById(item, id);
                    if (match) {
                        return match;
                    }
                }
            }
            return null;
        },
        iterateConditions(group, callback) {
            if (!group || !Array.isArray(group.conditions)) {
                return;
            }
            group.conditions.forEach((item) => {
                if (item.type === 'condition') {
                    callback(item);
                } else if (item.type === 'group') {
                    this.iterateConditions(item, callback);
                }
            });
        },
        operatorRequiresValue(operatorValue) {
            const operator = this.operatorOptions.find((item) => item.value === operatorValue);
            return operator ? operator.requiresValue !== false : true;
        },
        isValidOperator(value) {
            return this.operatorOptions.some((operator) => operator.value === value);
        },
        isValidClause(value) {
            return this.clauseOptions.some((clause) => clause.value === value);
        },
        groupsAreEqual(groupA, groupB) {
            const normalizedA = groupA === undefined ? null : groupA;
            const normalizedB = groupB === undefined ? null : groupB;
            return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
        },
        fieldsChanged(newFields, oldFields) {
            return JSON.stringify(newFields) !== JSON.stringify(oldFields);
        },
    },
};
</script>

<style scoped>
.filter-builder {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.filter-builder__empty {
    padding: 24px;
    border: 1px dashed #d1d5db;
    border-radius: 8px;
    text-align: center;
    color: #6b7280;
    background-color: #f9fafb;
}
</style>
