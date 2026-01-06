<template>
    <div
        :class="['ww-select-option', isFocused ? 'focused' : '', isOptionDisabled ? 'disabled' : '']"
        :style="optionStyles"
        ref="optionRef"
        @click="handleClick"
        @mousedown="handleMouseDown"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
        @keydown="handleKeyDown"
        role="option"
        :id="optionId"
        :aria-selected="isSelected"
        :aria-disabled="isOptionDisabled"
    >
        <label v-if="selectType === 'multiple'" class="ww-select-option-checkbox">
            <input
                type="checkbox"
                :checked="data.isSelected"
                :disabled="data.isOptionDisabled"
                @change.stop="toggle"
                @click.stop
            />
            <div class="user-option-content">
                <template v-if="isUsersCombo">
                    <div class="avatar-outer" v-if="!isGroupOption">
                        <div class="avatar-middle">
                            <div class="user-selector__avatar">
                                <img v-if="avatarUrl" :src="avatarUrl" :alt="translateText('User avatar')" />
                                <div v-else class="user-selector__initial">{{ avatarInitial }}</div>
                            </div>
                        </div>
                    </div>
                    <div class="avatar-outer group-avatar-wrapper" v-else>
                        <div class="avatar-middle">
                            <div class="user-selector__avatar">
                                <span class="material-symbols-outlined user-selector__group-icon">groups</span>
                            </div>
                        </div>

                    </div>
                </template>
                <span :style="optionTextStyles" v-html="data.label || ''"></span>
            </div>
        </label>
        <template v-else>
            <div class="user-option-content">
                <template v-if="isUsersCombo">
                    <div class="avatar-outer" v-if="!isGroupOption">
                        <div class="avatar-middle">
                            <div class="user-selector__avatar">
                                <img v-if="avatarUrl" :src="avatarUrl" :alt="translateText('User avatar')" />
                                <div v-else class="user-selector__initial">{{ avatarInitial }}</div>
                            </div>
                        </div>
                    </div>
                    <div class="avatar-outer group-avatar-wrapper" v-else>
                        <div class="avatar-middle">
                            <div class="user-selector__avatar">
                                <span class="material-symbols-outlined user-selector__group-icon">groups</span>
                            </div>
                        </div>

                    </div>
                </template>
                <span :style="optionTextStyles" v-html="data.label || ''"></span>
            </div>
            <div v-if="data.isSelected" v-html="optionIcon" :style="optionIconStyle" aria-hidden="true"></div>
        </template>
    </div>
</template>

<script>
import { ref, unref, toValue, inject, computed, watch, onBeforeUnmount, watchEffect, nextTick } from 'vue';
import useAccessibility from './useAccessibility_Option';
/* wwEditor:start */
import useEditorHint from './editor/useEditorHint';
/* wwEditor:end */
import { areValuesEqual } from './utils';
import { translateText } from './translation';

const SELECT_OPTION_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>';

