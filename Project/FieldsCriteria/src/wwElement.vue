<template>
    <div class="filter-builder">
        <FieldsCriteriaList
            v-if="localRootGroup"
            :group="localRootGroup"
            :fields="availableFields"
            :action-button-background-color="actionButtonBackgroundColor"
            :action-button-text-color="actionButtonTextColor"
            :action-button-hover-background-color="actionButtonHoverBackgroundColor"
            :action-button-hover-text-color="actionButtonHoverTextColor"
            :remove-button-text-color="removeButtonTextColor"
            @add-condition="handleAddCondition"
            @remove-condition="handleRemoveCondition"
            @update-condition="handleUpdateCondition"
        />
        <div v-else class="filter-builder__empty">No filter configuration available.</div>
    </div>
</template>

<script>
import FieldsCriteriaList from './components/FieldsCriteriaList.vue';

const INITIAL_QUERY_VARIABLE_ID = '4b4cff47-4599-44d2-a788-0e31ef09ed9f';
const DEFAULT_CLAUSE = 'AND';
const DEFAULT_OPERATOR = 'equals';
const DEFAULT_OPERATOR_LABEL = 'Equals';

export default {
    name: 'FieldsCriteria',
    components: { FieldsCriteriaList },
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
            queryChangedVariable: null,
            setQueryChanged: null,
            globalInitialQuery: undefined,
            globalQueryUnsubscribe: null,
            initialPublicQuerySnapshot: null,
            localQueryChanged: false,
        };
    },
    computed: {
        availableFields() {
            if (!this.content || !Array.isArray(this.content.fields)) {
                return [];
            }
            return this.content.fields.filter((field) => typeof field === 'string' && field.trim().length);
        },
        resolvedInitialQueryInput() {
            return this.globalInitialQuery;
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
        this.initializeGlobalInitialQuery();
        this.initializeRootGroup();
        this.initializePublicVariables();
    },
    beforeDestroy() {
        this.teardownGlobalInitialQuery();
    },
    beforeUnmount() {
        this.teardownGlobalInitialQuery();
    },
    watch: {
        'content.rootGroup': {
            handler(newGroup) {
                this.onExternalRootGroupChange(newGroup);
            },
            deep: true,
        },
        resolvedInitialQueryInput: {
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
        getInitialQuerySource(override) {
            if (override !== undefined) {
                return override;
            }
            return this.resolvedInitialQueryInput;
        },
        initializeRootGroup() {
            const initialGroup = this.resolveInitialRootGroup();
            const normalized = this.normalizeGroup(initialGroup, {
                allowEmpty: !initialGroup || !Array.isArray(initialGroup?.conditions) || !initialGroup.conditions.length,
            });
            this.localRootGroup = normalized;
            this.captureInitialPublicQuery(normalized);
            if (!this.groupsAreEqual(this.content.rootGroup, normalized)) {
                this.emitRootGroup(normalized);
            }
            this.syncPublicVariables(normalized);
        },
        initializeGlobalInitialQuery() {
            this.updateGlobalInitialQuery();
            this.subscribeToGlobalInitialQuery();
        },
        updateGlobalInitialQuery() {
            const wwVariable = typeof window !== 'undefined' ? window?.wwLib?.wwVariable : undefined;
            if (!wwVariable) {
                this.globalInitialQuery = undefined;
                return;
            }
            try {
                const getValue = wwVariable?.getValue;
                const getComponentValue = wwVariable?.getComponentValue;
                const getFallback = wwVariable?.get;
                const value =
                    typeof getValue === 'function'
                        ? getValue.call(wwVariable, INITIAL_QUERY_VARIABLE_ID)
                        : typeof getComponentValue === 'function'
                        ? getComponentValue.call(wwVariable, INITIAL_QUERY_VARIABLE_ID)
                        : typeof getFallback === 'function'
                        ? getFallback.call(wwVariable, INITIAL_QUERY_VARIABLE_ID)
                        : undefined;
                if (value && typeof value === 'object') {
                    try {
                        this.globalInitialQuery = JSON.parse(JSON.stringify(value));
                    } catch (error) {
                        this.globalInitialQuery = value;
                    }
                } else if (value === undefined) {
                    this.globalInitialQuery = null;
                } else {
                    this.globalInitialQuery = value;
                }
            } catch (error) {
                console.warn('[FieldsCriteria] Failed to read initial query variable', error);
                this.globalInitialQuery = undefined;
            }
        },
        subscribeToGlobalInitialQuery() {
            const wwVariable = typeof window !== 'undefined' ? window?.wwLib?.wwVariable : undefined;
            if (!wwVariable || typeof wwVariable.subscribe !== 'function') {
                return;
            }
            try {
                this.globalQueryUnsubscribe = wwVariable.subscribe(INITIAL_QUERY_VARIABLE_ID, () => {
                    this.updateGlobalInitialQuery();
                });
            } catch (error) {
                console.warn('[FieldsCriteria] Failed to subscribe to initial query variable', error);
                this.globalQueryUnsubscribe = null;
            }
        },
        teardownGlobalInitialQuery() {
            if (typeof this.globalQueryUnsubscribe === 'function') {
                try {
                    this.globalQueryUnsubscribe();
                } catch (error) {
                    console.warn('[FieldsCriteria] Failed to unsubscribe initial query listener', error);
                }
            }
            this.globalQueryUnsubscribe = null;
        },
        onExternalRootGroupChange(newGroup) {
            const normalized = this.normalizeGroup(newGroup, {
                allowEmpty: !newGroup || !Array.isArray(newGroup?.conditions) || !newGroup.conditions.length,
            });
            if (!this.groupsAreEqual(normalized, this.localRootGroup)) {
                this.localRootGroup = normalized;
            }
            if (!this.groupsAreEqual(newGroup, normalized)) {
                this.emitRootGroup(normalized);
            }
            this.syncPublicVariables(normalized);
        },
        onInitialQueryJsonChange(newInitial) {
            const parsedInitial = this.parseInitialQuery(this.getInitialQuerySource(newInitial));
            if (parsedInitial === undefined) {
                return;
            }
            const normalized = this.normalizeGroup(parsedInitial, {
                allowEmpty:
                    parsedInitial === null || !Array.isArray(parsedInitial?.conditions) || !parsedInitial.conditions.length,
            });
            const nextPublicGroup = this.buildPublicGroup(normalized);
            const currentPublicGroup = this.buildPublicGroup(this.localRootGroup);
            if (this.groupsAreEqual(nextPublicGroup, currentPublicGroup)) {
                return;
            }
            this.captureInitialPublicQuery(normalized);
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
        handleUpdateCondition({ groupId, conditionId, key, value }) {
            if (!['field', 'value'].includes(key)) {
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
            if (key === 'field') {
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
            const existingGroup = this.content?.rootGroup;
            const existingHasConditions = Array.isArray(existingGroup?.conditions) && existingGroup.conditions.length > 0;

            const parsedInitial = this.parseInitialQuery(this.getInitialQuerySource());
            if (parsedInitial !== undefined) {
                const parsedHasConditions = Array.isArray(parsedInitial?.conditions) && parsedInitial.conditions.length > 0;
                if (parsedHasConditions || !existingHasConditions) {
                    return parsedInitial || null;
                }
            }

            if (existingHasConditions) {
                return existingGroup;
            }

            if (parsedInitial === undefined) {
                return null;
            }

            return parsedInitial || existingGroup || null;
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
            const queryChangedVariable = wwLib.wwVariable.useComponentVariable({
                uid,
                name: 'queryChanged',
                type: 'boolean',
                defaultValue: false,
                readonly: true,
            });
            this.queryJsonVariable = queryJsonVariable.value;
            this.setQueryJson = queryJsonVariable.setValue;
            this.queryStringVariable = queryStringVariable.value;
            this.setQueryString = queryStringVariable.setValue;
            this.queryChangedVariable = queryChangedVariable.value;
            this.setQueryChanged = queryChangedVariable.setValue;
            this.syncPublicVariables(this.localRootGroup);
        },
        syncPublicVariables(group) {
            const setJson = this.setQueryJson;
            const setString = this.setQueryString;
            const payload = this.buildPublicGroup(group);
            if (!group || !this.hasActiveConditions(group) || !payload) {
                setJson?.(null);
                setString?.('');
                this.updateQueryChangedVariable(group, payload);
                return;
            }
            setJson?.(payload);
            setString?.(this.buildQueryString(payload));
            this.updateQueryChangedVariable(group, payload);
        },
        captureInitialPublicQuery(group) {
            const payload = this.buildPublicGroup(group);
            this.initialPublicQuerySnapshot = this.serializePublicQueryPayload(payload);
            this.updateQueryChangedVariable(group, payload);
        },
        serializePublicQueryPayload(payload) {
            if (!payload) {
                return null;
            }
            try {
                return JSON.stringify(payload);
            } catch (error) {
                console.warn('[FieldsCriteria] Failed to serialize query payload', error);
                return null;
            }
        },
        updateQueryChangedVariable(group, payload) {
            const effectivePayload = payload === undefined ? this.buildPublicGroup(group) : payload;
            const serialized = this.serializePublicQueryPayload(effectivePayload);
            const changed = serialized !== this.initialPublicQuerySnapshot;
            this.localQueryChanged = Boolean(changed);
            const setQueryChanged = this.setQueryChanged;
            if (typeof setQueryChanged === 'function') {
                setQueryChanged(this.localQueryChanged);
            }
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
            const conditions = Array.isArray(group.conditions)
                ? group.conditions
                      .filter((item) => item?.type === 'condition')
                      .map((item) => this.buildPublicCondition(item))
                      .filter(Boolean)
                : [];
            if (!conditions.length) {
                return null;
            }
            return {
                type: 'group',
                clause: DEFAULT_CLAUSE,
                conditions,
            };
        },
        buildPublicCondition(condition) {
            if (!condition || typeof condition !== 'object') {
                return null;
            }
            const normalizedField = typeof condition.field === 'string' ? condition.field : '';
            return {
                type: 'condition',
                field: normalizedField,
                operator: DEFAULT_OPERATOR,
                value: condition.value ?? '',
            };
        },
        buildQueryString(node) {
            if (!node) {
                return '';
            }
            if (node.type === 'group') {
                const parts = Array.isArray(node.conditions)
                    ? node.conditions
                          .filter((child) => child?.type === 'condition')
                          .map((child) => this.buildQueryString(child))
                          .filter((part) => part && part.length)
                    : [];
                return parts.join(` ${this.escapeHtml(DEFAULT_CLAUSE)} `);
            }
            if (node.type === 'condition') {
                const fieldHtml = this.formatFieldForQuery(node.field);
                const operatorLabel = this.escapeHtml(DEFAULT_OPERATOR_LABEL);
                const valueHtml = this.formatValueForQuery(node.value);
                return [fieldHtml, operatorLabel, valueHtml].filter(Boolean).join(' ');
            }
            return '';
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
        normalizeGroup(group, options = {}) {
            const allowEmpty = Boolean(options.allowEmpty);
            const normalizedGroup = {
                id: typeof group?.id === 'string' && group.id ? group.id : this.createId(),
                type: 'group',
                clause: DEFAULT_CLAUSE,
                conditions: [],
            };
            const collectConditions = (items) => {
                items.forEach((item) => {
                    if (item?.type === 'condition') {
                        normalizedGroup.conditions.push(this.normalizeCondition(item));
                    } else if (item?.type === 'group' && Array.isArray(item.conditions)) {
                        collectConditions(item.conditions);
                    }
                });
            };
            const items = Array.isArray(group?.conditions) ? group.conditions : [];
            collectConditions(items);
            if (!normalizedGroup.conditions.length && !allowEmpty) {
                normalizedGroup.conditions.push(this.createCondition());
            }
            return normalizedGroup;
        },
        normalizeCondition(condition = {}) {
            const safeCondition = condition && typeof condition === 'object' ? condition : {};
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
                operator: DEFAULT_OPERATOR,
                value: safeCondition.value ?? '',
            };
        },
        createCondition() {
            return {
                id: this.createId(),
                type: 'condition',
                field: this.availableFields[0] || '',
                operator: DEFAULT_OPERATOR,
                value: '',
            };
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
                }
            });
        },
        groupsAreEqual(groupA, groupB) {
            const normalizedA = groupA === undefined ? null : groupA;
            const normalizedB = groupB === undefined ? null : groupB;
            return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
        },
        fieldsChanged(newFields, oldFields) {
            return JSON.stringify(newFields) !== JSON.stringify(oldFields);
        },
        resetFilters() {
            const initialSource = this.getInitialQuerySource();
            const parsedInitial = this.parseInitialQuery(initialSource);
            const allowEmpty =
                parsedInitial === undefined ||
                parsedInitial === null ||
                !Array.isArray(parsedInitial?.conditions) ||
                !parsedInitial.conditions.length;
            const normalized = this.normalizeGroup(parsedInitial === undefined ? null : parsedInitial, { allowEmpty });
            this.updateRootGroup(normalized);
        },
        hasActiveConditions(node) {
            if (!node || typeof node !== 'object') {
                return false;
            }
            if (node.type === 'group' && Array.isArray(node.conditions)) {
                return node.conditions.some((child) => child?.type === 'condition');
            }
            if (node.type === 'condition') {
                return true;
            }
            return false;
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
