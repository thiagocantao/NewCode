<template>
    <div ref="root" class="icon-selector" :class="{ 'icon-selector--open': isPopupOpen }">
        <button
            class="icon-selector__trigger"
            type="button"
            :aria-expanded="isPopupOpen"
            aria-haspopup="listbox"
            aria-label="Selecionar ícone"
            @click="togglePopup"
        >
            <span v-if="visibleIcon" class="material-symbols-outlined" aria-hidden="true">{{ visibleIcon }}</span>
            <span v-else class="icon-selector__placeholder">Selecionar</span>
        </button>

        <div v-if="isPopupOpen" class="icon-selector__popup" role="listbox" aria-label="Lista de ícones">
            <button
                v-for="icon in availableIcons"
                :key="icon.name"
                class="icon-selector__item"
                type="button"
                :class="{ 'icon-selector__item--selected': icon.name === selectedIcon }"
                :aria-selected="icon.name === selectedIcon"
                @click="selectIcon(icon.name)"
            >
                <span class="material-symbols-outlined" aria-hidden="true">{{ icon.name }}</span>
            </button>

            <div v-if="!availableIcons.length" class="icon-selector__empty">Nenhum ícone disponível</div>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        content: { type: Object, required: true },
        wwElementState: { type: Object, required: true },
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
    },
    emits: ['update:content:effect', 'update:content', 'element-event'],

    data() {
        return {
            currentSelectedItem: this.content.currentSelectedItem || this.content.selectedIcon || '',
            setCurrentSelectedItem: null,
            isPopupOpen: false,
        };
    },
    created() {
        this.initializePublicVariables();
    },
    mounted() {
        document.addEventListener('click', this.handleClickOutside);
    },
    beforeUnmount() {
        document.removeEventListener('click', this.handleClickOutside);
    },
    computed: {
        availableIcons() {
            const source = this.content.availableIcons;

            const parsedSource = typeof source === 'string' ? this.parseJsonSource(source) : source;

            if (!Array.isArray(parsedSource)) {
                return [];
            }

            return parsedSource
                .map((icon) => this.normalizeIcon(icon))
                .filter(Boolean);
        },
        selectedIcon() {
            return this.content.currentSelectedItem || this.content.selectedIcon || '';
        },
        visibleIcon() {
            return this.selectedIcon || this.availableIcons[0]?.name || '';
        },
    },
    watch: {
        selectedIcon(newSelectedIcon) {
            this.currentSelectedItem = newSelectedIcon;
            this.syncCurrentSelectedItem(newSelectedIcon);
        },
    },
    methods: {
        setSelectedItem(actionItem) {
            this.selectItemFromAction(actionItem);
        },
        initializePublicVariables() {
            if (typeof wwLib === 'undefined' || !wwLib?.wwVariable?.useComponentVariable) {
                return;
            }

            const uid = this.wwElementState?.uid;
            if (!uid) {
                return;
            }

            const currentSelectedItemVariable = wwLib.wwVariable.useComponentVariable({
                uid,
                name: 'currentSelectedItem',
                type: 'string',
                defaultValue: this.currentSelectedItem,
                readonly: true,
            });

            this.setCurrentSelectedItem = currentSelectedItemVariable.setValue;
            this.syncCurrentSelectedItem(this.currentSelectedItem);
        },
        syncCurrentSelectedItem(value) {
            this.setCurrentSelectedItem?.(value || '');
        },
        parseJsonSource(source) {
            try {
                return JSON.parse(source);
            } catch (error) {
                return [];
            }
        },
        normalizeIcon(icon) {
            if (typeof icon === 'string') {
                const name = icon.trim();
                return name ? { name } : null;
            }

            if (!icon || typeof icon !== 'object') {
                return null;
            }

            const name = typeof icon.name === 'string' ? icon.name.trim() : '';
            return name ? { ...icon, name } : null;
        },
        togglePopup() {
            this.isPopupOpen = !this.isPopupOpen;
        },
        closePopup() {
            this.isPopupOpen = false;
        },
        handleClickOutside(event) {
            if (!this.isPopupOpen) {
                return;
            }

            if (this.$refs.root?.contains(event.target)) {
                return;
            }

            this.closePopup();
        },
        selectItemFromAction(actionItem) {
            const normalizedActionItem = this.unwrapActionItem(actionItem);
            const icon = this.resolveIconFromActionItem(normalizedActionItem);

            if (!icon?.name) {
                return;
            }

            const selectedItemId = this.resolveSelectedItemId(normalizedActionItem, icon);
            this.selectIcon(icon.name, {
                selectedItemId,
                forceUpdate: true,
            });
        },
        unwrapActionItem(actionItem) {
            if (actionItem && typeof actionItem === 'object' && 'item' in actionItem && Object.keys(actionItem).length === 1) {
                return actionItem.item;
            }

            return actionItem;
        },
        resolveIconFromActionItem(actionItem) {
            if (actionItem && typeof actionItem === 'object') {
                const rawName = actionItem.name ?? actionItem.icon ?? actionItem.selectedIcon;
                const iconName = `${rawName || ''}`.trim();

                if (iconName) {
                    return this.availableIcons.find(icon => icon.name === iconName) || { ...actionItem, name: iconName };
                }

                const rawId = actionItem.id ?? actionItem.itemId ?? actionItem.value;
                const iconId = `${rawId || ''}`.trim();

                if (iconId) {
                    return this.availableIcons.find(icon => `${icon?.id ?? ''}`.trim() === iconId) || null;
                }

                return null;
            }

            const normalizedValue = `${actionItem || ''}`.trim();

            if (!normalizedValue) {
                return null;
            }

            return (
                this.availableIcons.find(icon => icon.name === normalizedValue) ||
                this.availableIcons.find(icon => `${icon?.id ?? ''}`.trim() === normalizedValue) ||
                { name: normalizedValue }
            );
        },
        resolveSelectedItemId(actionItem, icon) {
            if (actionItem && typeof actionItem === 'object') {
                const rawId = actionItem.id ?? actionItem.itemId ?? actionItem.value;
                const normalizedId = `${rawId || ''}`.trim();

                if (normalizedId) {
                    return normalizedId;
                }
            }

            const iconId = `${icon?.id ?? ''}`.trim();
            if (iconId) {
                return iconId;
            }

            return `${icon?.name || ''}`.trim();
        },
        selectIcon(iconName, options = {}) {
            this.closePopup();

            const normalizedIconName = `${iconName || ''}`.trim();
            if (!normalizedIconName) {
                return;
            }

            const selectedItemId = `${options.selectedItemId || normalizedIconName}`.trim();
            const shouldSkipUpdate = normalizedIconName === this.selectedIcon && selectedItemId === this.currentSelectedItem && !options.forceUpdate;

            if (shouldSkipUpdate) {
                return;
            }

            this.currentSelectedItem = selectedItemId;
            this.syncCurrentSelectedItem(selectedItemId);

            this.$emit('update:content', {
                ...this.content,
                selectedIcon: normalizedIconName,
                currentSelectedItem: selectedItemId,
            });
            this.$emit('element-event', {
                type: 'icon-select',
                icon: normalizedIconName,
                selectedItemId,
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.icon-selector {
    position: relative;
    display: inline-flex;

    &::before {
        content: none !important;
        display: none !important;
    }
}

.icon-selector__trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #ffffff;
    cursor: pointer;

    .material-symbols-outlined {
        font-size: 28px;
        line-height: 28px;
        color: #777;
    }
}

.icon-selector__popup {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    z-index: 10;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 8px;
    width: min(280px, 100vw - 24px);
    max-height: 232px;
    overflow-y: auto;
    padding: 8px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
}

.icon-selector__item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;

    &:hover {
        background: #f3f4f6;
    }

    .material-symbols-outlined {
        font-size: 28px;
        line-height: 28px;
        color: #777;
    }
}

.icon-selector__item--selected {
    border-color: #2563eb;
    background: #dbeafe;
}

.icon-selector__empty {
    width: 100%;
    color: #6b7280;
    font-size: 12px;
    text-align: center;
    padding: 8px;
}

.icon-selector__placeholder {
    font-size: 10px;
    color: #6b7280;
}
</style>
