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
        uid: { type: String, required: true },
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
    },
    emits: ['update:content:effect', 'update:content', 'element-event'],
    data() {
        return {
            localRootGroup: null,
            queryJsonVariable: null,
            queryStringVariable: null,
            setQueryJson: null,
            setQueryString: null,
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
        this.initializePublicVariables();
    },
    watch: {
        'content.rootGroup': {
            handler(newGroup) {
                this.onExternalRootGroupChange(newGroup);
            },
            deep: true,
        },
        'content.initialQueryJson': {
            handler(newInitial) {
                this.onInitialQueryJsonChange(newInitial);
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
            const initialGroup = this.resolveInitialRootGroup();
            const normalized = this.normalizeGroup(initialGroup);
            this.localRootGroup = normalized;
            if (!this.groupsAreEqual(this.content.rootGroup, normalized)) {
                this.emitRootGroup(normalized);
            }
            this.syncPublicVariables(normalized);
        },
        onExternalRootGroupChange(newGroup) {
            const normalized = this.normalizeGroup(newGroup);
            if (!this.groupsAreEqual(normalized, this.localRootGroup)) {
                this.localRootGroup = normalized;
            }
            if (!this.groupsAreEqual(newGroup, normalized)) {
                this.emitRootGroup(normalized);
            }
            this.syncPublicVariables(normalized);
        },
        onInitialQueryJsonChange(newInitial) {
            const parsedInitial = this.parseInitialQuery(newInitial);
            if (parsedInitial === undefined) {
                return;
            }
            const normalized = this.normalizeGroup(parsedInitial);
            const nextPublicGroup = this.buildPublicGroup(normalized);
            const currentPublicGroup = this.buildPublicGroup(this.localRootGroup);
            if (this.groupsAreEqual(nextPublicGroup, currentPublicGroup)) {
                return;
            }
            this.updateRootGroup(normalized);
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
            this.syncPublicVariables(group);
        },
        resolveInitialRootGroup() {
            if (this.content?.rootGroup) {
                return this.content.rootGroup;
            }
            const parsedInitial = this.parseInitialQuery(this.content?.initialQueryJson);
            if (parsedInitial === undefined) {
                return null;
            }
            return parsedInitial || null;
        },
        initializePublicVariables() {
            if (typeof wwLib === 'undefined' || !wwLib?.wwVariable?.useComponentVariable) {
                return;
            }
            const uid = this.uid || this.wwElementState?.uid;
            if (!uid) {
                return;
            }
            const queryJsonVariable = wwLib.wwVariable.useComponentVariable({
                uid,
                name: 'queryJson',
                type: 'object',
                defaultValue: null,
                readonly: true,
            });
            const queryStringVariable = wwLib.wwVariable.useComponentVariable({
                uid,
                name: 'queryString',
                type: 'string',
                defaultValue: '',
                readonly: true,
            });
            this.queryJsonVariable = queryJsonVariable.value;
            this.setQueryJson = queryJsonVariable.setValue;
            this.queryStringVariable = queryStringVariable.value;
            this.setQueryString = queryStringVariable.setValue;
            this.syncPublicVariables(this.localRootGroup);
        },
        syncPublicVariables(group) {
            const setJson = this.setQueryJson;
            const setString = this.setQueryString;
            if (!setJson && !setString) {
                return;
            }
            if (!group) {
                setJson?.(null);
                setString?.('');
                return;
            }
            const payload = this.buildPublicGroup(group);
            setJson?.(payload);
            setString?.(this.buildQueryString(payload));
        },
        parseInitialQuery(initialQuery) {
            if (initialQuery === null || initialQuery === undefined || initialQuery === '') {
                return null;
            }
            let parsed = initialQuery;
            if (typeof initialQuery === 'string') {
                try {
                    parsed = JSON.parse(initialQuery);
                } catch (error) {
                    return undefined;
                }
            }
            if (!parsed || typeof parsed !== 'object') {
                return undefined;
            }
            const cloned = JSON.parse(JSON.stringify(parsed));
            if (cloned.type && cloned.type !== 'group') {
                return undefined;
            }
            if (!cloned.type) {
                cloned.type = 'group';
            }
            if (!Array.isArray(cloned.conditions)) {
                cloned.conditions = [];
            }
            return cloned;
        },
        buildPublicGroup(group) {
            if (!group || typeof group !== 'object') {
                return null;
            }
            const clause = this.isValidClause(group.clause) ? group.clause : 'AND';
            const conditions = Array.isArray(group.conditions)
                ? group.conditions
                      .map((item) => (item?.type === 'group' ? this.buildPublicGroup(item) : this.buildPublicCondition(item)))
                      .filter(Boolean)
                : [];
            return {
                type: 'group',
                clause,
                conditions,
            };
        },
        buildPublicCondition(condition) {
            if (!condition || typeof condition !== 'object') {
                return null;
            }
            const operator = this.isValidOperator(condition.operator)
                ? condition.operator
                : this.operatorOptions[0].value;
            const requiresValue = this.operatorRequiresValue(operator);
            const normalizedField = typeof condition.field === 'string' ? condition.field : '';
            const payload = {
                type: 'condition',
                field: normalizedField,
                operator,
            };
            if (requiresValue) {
                payload.value = condition.value ?? '';
            }
            return payload;
        },
        buildQueryString(node) {
            if (!node) {
                return '';
            }
            if (node.type === 'group') {
                const clause = this.isValidClause(node.clause) ? node.clause : 'AND';
                const parts = Array.isArray(node.conditions)
                    ? node.conditions.map((child) => this.buildQueryString(child)).filter((part) => part && part.length)
                    : [];
                if (!parts.length) {
                    return '';
                }
                if (parts.length === 1) {
                    return parts[0];
                }
                return `(${parts.join(` ${clause} `)})`;
            }
            if (node.type === 'condition') {
                const field = node.field || '';
                const operatorLabel = this.getOperatorLabel(node.operator);
                if (this.operatorRequiresValue(node.operator)) {
                    const value = node.value ?? '';
                    return `${field} ${operatorLabel} ${this.formatValueForQuery(value)}`.trim();
                }
                return `${field} ${operatorLabel}`.trim();
            }
            return '';
        },
        getOperatorLabel(operatorValue) {
            const operator = this.operatorOptions.find((item) => item.value === operatorValue);
            return operator ? operator.label : operatorValue || '';
        },
        formatValueForQuery(value) {
            if (value === null || value === undefined) {
                return '""';
            }
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            const escapedValue = stringValue.replace(/"/g, '\\"');
            return `"${escapedValue}"`;
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
