<template>
    <div
        class="query-multi-select"
        :class="{ 'query-multi-select--disabled': disabled }"
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
                            :aria-label="`Remover ${option.label}`"
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
            </div>
            <span class="query-multi-select__icon" aria-hidden="true">▾</span>
        </button>
        <div v-if="isOpen" class="query-multi-select__dropdown" ref="dropdownRef">
            <div v-if="loading" class="query-multi-select__state">Carregando...</div>
            <div v-else-if="!options.length" class="query-multi-select__state">Sem opções</div>
            <ul v-else class="query-multi-select__list">
                <li v-for="option in options" :key="String(option.value)" class="query-multi-select__option">
                    <label>
                        <input
                            type="checkbox"
                            :value="String(option.value)"
                            :checked="isSelected(option.value)"
                            @change="toggleValue(option.value)"
                        />
                        <span>{{ option.label }}</span>
                    </label>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount, onBeforeUpdate } from 'vue';

export default {
    name: 'QueryMultiSelect',
    props: {
        modelValue: { type: [Array, String], default: () => [] },
        options: { type: Array, default: () => [] },
        placeholder: { type: String, default: 'Selecione...' },
        disabled: { type: Boolean, default: false },
        loading: { type: Boolean, default: false },
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
        const optionsState = computed(() => props.options);
        const disabledState = computed(() => props.disabled);

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
            const entries = props.options.map((option) => [String(option.value), option]);
            return new Map(entries);
        });

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
            if (isOpen.value) {
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
            emit('update:modelValue', values);
            updateChipVisibility();
        };

        const toggleValue = (value) => {
            if (props.disabled) {
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

        const removeValue = (value) => {
            const stringValue = String(value);
            const values = normalizedValue.value.filter((item) => item !== stringValue);
            emitValue(values);
        };

        watch(normalizedValue, updateChipVisibility, { immediate: true });
        watch(() => props.options, updateChipVisibility);
        watch(isOpen, (open) => {
            if (open) {
                nextTick(updateChipVisibility);
            }
        });
        watch(chipContainer, (element, previous) => {
            if (resizeObserver && previous) {
                resizeObserver.unobserve(previous);
            }
            if (resizeObserver && element) {
                resizeObserver.observe(element);
            }
        });

        onMounted(() => {
            document.addEventListener('click', handleClickOutside);
            window.addEventListener('resize', updateChipVisibility);
            if (window.ResizeObserver) {
                resizeObserver = new ResizeObserver(updateChipVisibility);
                if (chipContainer.value) {
                    resizeObserver.observe(chipContainer.value);
                }
            }
            updateChipVisibility();
        });

        onBeforeUnmount(() => {
            document.removeEventListener('click', handleClickOutside);
            window.removeEventListener('resize', updateChipVisibility);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        });

        onBeforeUpdate(() => {
            chipRefs.value = [];
        });

        const setChipRef = (el) => {
            if (el) {
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
            options: optionsState,
            disabled: disabledState,
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

.query-multi-select__chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background-color: #2563eb;
    color: #ffffff;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    white-space: nowrap;
}

.query-multi-select__chip--counter {
    background-color: #374151;
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
    font-size: 18px;
    color: #6b7280;
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
}

.query-multi-select__option label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    cursor: pointer;
}

.query-multi-select__option input[type='checkbox'] {
    cursor: pointer;
}

.query-multi-select--disabled .query-multi-select__trigger {
    background-color: #f9fafb;
}
</style>
