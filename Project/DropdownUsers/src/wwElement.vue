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
</template>

<script>
import UserSelector from './components/UserSelector.vue';

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
