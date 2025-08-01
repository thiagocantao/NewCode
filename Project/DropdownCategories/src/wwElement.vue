<template>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
    <ComponentSelector
        :datasource="content.userDatasource"
        :uid="uid"
        :value-field="content.valueField"
        :label-field="content.labelField"
        :name-font-family="content.nameFontFamily"
        :name-font-size="content.nameFontSize"
        :name-font-weight="content.nameFontWeight"
        :initial-font-family="content.initialFontFamily"
        :initial-font-size="content.initialFontSize"
        :initial-font-weight="content.initialFontWeight"
        :input-font-family="content.inputFontFamily"
        :input-font-size="content.inputFontSize"
        :input-font-weight="content.inputFontWeight"
        :unassigned-label="content.unassignedLabel"
        :search-placeholder="content.searchPlaceholder"
        :initial-selected-id="content.initialSelectedId"
        :selected-component-id="selectedComponentId"
        :max-width="content.maxWidth"
        :supabase-url="content.supabaseUrl"
        :api-key="content.SupabaseApiKey"
        :auth-token="content.SupabaseAuthToken"
        :ApiURL="content.ApiURL"
        :ApiBody="content.ApiBody"
        :read-only="content.readOnly"
        :input-mode="content.inputMode"
        :list-title="content.listTitle"
        @component-selected="onComponentSelected"
        @trigger-event="onTriggerEvent"
    />
</template>

<script>
import ComponentSelector from './components/ComponentSelector.vue';

export default {
    components: {
        ComponentSelector,
    },
    props: {
        content: { type: Object, required: true },
        wwElementState: { type: Object, required: true },
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
        uid: { type: String, required: true },
    },
    emits: ['update:content:effect', 'update:content', 'element-event', 'component-selected'],
    data() {
        return {
            selectedComponentId: '',
            inputValue: '',
        };
    },
    created() {
        if (typeof wwLib !== 'undefined' && wwLib.wwVariable && wwLib.wwVariable.useComponentVariable) {
            const { value, setValue } = wwLib.wwVariable.useComponentVariable({
                uid: this.uid,
                name: 'selectedComponentId',
                type: 'text',
                defaultValue: ''
            });
            this._selectedComponentIdRef = value;
            this._setSelectedComponentId = setValue;
            this.selectedComponentId = value.value;
            this.$watch(
                () => value.value,
                (val) => {
                    this.selectedComponentId = val;
                }
            );

            const { value: inputVal, setValue: setInputVal } = wwLib.wwVariable.useComponentVariable({
                uid: this.uid,
                name: 'inputValue',
                type: 'text',
                defaultValue: ''
            });
            this._inputValueRef = inputVal;
            this._setInputValue = setInputVal;
            this.inputValue = inputVal.value;
            this.$watch(
                () => inputVal.value,
                (val) => {
                    this.inputValue = val;
                }
            );
        }
    },
    mounted() {
        if (this.content.initialSelectedId) {
            if (this._setSelectedComponentId) this._setSelectedComponentId(this.content.initialSelectedId);
            this.selectedComponentId = this.content.initialSelectedId;
        }
    },
    watch: {
        'content.initialSelectedId'(newVal) {
            if (this._setSelectedComponentId) this._setSelectedComponentId(newVal);
            this.selectedComponentId = newVal;
        }
    },
    methods: {
        onComponentSelected(componentId) {
            if (this._setSelectedComponentId) this._setSelectedComponentId(componentId);
            this.selectedComponentId = componentId;
            this.$emit('component-selected', componentId);
        },
        onTriggerEvent(event) {
            this.$emit('trigger-event', event);
        },
    },
};
</script>
