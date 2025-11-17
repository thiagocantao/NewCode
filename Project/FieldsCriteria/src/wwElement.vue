<template>
    <div class="filter-builder">
        <FieldsCriteriaList
            v-if="localRootGroup"
            :group="localRootGroup"
            :fields="normalizedFields"
            :action-button-background-color="actionButtonBackgroundColor"
            :action-button-text-color="actionButtonTextColor"
            :action-button-hover-background-color="actionButtonHoverBackgroundColor"
            :action-button-hover-text-color="actionButtonHoverTextColor"
            :remove-button-text-color="removeButtonTextColor"
            :get-field-definition="getFieldDefinition"
            :get-operator-definition="getOperatorDefinition"
            :get-field-options-state="getFieldOptionsState"
            :ensure-field-options-loaded="ensureFieldOptionsLoaded"
            @add-condition="handleAddCondition"
            @remove-condition="handleRemoveCondition"
            @update-condition="handleUpdateCondition"
        />
        <div v-else class="filter-builder__empty">
            {{ translateText('No filter configuration available.') }}
        </div>
    </div>
</template>

<script>
import FieldsCriteriaList from './components/FieldsCriteriaList.vue';
import {
    normalizeFieldDataSource,
    hasFetchableDataSource,
    fetchDataSourceOptions,
    mapOptionsFromData,
} from './components/dataSource';
import { translateText } from './translation';

const DEFAULT_INITIAL_QUERY_VARIABLE_ID = '4b4cff47-4599-44d2-a788-0e31ef09ed9f';
const FIELDS_CONFIG_VARIABLE_ID = 'b839531d-663a-4dd8-8cac-51f664c77256';
const DEFAULT_CLAUSE = 'AND';
const DEFAULT_OPERATOR = '=';
const DEFAULT_OPERATOR_LABEL = '=';

function resolveFieldsConfigArray(rawInput) {
    if (Array.isArray(rawInput)) {
        return rawInput;
    }

    if (rawInput === null || rawInput === undefined) {
        return [];
    }

    if (typeof rawInput === 'string') {
        const trimmed = rawInput.trim();
        if (!trimmed.length) {
            return [];
        }
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed;
            }
            if (parsed && typeof parsed === 'object') {
                if (Array.isArray(parsed.fieldsConfig)) {
                    return parsed.fieldsConfig;
                }
                if (Array.isArray(parsed.items)) {
                    return parsed.items;
                }
                if (Array.isArray(parsed.data)) {
                    return parsed.data;
                }
            }
        } catch (error) {
            console.warn('[FieldsCriteria] Failed to parse fieldsConfig JSON', error);
        }
        return [];
    }

    if (typeof rawInput === 'object') {
        if (Array.isArray(rawInput.fieldsConfig)) {
            return rawInput.fieldsConfig;
        }
        if (Array.isArray(rawInput.items)) {
            return rawInput.items;
        }
        if (Array.isArray(rawInput.data)) {
            return rawInput.data;
        }
    }

    return [];
}

function extractFieldsConfigFromCollectionPayload(payload, visited = new WeakSet()) {
    if (payload === null || payload === undefined) {
        return null;
    }

    const resolved = resolveFieldsConfigArray(payload);
    const looksArrayLike =
        Array.isArray(payload) ||
        (typeof payload === 'string' && payload.trim().startsWith('[')) ||
        (typeof payload === 'object' &&
            (Array.isArray(payload?.fieldsConfig) ||
                Array.isArray(payload?.items) ||
                Array.isArray(payload?.data)));

    if (Array.isArray(resolved) && (resolved.length || looksArrayLike)) {
        return resolved;
    }

    if (typeof payload !== 'object') {
        return null;
    }

    if (visited.has(payload)) {
        return null;
    }

    visited.add(payload);

    const entries = Array.isArray(payload) ? payload : Object.values(payload);
    for (const entry of entries) {
        const nested = extractFieldsConfigFromCollectionPayload(entry, visited);
        if (Array.isArray(nested)) {
            return nested;
        }
    }

    return null;
}

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

