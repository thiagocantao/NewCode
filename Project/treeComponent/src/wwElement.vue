<template>
    <div class="tree-manager" :style="containerStyle">
        <div class="tree-manager__toolbar">
            <button
                class="icon-button"
                type="button"
                :style="iconButtonStyle"
                @click="onAdd"
                aria-label="Adicionar"
                title="Adicionar"
            >
                +
            </button>
            <div class="search-box">
                <span class="search-icon">🔍</span>
                <input
                    v-model="searchText"
                    class="search-input"
                    type="text"
                    :placeholder="content.searchPlaceholder || 'Pesquisar...'"
                />
            </div>
        </div>

        <div class="tree-manager__content">
            <div
                v-for="row in visibleRows"
                :key="`row-${row.id}`"
                class="tree-row"
                :style="{ paddingLeft: `${row.depth * 16 + 8}px` }"
                @click="onNodeClick(row.raw)"
            >
                <button
                    v-if="row.hasChildren"
                    class="toggle-button"
                    type="button"
                    :style="iconButtonStyle"
                    @click.stop="toggleNode(row.id)"
                    :disabled="row.depth >= normalizedMaxLevel - 1"
                >
                    {{ isExpanded(row.id) ? '▾' : '▸' }}
                </button>
                <span v-else class="toggle-placeholder"></span>

                <span
                    class="node-icon"
                    :style="iconStyle"
                    :title="row.icon"
                >
                    {{ row.icon }}
                </span>

                <span class="node-label" v-html="highlightLabel(row.label)"></span>
            </div>
            <div v-if="!visibleRows.length" class="empty-state">Nenhum item encontrado.</div>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        content: { type: Object, required: true },
    },
    emits: ['trigger-event'],
    data() {
        return {
            searchText: '',
            expandedNodes: {},
        };
    },
    computed: {
        normalizedData() {
            return Array.isArray(this.content.data) ? this.content.data : [];
        },
        normalizedMaxLevel() {
            const maxLevel = Number(this.content.maxLevel);
            if (!Number.isFinite(maxLevel) || maxLevel < 1) return 1;
            return Math.floor(maxLevel);
        },
        fieldMap() {
            return {
                label: this.content.labelField || 'label',
                id: this.content.idField || 'id',
                parentId: this.content.parentIdField || 'parentId',
                icon: this.content.iconField || '',
            };
        },
        tree() {
            const map = new Map();
            const roots = [];

            this.normalizedData.forEach(item => {
                const id = item?.[this.fieldMap.id];
                if (id === undefined || id === null || id === '') return;
                map.set(id, {
                    id,
                    parentId: item?.[this.fieldMap.parentId],
                    label: `${item?.[this.fieldMap.label] ?? ''}`,
                    customIcon: this.fieldMap.icon ? item?.[this.fieldMap.icon] : null,
                    raw: item,
                    children: [],
                });
            });

            map.forEach(node => {
                const parent = map.get(node.parentId);
                if (parent) {
                    parent.children.push(node);
                } else {
                    roots.push(node);
                }
            });

            return roots;
        },
        filteredTree() {
            if (!this.searchText) return this.tree;
            const query = this.searchText.trim().toLowerCase();
            if (!query) return this.tree;

            const filterNode = (node, depth = 0) => {
                if (depth >= this.normalizedMaxLevel) return null;
                const filteredChildren = node.children
                    .map(child => filterNode(child, depth + 1))
                    .filter(Boolean);
                const isMatch = node.label.toLowerCase().includes(query);
                if (!isMatch && !filteredChildren.length) return null;
                return {
                    ...node,
                    children: filteredChildren,
                };
            };

            return this.tree.map(node => filterNode(node)).filter(Boolean);
        },
        visibleRows() {
            const rows = [];
            const usingSearch = !!this.searchText.trim();

            const walk = (nodes, depth = 0) => {
                if (depth >= this.normalizedMaxLevel) return;

                nodes.forEach(node => {
                    const hasChildren = node.children.length > 0 && depth < this.normalizedMaxLevel - 1;
                    rows.push({
                        id: node.id,
                        label: node.label,
                        depth,
                        hasChildren,
                        raw: node.raw,
                        icon: this.getNodeIcon(node, hasChildren),
                    });

                    if (hasChildren && (usingSearch || this.isExpanded(node.id))) {
                        walk(node.children, depth + 1);
                    }
                });
            };

            walk(this.filteredTree);
            return rows;
        },
        containerStyle() {
            return {
                width: this.content.width || '100%',
                height: this.content.height || '420px',
            };
        },
        iconButtonStyle() {
            return {
                '--icon-button-bg': this.content.iconButtonBackground || '#f1f3f5',
                '--icon-button-hover-bg': this.content.iconButtonHoverBackground || '#e2e6ea',
                '--icon-color': this.content.iconColor || '#263238',
                '--icon-hover-color': this.content.iconHoverColor || '#0d6efd',
            };
        },
        iconStyle() {
            return {
                color: this.content.iconColor || '#263238',
            };
        },
    },
    watch: {
        tree: {
            immediate: true,
            handler(newTree) {
                const expanded = {};
                const expandDefault = nodes => {
                    nodes.forEach(node => {
                        if (node.children.length) expanded[node.id] = true;
                        if (node.children.length) expandDefault(node.children);
                    });
                };
                expandDefault(newTree);
                this.expandedNodes = { ...expanded, ...this.expandedNodes };
            },
        },
    },
    methods: {
        isExpanded(id) {
            return this.expandedNodes[id] !== false;
        },
        toggleNode(id) {
            this.expandedNodes = {
                ...this.expandedNodes,
                [id]: !this.isExpanded(id),
            };
        },
        getNodeIcon(node, hasChildren) {
            if (node.customIcon) return node.customIcon;
            return hasChildren ? '📁' : '📄';
        },
        escapeRegex(value) {
            return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        },
        highlightLabel(label) {
            const query = this.searchText.trim();
            if (!query) return this.escapeHtml(label);
            const safeQuery = this.escapeRegex(query);
            const regex = new RegExp(`(${safeQuery})`, 'ig');
            const escapedLabel = this.escapeHtml(label);
            const highlightColor = this.content.highlightColor || '#fff3bf';

            return escapedLabel.replace(
                regex,
                `<mark style="background:${highlightColor};padding:0 2px;border-radius:2px;">$1</mark>`
            );
        },
        escapeHtml(text) {
            return `${text}`
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },
        onAdd() {
            this.$emit('trigger-event', {
                name: 'onAdd',
                event: { parentId: null },
            });
        },
        onNodeClick(node) {
            this.$emit('trigger-event', {
                name: 'onNodeClick',
                event: node,
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.tree-manager {
    display: flex;
    flex-direction: column;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
}

.tree-manager__toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-bottom: 1px solid #e9ecef;
}

.icon-button,
.toggle-button {
    border: none;
    background: var(--icon-button-bg);
    color: var(--icon-color);
    border-radius: 6px;
    min-width: 28px;
    height: 28px;
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;
}

.icon-button:hover,
.toggle-button:hover {
    background: var(--icon-button-hover-bg);
    color: var(--icon-hover-color);
}

.toggle-button:disabled {
    cursor: default;
    opacity: 0.5;
}

.search-box {
    display: flex;
    align-items: center;
    flex: 1;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 0 8px;
    gap: 6px;
    min-height: 32px;
}

.search-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
}

.tree-manager__content {
    flex: 1;
    overflow: auto;
    padding: 6px 0;
}

.tree-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
    cursor: pointer;
}

.tree-row:hover .node-icon {
    color: var(--icon-hover-color);
}

.toggle-placeholder {
    width: 28px;
}

.node-label {
    white-space: nowrap;
}

.empty-state {
    padding: 12px;
    color: #6c757d;
}
</style>
