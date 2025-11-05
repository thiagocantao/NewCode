<template>
    <div class="query-builder">
        <QueryGroup
            v-if="localRootGroup"
            :group="localRootGroup"
            :fields="normalizedFields"
            :clauses="clauseOptions"
            :is-root="true"
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
            @add-condition="handleAddCondition"
            @add-group="handleAddGroup"
            @remove-condition="handleRemoveCondition"
            @remove-group="handleRemoveGroup"
            @update-condition="handleUpdateCondition"
            @update-clause="handleUpdateClause"
        />
        <div v-else class="query-builder__empty">No query configuration available.</div>
    </div>
</template>

<script>
import QueryGroup from './components/QueryGroup.vue';
import {
    normalizeFieldDataSource,
    hasFetchableDataSource,
    fetchDataSourceOptions,
    mapOptionsFromData,
} from './components/dataSource';

const INITIAL_QUERY_VARIABLE_ID = '4b4cff47-4599-44d2-a788-0e31ef09ed9f';

const CLAUSE_OPTIONS = [
    { value: 'AND', label: 'AND' },
    { value: 'OR', label: 'OR' },
];

const OPERATOR_METADATA = {
    '=': { label: '=', requiresValue: true },
    '<>': { label: '≠', requiresValue: true },
    IN: { label: 'In', requiresValue: true, valueShape: 'array' },
    NOT_IN: { label: 'Not in', requiresValue: true, valueShape: 'array' },
    IS_NULL: { label: 'Is null', requiresValue: false, valueShape: 'none' },
    IS_NOT_NULL: { label: 'Is not null', requiresValue: false, valueShape: 'none' },
    CONTAINS: { label: 'Contains', requiresValue: true },
    NOT_CONTAINS: { label: 'Does not contain', requiresValue: true },
    STARTS_WITH: { label: 'Starts with', requiresValue: true },
    ENDS_WITH: { label: 'Ends with', requiresValue: true },
    '>': { label: 'Greater than', requiresValue: true },
    '>=': { label: 'Greater or equal', requiresValue: true },
    '<': { label: 'Less than', requiresValue: true },
    '<=': { label: 'Less or equal', requiresValue: true },
    BETWEEN: { label: 'Between', requiresValue: true, valueShape: 'range' },
};