export default {
    props: {
        content: { type: Object, required: true },
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
        localData: { type: Object, default: () => ({}) },
    },
    emits: ['update:content', 'update:sidepanel-content', 'add-state', 'remove-state'],
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

        const { getIcon } = wwLib.useIcons();

        const { resolveMappingFormula } = wwLib.wwFormula.useFormula();

        const registerOption = inject('_wwSelect:registerOption', () => {});
        const unregisterOption = inject('_wwSelect:unregisterOption', () => {});
        const optionRef = ref(null);
        const optionElement = computed(() => optionRef.value?.componentRef?.$el);
        const selectValue = inject('_wwSelect:value', ref(''));
        const selectType = inject('_wwSelect:type', ref('simple'));
        const setValue = inject('_wwSelect:setValue', () => {});
        const isDisabled = inject('_wwSelect:isDisabled', ref(false));
        const isReadonly = inject('_wwSelect:isReadonly', ref(false));
        const updateValue = inject('_wwSelect:updateValue', () => {});
        const removeSpecificValue = inject('_wwSelect:removeSpecificValue', () => {});
        const focusSelectElement = inject('_wwSelect:focusSelectElement', () => {});
        const activeDescendant = inject('_wwSelect:activeDescendant', ref(null));
        const isMouseDownOnOption = inject('_wwSelect:isMouseDownOnOption', ref(false));

        const mappingLabel = inject('_wwSelect:mappingLabel', ref(null));
        const mappingValue = inject('_wwSelect:mappingValue', ref(null));
        const mappingDisabled = inject('_wwSelect:mappingDisabled', ref(null));
        const mappingBgColor = inject('_wwSelect:mappingBgColor', ref(null));
        const mappingFontColor = inject('_wwSelect:mappingFontColor', ref(null));

        // Styles
        const resolvedBgColor = computed(() => {
            const path = toValue(mappingBgColor);
            return path ? wwLib.resolveObjectPropertyPath(props.localData, path) : null;
        });
        const resolvedFontColor = computed(() => {
            const path = toValue(mappingFontColor);
            return path ? wwLib.resolveObjectPropertyPath(props.localData, path) : null;
        });

        const optionStyles = computed(() => {
            return {
                padding: props.content.optionPadding,

                'font-family': props.content.optionFontFamily,
                'font-size': props.content.optionFontSize,
                'font-weight': props.content.optionFontWeight,
                cursor: props.content.optionCursor,
                'border-radius': props.content.optionBorderRadius,
                border: props.content.optionBorder,
                '--ww-select-option-bg-color-hover': props.content.optionBgColorHover,
                '--ww-select-option-bg-color-focused': props.content.optionBgColorFocused,
            };
        });

        const optionTextStyles = computed(() => {
            return {
                display: 'inline-block',
                padding: '4px 6px',
                'background-color': resolvedBgColor.value || props.content.optionBgColor,
                color: resolvedFontColor.value || props.content.optionFontColor,
                'border-radius': props.content.optionBorderRadius,
                'font-size' : '13px',
            };
        });


        const optionIcon = ref(null);

        watchEffect(async () => {
            optionIcon.value = (await getIcon(props.content.optionIcon)) || SELECT_OPTION_ICON;
        });

        const optionIconStyle = computed(() => {
            return {
                width: props.content.optionIconSize,
                color: props.content.optionIconColor,
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'pointer-events': 'none',
            };
        });

        const label = computed(() => {
            // Check if this is a wrapped primitive from OptionsList (has only 'value' and 'id' properties)
            const isWrappedPrimitive =
                props.localData &&
                typeof props.localData === 'object' &&
                'value' in props.localData &&
                'id' in props.localData &&
                Object.keys(props.localData).length === 2;

            if (isWrappedPrimitive) {
                // For wrapped primitives, use the inner value as the label
                return props.localData.value;
            }

            // Handle true primitive values (strings, numbers) vs objects
            const isPrimitive = typeof props.localData !== 'object' || props.localData === null;

            if (isPrimitive) {
                // For primitive values, use the value as the label
                return props.localData;
            }

            // For objects, prefer explicit label/value properties before falling back to mappings
            const mappedLabel = resolveMappingFormula(toValue(mappingLabel), props.localData);
            if (mappedLabel !== undefined && mappedLabel !== null && mappedLabel !== '') {
                return mappedLabel;
            }

            if (props.localData?.label !== undefined && props.localData?.label !== null) {
                return props.localData.label;
            }

            if (props.localData?.value !== undefined && props.localData?.value !== null) {
                return props.localData.value;
            }

            return props.content.label ?? props.localData;
        });

        const value = computed(() => {
            // Check if this is a wrapped primitive from OptionsList (has only 'value' and 'id' properties)
            const isWrappedPrimitive =
                props.localData &&
                typeof props.localData === 'object' &&
                'value' in props.localData &&
                'id' in props.localData &&
                Object.keys(props.localData).length === 2;

            if (isWrappedPrimitive) {
                // For wrapped primitives, use the inner value
                return props.localData.value;
            }

            // Handle true primitive values (strings, numbers) vs objects
            const isPrimitive = typeof props.localData !== 'object' || props.localData === null;

            if (isPrimitive) {
                // For primitive values, use the value itself
                return props.localData;
            }

            const mappedValue = resolveMappingFormula(toValue(mappingValue), props.localData);
            if (mappedValue !== undefined && mappedValue !== null && mappedValue !== '') {
                return mappedValue;
            }

            if (props.localData?.value !== undefined && props.localData?.value !== null) {
                return props.localData.value;
            }

            return props.content.value ?? props.localData;
        });
        const isOptionDisabled = computed(() => resolveMappingFormula(toValue(mappingDisabled), props.localData));

        const isFocused = computed(() => optionId == activeDescendant.value);

        const isSelected = computed(() =>
            selectType.value === 'single'
                ? areValuesEqual(selectValue.value, value.value)
                : Array.isArray(selectValue.value) && selectValue.value.some(v => areValuesEqual(v, value.value))
        );

        const isUsersCombo = computed(() => props.content.isUsers || false);
        const avatarUrl = computed(
            () =>
                props.localData?.photoUrl || props.localData?.PhotoURL || props.localData?.PhotoUrl
        );
        const isGroupOption = computed(() => {
            const d = props.localData || {};
            return (
                (Array.isArray(d.groupUsers) && d.groupUsers.length > 0) ||
                String(d.type || '').toLowerCase() === 'group' ||
                d.isAssignToTeam
            );
        });
        const avatarInitial = computed(() => (label.value || '').trim().charAt(0).toUpperCase());

        const { optionId, handleKeyDown, focusFromOptionId } = useAccessibility({
            emit,
            optionElement,
            content: props.content,
        });

        const option = computed(() => ({
            optionId,
            label: label.value,
            value: value.value,
            disabled: isOptionDisabled.value,
            isSelected: isSelected.value,
            _data: props.localData,
        }));

        unregisterOption(optionId);
        registerOption(optionId, unref(option));

        const canInteract = computed(
            () => !isEditing.value && !isOptionDisabled.value && !isDisabled.value && !isReadonly.value
        );

        const handleClick = () => {
            if (isSelected.value && canInteract.value && props.content.unselectOnClick) {
                unselect();
                focusFromOptionId(null);
            } else if (!isSelected.value && canInteract.value && props.content.selectOnClick) {
                updateValue(value.value);
                focusFromOptionId(optionId);
                focusSelectElement();
            }
        };

        const handleMouseDown = (event) => {
            // Track mousedown to prevent blur on the select element
            isMouseDownOnOption.value = true;
        };

        const handleMouseUp = () => {
            // Reset the flag after mouseup
            nextTick(() => {
                isMouseDownOnOption.value = false;
            });
        };

        const handleMouseLeave = () => {
            // Also reset if mouse leaves the option while pressed
            isMouseDownOnOption.value = false;
        };

        // Maybe => move this to the select component (selectType too + new isSelected function in the select)
        const unselect = () => {
            if (canInteract.value) {
                if (selectType.value === 'single') {
                    updateValue(null);
                } else {
                    removeSpecificValue(value.value);
                }
            }
        };

        const data = ref({
            isSelected: false,
            isOptionDisabled: false,
            label: '',
            value: '',
            _data: {},
        });

        const select = () => {
            if (canInteract.value) {
                updateValue(value.value);
            }
        };

        const toggle = () => {
            if (data.value.isSelected) {
                removeSpecificValue(value.value);
            } else {
                updateValue(value.value);
            }
        };

        /*
         * Create a data ref with initial empty values, then use a watcher to update it.
         * This pattern prevents circular dependencies that can occur when reactive refs
         * directly reference each other. Instead of creating a complex web of reactive
         * dependencies, we:
         * 1. Start with a clean slate (empty values)
         * 2. Use a watcher to explicitly update all values when any dependency changes
         * 3. Keep the data flow unidirectional (computed props -> watcher -> data ref)
         *
         * The previous approach of directly referencing computed properties in the ref
         * created an infinite loop because:
         * - The ref would try to access the computed properties
         * - The computed properties would trigger updates
         * - These updates would cause the ref to update
         * - Which would trigger the computed properties again... and so on
         */

        watch(
            [isSelected, isOptionDisabled, label, value],
            ([newIsSelected, newIsOptionDisabled, newLabel, newValue]) => {
                data.value = {
                    isSelected: newIsSelected,
                    isOptionDisabled: newIsOptionDisabled,
                    label: newLabel,
                    value: newValue,
                    _data: props.localData,
                };
            },
            { immediate: true }
        );

        const contextMethods = {
            select: {
                description: 'Select the current option',
                method: select,
                editor: { label: 'Select', group: 'Select Option', icon: 'cursor-click' },
            },
        };

        onBeforeUnmount(() => unregisterOption(optionId));

        const contextMarkdown = translateText(`### Select Option local informations

        // - \`isSelected\`: Boolean indicating if the option is selected
        // - \`isOptionDisabled\`: Boolean indicating if the option is disabled
        // - \`label\`: The label of the option (will be overwritten if defined in the Select root element)
        // - \`value\`: The value of the option (will be overwritten if defined in the Select root element)`);

        return {
            optionRef,
            optionId,
            handleClick,
            handleMouseDown,
            handleMouseUp,
            handleMouseLeave,
            handleKeyDown,
            isFocused,
            activeDescendant,
            option,
            optionStyles,
            optionTextStyles,
            optionIcon,
            optionIconStyle,
            contextMethods,
            data,
            contextMarkdown,
            isOptionDisabled,
            selectType,
            toggle,
            isSelected,
            isUsersCombo,
            avatarUrl,
            avatarInitial,
            isGroupOption,
            translateText,
        };
    },
};
</script>

<style scoped lang="scss">
.ww-select-option {
    cursor: pointer;
    display: flex;
    font-size: 13px;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    &:hover {
        background-color: var(--ww-select-option-bg-color-hover) !important;
    }
    &.focused {
        background-color: var(--ww-select-option-bg-color-focused) !important;
    }
    &.disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }
}

.ww-select-option-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5em;
}

.user-option-content {
    display: flex;
    align-items: center;
    gap: 0.5em;
}

.avatar-outer {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px solid #3A4663;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
}

.avatar-middle {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 2px solid #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
}

.user-selector__avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #4B6CB7;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.user-selector__avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
}

.user-selector__initial {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 400;
    background: transparent;
    color: #fff;
    border-radius: 50%;
    letter-spacing: 0.5px;
}

.user-selector__group-icon {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    color: #fff;

}
</style>
