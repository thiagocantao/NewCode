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
            :action-button-hover-background-color="actionButtonHoverBackgroundColor"
            :action-button-hover-text-color="actionButtonHoverTextColor"
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
            publicVariableValues: {
                queryJson: null,
                queryString: '',
            },
            publicVariableSetters: {
                queryJson: null,
                queryString: null,
            },
            initialRootGroupSnapshot: null,
            unregisterResetAction: null,
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
        actionButtonHoverBackgroundColor() {
            return (this.content && this.content.actionButtonHoverBackgroundColor) || '#1d4ed8';
        },
        actionButtonHoverTextColor() {
            return (this.content && this.content.actionButtonHoverTextColor) || '#ffffff';
        },
        removeButtonTextColor() {
            return (this.content && this.content.removeButtonTextColor) || '#ef4444';
        },
    },
    created() {
        this.initializeRootGroup();
        this.initializePublicVariables();
        this.registerComponentActions();
    },
    beforeUnmount() {
        this.cleanupComponentActions();
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
        'wwElementState.props.initialQueryJson': {
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
            this.initialRootGroupSnapshot = this.cloneGroup(normalized);
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
            this.initialRootGroupSnapshot = this.cloneGroup(normalized);
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
            const parsedInitial = this.parseInitialQuery(this.getInitialQuerySource());
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
            this.publicVariableValues.queryJson =
                queryJsonVariable.value?.value ?? queryJsonVariable.value ?? null;
            this.publicVariableValues.queryString =
                queryStringVariable.value?.value ?? queryStringVariable.value ?? '';
            this.publicVariableSetters.queryJson = queryJsonVariable.setValue;
            this.publicVariableSetters.queryString = queryStringVariable.setValue;
            this.syncPublicVariables(this.localRootGroup);
        },
        syncPublicVariables(group) {
            let payload = null;
            let queryString = '';
            if (group) {
                payload = this.buildPublicGroup(group);
                queryString = this.buildQueryString(payload);
            }
            this.publicVariableValues.queryJson = payload;
            this.publicVariableValues.queryString = queryString;
            const setQueryJson = this.publicVariableSetters.queryJson;
            const setQueryString = this.publicVariableSetters.queryString;
            if (typeof setQueryJson === 'function') {
                setQueryJson(payload);
            }
            if (typeof setQueryString === 'function') {
                setQueryString(queryString);
            }
        },
        registerComponentActions() {
            const uid = this.uid || this.wwElementState?.uid;
            const handler = () => {
                this.resetFilterBuilder();
            };
            this.cleanupComponentActions();
            if (typeof wwLib !== 'undefined') {
                const useComponentAction =
                    wwLib?.wwElement?.useComponentAction || wwLib?.wwComponent?.useComponentAction;
                if (typeof useComponentAction === 'function' && uid) {
                    const actionPayload = {
                        uid,
                        name: 'resetFilterBuilder',
                        label: { en: 'Reset filter builder' },
                        onTrigger: handler,
                        handler,
                        action: handler,
                        icon: 'refresh',
                    };
                    const unregister = useComponentAction(actionPayload);
                    if (typeof unregister === 'function') {
                        this.unregisterResetAction = unregister;
                    } else if (unregister && typeof unregister.unsubscribe === 'function') {
                        this.unregisterResetAction = unregister.unsubscribe;
                    } else if (unregister && typeof unregister.remove === 'function') {
                        this.unregisterResetAction = unregister.remove;
                    } else if (unregister && typeof unregister.destroy === 'function') {
                        this.unregisterResetAction = unregister.destroy;
                    }
                }
            }
            this.$emit('element-event', {
                event: 'register-component-action',
                value: {
                    name: 'resetFilterBuilder',
                    label: { en: 'Reset filter builder' },
                    type: 'component',
                    onTrigger: handler,
                    handler,
                    action: handler,
                    icon: 'refresh',
                },
            });
        },
        cleanupComponentActions() {
            if (typeof this.unregisterResetAction === 'function') {
                this.unregisterResetAction();
            }
            this.unregisterResetAction = null;
        },
        resetFilterBuilder() {
            const targetGroup = this.getInitialGroupForReset();
            const normalizedTarget = targetGroup ? this.cloneGroup(targetGroup) : this.normalizeGroup(null);
            this.initialRootGroupSnapshot = this.cloneGroup(normalizedTarget);
            if (!this.groupsAreEqual(normalizedTarget, this.localRootGroup)) {
                this.updateRootGroup(normalizedTarget);
            } else {
                this.localRootGroup = normalizedTarget;
                this.emitRootGroup(normalizedTarget);
            }
        },
        getInitialGroupForReset() {
            const parsedInitial = this.parseInitialQuery(this.getInitialQuerySource());
            if (parsedInitial !== undefined && parsedInitial !== null) {
                return this.normalizeGroup(parsedInitial);
            }
            if (this.initialRootGroupSnapshot) {
                return this.cloneGroup(this.initialRootGroupSnapshot);
            }
            return null;
        },
        getInitialQuerySource() {
            if (this.wwElementState?.props && 'initialQueryJson' in this.wwElementState.props) {
                return this.wwElementState.props.initialQueryJson;
            }
            return this.content?.initialQueryJson;
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
                const clauseLabel = this.escapeHtml(clause);
                const parts = Array.isArray(node.conditions)
                    ? node.conditions.map((child) => this.buildQueryString(child)).filter((part) => part && part.length)
                    : [];
                if (!parts.length) {
                    return '';
                }
                if (parts.length === 1) {
                    return parts[0];
                }
                return `(${parts.join(` ${clauseLabel} `)})`;
            }
            if (node.type === 'condition') {
                const fieldHtml = this.formatFieldForQuery(node.field);
                const operatorLabel = this.escapeHtml(this.getOperatorLabel(node.operator));
                if (this.operatorRequiresValue(node.operator)) {
                    const valueHtml = this.formatValueForQuery(node.value);
                    return [fieldHtml, operatorLabel, valueHtml].filter(Boolean).join(' ');
                }
                return [fieldHtml, operatorLabel].filter(Boolean).join(' ');
            }
            return '';
        },
        getOperatorLabel(operatorValue) {
            const operator = this.operatorOptions.find((item) => item.value === operatorValue);
            return operator ? operator.label : operatorValue || '';
        },
        formatFieldForQuery(field) {
            if (typeof field !== 'string') {
                return '';
            }
            const normalizedField = field.trim();
            if (!normalizedField.length) {
                return '';
            }
            const escapedField = this.escapeHtml(normalizedField);
            return `<span style="color: blue;">${escapedField}</span>`;
        },
        formatValueForQuery(value) {
            if (value === null || value === undefined) {
                return '<span style="color: green;">""</span>';
            }
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            const displayValue = stringValue.replace(/"/g, '\\"');
            const escapedValue = this.escapeHtml(displayValue);
            return `<span style="color: green;">"${escapedValue}"</span>`;
        },
        escapeHtml(value) {
            if (value === null || value === undefined) {
                return '';
            }
            return String(value).replace(/[&<>"']/g, (char) => {
                switch (char) {
                    case '&':
                        return '&amp;';
                    case '<':
                        return '&lt;';
                    case '>':
                        return '&gt;';
                    case '"':
                        return '&quot;';
                    case "'":
                        return '&#39;';
                    default:
                        return char;
                }
            });
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
