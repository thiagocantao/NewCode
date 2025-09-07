<template>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
    <UserSelector
        :datasource="content.userDatasource"
        :group-by="content.groupBy"
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
        :initial-group-id="content.initialGroupId"
        :initial-selected-id="content.initialSelectedId"
        :selected-user-id="selectedUserId"
        :max-width="content.maxWidth"
        :table-name="content.tableName"
        :column-name="content.columnName"
        :supabase-url="content.supabaseUrl"
        :api-key="content.apiKey"
        :auth-token="content.authToken"
        :filter-query="content.filterQuery"
        @user-selected="onUserSelected"
        @trigger-event="onTriggerEvent"
    />
    <input
        type="text"
        :name="wwElementState.name"
        :value="selectedUserId"
        :required="content.required"
        tabindex="-1"
        class="fake-input"

    />
</template>

<script>
import UserSelector from './components/UserSelector.vue';
import { computed } from 'vue';

export default {
    components: {
        UserSelector,
    },
    props: {
        content: { type: Object, required: true },
        wwElementState: { type: Object, required: true },
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
        uid: { type: String, required: true },
    },
    inject: {
        useForm: { from: '_wwForm:useForm', default: null },
    },
    emits: ['update:content:effect', 'update:content', 'element-event', 'user-selected'],
    data() {
        return {
            selectedUserId: '',
        };
    },
    created() {
        if (typeof wwLib !== 'undefined' && wwLib.wwVariable && wwLib.wwVariable.useComponentVariable) {
            const { value, setValue } = wwLib.wwVariable.useComponentVariable({
                uid: this.uid,
                name: 'selectedUserId',
                type: 'text',
                defaultValue: ''
            });
            this._selectedUserIdRef = value;
            this._setSelectedUserId = setValue;
            this.selectedUserId = value.value;
            this.$watch(
                () => value.value,
                (val) => {
                    this.selectedUserId = val;
                }
            );
            if (this.useForm) {
                const fieldName = computed(() => this.wwElementState.name);
                const validation = computed(() => ({ required: this.content.required }));
                this.useForm(
                    value,
                    { fieldName, validation, initialValue: '' },
                    { elementState: this.wwElementState, emit: this.$emit, sidepanelFormPath: 'form', setValue }
                );
            }
        }
    },
    mounted() {
        if (!this.selectedUserId && this.content.initialSelectedId) {
            if (this._setSelectedUserId) this._setSelectedUserId(this.content.initialSelectedId);
            this.selectedUserId = this.content.initialSelectedId;
        }
    },
    watch: {
        'content.initialSelectedId'(newVal) {
            if (!this.selectedUserId) {
                if (this._setSelectedUserId) this._setSelectedUserId(newVal);
                this.selectedUserId = newVal;
            }
        }
    },
    methods: {
        onUserSelected(userId) {
            if (this._setSelectedUserId) this._setSelectedUserId(userId);
            this.selectedUserId = userId;
            this.$emit('user-selected', userId);
        },
        onTriggerEvent(event) {
            this.$emit('trigger-event', event);
        },
    },
};
</script>

<style>
.fake-input {
    background: rgba(0, 0, 0, 0);
    border: 0;
    bottom: -1px;
    font-size: 0;
    height: 1px;
    left: 0;
    outline: none;
    padding: 0;
    position: absolute;
    right: 0;
    width: 100%;
}
</style>
