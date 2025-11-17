<template>
    <div
        class="query-multi-select"
        :class="{ 'query-multi-select--disabled': disabled }"
        :style="chipStyles"
        ref="rootRef"
    >
        <button
            type="button"
            class="query-multi-select__trigger"
            :aria-expanded="isOpen"
            :aria-haspopup="true"
            :disabled="disabled"
            @click="toggleDropdown"
        >
            <div class="query-multi-select__chips" ref="chipContainer">
                <template v-if="isMultiple">
                    <template v-if="selectedOptions.length">
                        <span
                            v-for="(option, index) in selectedOptions"
                            :key="option.value"
                            class="query-multi-select__chip"
                            :class="{ 'query-multi-select__chip--hidden': index >= visibleChipCount }"
                            :ref="setChipRef"
                        >
                            <span class="query-multi-select__chip-label">{{ option.label }}</span>
                            <button
                                type="button"
                                class="query-multi-select__chip-remove"
                                :aria-label="`${translateText('Remove')} ${option.label}`"
                                @click.stop="removeValue(option.value)"
                            >
                                X
                            </button>
                        </span>
                        <span
                            v-if="hiddenChipCount > 0"
                            class="query-multi-select__chip query-multi-select__chip--counter"
                        >
                            +{{ hiddenChipCount }}
                        </span>
                    </template>
                    <span v-else class="query-multi-select__placeholder">{{ placeholder }}</span>
                </template>
                <template v-else>
                    <span
                        v-if="selectedOption"
                        class="query-multi-select__single-value"
                        :title="selectedOption.label"
                    >
                        {{ selectedOption.label }}
                    </span>
                    <span v-else class="query-multi-select__placeholder">{{ placeholder }}</span>
                </template>
            </div>
            <span class="query-multi-select__icon material-symbols-outlined" aria-hidden="true">keyboard_arrow_down</span>
        </button>
        <div v-if="isOpen" class="query-multi-select__dropdown" ref="dropdownRef">
            <div v-if="loading" class="query-multi-select__state">{{ translateText('Loading...') }}</div>
            <template v-else>
                <div class="query-multi-select__search">
                    <span class="material-symbols-outlined query-multi-select__search-icon" aria-hidden="true">search</span>
                    <input
                        ref="searchInputRef"
                        v-model="searchTerm"
                        type="text"
                        class="query-multi-select__search-input"
                        :placeholder="translateText('Search...')"
                        @keydown.stop
                    />
                </div>
                <div v-if="!hasOptions" class="query-multi-select__state">{{ translateText('No options') }}</div>
                <div v-else-if="!filteredOptions.length" class="query-multi-select__state">
                    {{ translateText('No results found') }}
                </div>
                <ul v-else class="query-multi-select__list">
                    <li
                        v-for="option in filteredOptions"
                        :key="String(option.value)"
                        class="query-multi-select__option"
                        :class="{ 'query-multi-select__option--selected': isSelected(option.value) }"
                    >
                        <label v-if="isMultiple">
                            <input
                                type="checkbox"
                                :value="String(option.value)"
                                :checked="isSelected(option.value)"
                                @change="toggleValue(option.value)"
                            />
                            <span>{{ option.label }}</span>
                        </label>
                        <button
                            v-else
                            type="button"
                            class="query-multi-select__option-button"
                            @click="selectSingleValue(option.value)"
                        >
                            {{ option.label }}
                        </button>
                    </li>
                </ul>
            </template>
        </div>
    </div>
</template>

<script>
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount, onBeforeUpdate } from 'vue';
import { translateText } from '../translation';

