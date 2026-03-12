<template>
    <div class="ww-select-search-wrapper">
        <div class="ww-select-search-row">
            <div class="ww-select-search-input-wrapper">
                <span class="material-symbols-outlined ww-select-search-icon">search</span>
                <input
                    ref="searchElementRef"
                    name="select-search"
                    :style="[searchStyles]"
                    :class="['ww-select-search']"
                    @input="handleInputChange"
                    @focus="handleSearchFocus"
                    @blur="handleSearchBlur"
                    :placeholder="searchPlaceholder"
                />
            </div>
            <button
                v-if="showAddButton"
                type="button"
                class="ww-select-search-add-btn"
                :title="insertNewLabel"
                @click="handleAddNew"
            >
                <span class="material-symbols-outlined">add</span>
            </button>
        </div>
    </div>
</template>

<script>
import { inject, onMounted, onBeforeUnmount, ref, computed, watch, nextTick } from 'vue';
/* wwEditor:start */
import useEditorHint from './editor/useEditorHint';
/* wwEditor:end */
import { debounce } from './utils';
import { translateText } from './translation';

export default {
    props: {
        content: { type: Object, required: true },
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
        wwElementState: { type: Object, required: true },
    },
    emits: ['element-event', 'trigger-event', 'update:sidepanel-content', 'add-new'],
    setup(props, { emit }) {
        /* wwEditor:start */
        useEditorHint(emit);
        /* wwEditor:end */
        const { updateHasSearch, updateSearchElement, updateSearch, autoFocusSearch, focusSearch, isSearchBarFocused } = inject(
            '_wwSelect:useSearch',
            {}
        );
        const searchElementRef = ref(null);
        const searchValue = ref('');
        const rawData = inject('_wwSelect:rawData', ref([]));
        const searchState = inject('_wwSelect:searchState', ref(null));
        const searchElement = computed(() => searchElementRef.value);
        const allowInsertNew = computed(() => props.content.allowInsertNew || false);
        const searchBy = computed(() => {
            return (props.content.searchBy || [])
                .filter(item => item && item.filter)
                .map(item => JSON.parse(item.filter.replace(/'/g, '"')))
                .flat();
        });

        const debouncedUpdateSearch = debounce((value, searchBy) => {
            if (updateSearch) updateSearch({ value, searchBy });
        }, 300);

        const searchStyles = computed(() => {
            const borderCss = !props.content.searchBorder
                ? {
                      border: props.content.searchBorderAll,
                  }
                : {
                      'border-top': props.content.searchBorderTop,
                      'border-right': props.content.searchBorderRight,
                      'border-bottom': props.content.searchBorderBottom,
                      'border-left': props.content.searchBorderLeft,
                  };

            return {
                width: props.content.searchWidth,
                height: props.content.searchHeight,
                'border-radius': props.content.searchBorderRadius,
                padding: props.content.searchPadding,
                'padding-left': '12px',
                margin: props.content.searchMargin,
                'background-color': props.content.searchBgColor,
                'font-family': props.content.searchFontFamily,
                'font-size': props.content.searchFontSize,
                'font-weight': props.content.searchFontWeight,
                color: props.content.searchFontColor,
                '--placeholder-color': props.content.searchPlaceholderColor,
                outline: props.content.searchOutline,
                'outline-offset': props.content.searchOutlineOffset,
                cursor: 'text',
                ...borderCss,
            };
        });

        const searchPlaceholder = computed(() => {
            return translateText(wwLib.wwLang.getText(props.content.searchPlaceholder));
        });

        const insertNewLabel = computed(() => translateText('Insert new'));

        const optionLabels = computed(() => {
            if (!Array.isArray(rawData.value)) return [];

            return rawData.value
                .map(option => {
                    if (typeof option !== 'object' || option === null) {
                        return option != null ? String(option) : '';
                    }

                    if (option.name !== undefined && option.name !== null) return String(option.name);
                    if (option.label !== undefined && option.label !== null) return String(option.label);
                    return '';
                })
                .filter(Boolean);
        });

        const showAddButton = computed(() => {
            const value = (searchValue.value || '').trim();
            if (!allowInsertNew.value || !value) return false;

            return !optionLabels.value.some(label => label === value);
        });

        // This event come from ww-input-basic => https://github.com/weweb-assets/ww-input-basic
        const handleInputChange = event => {
            const value = event?.target?.value || '';
            searchValue.value = value;
            debouncedUpdateSearch(value, searchBy);
        };

        const handleAddNew = () => {
            const value = (searchValue.value || '').trim();
            if (!value) return;

            emit('add-new', value);
        };

        const handleSearchFocus = () => {
            isSearchBarFocused.value = true;
        };

        const handleSearchBlur = () => {
            isSearchBarFocused.value = false;
        };

        watch(searchElement, value => {
            if (updateSearchElement) updateSearchElement(value);
        });


        watch(
            () => searchState.value?.value,
            value => {
                searchValue.value = value || '';
            }
        );

        onMounted(() => {
            if (updateHasSearch) updateHasSearch(true);
            if (updateSearch) updateSearch({ value: '', searchBy, searchMatches: [] });
            searchValue.value = '';
        });

        onBeforeUnmount(() => {
            if (updateHasSearch) updateHasSearch(false);
        });

        return {
            searchElementRef,
            handleInputChange,
            handleSearchFocus,
            handleSearchBlur,
            showAddButton,
            handleAddNew,
            insertNewLabel,
            searchStyles,
            searchPlaceholder,
        };
    },
};
</script>

<style scoped lang="scss">
.ww-select-search-wrapper {
    position: relative;
}

.ww-select-search-row {
    display: flex;
    align-items: start;
    gap: 8px;
}

.ww-select-search-input-wrapper {
    position: relative;
    flex: 1;
}

.ww-select-search-icon {
    position: absolute;
    right: 8px;
    top: 40px;
    transform: translateY(-36px);
    font-size: 25px !important;
    color: #9e9e9e;
    pointer-events: none;
}

.ww-select-search {
    width: 100%;
    &::placeholder {
        color: var(--placeholder-color);
    }
}

.ww-select-search-add-btn {
    width: 32px;
    min-width: 32px;
    height: 32px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #fff;
    color: #4b5563;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}
</style>
