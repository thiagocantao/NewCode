<template>
    <div class="icon-selector" role="listbox" aria-label="Icon selector">
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
            currentSelectedItem: this.content.selectedIcon || '',
            setCurrentSelectedItem: null,
        };
    },
    created() {
        this.initializePublicVariables();
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
    },
    watch: {
        selectedIcon(newSelectedIcon) {
            this.currentSelectedItem = newSelectedIcon;
            this.syncCurrentSelectedItem(newSelectedIcon);
        },
    },
    watch: {
        selectedIcon(newSelectedIcon) {
            this.currentSelectedItem = newSelectedIcon;
        },
    },
    methods: {
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
        selectIcon(iconName) {
            if (iconName === this.selectedIcon) {
                return;
            }

            this.currentSelectedItem = iconName;
            this.syncCurrentSelectedItem(iconName);

            this.$emit('update:content', {
                ...this.content,
                selectedIcon: iconName,
                currentSelectedItem: iconName,
            });
            this.$emit('element-event', {
                type: 'icon-select',
                icon: iconName,
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.icon-selector {
    display: flex !important;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
    max-height: 232px;
    overflow-y: auto;
    padding: 8px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #ffffff;

    &::before {
        content: none !important;
        display: none !important;
    }
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
</style>
