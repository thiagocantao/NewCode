<template>
    <div class="tree-manager" :style="containerStyle" @click="hideContextActions">
        <div class="tree-manager__toolbar">
            <button
                class="icon-button"
                type="button"
                :style="iconButtonStyle"
                @click.stop="onAdd"
                aria-label="Add"
                title="Add"
            >
                <span class="material-symbols-outlined">add</span>
            </button>
            <div class="search-box">
                <span class="material-symbols-outlined search-icon">search</span>
                <input
                    v-model="searchText"
                    class="search-input"
                    type="text"
                    :placeholder="content.searchPlaceholder || 'Search...'"
                />
            </div>
        </div>

        <div class="tree-manager__content">
            <div
                v-for="row in visibleRows"
                :key="`row-${row.id}`"
                class="tree-row"
                :class="{ 'tree-row--selected': selectedNodeId === row.id }"
                :style="{ paddingLeft: `${row.depth * 16 + 8}px` }"
                @click="onNodeClick(row)"
                @contextmenu.prevent.stop
            >
                <button
                    v-if="row.hasChildren"
                    class="toggle-button"
                    type="button"
                    :style="toggleButtonStyle"
                    @click.stop="toggleNode(row.id)"
                    :disabled="row.depth >= normalizedMaxLevel - 1"
                    :aria-label="isExpanded(row.id) ? 'Collapse' : 'Expand'"
                    :title="isExpanded(row.id) ? 'Collapse' : 'Expand'"
                >
                    <span class="material-symbols-outlined">
                        {{ isExpanded(row.id) ? 'expand_more' : 'chevron_right' }}
                    </span>
                </button>
                <span v-else class="toggle-placeholder"></span>

                <span v-if="row.icon" class="material-symbols-outlined node-icon">{{ row.icon }}</span>
                <span class="node-label" v-html="highlightLabel(row.label)"></span>

                <div v-if="selectedNodeId === row.id" class="row-actions" @click.stop>
                    <button
                        v-if="row.canAddChild"
                        class="icon-button row-action-button"
                        type="button"
                        :style="iconButtonStyle"
                        title="Add child"
                        aria-label="Add child"
                        @click.stop="onAddChild(row.raw)"
                    >
                        <span class="material-symbols-outlined node-icon">add</span>
                    </button>
                    <button
                        class="icon-button row-action-button"
                        type="button"
                        :style="iconButtonStyle"
                        title="Delete"
                        aria-label="Delete"
                        @click.stop="onDelete(row.raw)"
                    >
                        <span class="material-symbols-outlined node-icon">delete</span>
                    </button>
                </div>
            </div>
            <div v-if="!visibleRows.length" class="empty-state">No items found.</div>
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
            contextNodeId: null,
            selectedNodeId: null,
            setSelectedItemId: null,
        };
    },
    created() {
        this.initializePublicVariables();
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
                type: this.content.typeField || 'type',
            };
        },
        allowedChildrenTypesSet() {
            const source = this.content.allowedChildrenTypes;

            if (Array.isArray(source)) {
                return new Set(source.map(item => `${item}`.trim()).filter(Boolean));
            }

            if (typeof source === 'string' && source.trim()) {
                const normalizedSource = source.replace(/\{/g, '[').replace(/\}/g, ']');

                try {
                    const parsed = JSON.parse(normalizedSource);
                    if (Array.isArray(parsed)) {
                        return new Set(parsed.map(item => `${item}`.trim()).filter(Boolean));
                    }
                } catch (error) {
                    return new Set();
                }
            }

            return new Set();
        },
        hasTypeRestriction() {
            return this.allowedChildrenTypesSet.size > 0;
        },
        tree() {
            const map = new Map();
            const roots = [];

            this.normalizedData.forEach(item => {
                const id = item?.[this.fieldMap.id];
                if (id === undefined || id === null || id === '') return;
                
                const parentIdRaw = item?.[this.fieldMap.parentId];
                const parentId =
                parentIdRaw === undefined || parentIdRaw === null || parentIdRaw === ''
                ? null
                : parentIdRaw;
                
                map.set(String(id), {
                id: String(id),
                parentId: parentId === null ? null : String(parentId),
                label: `${item?.[this.fieldMap.label] ?? ''}`,
                icon: this.fieldMap.icon ? `${item?.[this.fieldMap.icon] ?? ''}`.trim() : '',
                type: `${item?.[this.fieldMap.type] ?? ''}`.trim(),
                raw: item,
                children: [],
                });
            });

            map.forEach(node => {
                const parent = map.get(node.parentId);
                if (parent && this.canNodeHaveChildren(parent)) {
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
                        parentId: node.parentId,
                        label: node.label,
                        icon: node.icon,
                        type: node.type,
                        depth,
                        hasChildren,
                        canHaveChildren: this.canNodeHaveChildren(node),
                        canAddChild: this.canNodeHaveChildren(node) && depth < this.normalizedMaxLevel - 1,
                        raw: node.raw,
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
                '--tree-font-size': this.normalizedFontSize,
                '--row-selected-bg': this.selectedItemBackground,
            };
        },
        normalizedFontSize() {
            const fontSize = this.content.fontSize;
            if (typeof fontSize === 'number' && Number.isFinite(fontSize)) {
                return `${fontSize}px`;
            }

            if (typeof fontSize === 'string' && fontSize.trim()) {
                return fontSize.trim();
            }

            return '14px';
        },

        selectedItemBackground() {
            const background = this.content.selectedItemBackground;
            if (typeof background === 'string' && background.trim()) {
                return background.trim();
            }

            return '#e7f1ff';
        },
        iconButtonStyle() {
            return {
                '--icon-button-bg': this.content.iconButtonBackground || '#f1f3f5',
                '--icon-button-hover-bg': this.content.iconButtonHoverBackground || '#e2e6ea',
                '--icon-color': this.content.iconButtonColor || '#263238',
                '--icon-hover-color': this.content.iconButtonHoverColor || '#0d6efd',
            };
        },
        toggleButtonStyle() {
            return {
                ...this.iconButtonStyle,
                '--toggle-button-bg': this.content.toggleButtonBackground || 'transparent',
                '--toggle-button-color': this.content.toggleButtonColor || '#6c757d',
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
        initializePublicVariables() {
            if (typeof wwLib === 'undefined' || !wwLib?.wwVariable?.useComponentVariable) return;

            const uid = this.uid || this.wwElementState?.uid;
            if (!uid) return;

            const selectedItemIdVariable = wwLib.wwVariable.useComponentVariable({
                uid,
                name: 'selectedItemId',
                type: 'string',
                defaultValue: null,
                readonly: true,
            });

            this.setSelectedItemId = selectedItemIdVariable.setValue;
        },
        isExpanded(id) {
            return this.expandedNodes[id] !== false;
        },
        toggleNode(id) {
            this.expandedNodes = {
                ...this.expandedNodes,
                [id]: !this.isExpanded(id),
            };
        },
        hideContextActions() {
            this.contextNodeId = null;
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
        onAddChild(node) {
            if (!this.canNodeHaveChildren(node)) return;

            const nodeId = `${node?.[this.fieldMap.id] ?? ''}`;
            const selectedRow = this.visibleRows.find(row => row.id === nodeId);
            if (!selectedRow || !selectedRow.canAddChild) return;

            this.$emit('trigger-event', {
                name: 'onAdd',
                event: { parentId: node?.[this.fieldMap.id] ?? null, node },
            });
            this.hideContextActions();
        },
        onDelete(node) {
            this.$emit('trigger-event', {
                name: 'onDelete',
                event: node,
            });
            this.hideContextActions();
        },
        onNodeClick(row) {
        this.contextNodeId = row.id;
        this.selectedNodeId = row.id;
        this.setSelectedItemId?.(row.id ?? null);
        
        const nodeData = row.raw && typeof row.raw === 'object' ? row.raw : {};
        
        const id = nodeData?.[this.fieldMap.id] ?? row.id ?? null;
        const parentId = nodeData?.[this.fieldMap.parentId] ?? row.parentId ?? null;
        const label = nodeData?.[this.fieldMap.label] ?? row.label ?? '';
        
        this.$emit('trigger-event', {
        name: 'onNodeClick',
        event: {
        ...nodeData,
        id,
        parentId,
        label: `${label}`,
        },
        });
        },
        canNodeHaveChildren(node) {
            if (!this.hasTypeRestriction) return true;

            const itemType = `${node?.[this.fieldMap.type] ?? node?.type ?? ''}`.trim();
            return this.allowedChildrenTypesSet.has(itemType);
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
    font-size: var(--tree-font-size);
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.icon-button:hover,
.toggle-button:hover {
    background: var(--icon-button-hover-bg);
    color: var(--icon-hover-color);
}

.toggle-button {
    background: var(--toggle-button-bg);
    color: var(--toggle-button-color);
}

.toggle-button:disabled {
    cursor: default;
    opacity: 0.5;
}

.material-symbols-outlined {
    font-size: 18px;
    line-height: 1;
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

.search-icon {
    color: var(--icon-color);
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
    padding-right: 8px;
    transition: background-color 0.2s ease;
}

.tree-row:hover,
.tree-row--selected {
    background: var(--row-selected-bg);
}

.toggle-placeholder {
    width: 28px;
}

.node-label {
    white-space: nowrap;
    flex: 1;
}

.node-icon {
    font-size: 22px;
    color: var(--icon-color);
}


.row-actions {
    display: inline-flex;
    gap: 4px;
}

.row-actions .row-action-button,
.row-actions .row-action-button:hover {
    background: transparent;
}

.empty-state {
    padding: 12px;
    color: #6c757d;
}
</style>
