<template>
    <DynamicScroller
        v-if="/*virtualScroll &&*/ filteredOptions.length > 0"
        style="height: 100%"
        :items="dynamicScrollerItems"
        :min-item-size="virtualScrollMinItemSize"
        :buffer="virtualScrollBuffer"
        :key="dynamicScrollerItems.length"
    >
        <template v-slot="{ item, index, active }">
            <DynamicScrollerItem
                :item="item"
                :active="active"
                :size-dependencies="JSON.stringify(item)"
                :data-index="index"
            >
                <wwLayoutItemContext :key="index" is-repeat :index="index" :data="item">
                    <template v-if="item.__type === 'group'">
                        <div class="ww-select-group" :style="{ padding: content.optionPadding }">
                            <label v-if="selectType === 'multiple'" class="ww-select-group-label">
                                <input
                                    type="checkbox"
                                    :checked="isGroupSelected(item)"
                                    @change="toggleGroup(item)"
                                />
                                <span>{{ item.label }}</span>
                            </label>
                            <span v-else>{{ item.label }}</span>
                        </div>
                    </template>
                    <template v-else>
                        <div :style="index != dynamicScrollerItems.length - 1 ? { paddingBottom: content.optionSpacing } : {}">
                            <ww-element-option :local-data="item" :content="content" :wwEditorState="wwEditorState" />
                        </div>
                    </template>
                </wwLayoutItemContext>
            </DynamicScrollerItem>
        </template>
    </DynamicScroller>

    <!-- <div v-else-if="!virtualScroll && filteredOptions.length > 0" style="height: 100%;overflow: auto;">
        <wwLayoutItemContext
            v-for="(item, index) in filteredOptions"
            :key="index"
            is-repeat
            :index="index"
            :data="item"
        >
            <ww-element-option :local-data="item" :content="content" :wwEditorState="wwEditorState" />
        </wwLayoutItemContext>
    </div> -->

    <div v-show="filteredOptions.length === 0 || showEmptyStateInEditor" :style="emptyStateStyle">
        <span>{{ emptyStateText }}</span>
        <!-- <wwElement v-bind="content.emptyStateContainer" /> -->
    </div>
</template>

<script>
import InputSelectOption from './wwElement_Option.vue';
import { ref, inject, computed, watch, toValue } from 'vue';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import { useMemoize } from '@vueuse/core';
import { areValuesEqual } from './utils';
/* wwEditor:start */
import useEditorHint from './editor/useEditorHint';
/* wwEditor:end */