function parseOptionsText(raw) {
    if (raw === null || raw === undefined) {
        return [];
    }
    if (Array.isArray(raw)) {
        return raw.slice();
    }
    if (typeof raw !== 'string') {
        return [];
    }
    const trimmed = raw.trim();
    if (!trimmed.length) {
        return [];
    }
    try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
            return parsed;
        }
    } catch (error) {
        // Ignore JSON parse errors and fallback to CSV parsing
    }
    return trimmed
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length);
}

function extractDataSourceOptions(field) {
    const dataSource = field?.DataSource ?? field?.dataSource ?? null;
    if (!dataSource || typeof dataSource !== 'object') {
        return [];
    }
    const rawOptions =
        dataSource?.optionsText ??
        dataSource?.OptionsText ??
        dataSource?.options_text ??
        dataSource?.Options_Text ??
        null;
    if (rawOptions === null || rawOptions === undefined) {
        return [];
    }
    return parseOptionsText(rawOptions);
}

function dedupeOptions(options) {
    const seen = new Set();
    const result = [];
    options.forEach((option) => {
        if (!option || option.value === undefined) {
            return;
        }
        let key;
        try {
            key = JSON.stringify(option.value);
        } catch (error) {
            key = String(option.value);
        }
        if (!seen.has(key)) {
            seen.add(key);
            result.push(option);
        }
    });
    return result;
}

