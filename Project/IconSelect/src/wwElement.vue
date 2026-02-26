<template>
    <div class="icon-selector" role="listbox" aria-label="Icon selector">
        <button
            v-for="iconName in availableIcons"
            :key="iconName"
            class="icon-selector__item"
            type="button"
            :class="{ 'icon-selector__item--selected': iconName === selectedIcon }"
            :aria-selected="iconName === selectedIcon"
            @click="selectIcon(iconName)"
        >
            <span class="material-symbols-outlined" aria-hidden="true">{{ iconName }}</span>
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
    computed: {
        availableIcons() {
            const source = this.content.availableIcons;

            if (Array.isArray(source)) {
                return source.map((icon) => String(icon).trim()).filter(Boolean);
            }

            if (typeof source !== 'string') {
                return [];
            }

            return source
                .split('\n')
                .map((icon) => icon.trim())
                .filter(Boolean);
        },
        selectedIcon() {
            return this.content.selectedIcon || '';
        },
    },
    methods: {
        selectIcon(iconName) {
            if (iconName === this.selectedIcon) {
                return;
            }

            this.$emit('update:content', {
                ...this.content,
                selectedIcon: iconName,
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
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
    gap: 8px;
    width: 100%;
    max-height: 232px;
    overflow-y: auto;
    padding: 8px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #ffffff;
}

.icon-selector__item {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;

    &:hover {
        background: #f3f4f6;
    }

    .material-symbols-outlined {
        font-size: 24px;
        line-height: 24px;
    }
}

.icon-selector__item--selected {
    border-color: #2563eb;
    background: #dbeafe;
}

.icon-selector__empty {
    grid-column: 1 / -1;
    color: #6b7280;
    font-size: 12px;
    text-align: center;
    padding: 8px;
}
</style>