export default {
    name: 'QueryMultiSelect',
    props: {
        modelValue: { type: [Array, String], default: () => [] },
        options: { type: Array, default: () => [] },
        placeholder: { type: String, default: () => translateText('Select...') },
        disabled: { type: Boolean, default: false },
        loading: { type: Boolean, default: false },
        chipBackgroundColor: { type: String, default: '#2563eb' },
        chipTextColor: { type: String, default: '#ffffff' },
        multiple: { type: Boolean, default: true },
    },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
        const isOpen = ref(false);
        const rootRef = ref(null);
        const dropdownRef = ref(null);
        const chipContainer = ref(null);
        const chipRefs = ref([]);
        const visibleChipCount = ref(Number.POSITIVE_INFINITY);
        const hiddenChipCount = ref(0);
        let resizeObserver = null;
        const placeholderText = computed(() => props.placeholder);
        const loadingState = computed(() => props.loading);
        const optionsState = computed(() => (Array.isArray(props.options) ? props.options : []));
        const searchTerm = ref('');
        const searchInputRef = ref(null);
        const disabledState = computed(() => props.disabled);
        const isMultiple = computed(() => props.multiple !== false);

        const normalizedValue = computed(() => {
            if (Array.isArray(props.modelValue)) {
                return props.modelValue.map((item) => String(item));
            }
            if (props.modelValue === null || props.modelValue === undefined || props.modelValue === '') {
                return [];
            }
            return [String(props.modelValue)];
        });

        const optionMap = computed(() => {
            const entries = optionsState.value.map((option) => [String(option.value), option]);
            return new Map(entries);
        });

        const chipStyles = computed(() => ({
            '--query-multi-select-chip-bg': props.chipBackgroundColor || '#2563eb',
            '--query-multi-select-chip-color': props.chipTextColor || '#ffffff',
        }));

        const normalizedSearch = computed(() => searchTerm.value.trim().toLowerCase());

        const filteredOptions = computed(() => {
            const term = normalizedSearch.value;
            if (!term) {
                return optionsState.value;
            }
            return optionsState.value.filter((option) => {
                const label = String(option?.label ?? '').toLowerCase();
                const value = String(option?.value ?? '').toLowerCase();
                return label.includes(term) || value.includes(term);
            });
        });

        const hasOptions = computed(() => optionsState.value.length > 0);

        const selectedOptions = computed(() => {
            const seen = new Set();
            const list = [];
            normalizedValue.value.forEach((value) => {
                if (seen.has(value)) {
                    return;
                }
                seen.add(value);
                const option = optionMap.value.get(value);
                list.push(option ? { ...option, value } : { label: value, value });
            });
            return list;
        });

        const selectedOption = computed(() => (selectedOptions.value.length ? selectedOptions.value[0] : null));

        const updateChipVisibility = () => {
            visibleChipCount.value = Number.POSITIVE_INFINITY;
            hiddenChipCount.value = 0;
            nextTick(() => {
                const container = chipContainer.value;
                const chips = chipRefs.value;
                if (!container || !Array.isArray(chips) || chips.length === 0) {
                    visibleChipCount.value = chips?.length || Number.POSITIVE_INFINITY;
                    hiddenChipCount.value = 0;
                    return;
                }

                const containerWidth = container.clientWidth;
                if (!containerWidth) {
                    visibleChipCount.value = chips.length;
                    hiddenChipCount.value = 0;
                    return;
                }

                let usedWidth = 0;
                let visible = 0;
                const style = window.getComputedStyle(container);
                const gap = parseFloat(style.columnGap || style.gap || '0') || 0;
                const widths = [];

                for (let index = 0; index < chips.length; index += 1) {
                    const chip = chips[index];
                    if (!chip) {
                        continue;
                    }
                    const chipWidth = chip.offsetWidth;
                    const space = visible > 0 ? gap : 0;
                    if (usedWidth + chipWidth + space <= containerWidth) {
                        usedWidth += chipWidth + space;
                        widths.push(chipWidth);
                        visible = index + 1;
                    } else {
                        break;
                    }
                }

                const computeTotalWidth = (count) => {
                    let total = 0;
                    for (let i = 0; i < count; i += 1) {
                        total += widths[i] ?? 0;
                        if (i > 0) {
                            total += gap;
                        }
                    }
                    return total;
                };

                let hidden = chips.length - visible;
                let totalWidth = computeTotalWidth(visible);
                const COUNTER_WIDTH = hidden > 0 ? 32 : 0;

                if (hidden > 0) {
                    while (visible > 0 && totalWidth + COUNTER_WIDTH > containerWidth) {
                        visible -= 1;
                        hidden += 1;
                        totalWidth = computeTotalWidth(visible);
                    }
                    if (visible === 0 && chips.length > 0) {
                        visible = 1;
                        hidden = chips.length - 1;
                    }
                }

                if (visible === 0 && chips.length === 0) {
                    visibleChipCount.value = Number.POSITIVE_INFINITY;
                    hiddenChipCount.value = 0;
                    return;
                }

                visibleChipCount.value = visible === 0 ? 0 : visible;
                hiddenChipCount.value = hidden > 0 ? hidden : 0;
            });
        };

        const toggleDropdown = () => {
            if (props.disabled) {
                return;
            }
            isOpen.value = !isOpen.value;
            if (isOpen.value && isMultiple.value) {
                updateChipVisibility();
            }
        };

        const closeDropdown = () => {
            isOpen.value = false;
        };

        const handleClickOutside = (event) => {
            const root = rootRef.value;
            if (!root) {
                return;
            }
            if (!root.contains(event.target)) {
                closeDropdown();
            }
        };

        const isSelected = (value) => normalizedValue.value.includes(String(value));

        const emitValue = (values) => {
            if (isMultiple.value) {
                emit('update:modelValue', values);
                updateChipVisibility();
            } else {
                const [first] = values;
                emit('update:modelValue', first ?? '');
            }
        };

        const toggleValue = (value) => {
            if (props.disabled) {
                return;
            }
            if (!isMultiple.value) {
                selectSingleValue(value);
                return;
            }
            const stringValue = String(value);
            const values = normalizedValue.value.slice();
            const index = values.indexOf(stringValue);
            if (index >= 0) {
                values.splice(index, 1);
            } else {
                values.push(stringValue);
            }
            emitValue(values);
        };

        const selectSingleValue = (value) => {
            if (props.disabled) {
                return;
            }
            const stringValue = String(value);
            emitValue([stringValue]);
            closeDropdown();
        };

        const removeValue = (value) => {
            const stringValue = String(value);
            const values = normalizedValue.value.filter((item) => item !== stringValue);
            emitValue(values);
        };

        watch(
            normalizedValue,
            () => {
                if (isMultiple.value) {
                    updateChipVisibility();
                }
            },
            { immediate: true },
        );
        watch(
            () => props.options,
            () => {
                if (isMultiple.value) {
                    updateChipVisibility();
                }
            },
        );
        watch(isOpen, (open) => {
            if (open) {
                searchTerm.value = '';
                nextTick(() => {
                    if (isMultiple.value) {
                        updateChipVisibility();
                    }
                    if (!loadingState.value && searchInputRef.value) {
                        searchInputRef.value.focus();
                    }
                });
            } else {
                searchTerm.value = '';
            }
        });
        watch(loadingState, (loading) => {
            if (!loading && isOpen.value) {
                nextTick(() => {
                    if (searchInputRef.value) {
                        searchInputRef.value.focus();
                    }
                });
            }
        });
        watch(chipContainer, (element, previous) => {
            if (!isMultiple.value) {
                return;
            }
            if (resizeObserver && previous) {
                resizeObserver.unobserve(previous);
            }
            if (resizeObserver && element) {
                resizeObserver.observe(element);
            }
        });

        onMounted(() => {
            document.addEventListener('click', handleClickOutside);
            if (isMultiple.value) {
                window.addEventListener('resize', updateChipVisibility);
                if (window.ResizeObserver) {
                    resizeObserver = new ResizeObserver(updateChipVisibility);
                    if (chipContainer.value) {
                        resizeObserver.observe(chipContainer.value);
                    }
                }
                updateChipVisibility();
            }
        });

        onBeforeUnmount(() => {
            document.removeEventListener('click', handleClickOutside);
            if (isMultiple.value) {
                window.removeEventListener('resize', updateChipVisibility);
                if (resizeObserver) {
                    resizeObserver.disconnect();
                }
            }
        });

        onBeforeUpdate(() => {
            if (isMultiple.value) {
                chipRefs.value = [];
            }
        });

        const setChipRef = (el) => {
            if (el && isMultiple.value) {
                chipRefs.value.push(el);
            }
        };

        return {
            isOpen,
            rootRef,
            dropdownRef,
            chipContainer,
            selectedOptions,
            visibleChipCount,
            hiddenChipCount,
            toggleDropdown,
            toggleValue,
            isSelected,
            removeValue,
            setChipRef,
            placeholder: placeholderText,
            loading: loadingState,
            filteredOptions,
            hasOptions,
            disabled: disabledState,
            chipStyles,
            searchTerm,
            searchInputRef,
            isMultiple,
            selectSingleValue,
            selectedOption,
            translateText,
        };
    },
};
</script>