const DEFAULT_OPERATORS_BY_TYPE = {
    CONTROLLED_LIST: ['=', '<>', 'IN', 'NOT_IN', 'IS_NULL', 'IS_NOT_NULL'],
    LIST: ['=', '<>', 'IN', 'NOT_IN', 'IS_NULL', 'IS_NOT_NULL'],
    SIMPLE_LIST: ['=', '<>', 'IN', 'NOT_IN', 'IS_NULL', 'IS_NOT_NULL'],
    MULTISELECTION: ['IN', 'NOT_IN', 'IS_NULL', 'IS_NOT_NULL'],
    TEXT: ['=', '<>', 'CONTAINS', 'NOT_CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'IS_NULL', 'IS_NOT_NULL'],
    STRING: ['=', '<>', 'CONTAINS', 'NOT_CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'IS_NULL', 'IS_NOT_NULL'],
    NUMBER: ['=', '<>', '>', '>=', '<', '<=', 'BETWEEN', 'IS_NULL', 'IS_NOT_NULL'],
    NUMERIC: ['=', '<>', '>', '>=', '<', '<=', 'BETWEEN', 'IS_NULL', 'IS_NOT_NULL'],
    DATE: ['=', '<>', '>', '>=', '<', '<=', 'BETWEEN', 'IS_NULL', 'IS_NOT_NULL'],
    DATETIME: ['=', '<>', '>', '>=', '<', '<=', 'BETWEEN', 'IS_NULL', 'IS_NOT_NULL'],
    DATE_TIME: ['=', '<>', '>', '>=', '<', '<=', 'BETWEEN', 'IS_NULL', 'IS_NOT_NULL'],
    TIME: ['=', '<>', '>', '>=', '<', '<=', 'BETWEEN', 'IS_NULL', 'IS_NOT_NULL'],
    BOOLEAN: ['=', '<>', 'IS_NULL', 'IS_NOT_NULL'],
};

function normalizeOption(option) {
    if (!option) {
        return null;
    }
    if (typeof option !== 'object') {
        return { value: option, label: String(option) };
    }
    const value = option.value ?? option.Value ?? option.id ?? option.ID;
    const label = option.label ?? option.Label ?? option.name ?? option.Name;
    if (value === undefined || label === undefined) {
        return null;
    }
    return { value, label };
}

function extractStaticOptions(field) {
    const candidates =
        field?.options ??
        field?.Options ??
        field?.list_options ??
        field?.listOptions ??
        field?.ListOptions ??
        [];
    if (!Array.isArray(candidates)) {
        return [];
    }
    return candidates.map(normalizeOption).filter(Boolean);
}

function normalizeFieldDefinition(field, index) {
    if (!field || typeof field !== 'object') {
        return null;
    }
    const id =
        (typeof field.ID === 'string' && field.ID.trim().length && field.ID) ||
        (typeof field.id === 'string' && field.id.trim().length && field.id) ||
        `field_${index}`;
    const fieldTagControl =
        (typeof field.FieldTagControl === 'string' && field.FieldTagControl.trim().length && field.FieldTagControl) ||
        (typeof field.fieldTagControl === 'string' && field.fieldTagControl.trim().length && field.fieldTagControl) ||
        null;
    const label =
        (typeof field.Name === 'string' && field.Name.trim().length && field.Name) ||
        (typeof field.name === 'string' && field.name.trim().length && field.name) ||
        id;
    const typeRaw = field.Type ?? field.type ?? 'TEXT';
    const type = typeof typeRaw === 'string' ? typeRaw.toUpperCase() : 'TEXT';
    const operators = Array.isArray(field.Operators ?? field.operators)
        ? (field.Operators ?? field.operators)
              .filter((item) => typeof item === 'string' && item.trim().length)
              .map((item) => item.trim().toUpperCase())
        : null;
    const dataSource = field.DataSource ?? field.dataSource ?? null;
    const staticOptions = extractStaticOptions(field);
    return {
        id,
        fieldTagControl,
        label,
        type,
        operators,
        dataSource,
        placeholder: field.Placeholder ?? field.placeholder ?? null,
        format: field.Format ?? field.format ?? null,
        staticOptions,
        raw: field,
    };
}

export default {
    name: 'QueryBuilder',
    components: { QueryGroup },
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
            globalInitialQuery: undefined,
            globalQueryUnsubscribe: null,
            fieldOptionsState: {},
        };
    },
    computed: {
        normalizedFields() {
            if (!Array.isArray(this.content?.fieldsConfig)) {
                return [];
            }
            return this.content.fieldsConfig
                .map((field, index) => normalizeFieldDefinition(field, index))
                .filter(Boolean);
        },
        fieldsMap() {
            return this.normalizedFields.reduce((map, field) => {
                map[field.id] = field;
                return map;
            }, {});
        },
        fieldsByTag() {
            return this.normalizedFields.reduce((map, field) => {
                if (typeof field.fieldTagControl === 'string' && field.fieldTagControl.trim().length) {
                    map[field.fieldTagControl] = field;
                }
                return map;
            }, {});
        },
        resolvedInitialQueryInput() {
            return this.globalInitialQuery;
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
        this.refreshFieldOptionsState(this.normalizedFields);
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
        normalizedFields: {
            handler(newFields, oldFields) {
                this.refreshFieldOptionsState(newFields, oldFields);
                this.onFieldsChange(newFields, oldFields);
            },
            deep: true,
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
                allowEmpty:
                    !initialGroup || !Array.isArray(initialGroup?.conditions) || !initialGroup.conditions.length,
            });
            this.localRootGroup = normalized;
            this.primeFieldOptionsForGroup(normalized);
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
                console.warn('[QueryBuilder] Failed to read initial query variable', error);
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
                console.warn('[QueryBuilder] Failed to subscribe to initial query variable', error);
                this.globalQueryUnsubscribe = null;
            }
        },
        teardownGlobalInitialQuery() {
            if (typeof this.globalQueryUnsubscribe === 'function') {
                try {
                    this.globalQueryUnsubscribe();
                } catch (error) {
                    console.warn('[QueryBuilder] Failed to unsubscribe from initial query variable', error);
                }
            }
            this.globalQueryUnsubscribe = null;
        },
        onExternalRootGroupChange(newGroup) {
            if (this.groupsAreEqual(newGroup, this.localRootGroup)) {
                return;
            }
            const normalized = this.normalizeGroup(newGroup, {
                allowEmpty: !Array.isArray(newGroup?.conditions) || !newGroup.conditions.length,
            });
            this.localRootGroup = normalized;
            this.primeFieldOptionsForGroup(normalized);
            this.syncPublicVariables(normalized);
        },
        onInitialQueryJsonChange(newInitial) {
            const parsedInitial = this.parseInitialQuery(this.getInitialQuerySource(newInitial));
            if (parsedInitial === undefined) {
                return;
            }
            const normalized = this.normalizeGroup(parsedInitial, {
                allowEmpty:
                    parsedInitial === null ||
                    !Array.isArray(parsedInitial?.conditions) ||
                    !parsedInitial.conditions.length,
            });
            const nextPublicGroup = this.buildPublicGroup(normalized);
            const currentPublicGroup = this.buildPublicGroup(this.localRootGroup);
            if (this.groupsAreEqual(nextPublicGroup, currentPublicGroup)) {
                return;
            }
            this.updateRootGroup(normalized);
        },
        onFieldsChange(newFields, oldFields = []) {
            if (!this.localRootGroup) {
                return;
            }
            const updated = this.cloneGroup(this.localRootGroup);
            let changed = false;
            const availableIds = newFields.map((field) => field.id);
            const defaultFieldId = availableIds[0] || '';
            this.iterateConditions(updated, (condition) => {
                if (!availableIds.length) {
                    if (condition.fieldId !== '') {
                        condition.fieldId = '';
                        condition.operator = this.resolveOperator('', condition.operator);
                        condition.value = this.normalizeInputValue('', condition.operator, condition.value);
                        changed = true;
                    }
                    return;
                }
                if (!availableIds.includes(condition.fieldId)) {
                    condition.fieldId = defaultFieldId;
                    condition.operator = this.resolveOperator(condition.fieldId, condition.operator);
                    condition.value = this.normalizeInputValue(
                        condition.fieldId,
                        condition.operator,
                        condition.value
                    );
                    this.ensureFieldOptionsLoaded(condition.fieldId);
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
            const newCondition = this.createCondition();
            targetGroup.conditions.push(newCondition);
            if (newCondition.fieldId) {
                this.ensureFieldOptionsLoaded(newCondition.fieldId);
            }
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
                const fallbackCondition = this.createCondition();
                targetGroup.conditions.push(fallbackCondition);
                if (fallbackCondition.fieldId) {
                    this.ensureFieldOptionsLoaded(fallbackCondition.fieldId);
                }
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
                const fallbackCondition = this.createCondition();
                parentGroup.conditions.push(fallbackCondition);
                if (fallbackCondition.fieldId) {
                    this.ensureFieldOptionsLoaded(fallbackCondition.fieldId);
                }
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
            if (!['fieldId', 'operator', 'value'].includes(key)) {
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
            const condition = targetGroup.conditions.find(
                (item) => item.id === conditionId && item.type === 'condition'
            );
            if (!condition) {
                return;
            }
            if (key === 'fieldId') {
                condition.fieldId = value || '';
                condition.operator = this.resolveOperator(condition.fieldId, condition.operator);
                condition.value = this.normalizeInputValue(
                    condition.fieldId,
                    condition.operator,
                    condition.value
                );
                if (condition.fieldId) {
                    this.ensureFieldOptionsLoaded(condition.fieldId);
                }
            } else if (key === 'operator') {
                const normalizedOperator = this.resolveOperator(condition.fieldId, value);
                condition.operator = normalizedOperator;
                condition.value = this.normalizeInputValue(
                    condition.fieldId,
                    normalizedOperator,
                    condition.value
                );
            } else {
                condition.value = this.normalizeInputValue(
                    condition.fieldId,
                    condition.operator,
                    value
                );
            }
            this.updateRootGroup(updated);
        },
        updateRootGroup(group) {
            this.primeFieldOptionsForGroup(group);
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
            if (!this.hasActiveConditions(group)) {
                setJson?.(null);
                setString?.('');
                return;
            }
            const payload = this.buildPublicGroup(group);
            if (!payload) {
                setJson?.(null);
                setString?.('');
                return;
            }
            setJson?.(payload);
            setString?.(this.buildQueryString(payload));
        },
        parseInitialQuery(initialQuery) {
            if (initialQuery === null || initialQuery === undefined || initialQuery === '') {
                return null;
            }
            if (typeof initialQuery === 'string') {
                try {
                    return JSON.parse(initialQuery);
                } catch (error) {
                    console.warn('[QueryBuilder] Failed to parse initial query JSON', error);
                    return undefined;
                }
            }
            if (typeof initialQuery === 'object') {
                return initialQuery;
            }
            return undefined;
        },
        buildPublicGroup(group) {
            if (!group || typeof group !== 'object') {
                return null;
            }
            const logic = this.isValidClause(group.clause) ? group.clause : 'AND';
            const conditions = Array.isArray(group.conditions)
                ? group.conditions
                      .map((item) =>
                          item?.type === 'group'
                              ? this.buildPublicGroup(item)
                              : this.buildPublicCondition(item)
                      )
                      .filter(Boolean)
                : [];
            if (!conditions.length) {
                return null;
            }
            return {
                logic,
                conditions,
            };
        },
        buildPublicCondition(condition) {
            if (!condition || typeof condition !== 'object') {
                return null;
            }
            const fieldId = typeof condition.fieldId === 'string' ? condition.fieldId : '';
            const operator = this.resolveOperator(fieldId, condition.operator);
            const operatorDef = this.getOperatorDefinition(fieldId, operator);
            const fieldDefinition = this.getFieldDefinition(fieldId);
            const publicFieldIdentifier =
                typeof fieldDefinition?.fieldTagControl === 'string' && fieldDefinition.fieldTagControl.trim().length
                    ? fieldDefinition.fieldTagControl
                    : fieldId;
            const payload = {
                field: publicFieldIdentifier,
                op: operator,
            };
            if (operatorDef && operatorDef.requiresValue !== false) {
                if (operatorDef.valueShape === 'range' || operatorDef.valueShape === 'array') {
                    const entries = Array.isArray(condition.value)
                        ? condition.value.slice()
                        : condition.value === null || condition.value === undefined
                        ? []
                        : [condition.value];
                    if (operatorDef.valueShape === 'range') {
                        while (entries.length < 2) {
                            entries.push('');
                        }
                        payload.value = entries.slice(0, 2);
                    } else {
                        payload.value = entries;
                    }
                } else {
                    payload.value = condition.value ?? '';
                }
            }
            return payload;
        },
        buildQueryString(node) {
            if (!node) {
                return '';
            }
            if (node.logic && Array.isArray(node.conditions)) {
                const clause = this.isValidClause(node.logic) ? node.logic : 'AND';
                const parts = node.conditions
                    .map((child) => this.buildQueryString(child))
                    .filter((part) => part && part.length);
                if (!parts.length) {
                    return '';
                }
                if (parts.length === 1) {
                    return parts[0];
                }
                return `(${parts.join(` ${clause} `)})`;
            }
            if (node.field) {
                const fieldDefinition = this.getFieldDefinition(node.field);
                const fieldId = fieldDefinition?.id || node.field;
                const fieldLabel = this.decorateFieldLabel(this.formatFieldForQuery(fieldId));
                const operatorLabel = this.escapeHtml(this.getOperatorLabel(fieldId, node.op));
                const operatorDef = this.getOperatorDefinition(fieldId, node.op);
                if (operatorDef && operatorDef.requiresValue === false) {
                    return [fieldLabel, operatorLabel].filter(Boolean).join(' ');
                }
                const valueText = this.decorateValueText(
                    this.formatValueForQuery(node.value, fieldId, node.op)
                );
                return [fieldLabel, operatorLabel, valueText].filter(Boolean).join(' ');
            }
            return '';
        },
        getOperatorLabel(fieldId, operatorValue) {
            const operator = this.getOperatorDefinition(fieldId, operatorValue);
            return operator ? operator.label : operatorValue || '';
        },
        formatFieldForQuery(fieldId) {
            const field = this.getFieldDefinition(fieldId);
            const label = typeof field?.label === 'string' && field.label.trim().length ? field.label : fieldId;
            return this.escapeHtml(label || '');
        },
        formatValueForQuery(value, fieldId, operatorValue) {
            const operator = this.getOperatorDefinition(fieldId, operatorValue);
            const requiresValue = operator ? operator.requiresValue !== false : true;
            const valueShape = operator?.valueShape || (Array.isArray(value) ? 'array' : 'scalar');
            if (!requiresValue) {
                return '';
            }
            if (valueShape === 'range') {
                const entries = Array.isArray(value) ? value : [];
                const formatted = [entries[0], entries[1]]
                    .map((entry) => this.formatScalarValue(entry, fieldId))
                    .filter((entry) => entry !== '');
                if (!formatted.length) {
                    return this.wrapMultiValueText(operatorValue, '""');
                }
                if (formatted.length === 1) {
                    return this.wrapMultiValueText(operatorValue, formatted[0]);
                }
                return this.wrapMultiValueText(operatorValue, `${formatted[0]} AND ${formatted[1]}`);
            }
            if (valueShape === 'array') {
                const entries = Array.isArray(value)
                    ? value
                    : value === null || value === undefined
                    ? []
                    : [value];
                const formatted = entries.map((entry) => this.formatScalarValue(entry, fieldId)).filter((entry) => entry !== '');
                const listText = formatted.length ? formatted.join(', ') : '""';
                return this.wrapMultiValueText(operatorValue, listText);
            }
            return this.formatScalarValue(value, fieldId);
        },
        formatScalarValue(value, fieldId) {
            if (value === null || value === undefined || value === '') {
                return '""';
            }
            const field = this.getFieldDefinition(fieldId);
            const type = String(field?.type || '').toUpperCase();
            if (this.isListFieldType(type)) {
                const explicitLabel =
                    value && typeof value === 'object' && value !== null && typeof value.label === 'string'
                        ? value.label
                        : null;
                const optionLabel = this.getFieldOptionLabel(fieldId, value);
                const fallbackValue =
                    value && typeof value === 'object' && value !== null && 'value' in value ? value.value : value;
                const displayValue =
                    explicitLabel && explicitLabel.length
                        ? explicitLabel
                        : optionLabel && optionLabel.length
                        ? optionLabel
                        : fallbackValue;
                if (displayValue === null || displayValue === undefined || displayValue === '') {
                    return '""';
                }
                const stringDisplay = typeof displayValue === 'string' ? displayValue : String(displayValue);
                if (!stringDisplay.length) {
                    return '""';
                }
                const escapedListValue = this.escapeHtml(stringDisplay);
                return `"${escapedListValue}"`;
            }
            if (type === 'BOOLEAN') {
                if (value === true || value === 'true') {
                    return 'true';
                }
                if (value === false || value === 'false') {
                    return 'false';
                }
            }
            if (type === 'NUMBER' || type === 'NUMERIC') {
                const parsed = Number(value);
                if (!Number.isNaN(parsed)) {
                    return String(parsed);
                }
            }
            const stringValue = typeof value === 'string' ? value : String(value);
            const escaped = this.escapeHtml(stringValue);
            if (type === 'DATE' || type === 'DATETIME' || type === 'DATE_TIME' || type === 'TIME') {
                return escaped;
            }
            if (type === 'BOOLEAN') {
                return escaped;
            }
            return `"${escaped}"`;
        },
        shouldWrapMultiValueOperator(operatorValue) {
            const normalized = typeof operatorValue === 'string' ? operatorValue.toUpperCase() : '';
            return normalized === 'IN' || normalized === 'NOT_IN' || normalized === 'BETWEEN';
        },
        wrapMultiValueText(operatorValue, content) {
            if (!content || !this.shouldWrapMultiValueOperator(operatorValue)) {
                return content;
            }
            return `(${content})`;
        },
        decorateFieldLabel(label) {
            if (!label) {
                return '';
            }
            return `<span class="qb-query-field" style="color: #007bff;">${label}</span>`;
        },
        decorateValueText(value) {
            if (!value) {
                return '';
            }
            return `<span class="qb-query-value" style="color: #28a745;">${value}</span>`;
        },
        isListFieldType(type) {
            switch (type) {
                case 'CONTROLLED_LIST':
                case 'LIST':
                case 'SIMPLE_LIST':
                case 'MULTISELECTION':
                    return true;
                default:
                    return false;
            }
        },
        getFieldOptionLabel(fieldId, rawValue) {
            if (rawValue === null || rawValue === undefined) {
                return '';
            }
            const candidateValue =
                rawValue && typeof rawValue === 'object' && rawValue !== null && 'value' in rawValue
                    ? rawValue.value
                    : rawValue;
            const normalizedValue = String(candidateValue);
            if (!normalizedValue.length) {
                return '';
            }
            const field = this.getFieldDefinition(fieldId);
            const sources = [];
            if (Array.isArray(field?.staticOptions)) {
                sources.push(...field.staticOptions);
            }
            const state = this.getFieldOptionsState(fieldId);
            if (Array.isArray(state?.options)) {
                sources.push(...state.options);
            }
            for (const option of sources) {
                if (!option) {
                    continue;
                }
                const optionValue = option.value;
                if (String(optionValue) === normalizedValue) {
                    const label = option.label ?? option.Label ?? option.name ?? option.Name;
                    if (label === null || label === undefined) {
                        return normalizedValue;
                    }
                    const stringLabel = typeof label === 'string' ? label : String(label);
                    return stringLabel;
                }
            }
            return '';
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
            if (!normalizedGroup.conditions.length && !allowEmpty) {
                normalizedGroup.conditions.push(this.createCondition());
            }
            return normalizedGroup;
        },
        normalizeCondition(condition = {}) {
            const safeCondition = condition && typeof condition === 'object' ? condition : {};
            const candidateFieldId =
                typeof safeCondition.fieldId === 'string'
                    ? safeCondition.fieldId
                    : typeof safeCondition.field === 'string'
                    ? safeCondition.field
                    : '';
            const fieldId = this.resolveFieldId(candidateFieldId);
            const operator = this.resolveOperator(fieldId, safeCondition.operator);
            const value = this.normalizeInputValue(fieldId, operator, safeCondition.value);
            return {
                id:
                    typeof safeCondition.id === 'string' && safeCondition.id
                        ? safeCondition.id
                        : this.createId(),
                type: 'condition',
                fieldId,
                operator,
                value,
            };
        },
        createCondition() {
            const defaultField = this.normalizedFields[0] || null;
            const fieldId = defaultField ? defaultField.id : '';
            const operator = this.resolveOperator(fieldId, null);
            const value = this.normalizeInputValue(fieldId, operator, null);
            return {
                id: this.createId(),
                type: 'condition',
                fieldId,
                operator,
                value,
            };
        },
        createGroup() {
            const group = {
                id: this.createId(),
                type: 'group',
                clause: 'AND',
                conditions: [],
            };
            const condition = this.createCondition();
            group.conditions.push(condition);
            if (condition.fieldId) {
                this.ensureFieldOptionsLoaded(condition.fieldId);
            }
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
        resolveFieldId(candidate) {
            if (candidate && this.fieldsMap[candidate]) {
                return candidate;
            }
            if (candidate && this.fieldsByTag[candidate]) {
                return this.fieldsByTag[candidate].id;
            }
            const firstField = this.normalizedFields[0];
            return firstField ? firstField.id : '';
        },
        resolveOperator(fieldId, candidate) {
            const operators = this.getOperatorsForField(fieldId);
            const normalizedCandidate =
                typeof candidate === 'string' && candidate.trim().length
                    ? candidate.trim().toUpperCase()
                    : null;
            if (normalizedCandidate && operators.some((item) => item.value === normalizedCandidate)) {
                return normalizedCandidate;
            }
            return operators.length ? operators[0].value : '';
        },
        normalizeInputValue(fieldId, operatorValue, rawValue) {
            const operator = this.getOperatorDefinition(fieldId, operatorValue);
            if (!operator || operator.requiresValue === false) {
                return '';
            }
            const field = this.getFieldDefinition(fieldId);
            const type = String(field?.type || '').toUpperCase();
            const coerceScalar = (value) => {
                if (value === undefined || value === null || value === '') {
                    return '';
                }
                if (type === 'BOOLEAN') {
                    if (value === true || value === 'true') {
                        return true;
                    }
                    if (value === false || value === 'false') {
                        return false;
                    }
                    return '';
                }
                if (type === 'NUMBER' || type === 'NUMERIC') {
                    const parsed = Number(value);
                    return Number.isNaN(parsed) ? value : parsed;
                }
                if (type === 'DATE') {
                    return this.normalizeDateOnlyValue(value);
                }
                if (type === 'DATETIME' || type === 'DATE_TIME') {
                    return this.normalizeDateTimeValue(value);
                }
                return value;
            };
            if (operator.valueShape === 'range') {
                const entries = Array.isArray(rawValue) ? rawValue.slice(0, 2) : [];
                while (entries.length < 2) {
                    entries.push('');
                }
                return entries.map((entry) => coerceScalar(entry));
            }
            if (operator.valueShape === 'array') {
                const entries = Array.isArray(rawValue)
                    ? rawValue.slice()
                    : rawValue === null || rawValue === undefined || rawValue === ''
                    ? []
                    : [rawValue];
                return entries.map((entry) => coerceScalar(entry));
            }
            const scalarSource = Array.isArray(rawValue) ? rawValue[0] : rawValue;
            const scalar = coerceScalar(scalarSource);
            return scalar === undefined || scalar === null ? '' : scalar;
        },
        normalizeDateOnlyValue(value) {
            if (value === undefined || value === null || value === '') {
                return '';
            }
            if (value instanceof Date && !Number.isNaN(value.getTime())) {
                return value.toISOString().slice(0, 10);
            }
            const str = String(value).trim();
            if (!str) {
                return '';
            }
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
                return str;
            }
            if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
                return str.slice(0, 10);
            }
            const parsed = new Date(str);
            if (Number.isNaN(parsed.getTime())) {
                return '';
            }
            return parsed.toISOString().slice(0, 10);
        },
        normalizeDateTimeValue(value) {
            if (value === undefined || value === null || value === '') {
                return '';
            }
            if (value instanceof Date && !Number.isNaN(value.getTime())) {
                return value.toISOString();
            }
            const str = String(value).trim();
            if (!str) {
                return '';
            }
            const match = str.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2})T([0-9]{2}:[0-9]{2})(?::([0-9]{2}))?(Z|[+-][0-9]{2}:[0-9]{2})?$/);
            if (match) {
                const [, datePart, timePart, secondsPart, zonePart] = match;
                const seconds = secondsPart ?? '00';
                const zone = zonePart ?? 'Z';
                return `${datePart}T${timePart}:${seconds}${zone}`;
            }
            if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
                return `${str}T00:00:00Z`;
            }
            const parsed = new Date(str);
            if (Number.isNaN(parsed.getTime())) {
                return '';
            }
            return parsed.toISOString();
        },
        getOperatorsForField(fieldId) {
            const field = this.getFieldDefinition(fieldId);
            const fieldType = String(field?.type || 'TEXT').toUpperCase();
            const operatorKeys = Array.isArray(field?.operators) && field.operators.length
                ? field.operators
                : DEFAULT_OPERATORS_BY_TYPE[fieldType] || ['=', '<>'];
            const uniqueKeys = Array.from(new Set(operatorKeys.filter((item) => typeof item === 'string' && item.trim().length)));
            return uniqueKeys.map((key) => {
                const metadata = OPERATOR_METADATA[key] || { label: key, requiresValue: true };
                return {
                    value: key,
                    label: metadata.label,
                    requiresValue: metadata.requiresValue !== false,
                    valueShape: metadata.valueShape || 'scalar',
                };
            });
        },
        getOperatorDefinition(fieldId, operatorValue) {
            const operators = this.getOperatorsForField(fieldId);
            return operators.find((item) => item.value === operatorValue) || null;
        },
        getFieldDefinition(fieldId) {
            return this.fieldsMap[fieldId] || this.fieldsByTag[fieldId] || null;
        },
        isValidClause(value) {
            return this.clauseOptions.some((clause) => clause.value === value);
        },
        groupsAreEqual(groupA, groupB) {
            const normalizedA = groupA === undefined ? null : groupA;
            const normalizedB = groupB === undefined ? null : groupB;
            return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
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
            if (node.type === 'condition') {
                return true;
            }
            if (node.type === 'group' && Array.isArray(node.conditions)) {
                return node.conditions.some((child) => this.hasActiveConditions(child));
            }
            return false;
        },
        primeFieldOptionsForGroup(group) {
            if (!group) {
                return;
            }
            this.iterateConditions(group, (condition) => {
                if (condition.fieldId) {
                    this.ensureFieldOptionsLoaded(condition.fieldId);
                }
            });
        },
        refreshFieldOptionsState(newFields, oldFields = []) {
            const nextState = {};
            const oldState = this.fieldOptionsState || {};
            newFields.forEach((field) => {
                const previous = oldState[field.id] || {};
                const staticOptions = Array.isArray(field.staticOptions) ? field.staticOptions : [];
                const options = staticOptions.length
                    ? staticOptions
                    : Array.isArray(previous.options)
                    ? previous.options
                    : [];
                nextState[field.id] = {
                    options,
                    loading: staticOptions.length ? false : Boolean(previous.loading),
                    error: staticOptions.length ? null : previous.error || null,
                    loaded: staticOptions.length ? true : Boolean(previous.loaded),
                    hasStaticOptions: staticOptions.length > 0,
                };
            });
            this.fieldOptionsState = nextState;
        },
        ensureFieldOptionsLoaded(fieldId) {
            if (!fieldId) {
                return;
            }
            const field = this.getFieldDefinition(fieldId);
            if (!field) {
                return;
            }
            const state = this.fieldOptionsState[fieldId] || {};
            if (Array.isArray(field.staticOptions) && field.staticOptions.length) {
                this.setFieldOptionsState(fieldId, {
                    options: field.staticOptions,
                    loading: false,
                    error: null,
                    loaded: true,
                });
                return;
            }
            const normalizedDataSource = normalizeFieldDataSource(field.dataSource || field.DataSource || field.raw);
            if (!hasFetchableDataSource(normalizedDataSource)) {
                this.setFieldOptionsState(fieldId, {
                    options: Array.isArray(state.options) ? state.options : [],
                    loading: false,
                    error: null,
                    loaded: true,
                });
                return;
            }
            if (state.loading) {
                return;
            }
            this.setFieldOptionsState(fieldId, {
                ...state,
                loading: true,
                error: null,
            });
            fetchDataSourceOptions(normalizedDataSource)
                .then((response) => {
                    const rawOptions = Array.isArray(response)
                        ? response
                        : mapOptionsFromData(response, normalizedDataSource) || [];
                    const normalizedOptions = Array.isArray(rawOptions)
                        ? rawOptions.map(normalizeOption).filter(Boolean)
                        : [];
                    this.setFieldOptionsState(fieldId, {
                        options: normalizedOptions,
                        loading: false,
                        error: null,
                        loaded: true,
                    });
                })
                .catch((error) => {
                    console.warn('[QueryBuilder] Failed to load options for field', fieldId, error);
                    this.setFieldOptionsState(fieldId, {
                        options: Array.isArray(state.options) ? state.options : [],
                        loading: false,
                        error: error?.message || 'Failed to load options',
                        loaded: true,
                    });
                });
        },
        setFieldOptionsState(fieldId, patch) {
            const previousState = this.fieldOptionsState[fieldId] || {};
            const nextState = { ...previousState, ...patch };
            const optionsChanged = !this.areFieldOptionsEqual(previousState.options, nextState.options);
            this.fieldOptionsState = {
                ...this.fieldOptionsState,
                [fieldId]: nextState,
            };
            if (!optionsChanged) {
                return;
            }
            if (!this.localRootGroup || !this.hasActiveConditions(this.localRootGroup)) {
                return;
            }
            this.syncPublicVariables(this.localRootGroup);
        },
        getFieldOptionsState(fieldId) {
            return this.fieldOptionsState[fieldId] || { options: [], loading: false, error: null, loaded: false };
        },
        areFieldOptionsEqual(previousOptions, nextOptions) {
            const prev = Array.isArray(previousOptions) ? previousOptions : [];
            const next = Array.isArray(nextOptions) ? nextOptions : [];
            if (prev === next) {
                return true;
            }
            if (prev.length !== next.length) {
                return false;
            }
            for (let index = 0; index < prev.length; index += 1) {
                const prevOption = prev[index] || {};
                const nextOption = next[index] || {};
                if (prevOption.value !== nextOption.value) {
                    return false;
                }
                if (prevOption.label !== nextOption.label) {
                    return false;
                }
            }
            return true;
        },
    },
};
</script>

<style scoped>
.query-builder {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.query-builder__empty {
    padding: 24px;
    border: 1px dashed #d1d5db;
    border-radius: 8px;
    text-align: center;
    color: #6b7280;
    background-color: #f9fafb;
}
</style>