function extractStaticOptions(field, normalizedType = '') {
    const candidates =
        field?.options ??
        field?.Options ??
        field?.list_options ??
        field?.listOptions ??
        field?.ListOptions ??
        [];
    const normalizedCandidates = Array.isArray(candidates)
        ? candidates.map(normalizeOption).filter(Boolean)
        : [];
    const type = typeof normalizedType === 'string' ? normalizedType.toUpperCase() : '';
    if (type === 'SIMPLE_LIST') {
        const dataSourceOptions = extractDataSourceOptions(field)
            .map(normalizeOption)
            .filter(Boolean);
        return dedupeOptions([...normalizedCandidates, ...dataSourceOptions]);
    }
    return dedupeOptions(normalizedCandidates);
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
    const staticOptions = extractStaticOptions(field, type);
    return {
        id,
        fieldTagControl,
        label,
        type,
        dataSource: field.DataSource ?? field.dataSource ?? null,
        placeholder: field.Placeholder ?? field.placeholder ?? null,
        format: field.Format ?? field.format ?? null,
        staticOptions,
        raw: field,
    };
}

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
            fieldOptionsState: {},
            collectionFieldsConfig: null,
            fieldsConfigVariableValue: undefined,
            fieldsConfigVariableUnsubscribe: null,
        };
    },
    computed: {
        fieldsConfigFromVariable() {
            if (this.fieldsConfigVariableValue === undefined) {
                return undefined;
            }
            return resolveFieldsConfigArray(this.fieldsConfigVariableValue);
        },
        resolvedFieldsConfig() {
            if (this.collectionFieldsConfig !== null) {
                return this.collectionFieldsConfig;
            }
            const fromVariable = this.fieldsConfigFromVariable;
            if (fromVariable !== undefined) {
                return fromVariable;
            }
            return resolveFieldsConfigArray(this.content?.fieldsConfig);
        },
        normalizedFields() {
            if (!Array.isArray(this.resolvedFieldsConfig)) {
                return [];
            }
            return this.resolvedFieldsConfig
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
        initialQueryVariableId() {
            const rawId = this.content?.initialQueryVariableId;
            if (typeof rawId === 'string') {
                const trimmed = rawId.trim();
                if (trimmed.length) {
                    return trimmed;
                }
            }
            return DEFAULT_INITIAL_QUERY_VARIABLE_ID;
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
        this.initializeFieldsConfigVariable();
        this.loadFieldsConfigFromCollection();
        this.refreshFieldOptionsState(this.normalizedFields);
        this.initializeGlobalInitialQuery();
        this.initializeRootGroup();
        this.initializePublicVariables();
    },
    beforeDestroy() {
        this.teardownGlobalInitialQuery();
        this.teardownFieldsConfigVariable();
    },
    beforeUnmount() {
        this.teardownGlobalInitialQuery();
        this.teardownFieldsConfigVariable();
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
        'content.fieldsConfigCollectionId': {
            handler() {
                this.loadFieldsConfigFromCollection();
            },
        },
        'wwElementState.props.variables': {
            handler() {
                this.updateFieldsConfigVariableValue();
            },
            deep: true,
        },
        initialQueryVariableId(newId, oldId) {
            if (newId === oldId) {
                return;
            }
            this.teardownGlobalInitialQuery();
            this.globalInitialQuery = undefined;
            this.initializeGlobalInitialQuery();
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
        translateText,
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
            } else {
                this.syncPublicVariables(normalized);
            }
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
                        ? getValue.call(wwVariable, this.initialQueryVariableId)
                        : typeof getComponentValue === 'function'
                        ? getComponentValue.call(wwVariable, this.initialQueryVariableId)
                        : typeof getFallback === 'function'
                        ? getFallback.call(wwVariable, this.initialQueryVariableId)
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
                this.globalQueryUnsubscribe = wwVariable.subscribe(this.initialQueryVariableId, () => {
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
            this.primeFieldOptionsForGroup(normalized);
            if (!this.groupsAreEqual(newGroup, normalized)) {
                this.emitRootGroup(normalized);
            } else {
                this.syncPublicVariables(normalized);
            }
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
        onFieldsChange(newFields = [], oldFields = []) {
            if (!this.localRootGroup) {
                return;
            }
            const updated = this.cloneGroup(this.localRootGroup);
            let changed = false;
            const availableIds = newFields.map((field) => field.id);
            const availableNormalizedIds = new Set(
                availableIds.map((fieldId) => this.normalizeFieldId(fieldId)),
            );
            const usedIds = new Set();
            this.iterateConditions(updated, (condition) => {
                if (!availableIds.length) {
                    if (condition.fieldId !== '') {
                        condition.fieldId = '';
                        condition.value = '';
                        changed = true;
                    }
                    return;
                }
                const normalizedCurrentId = this.normalizeFieldId(condition.fieldId);
                let nextFieldId = '';
                if (
                    normalizedCurrentId &&
                    availableNormalizedIds.has(normalizedCurrentId) &&
                    !usedIds.has(normalizedCurrentId)
                ) {
                    nextFieldId = condition.fieldId;
                } else {
                    nextFieldId = this.findFirstAvailableFieldId(updated, {
                        excludeConditionId: condition.id,
                        usedIds,
                    });
                }
                const normalizedNextId = this.normalizeFieldId(nextFieldId);
                if (condition.fieldId !== nextFieldId) {
                    condition.fieldId = nextFieldId;
                    condition.value = this.normalizeConditionValue(condition.fieldId, null);
                    if (condition.fieldId) {
                        this.ensureFieldOptionsLoaded(condition.fieldId);
                    }
                    changed = true;
                } else {
                    const normalizedValue = this.normalizeConditionValue(
                        condition.fieldId,
                        condition.value,
                    );
                    if (!this.valuesAreEqual(condition.value, normalizedValue)) {
                        condition.value = normalizedValue;
                        changed = true;
                    }
                    if (condition.fieldId) {
                        this.ensureFieldOptionsLoaded(condition.fieldId);
                    }
                }
                if (normalizedNextId) {
                    usedIds.add(normalizedNextId);
                }
            });
            if (!updated.conditions.length && availableIds.length) {
                const condition = this.createCondition(this.findFirstAvailableFieldId(updated));
                updated.conditions.push(condition);
                if (condition.fieldId) {
                    this.ensureFieldOptionsLoaded(condition.fieldId);
                }
                changed = true;
            }
            if (changed) {
                this.updateRootGroup(updated);
            }
        },
        loadFieldsConfigFromCollection() {
            const rawId = this.content?.fieldsConfigCollectionId;
            const collectionId = typeof rawId === 'string' ? rawId.trim() : '';
            if (!collectionId) {
                this.collectionFieldsConfig = null;
                return;
            }

            const wwCollection = typeof window !== 'undefined' ? window?.wwLib?.wwCollection : undefined;
            if (!wwCollection) {
                this.collectionFieldsConfig = [];
                return;
            }

            try {
                const getCollectionData = wwCollection?.getCollectionData;
                const getCollection = wwCollection?.getCollection;
                let payload;
                if (typeof getCollectionData === 'function') {
                    payload = getCollectionData.call(wwCollection, collectionId);
                } else if (typeof getCollection === 'function') {
                    payload = getCollection.call(wwCollection, collectionId)?.data;
                } else {
                    payload = null;
                }

                const resolved = extractFieldsConfigFromCollectionPayload(payload);
                if (Array.isArray(resolved)) {
                    this.collectionFieldsConfig = resolved;
                } else {
                    this.collectionFieldsConfig = [];
                }
            } catch (error) {
                console.warn('[FieldsCriteria] Failed to load fields configuration from collection', error);
                this.collectionFieldsConfig = [];
            }
        },
        initializeFieldsConfigVariable() {
            this.updateFieldsConfigVariableValue();
            this.subscribeToFieldsConfigVariable();
        },
        updateFieldsConfigVariableValue() {
            const value = this.readVariableById(FIELDS_CONFIG_VARIABLE_ID);
            if (value === undefined) {
                this.fieldsConfigVariableValue = undefined;
                return;
            }
            if (value && typeof value === 'object') {
                try {
                    this.fieldsConfigVariableValue = JSON.parse(JSON.stringify(value));
                    return;
                } catch (error) {
                    console.warn('[FieldsCriteria] Failed to clone fields configuration variable payload', error);
                }
            }
            this.fieldsConfigVariableValue = value;
        },
        subscribeToFieldsConfigVariable() {
            const wwVariable = typeof window !== 'undefined' ? window?.wwLib?.wwVariable : undefined;
            if (!wwVariable || typeof wwVariable.subscribe !== 'function') {
                return;
            }
            try {
                this.fieldsConfigVariableUnsubscribe = wwVariable.subscribe(
                    FIELDS_CONFIG_VARIABLE_ID,
                    () => {
                        this.updateFieldsConfigVariableValue();
                    },
                );
            } catch (error) {
                console.warn('[FieldsCriteria] Failed to subscribe to fields configuration variable', error);
                this.fieldsConfigVariableUnsubscribe = null;
            }
        },
        teardownFieldsConfigVariable() {
            if (typeof this.fieldsConfigVariableUnsubscribe === 'function') {
                try {
                    this.fieldsConfigVariableUnsubscribe();
                } catch (error) {
                    console.warn('[FieldsCriteria] Failed to unsubscribe fields configuration variable listener', error);
                }
            }
            this.fieldsConfigVariableUnsubscribe = null;
        },
        readVariableById(variableId) {
            if (!variableId) {
                return undefined;
            }
            const wwVariable = typeof window !== 'undefined' ? window?.wwLib?.wwVariable : undefined;
            if (wwVariable) {
                try {
                    const getValue = wwVariable?.getValue;
                    const getComponentValue = wwVariable?.getComponentValue;
                    const getFallback = wwVariable?.get;
                    return typeof getValue === 'function'
                        ? getValue.call(wwVariable, variableId)
                        : typeof getComponentValue === 'function'
                        ? getComponentValue.call(wwVariable, variableId)
                        : typeof getFallback === 'function'
                        ? getFallback.call(wwVariable, variableId)
                        : undefined;
                } catch (error) {
                    console.warn(`[FieldsCriteria] Failed to read variable ${variableId}`, error);
                }
            }
            const stateVariables = this.wwElementState?.props?.variables;
            if (stateVariables && Object.prototype.hasOwnProperty.call(stateVariables, variableId)) {
                return stateVariables[variableId];
            }
            return undefined;
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
            const nextFieldId = this.findFirstAvailableFieldId(targetGroup);
            if (!nextFieldId) {
                return;
            }
            const condition = this.createCondition(nextFieldId);
            targetGroup.conditions.push(condition);
            if (condition.fieldId) {
                this.ensureFieldOptionsLoaded(condition.fieldId);
            }
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
                const condition = this.createCondition(
                    this.findFirstAvailableFieldId(targetGroup),
                );
                targetGroup.conditions.push(condition);
                if (condition.fieldId) {
                    this.ensureFieldOptionsLoaded(condition.fieldId);
                }
            }
            this.updateRootGroup(updated);
        },
        handleUpdateCondition({ groupId, conditionId, key, value }) {
            if (!['fieldId', 'value'].includes(key)) {
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
            if (key === 'fieldId') {
                const resolvedFieldId = this.resolveFieldId(value);
                condition.fieldId = resolvedFieldId;
                condition.value = this.normalizeConditionValue(resolvedFieldId, null);
                if (resolvedFieldId) {
                    this.ensureFieldOptionsLoaded(resolvedFieldId);
                }
            } else if (key === 'value') {
                condition.value = this.normalizeConditionValue(condition.fieldId, value);
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
            if (cloned.logic && !cloned.type) {
                const normalizedConditions = Array.isArray(cloned.conditions)
                    ? cloned.conditions.map((item) => ({
                          type: 'condition',
                          fieldId: item.fieldId ?? item.field ?? '',
                          field: item.field ?? item.fieldId ?? '',
                          value: item.value ?? '',
                      }))
                    : [];
                return {
                    type: 'group',
                    clause: typeof cloned.logic === 'string' ? cloned.logic.toUpperCase() : DEFAULT_CLAUSE,
                    conditions: normalizedConditions,
                };
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
            const fieldDefinition = this.getFieldDefinition(condition.fieldId);
            const publicFieldIdentifier =
                typeof fieldDefinition?.fieldTagControl === 'string' && fieldDefinition.fieldTagControl.trim().length
                    ? fieldDefinition.fieldTagControl
                    : condition.fieldId || '';
            const fieldTagControl =
                typeof fieldDefinition?.fieldTagControl === 'string' && fieldDefinition.fieldTagControl.trim().length
                    ? fieldDefinition.fieldTagControl
                    : '';
            const payload = {
                type: 'condition',
                field: publicFieldIdentifier,
                fieldId: condition.fieldId || publicFieldIdentifier || '',
                operator: DEFAULT_OPERATOR,
            };
            if (fieldTagControl) {
                payload.fieldTagControl = fieldTagControl;
            }
            if (Array.isArray(condition.value)) {
                payload.value = condition.value.slice();
            } else if (condition.value !== undefined && condition.value !== null) {
                payload.value = condition.value;
            } else {
                payload.value = '';
            }
            return payload;
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
                const fieldHtml = this.formatFieldForQuery(node.fieldId || node.field);
                const operatorLabel = this.escapeHtml(DEFAULT_OPERATOR_LABEL);
                const valueHtml = this.formatValueForQuery(node.value, node.fieldId || node.field);
                return [fieldHtml, operatorLabel, valueHtml].filter(Boolean).join(' ');
            }
            return '';
        },
        formatFieldForQuery(fieldIdOrIdentifier) {
            let label = '';
            if (typeof fieldIdOrIdentifier === 'string' && fieldIdOrIdentifier.trim().length) {
                const field = this.getFieldDefinition(fieldIdOrIdentifier);
                label = field?.label || fieldIdOrIdentifier;
            }
            const normalizedLabel = typeof label === 'string' ? label.trim() : '';
            if (!normalizedLabel.length) {
                return '';
            }
            const escapedField = this.escapeHtml(normalizedLabel);
            return `<span style="color: blue;">${escapedField}</span>`;
        },
        formatValueForQuery(value, fieldIdOrIdentifier) {
            const fieldDefinition = this.getFieldDefinition(fieldIdOrIdentifier);
            const fieldId = fieldDefinition?.id || (typeof fieldIdOrIdentifier === 'string' ? fieldIdOrIdentifier : '');
            const fieldType = String(fieldDefinition?.type || '').toUpperCase();
            if (Array.isArray(value)) {
                if (!value.length) {
                    return '<span style="color: green;">[]</span>';
                }
                const formatted = value
                    .map((entry) => this.resolveDisplayValue(entry, fieldId, fieldType))
                    .map((entry) => (entry === null || entry === undefined ? '' : String(entry)))
                    .map((entry) => this.escapeHtml(entry));
                return `<span style="color: green;">[${formatted.join(', ')}]</span>`;
            }
            if (value === true || value === false) {
                return `<span style="color: green;">${value ? 'true' : 'false'}</span>`;
            }
            const displayValue = this.resolveDisplayValue(value, fieldId, fieldType);
            if (displayValue === true || displayValue === false) {
                return `<span style="color: green;">${displayValue ? 'true' : 'false'}</span>`;
            }
            if (displayValue === null || displayValue === undefined || displayValue === '') {
                return '<span style="color: green;">""</span>';
            }
            let stringValue = typeof displayValue === 'string' ? displayValue : String(displayValue);
            if (fieldType === 'BOOLEAN') {
                if (stringValue === 'true' || stringValue === 'false') {
                    return `<span style="color: green;">${stringValue}</span>`;
                }
            }
            if (fieldType === 'NUMBER' || fieldType === 'NUMERIC') {
                const parsed = Number(stringValue);
                if (!Number.isNaN(parsed)) {
                    return `<span style="color: green;">${parsed}</span>`;
                }
            }
            if (fieldType === 'DATE' || fieldType === 'DATETIME' || fieldType === 'DATE_TIME' || fieldType === 'TIME') {
                return `<span style="color: green;">${this.escapeHtml(stringValue)}</span>`;
            }
            const escapedValue = this.escapeHtml(stringValue.replace(/"/g, '\\"'));
            return `<span style="color: green;">"${escapedValue}"</span>`;
        },
        resolveDisplayValue(rawValue, fieldId, fieldType) {
            if (this.isListFieldType(fieldType)) {
                const label = this.getFieldOptionLabel(fieldId, rawValue);
                if (label && label.length) {
                    return label;
                }
                if (rawValue && typeof rawValue === 'object' && rawValue !== null && typeof rawValue.label === 'string') {
                    return rawValue.label;
                }
            }
            if (this.isDateLikeFieldType(fieldType)) {
                return this.formatDateLikeValueForDisplay(rawValue, fieldType);
            }
            return rawValue;
        },
        isListFieldType(type) {
            const normalized = String(type || '').toUpperCase();
            switch (normalized) {
                case 'CONTROLLED_LIST':
                case 'LIST':
                case 'SIMPLE_LIST':
                case 'MULTISELECTION':
                    return true;
                default:
                    return false;
            }
        },
        isDateLikeFieldType(type) {
            const normalized = String(type || '').toUpperCase();
            switch (normalized) {
                case 'DATE':
                case 'DATETIME':
                case 'DATE_TIME':
                case 'TIME':
                    return true;
                default:
                    return false;
            }
        },
        formatDateLikeValueForDisplay(rawValue, fieldType) {
            const normalized = String(fieldType || '').toUpperCase();
            if (normalized === 'DATE') {
                return this.formatDateOnlyForDisplay(rawValue);
            }
            if (normalized === 'DATETIME' || normalized === 'DATE_TIME') {
                return this.formatDateTimeForDisplay(rawValue);
            }
            if (normalized === 'TIME') {
                return this.formatTimeForDisplay(rawValue);
            }
            return rawValue;
        },
        formatDateOnlyForDisplay(rawValue) {
            const normalized = this.normalizeDateOnlyValue(rawValue);
            if (!normalized) {
                return '';
            }
            return this.formatDateByStyle(normalized);
        },
        formatDateTimeForDisplay(rawValue) {
            const normalized = this.normalizeDateTimeValue(rawValue);
            if (!normalized) {
                return '';
            }
            const [datePart] = normalized.split('T');
            const formattedDate = this.formatDateByStyle(datePart);
            const timePart = this.extractTimeFromDateTime(normalized);
            return timePart ? `${formattedDate} ${timePart}` : formattedDate;
        },
        formatTimeForDisplay(rawValue) {
            if (rawValue === undefined || rawValue === null) {
                return '';
            }
            const str = String(rawValue).trim();
            if (!str) {
                return '';
            }
            const match = str.match(/([0-9]{2}:[0-9]{2})/);
            return match ? match[1] : str;
        },
        extractTimeFromDateTime(value) {
            if (!value) {
                return '';
            }
            const str = String(value);
            const match = str.match(/T?([0-9]{2}:[0-9]{2})/);
            return match ? match[1] : '';
        },
        formatDateByStyle(yyyyMmDd) {
            if (!yyyyMmDd) {
                return '';
            }
            const parts = String(yyyyMmDd).split('-');
            if (parts.length < 3) {
                return String(yyyyMmDd);
            }
            const [year, month, day] = parts;
            const y = year.padStart(4, '0');
            const m = month.padStart(2, '0');
            const d = day.padStart(2, '0');
            return this.getDateFormatStyle() === 'american' ? `${m}/${d}/${y}` : `${d}/${m}/${y}`;
        },
        getDateFormatStyle() {
            const fallback = 'european';
            try {
                if (typeof window === 'undefined') {
                    return fallback;
                }
                const wwVariable = window?.wwLib?.wwVariable;
                if (!wwVariable || typeof wwVariable.getValue !== 'function') {
                    return fallback;
                }
                const raw = wwVariable.getValue('21a41590-e7d8-46a5-af76-bb3542da1df3');
                if (typeof raw === 'string' && raw.trim().toLowerCase() === 'american') {
                    return 'american';
                }
            } catch (error) {
                console.warn('[FieldsCriteria] Failed to read date format style', error);
            }
            return fallback;
        },
        getFieldOptionLabel(fieldId, rawValue) {
            if (!fieldId) {
                return '';
            }
            const candidateValue =
                rawValue && typeof rawValue === 'object' && rawValue !== null && 'value' in rawValue
                    ? rawValue.value
                    : rawValue;
            const normalizedValue = candidateValue === null || candidateValue === undefined ? '' : String(candidateValue);
            if (!normalizedValue.length) {
                return '';
            }
            const field = this.getFieldDefinition(fieldId);
            const optionSources = [];
            if (Array.isArray(field?.staticOptions)) {
                optionSources.push(...field.staticOptions);
            }
            const state = this.getFieldOptionsState(fieldId);
            if (Array.isArray(state?.options)) {
                optionSources.push(...state.options);
            }
            for (const option of optionSources) {
                if (!option) {
                    continue;
                }
                const optionValue = option.value ?? option.Value ?? option.id ?? option.ID;
                if (String(optionValue) === normalizedValue) {
                    const optionLabel = option.label ?? option.Label ?? option.name ?? option.Name;
                    if (optionLabel === null || optionLabel === undefined) {
                        return normalizedValue;
                    }
                    return typeof optionLabel === 'string' ? optionLabel : String(optionLabel);
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
            const fieldCandidate =
                typeof safeCondition.fieldId === 'string' && safeCondition.fieldId.trim().length
                    ? safeCondition.fieldId
                    : typeof safeCondition.field === 'string' && safeCondition.field.trim().length
                    ? safeCondition.field
                    : '';
            const fieldId = this.resolveFieldId(fieldCandidate);
            const value = this.normalizeConditionValue(fieldId, safeCondition.value);
            return {
                id:
                    typeof safeCondition.id === 'string' && safeCondition.id
                        ? safeCondition.id
                        : this.createId(),
                type: 'condition',
                fieldId,
                value,
            };
        },
        createCondition(preferredFieldId = undefined) {
            const fieldId =
                preferredFieldId === undefined ? this.getDefaultFieldId() : preferredFieldId || '';
            const value = this.normalizeConditionValue(fieldId, null);
            return {
                id: this.createId(),
                type: 'condition',
                fieldId,
                value,
            };
        },
        getDefaultFieldId() {
            const defaultField = this.normalizedFields[0] || null;
            return defaultField ? defaultField.id : '';
        },
        normalizeFieldId(fieldId) {
            if (fieldId === null || fieldId === undefined) {
                return '';
            }
            return String(fieldId);
        },
        findFirstAvailableFieldId(group, { excludeConditionId = null, usedIds = null } = {}) {
            const taken = new Set();
            if (usedIds) {
                Array.from(usedIds).forEach((value) => {
                    taken.add(this.normalizeFieldId(value));
                });
            }
            if (group && Array.isArray(group.conditions)) {
                group.conditions.forEach((item) => {
                    if (
                        item?.type === 'condition' &&
                        item.id !== excludeConditionId &&
                        item.fieldId
                    ) {
                        taken.add(this.normalizeFieldId(item.fieldId));
                    }
                });
            }
            const nextField = this.normalizedFields.find(
                (field) => !taken.has(this.normalizeFieldId(field.id)),
            );
            return nextField ? nextField.id : '';
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
                return Boolean(node.fieldId);
            }
            if (node.type === 'group' && Array.isArray(node.conditions)) {
                return node.conditions.some((child) => this.hasActiveConditions(child));
            }
            return false;
        },
        resolveFieldId(candidate) {
            if (candidate && this.fieldsMap[candidate]) {
                return this.fieldsMap[candidate].id;
            }
            if (candidate && this.fieldsByTag[candidate]) {
                return this.fieldsByTag[candidate].id;
            }
            const firstField = this.normalizedFields[0];
            return firstField ? firstField.id : '';
        },
        normalizeConditionValue(fieldId, rawValue) {
            const operator = this.getOperatorDefinition(fieldId);
            if (!operator || operator.requiresValue === false) {
                return '';
            }
            const field = this.getFieldDefinition(fieldId);
            const type = field?.type || 'TEXT';
            if (operator.valueShape === 'array') {
                const entries = Array.isArray(rawValue)
                    ? rawValue.slice()
                    : rawValue === null || rawValue === undefined || rawValue === ''
                    ? []
                    : [rawValue];
                return entries.map((entry) => this.coerceScalarValue(type, entry));
            }
            const scalarSource = Array.isArray(rawValue) ? rawValue[0] : rawValue;
            const scalar = this.coerceScalarValue(type, scalarSource);
            return scalar === undefined || scalar === null ? '' : scalar;
        },
        coerceScalarValue(type, rawValue) {
            const normalizedType = String(type || '').toUpperCase();
            if (rawValue === undefined || rawValue === null || rawValue === '') {
                return '';
            }
            if (normalizedType === 'BOOLEAN') {
                if (rawValue === true || rawValue === 'true') {
                    return true;
                }
                if (rawValue === false || rawValue === 'false') {
                    return false;
                }
                return '';
            }
            if (normalizedType === 'NUMBER' || normalizedType === 'NUMERIC') {
                const parsed = Number(rawValue);
                return Number.isNaN(parsed) ? rawValue : parsed;
            }
            if (normalizedType === 'DATE') {
                return this.normalizeDateOnlyValue(rawValue);
            }
            if (normalizedType === 'DATETIME' || normalizedType === 'DATE_TIME') {
                return this.normalizeDateTimeValue(rawValue);
            }
            if (normalizedType === 'TIME') {
                return String(rawValue);
            }
            if (
                normalizedType === 'CONTROLLED_LIST' ||
                normalizedType === 'LIST' ||
                normalizedType === 'SIMPLE_LIST' ||
                normalizedType === 'MULTISELECTION'
            ) {
                return String(rawValue);
            }
            return rawValue;
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
        getFieldDefinition(fieldId) {
            if (!fieldId) {
                return null;
            }
            if (this.fieldsMap[fieldId]) {
                return this.fieldsMap[fieldId];
            }
            if (this.fieldsByTag[fieldId]) {
                return this.fieldsByTag[fieldId];
            }
            return null;
        },
        getOperatorDefinition(fieldId) {
            const field = this.getFieldDefinition(fieldId);
            const normalizedType = String(field?.type || '').toUpperCase();
            if (normalizedType === 'MULTISELECTION') {
                return { value: DEFAULT_OPERATOR, label: DEFAULT_OPERATOR_LABEL, requiresValue: true, valueShape: 'array' };
            }
            return { value: DEFAULT_OPERATOR, label: DEFAULT_OPERATOR_LABEL, requiresValue: true, valueShape: 'scalar' };
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
            const normalizedDataSource = normalizeFieldDataSource(field.dataSource || field.raw);
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
                    console.warn('[FieldsCriteria] Failed to load options for field', fieldId, error);
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
            if (optionsChanged && this.localRootGroup && this.hasActiveConditions(this.localRootGroup)) {
                this.syncPublicVariables(this.localRootGroup);
            }
        },
        getFieldOptionsState(fieldId) {
            return this.fieldOptionsState[fieldId] || { options: [], loading: false, error: null, loaded: false };
        },
        areFieldOptionsEqual(previousOptions, nextOptions) {
            const prev = Array.isArray(previousOptions) ? previousOptions : [];
            const next = Array.isArray(nextOptions) ? nextOptions : [];
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
        valuesAreEqual(a, b) {
            return JSON.stringify(a) === JSON.stringify(b);
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