export default {
    components: {
        DynamicScroller,
        DynamicScrollerItem,
        'ww-element-option': InputSelectOption,
    },
    props: {
        content: { type: Object, required: true },
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
        wwElementState: { type: Object, required: true },
    },
    emits: ['update:sidepanel-content'],
    setup(props, { emit }) {
        /* wwEditor:start */
        useEditorHint(emit);
        /* wwEditor:end */

        const isEditing = computed(() => {
            /* wwEditor:start */
            return props.wwEditorState.isEditing;
            /* wwEditor:end */
            // eslint-disable-next-line no-unreachable
            return false;
        });

        const showEmptyStateInEditor = computed(() => {
            /* wwEditor:start */
            return props.wwEditorState.sidepanelContent.showEmptyStateInEditor && props.wwEditorState.isEditing;
            /* wwEditor:end */
            // eslint-disable-next-line no-unreachable
            return false;
        });

        const rawData = inject('_wwSelect:rawData', ref([]));
        const searchState = inject('_wwSelect:searchState', ref(null));
        const { updateSearch } = inject('_wwSelect:useSearch', {});
        const registerOptionProperties = inject('_wwSelect:registerOptionProperties', () => {});
        const selectValue = inject('_wwSelect:value', ref(null));
        const selectType = inject('_wwSelect:type', ref('single'));
        const updateValue = inject('_wwSelect:updateValue', () => {});
        const removeSpecificValue = inject('_wwSelect:removeSpecificValue', () => {});
        const mappingValue = inject('_wwSelect:mappingValue', ref(null));
        const virtualScroll = computed(() => props.content.virtualScroll);
        const virtualScrollSizeDependencies = computed(() => props.content.virtualScrollSizeDependencies);
        const virtualScrollMinItemSize = computed(() => props.content.virtualScrollMinItemSize || 40);
        const virtualScrollBuffer = computed(() => props.content.virtualScrollBuffer || 400);

        const emptyStateText = computed(() => wwLib.wwLang.getText(props.content.emptyStateText));

        const options = computed(() => {
            const items = rawData.value;
            return Array.isArray(items) ? items : [];
        });

        const optionProperties = computed(() => {
            if (!options.value || options.value.length === 0) return {};
            return options.value[0];
        });

        const memoizedFilter = useMemoize((options, filterValue) => {
            return options.filter(option => {
                // Handle primitive values directly
                const isPrimitive = typeof option !== 'object' || option === null;
                if (isPrimitive) {
                    const normalizedOption = option
                        .toString()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toLowerCase();
                    const normalizedFilter = filterValue
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .toLowerCase();
                    return normalizedOption.includes(normalizedFilter);
                } else {
                    // For objects, use the existing search logic
                    const searchBy = searchState.value?.searchBy?.length
                        ? searchState.value?.searchBy
                        : Object.keys(option);
                    return searchBy.some(key => {
                        const optionValue = option[key];
                        if (!optionValue) return false;
                        const normalizedOption = optionValue
                            .toString()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .toLowerCase();
                        const normalizedFilter = filterValue
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .toLowerCase();

                        return normalizedOption.includes(normalizedFilter);
                    });
                }
            });
        });

        const filteredOptions = computed(() => {
            if (!searchState.value || !searchState.value.value) return options.value;
            let filtered = memoizedFilter(options.value, searchState.value.value);
            return filtered;
        });

        const { resolveMappingFormula } = wwLib.wwFormula.useFormula();

        function getOptionValue(option) {
            const isPrimitive = typeof option !== 'object' || option === null;
            if (isPrimitive) return option;
            return resolveMappingFormula(toValue(mappingValue), option) ?? option;
        }

        function isValueSelected(value) {
            if (selectType.value !== 'multiple') return false;
            return Array.isArray(selectValue.value)
                ? selectValue.value.some(v => areValuesEqual(v, value))
                : false;
        }

        function getGroupValue(option, path) {
            return path
                .split('.')
                .reduce((obj, key) => (obj == null ? undefined : obj[key]), option);
        }


        const groupedOptions = computed(() => {
            if (!props.content.groupBy) return [];
            const groups = new Map();
            for (let option of filteredOptions.value) {
                const key = getGroupValue(option, props.content.groupBy);

                const group = key != null ? key : '';
                if (!groups.has(group)) groups.set(group, []);
                groups.get(group).push(option);
            }
            return Array.from(groups, ([label, items]) => ({ label, items }));
        });

        const dynamicScrollerItems = computed(() => {
            if (!props.content.groupBy) {
                return filteredOptions.value.map((item, index) => {
                    const isPrimitive = typeof item !== 'object' || item === null;
                    if (isPrimitive) {
                        return { value: item, id: `id_${index}` };
                    } else {
                        return { ...item, id: item.id ?? `id_${index}` };
                    }
                });
            }

            const items = [];
            groupedOptions.value.forEach((group, gIndex) => {
                items.push({ __type: 'group', label: group.label, items: group.items, id: `group_${gIndex}` });
                group.items.forEach((item, index) => {
                    const isPrimitive = typeof item !== 'object' || item === null;
                    if (isPrimitive) {
                        items.push({ value: item, id: `id_${gIndex}_${index}` });
                    } else {
                        items.push({ ...item, id: item.id ?? `id_${gIndex}_${index}` });
                    }
                });
            });
            return items;
        });

        function isGroupSelected(group) {
            return group.items.every(item => isValueSelected(getOptionValue(item)));
        }

        function toggleGroup(group) {
            const values = group.items.map(getOptionValue);
            const allSelected = values.every(isValueSelected);
            if (allSelected) {
                values.forEach(v => removeSpecificValue(v));
            } else {
                updateValue(values);
            }
        }

        watch(filteredOptions, () => {
            if (updateSearch) {
                const searchMatches = searchState.value && searchState.value.value ? filteredOptions.value : [];
                updateSearch({ ...searchState.value, searchMatches });
            }
        });

        // Styles
        const emptyStateStyle = computed(() => {
            return {
                'font-family': props.content.emptyStateFontFamily,
                'font-size': props.content.emptyStateFontSize,
                'font-weight': props.content.emptyStateFontWeight,
                color: props.content.emptyStateFontColor,
                padding: props.content.emptyStatePadding,
                'text-align': props.content.emptyStateTextAlign,
                width: '100%',
            };
        });

        // Watch
        watch(
            optionProperties,
            value => {
                emit('update:sidepanel-content', { path: 'optionProperties', value });
                if (registerOptionProperties) registerOptionProperties(value);
            },
            { immediate: true }
        );

        /* wwEditor:start */
        watch(
            isEditing,
            () => {
                emit('update:sidepanel-content', { path: 'showEmptyStateInEditor', value: false });
            },
            { immediate: true, deep: true }
        );
        /* wwEditor:end */

        return {
            emptyStateText,
            filteredOptions,
            virtualScroll,
            virtualScrollSizeDependencies,
            virtualScrollMinItemSize,
            virtualScrollBuffer,
            showEmptyStateInEditor,
            dynamicScrollerItems,
            emptyStateStyle,
            selectType,
            isGroupSelected,
            toggleGroup,
        };
    },
};
</script>

<style>
@import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

.ww-select-group-label {
    display: flex;
    align-items: center;
    gap: 0.5em;
}
</style>