<style scoped>
.query-multi-select {
    position: relative;
    width: 100%;
}

.query-multi-select__trigger {
    width: 100%;
    min-height: 36px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #e0e0e0;
    border-radius: 4px;
    background-color: #ffffff;
    cursor: pointer;
    padding: 4px 8px;
    gap: 8px;
}

.query-multi-select__trigger:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.query-multi-select__chips {
    display: flex;
    flex-wrap: nowrap;
    gap: 4px;
    align-items: center;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    position: relative;
}

.query-multi-select__placeholder {
    color: #6b7280;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.query-multi-select__single-value {
    color: #111827;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.query-multi-select__chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background-color: var(--query-multi-select-chip-bg, #2563eb);
    color: var(--query-multi-select-chip-color, #ffffff);
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    white-space: nowrap;
}

.query-multi-select__chip--counter {
    background-color: var(--query-multi-select-chip-bg, #2563eb);
    color: var(--query-multi-select-chip-color, #ffffff);
}

.query-multi-select__chip--hidden {
    position: absolute;
    visibility: hidden;
    pointer-events: none;
}

.query-multi-select__chip-remove {
    border: none;
    background: none;
    color: inherit;
    cursor: pointer;
    padding: 0;
    font-size: 12px;
    line-height: 1;
}

.query-multi-select__chip-remove:hover {
    opacity: 0.8;
}

.query-multi-select__icon {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    font-family: 'Material Symbols Outlined';
    font-weight: normal;
    font-style: normal;
    font-size: 20px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    color: #6b7280;
    user-select: none;
    -webkit-font-smoothing: antialiased;
}

.query-multi-select__dropdown {
    position: absolute;
    z-index: 10;
    left: 0;
    right: 0;
    margin-top: 4px;
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.1);
    max-height: 240px;
    overflow: auto;
    padding: 8px;
}

.query-multi-select__search {
    position: sticky;
    top: 0;
    display: flex;
    align-items: center;
    padding-bottom: 12px;
    background-color: #ffffff;
    z-index: 1;
}

.query-multi-select__search-input {
    width: 100%;
    border: 1.5px solid #bdbdbd !important;
    border-radius: 20px;
    padding: 7px 38px 7px 12px;
    font-size: 13px;
    background: #f8f9fa;
    color: #787878;
    outline: none !important;
    transition: border 0.2s, background 0.2s;
}

.query-multi-select__search-input:focus,
.query-multi-select__search-input:active,
.query-multi-select__search-input:hover {
    border-color: #bdbdbd !important;
    background: #ffffff;
}

.query-multi-select__search-input::placeholder {
    color: #787878;
    opacity: 1;
}

.query-multi-select__search-icon {
    position: absolute;
    right: 12px;
    top: 15px;
    transform: translateY(-50%);
    font-size: 20px;
    color: #bdbdbd;
    pointer-events: none;
}

.query-multi-select__state {
    padding: 12px;
    font-size: 13px;
    color: #6b7280;
}

.query-multi-select__list {
    list-style: none;
    margin: 0;
    padding: 4px 0;
}

.query-multi-select__option {
    padding: 8px 12px;
    border-radius: 4px;
}

.query-multi-select__option--selected {
    background-color: #f3f4f6;
}

.query-multi-select__option label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    cursor: pointer;
}

.query-multi-select__option-button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    cursor: pointer;
    background: transparent;
    border: none;
    padding: 0;
    color: inherit;
    text-align: left;
}

.query-multi-select__option-button:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
}

.query-multi-select__option input[type='checkbox'],
.query-multi-select__option input[type='radio'] {
    cursor: pointer;
}

.query-multi-select--disabled .query-multi-select__trigger {
    background-color: #f9fafb;
}
</style>
