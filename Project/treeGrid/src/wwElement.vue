<template>
    <div class="tree-manager" :style="containerStyle" @click="hideContextActions">
        <div v-if="showToolbar" class="tree-manager__toolbar">
            <button
                v-if="!isReadOnly"
                class="icon-button"
                type="button"
                :style="iconButtonStyle"
                @click.stop="onToolbarAdd"
                :aria-label="translatedTexts.add"
                :title="translatedTexts.add"
            >
                <i class="fa fa-plus" aria-hidden="true"></i>
            </button>
            <div class="search-box">
                <i class="fa fa-search search-icon" aria-hidden="true"></i>
                <input
                    v-model="searchText"
                    class="search-input"
                    type="text"
                    :placeholder="content.searchPlaceholder || translatedTexts.searchPlaceholder"
                />
            </div>
        </div>

        <div class="tree-manager__content">
            <div v-if="normalizedColumns.length" class="tree-header">
                <div class="tree-header__indent"></div>
                <div v-if="showIconColumn" class="tree-header__icon-spacer"></div>
                <div v-for="column in normalizedColumns" :key="`header-${column.field}-${column.position}`"
                    class="tree-header__cell" :style="getColumnStyle(column)">
                    {{ column.title }}
                </div>
                <div class="tree-header__actions-spacer"></div>
            </div>
            <div v-for="row in visibleRows" :key="`row-${row.id}`" class="tree-row"
                :class="{ 'tree-row--selected': selectedNodeId === row.id, 'tree-row--drag-over': dropTargetRowId === row.id }"
                :draggable="canDragRow(row)" @dragstart="onDragStart(row, $event)" @dragover="onDragOver(row, $event)"
                @drop="onDrop(row, $event)" @dragend="onDragEnd" @click="onNodeClick(row)" @contextmenu.prevent.stop>
                <span class="row-indent-spacer" :style="{ width: `${row.depth * 16 + 8}px` }"></span>

                <button
                    v-if="row.showToggle"
                    class="toggle-button"
                    type="button"
                    :style="toggleButtonStyle"
                    @click.stop="toggleNode(row)"
                    :disabled="row.depth >= normalizedMaxLevel - 1 || !row.hasChildren"
                    :aria-label="isExpanded(row.id) ? translatedTexts.collapse : translatedTexts.expand"
                    :title="isExpanded(row.id) ? translatedTexts.collapse : translatedTexts.expand"
                >
                    <i
                        class="fa"
                        :class="row.hasChildren && isExpanded(row.id) ? 'fa-angle-up' : 'fa-angle-down'"
                        aria-hidden="true"
                    ></i>
                </button>
                <span v-else class="toggle-placeholder"></span>

                <i v-if="row.icon" class="fa node-icon" :class="normalizeNodeIconClass(row.icon)" aria-hidden="true"></i>
                <span v-else-if="showIconColumn" class="node-icon node-icon--placeholder"></span>
                <template v-if="isRowBeingEdited(row)">
                    <div class="node-label-edit" @click.stop>
                        <input
                            v-model="editingLabel"
                            class="node-label-input"
                            type="text"
                            @click.stop
                            @keydown.enter.stop.prevent="confirmRenameEdit(row)"
                            @keydown.esc.stop.prevent="cancelRenameEdit"
                        />
                        <button
                            class="icon-button row-action-button row-action-button--cancel"
                            type="button"
                            :style="iconButtonStyle"
                            :title="translatedTexts.cancel"
                            :aria-label="translatedTexts.cancel"
                            @click.stop="cancelRenameEdit"
                        >
                            <i class="fa fa-times node-icon" aria-hidden="true"></i>
                        </button>
                        <button
                            class="icon-button row-action-button row-action-button--confirm"
                            type="button"
                            :style="iconButtonStyle"
                            :title="translatedTexts.confirm"
                            :aria-label="translatedTexts.confirm"
                            @click.stop="confirmRenameEdit(row)"
                        >
                            <i class="fa fa-check node-icon" aria-hidden="true"></i>
                        </button>
                    </div>
                </template>
                <template v-else>
                    <template v-if="normalizedColumns.length">
                        <div v-for="column in normalizedColumns" :key="`cell-${row.id}-${column.field}`"
                            class="tree-cell" :class="{ 'tree-cell--chiplist': column.type === 'chiplist' }" :style="getColumnStyle(column)">
                            <template v-if="column.type === 'avatar'">
                                <div class="tree-cell-avatar">
                                    <img
                                        v-if="getAvatarImageUrl(row, column.field)"
                                        :src="getAvatarImageUrl(row, column.field)"
                                        class="tree-cell-avatar__image"
                                        alt="avatar"
                                    />
                                    <span v-else-if="hasAvatarFallback(row, column)" class="tree-cell-avatar__fallback">{{ getAvatarFallback(row, column) }}</span>
                                    <span v-if="getAvatarUserName(row, column)" class="tree-cell-avatar__name" v-html="highlightLabel(getAvatarUserName(row, column))"></span>
                                </div>
                            </template>
                            <template v-else-if="column.type === 'progress'">
                                <div class="tree-cell-progress">
                                    <div class="tree-cell-progress__bar">
                                        <div class="tree-cell-progress__fill"
                                            :style="{ width: `${getProgressPercent(row, column.field)}%` }"></div>
                                    </div>
                                    <span class="tree-cell-progress__label">{{ getProgressPercent(row, column.field) }}%</span>
                                </div>
                            </template>
                            <template v-else-if="column.type === 'divcolor'">
                                <div class="tree-cell-div-color" :style="getDivColorStyle(row, column)">
                                    <span v-html="highlightCell(row, column)"></span>
                                </div>
                            </template>
                            <template v-else-if="column.type === 'chiplist'">
                                <div
                                    class="tree-cell-chip-list"
                                    @mouseenter="onChipCellHover(row, column, true)"
                                    @mouseleave="onChipCellHover(row, column, false)"
                                >
                                    <div class="tree-cell-chip-list__chips">
                                        <span
                                            v-for="(chip, index) in getVisibleChips(row, column)"
                                            :key="`chip-${row.id}-${column.field}-${index}`"
                                            class="tree-cell-chip"
                                            :style="getChipStyle(chip)"
                                        >
                                            {{ chip.label }}
                                        </span>
                                        <span
                                            v-if="getHiddenChipCount(row, column) > 0"
                                            class="tree-cell-chip tree-cell-chip--counter"
                                        >
                                            +{{ getHiddenChipCount(row, column) }}
                                        </span>
                                    </div>
                                    <div
                                        v-if="shouldShowChipPopup(row, column)"
                                        class="tree-cell-chip-list__popup"
                                    >
                                        <span
                                            v-for="(chip, index) in getChipList(row, column)"
                                            :key="`popup-chip-${row.id}-${column.field}-${index}`"
                                            class="tree-cell-chip"
                                            :style="getChipStyle(chip)"
                                        >
                                            {{ chip.label }}
                                        </span>
                                    </div>
                                </div>
                            </template>
                            <template v-else>
                                <span v-html="highlightCell(row, column)"></span>
                            </template>
                        </div>
                    </template>
                    <span v-else class="node-label" v-html="highlightLabel(row.label)"></span>
                </template>

                <div class="row-actions"
                    :class="{ 'row-actions--visible': (selectedNodeId === row.id) && !isReadOnly && !isEditingAnyNode }"
                    @click.stop>
                    <button
                        v-if="row.canAddChild && !isRowBeingEdited(row) && !isReadOnly && !isEditingAnyNode"
                        class="icon-button row-action-button"
                        type="button"
                        :style="iconButtonStyle"
                        :title="translatedTexts.addChild"
                        :aria-label="translatedTexts.addChild"
                        @click.stop="onAddChild(row.raw)"
                    >
                        <i class="fa fa-plus node-icon" aria-hidden="true"></i>
                    </button>
                    <button
                        v-if="row.canRename && !isReadOnly && !isEditingAnyNode"
                        class="icon-button row-action-button"
                        type="button"
                        :style="iconButtonStyle"
                        :title="translatedTexts.rename"
                        :aria-label="translatedTexts.rename"
                        @click.stop="startRenameEdit(row)"
                    >
                        <i class="fa fa-pencil node-icon" aria-hidden="true"></i>
                    </button>
                    <button
                        v-if="row.canDelete && !isRowBeingEdited(row) && !isReadOnly && !isEditingAnyNode"
                        class="icon-button row-action-button"
                        type="button"
                        :style="iconButtonStyle"
                        :title="translatedTexts.delete"
                        :aria-label="translatedTexts.delete"
                        @click.stop="onDelete(row.raw)"
                    >
                        <i class="fa fa-trash node-icon" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
            <div v-if="!visibleRows.length" class="empty-state">{{ translatedTexts.noItemsFound }}</div>
        </div>
    </div>
</template>

<script>
    import { translatePhrase } from './translation';

    export default {
    props: {
        content: { type: Object, required: true },
    },
    emits: ['trigger-event'],
    wwEditor: {
        actions: {
            selectNodeById(id) {
                this.selectNodeById(id);
            },
            clearSelectedNode() {
                this.clearSelectedNode();
            },
            searchNodes(text) {
                this.searchNodes(text);
            },
        },
    },
    data() {
        return {
            searchText: '',
            expandedNodes: {},
            contextNodeId: null,
            selectedNodeId: null,
            setSelectedItemId: null,
            draggingRowId: null,
            draggingParentId: null,
            draggingRowDepth: null,
            dropTargetRowId: null,
            orderOverrides: {},
            hoveredChipCellKey: null,
            editingNodeId: null,
            editingLabel: '',
            labelOverrides: {},
        };
    },
    created() {
        this.initializePublicVariables();
    },
    computed: {
        translatedTexts() {
            return {
                add: this.translate('Add'),
                searchPlaceholder: this.translate('Search...'),
                collapse: this.translate('Collapse'),
                expand: this.translate('Expand'),
                addChild: this.translate('Add child'),
                rename: this.translate('Rename'),
                cancel: this.translate('Cancel'),
                confirm: this.translate('Confirm'),
                delete: this.translate('Delete'),
                noItemsFound: this.translate('No items found.'),
            };
        },
        normalizedData() {
            return Array.isArray(this.content.data) ? this.content.data : [];
        },
        isReadOnly() {
            return this.content.readOnly === true;
        },

        showToolbar() {
            return this.content.showToolbar !== false;
        },
        isEditingAnyNode() {
            return !!this.editingNodeId;
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
                order: this.content.orderField || 'order',
                icon: this.content.iconField || '',
                type: this.content.typeField || 'type',
                renameVisible: this.content.renameIconVisibleField || '',
                deleteVisible: this.content.deleteIconVisibleField || '',
            };
        },
        normalizedColumns() {
            const source = Array.isArray(this.content.columns) ? this.content.columns : [];
            return source
                .filter(column => column && typeof column === 'object' && `${column.field ?? ''}`.trim())
                .map(column => {
                    const field = `${column.field}`.trim();
                    const title = `${column.title ?? field}`.trim() || field;
                    const position = Number(column.position);
                    const width = typeof column.width === 'string' ? column.width.trim() : '';
                    const flex = Number(column.flex);
                    const type = `${column.type ?? 'text'}`.trim().toLowerCase();
                    const userNameField = `${column.UserName ?? column.userName ?? ''}`.trim();
                    const color = `${column.Color ?? column.color ?? ''}`.trim();
                    const bgColor = `${column.BgColor ?? column.bgColor ?? ''}`.trim();
                    return {
                        field,
                        title,
                        type,
                        userNameField,
                        color,
                        bgColor,
                        position: Number.isFinite(position) ? position : Number.MAX_SAFE_INTEGER,
                        width,
                        flex: Number.isFinite(flex) ? flex : null,
                    };
                })
                .sort((a, b) => a.position - b.position);
        },
        showIconColumn() {
            return this.visibleRows.some(row => !!row.icon);
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

            this.normalizedData.forEach((item, index) => {
                const id = item?.[this.fieldMap.id];
                if (id === undefined || id === null || id === '') return;
                
                const parentIdRaw = item?.[this.fieldMap.parentId];
                const parentId =
                parentIdRaw === undefined || parentIdRaw === null || parentIdRaw === ''
                ? null
                : parentIdRaw;
                
                const normalizedId = String(id);
                map.set(normalizedId, {
                id: normalizedId,
                parentId: parentId === null ? null : String(parentId),
                label: this.getNodeLabel(item, normalizedId),
                icon: this.fieldMap.icon ? `${item?.[this.fieldMap.icon] ?? ''}`.trim() : '',
                type: `${item?.[this.fieldMap.type] ?? ''}`.trim(),
                order: this.getNodeOrder(item, normalizedId),
                raw: item,
                sourceIndex: index,
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

            const sortRecursively = nodes => {
                this.sortNodesByOrder(nodes);
                nodes.forEach(child => {
                    if (child.children.length) sortRecursively(child.children);
                });
            };

            sortRecursively(roots);
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
        isSearchActive() {
            return !!this.searchText.trim();
        },
        visibleRows() {
            const rows = [];
            const usingSearch = this.isSearchActive;

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
                        showToggle: hasChildren || `${node.type ?? ''}`.trim().toUpperCase() === 'FOLDER',
                        canHaveChildren: this.canNodeHaveChildren(node),
                        canAddChild: this.canNodeHaveChildren(node) && depth < this.normalizedMaxLevel - 1,
                        canRename: this.canRenameNode(node.raw),
                        canDelete: this.canDeleteNode(node.raw),
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
                '--node-icon-color': this.content.nodeIconColor || '#777',
                '--node-icon-bg': this.content.nodeIconBackground || 'transparent',
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
        normalizedData: {
            deep: true,
            handler() {
                this.orderOverrides = {};
            },
        },
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
        translate(phrase) {
            return translatePhrase(phrase);
        },
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
        getNodeLabel(node, nodeId) {
            if (this.labelOverrides[nodeId] !== undefined) {
                return `${this.labelOverrides[nodeId] ?? ''}`;
            }

            return `${node?.[this.fieldMap.label] ?? ''}`;
        },
        getColumnStyle(column) {
            const style = {};
            if (column.width) {
                style.flex = '0 0 auto';
                style.width = column.width;
            } else if (Number.isFinite(column.flex) && column.flex > 0) {
                style.flex = `${column.flex} ${column.flex} 0`;
                style.minWidth = 0;
            } else {
                style.flex = '1 1 0';
                style.minWidth = 0;
            }
            return style;
        },
        highlightCell(row, column) {
            const value = row?.raw?.[column.field];
            const formatted = this.formatColumnValue(value, column.type);
            return this.highlightLabel(formatted);
        },
        formatColumnValue(value, type) {
            if (value === undefined || value === null || value === '') return '';

            if (type === 'date') {
                const parsed = new Date(value);
                if (Number.isNaN(parsed.getTime())) return `${value}`;
                return new Intl.DateTimeFormat(undefined, {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                }).format(parsed);
            }

            if (type === 'currency') {
                const numberValue = Number(value);
                if (!Number.isFinite(numberValue)) return `${value}`;
                return new Intl.NumberFormat(undefined, {
                    style: 'currency',
                    currency: this.content.currencyCode || 'BRL',
                }).format(numberValue);
            }

            return `${value}`;
        },


        getChipCellKey(row, column) {
            return `${row?.id ?? ''}::${column?.field ?? ''}`;
        },
        onChipCellHover(row, column, isHover) {
            const key = this.getChipCellKey(row, column);
            this.hoveredChipCellKey = isHover ? key : null;
        },
        parseChipList(value) {
            if (!value) return [];
            const parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
            const tags = Array.isArray(parsedValue) ? parsedValue : parsedValue?.tags;
            if (!Array.isArray(tags)) return [];
            return tags
                .map(item => ({
                    label: `${item?.label ?? ''}`.trim(),
                    color: `${item?.color ?? ''}`.trim(),
                }))
                .filter(item => item.label);
        },
        getChipList(row, column) {
            try {
                return this.parseChipList(row?.raw?.[column.field]);
            } catch (error) {
                return [];
            }
        },
        measureChipWidth(label, isCounter = false) {
            if (typeof document === 'undefined') return 0;
            const el = document.createElement('span');
            el.className = isCounter ? 'tree-cell-chip tree-cell-chip--counter' : 'tree-cell-chip';
            el.style.position = 'absolute';
            el.style.visibility = 'hidden';
            el.style.pointerEvents = 'none';
            el.style.left = '-9999px';
            el.textContent = label;
            document.body.appendChild(el);
            const width = el.offsetWidth;
            document.body.removeChild(el);
            return width;
        },
        getChipListLayout(row, column) {
            const chips = this.getChipList(row, column);
            const widthRaw = column?.width && `${column.width}`.trim() ? `${column.width}`.trim() : '';
            const containerWidth = Number.parseFloat(widthRaw);
            if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
                return { visible: chips, hiddenCount: 0 };
            }

            const gap = 4;
            let usedWidth = 0;
            let visibleCount = 0;

            for (let index = 0; index < chips.length; index += 1) {
                const chip = chips[index];
                const chipWidth = this.measureChipWidth(chip.label);
                const remaining = chips.length - (index + 1);
                const counterWidth = remaining > 0 ? this.measureChipWidth(`+${remaining}`, true) + gap : 0;
                const space = visibleCount > 0 ? gap : 0;
                if (usedWidth + chipWidth + space + counterWidth <= containerWidth) {
                    usedWidth += chipWidth + space;
                    visibleCount += 1;
                    continue;
                }
                break;
            }

            if (visibleCount === 0 && chips.length > 0) visibleCount = 1;
            const hiddenCount = Math.max(0, chips.length - visibleCount);
            return { visible: chips.slice(0, visibleCount), hiddenCount };
        },
        getVisibleChips(row, column) {
            return this.getChipListLayout(row, column).visible;
        },
        getHiddenChipCount(row, column) {
            return this.getChipListLayout(row, column).hiddenCount;
        },
        shouldShowChipPopup(row, column) {
            const key = this.getChipCellKey(row, column);
            return this.hoveredChipCellKey === key;
        },
        getChipStyle(chip) {
            return {
                backgroundColor: chip.color || '#E5E7EB',
                color: '#1f2937',
            };
        },
        getDivColorStyle(row, column) {
            const style = {
                padding: '3px 10px',
                borderRadius: '4px',
            };

            const colorField = column.color;
            const bgColorField = column.bgColor;

            const textColor = colorField ? `${row?.raw?.[colorField] ?? ''}`.trim() : '';
            const backgroundColor = bgColorField ? `${row?.raw?.[bgColorField] ?? ''}`.trim() : '';

            if (textColor) {
                style.color = textColor;
                style.border = `1px solid ${textColor}`;
            }
            if (backgroundColor) style.backgroundColor = backgroundColor;

            return style;
        },
        getAvatarUserName(row, column) {
            const field = column.userNameField;
            if (!field) return '';
            return `${row?.raw?.[field] ?? ''}`;
        },
        getAvatarImageUrl(row, field) {
            const value = `${row?.raw?.[field] ?? ''}`.trim();
            return value || '';
        },
        hasAvatarFallback(row, column) {
            const hasImage = !!this.getAvatarImageUrl(row, column.field);
            const hasName = !!this.getAvatarUserName(row, column).trim();
            return !hasImage && hasName;
        },
        getAvatarFallback(row, column) {
            const name = this.getAvatarUserName(row, column).trim();
            return name ? name.charAt(0).toUpperCase() : '';
        },
        getProgressPercent(row, field) {
            const value = Number(row?.raw?.[field]);
            if (!Number.isFinite(value)) return 0;
            const percent = Math.round(value * 100);
            return Math.min(100, Math.max(0, percent));
        },
        getNodeOrder(node, nodeId) {
            const fieldName = `${this.fieldMap.order ?? ''}`.trim();
            if (this.orderOverrides[nodeId] !== undefined) {
                return this.toIntegerOrder(this.orderOverrides[nodeId], Number.MAX_SAFE_INTEGER);
            }

            if (!fieldName) return Number.MAX_SAFE_INTEGER;
            return this.toIntegerOrder(node?.[fieldName], Number.MAX_SAFE_INTEGER);
        },
        toIntegerOrder(value, fallback = 0) {
            const parsed = Number(value);
            if (!Number.isFinite(parsed)) return fallback;
            return Math.floor(parsed);
        },
        sortNodesByOrder(nodes) {
            nodes.sort((a, b) => {
                const hasOrderA = Number.isFinite(a.order) && a.order !== Number.MAX_SAFE_INTEGER;
                const hasOrderB = Number.isFinite(b.order) && b.order !== Number.MAX_SAFE_INTEGER;

                if (hasOrderA && hasOrderB && a.order !== b.order) return a.order - b.order;
                if (hasOrderA !== hasOrderB) return hasOrderA ? -1 : 1;

                if (a.sourceIndex !== b.sourceIndex) return a.sourceIndex - b.sourceIndex;
                return `${a.id}`.localeCompare(`${b.id}`);
            });
        },
        canDragRow(row) {
            return !this.isSearchActive && !!row && !!row.id;
        },
        canMoveToAnotherParent() {
            return this.content.allowMoveToAnotherParent === true;
        },
        canDropAsNewParent(targetRow) {
            if (!this.canMoveToAnotherParent()) return false;
            if (!targetRow?.id) return false;
            if (!this.draggingRowId) return false;
            if (targetRow.id === this.draggingRowId) return false;
            if (!targetRow.canHaveChildren) return false;
            if (!Number.isFinite(this.draggingRowDepth)) return false;

            const currentParentDepth = this.draggingRowDepth - 1;
            return targetRow.depth === currentParentDepth;
        },
        isExpanded(id) {
            return this.expandedNodes[id] !== false;
        },
        toggleNode(row) {
            if (!row?.hasChildren) return;

            const id = row.id;
            this.expandedNodes = {
                ...this.expandedNodes,
                [id]: !this.isExpanded(id),
            };
        },
        hideContextActions() {
            this.contextNodeId = null;
        },
        normalizeNodeIconClass(icon) {
            const value = `${icon || ''}`.trim();
            if (!value) return '';
            if (value.includes('fa-')) return value;
            return `fa-${value}`;
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
        onToolbarAdd() {
            if (this.isReadOnly) return;

            this.$emit('trigger-event', {
                name: 'onToolbarAdd',
                event: { parentId: null },
            });
        },
        onAddChild(node) {
            if (this.isReadOnly) return;
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
            if (this.isReadOnly) return;

            this.$emit('trigger-event', {
                name: 'onDelete',
                event: node,
            });
            this.hideContextActions();
        },
        startRenameEdit(row) {
            if (this.isReadOnly) return;
            if (!row?.canRename) return;
            const currentLabel = `${row?.raw?.[this.fieldMap.label] ?? row?.label ?? ''}`;
            this.editingNodeId = row.id;
            this.editingLabel = currentLabel;
        },
        isRowBeingEdited(row) {
            return !!row?.id && this.editingNodeId === row.id;
        },
        cancelRenameEdit() {
            this.editingNodeId = null;
            this.editingLabel = '';
        },
        confirmRenameEdit(row) {
            if (!this.isRowBeingEdited(row)) return;
            const nextLabel = `${this.editingLabel ?? ''}`;
            this.onRename(row.raw, nextLabel);
            this.cancelRenameEdit();
        },
        onRename(node, nextLabel = null) {
            if (this.isReadOnly) return;
            if (!this.canRenameNode(node)) return;

            const payload = node && typeof node === 'object' ? { ...node } : {};

            if (nextLabel !== null) {
                const nodeId = `${node?.[this.fieldMap.id] ?? ''}`;
                if (nodeId) {
                    this.labelOverrides = {
                        ...this.labelOverrides,
                        [nodeId]: nextLabel,
                    };
                }
                payload[this.fieldMap.label] = nextLabel;
                payload.label = nextLabel;
            }

            this.$emit('trigger-event', {
                name: 'onRename',
                event: payload,
            });
            this.hideContextActions();
        },
        selectNodeById(id) {
            const nodeId = id === undefined || id === null ? '' : `${id}`;
            if (!nodeId) return;

            const path = [];
            const findPath = nodes => {
                for (const node of nodes) {
                    path.push(node.id);
                    if (node.id === nodeId) return true;
                    if (node.children?.length && findPath(node.children)) return true;
                    path.pop();
                }

                return false;
            };

            const found = findPath(this.tree);
            if (!found) return;

            const expandedNodes = { ...this.expandedNodes };
            path.slice(0, -1).forEach(ancestorId => {
                expandedNodes[ancestorId] = true;
            });
            this.expandedNodes = expandedNodes;

            this.$nextTick(() => {
                const row = this.visibleRows.find(currentRow => currentRow.id === nodeId);
                if (!row) return;
                this.onNodeClick(row);
            });
        },
        clearSelectedNode() {
            this.contextNodeId = null;
            this.selectedNodeId = null;
            this.setSelectedItemId?.(null);
        },
        searchNodes(text) {
            this.searchText = `${text ?? ''}`;
        },
        onNodeClick(row) {
        if (this.isEditingAnyNode && this.editingNodeId !== row?.id) {
        this.cancelRenameEdit();
        }

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
        onDragStart(row, event) {
            if (!this.canDragRow(row)) return;

            this.draggingRowId = row.id;
            this.draggingParentId = row.parentId ?? null;
            this.draggingRowDepth = Number(row.depth);
            this.dropTargetRowId = null;

            if (event?.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', row.id);
            }
        },
        onDragOver(row, event) {
            if (!this.draggingRowId || !row?.id) return;
            if (row.id === this.draggingRowId) return;

            const rowParentId = row.parentId ?? null;
            const canReorderWithinParent = rowParentId === this.draggingParentId;
            const canMoveToNewParent = this.canDropAsNewParent(row);

            if (!canReorderWithinParent && !canMoveToNewParent) return;

            event.preventDefault();
            this.dropTargetRowId = row.id;
        },
        onDrop(row, event) {
            if (event) event.preventDefault();
            if (!this.draggingRowId || !row?.id || row.id === this.draggingRowId) {
                this.onDragEnd();
                return;
            }

            const targetParentId = row.parentId ?? null;
            const isReorderWithinParent = targetParentId === this.draggingParentId;
            const isMoveToNewParent = this.canDropAsNewParent(row);

            if (!isReorderWithinParent && !isMoveToNewParent) {
                this.onDragEnd();
                return;
            }

            if (isMoveToNewParent) {
                this.moveNodeToAnotherParent(row.id);
                this.onDragEnd();
                return;
            }

            const sameLevelNodes = this.visibleRows
                .filter(currentRow => (currentRow.parentId ?? null) === targetParentId)
                .map(currentRow => currentRow.id);

            const draggingIndex = sameLevelNodes.indexOf(this.draggingRowId);
            const targetIndex = sameLevelNodes.indexOf(row.id);

            if (draggingIndex === -1 || targetIndex === -1) {
                this.onDragEnd();
                return;
            }

            const reorderedIds = [...sameLevelNodes];
            const [movedId] = reorderedIds.splice(draggingIndex, 1);
            const insertionIndex = reorderedIds.indexOf(row.id);
            reorderedIds.splice(insertionIndex, 0, movedId);

            const updates = reorderedIds.map((id, index) => ({
                id,
                [this.fieldMap.order]: index + 1,
            }));

            const newOverrides = { ...this.orderOverrides };
            updates.forEach(update => {
                newOverrides[update.id] = update[this.fieldMap.order];
            });
            this.orderOverrides = newOverrides;

            this.$emit('trigger-event', {
                name: 'onReorder',
                event: {
                    movedId: movedId,
                    parentId: targetParentId,
                    previousParentId: targetParentId,
                    orderField: this.fieldMap.order,
                    parentIdField: this.fieldMap.parentId,
                    updates,
                },
            });

            this.onDragEnd();
        },
        moveNodeToAnotherParent(newParentId) {
            const currentParentId = this.draggingParentId ?? null;
            const movingRow = this.visibleRows.find(currentRow => currentRow.id === this.draggingRowId);
            if (!movingRow) return;

            const oldSiblings = this.visibleRows
                .filter(currentRow => (currentRow.parentId ?? null) === currentParentId)
                .map(currentRow => currentRow.id)
                .filter(id => id !== this.draggingRowId);

            const newSiblings = this.visibleRows
                .filter(currentRow => (currentRow.parentId ?? null) === newParentId)
                .map(currentRow => currentRow.id);

            const updates = [];
            oldSiblings.forEach((id, index) => {
                updates.push({
                    id,
                    [this.fieldMap.order]: index + 1,
                });
            });

            const movedOrder = newSiblings.length + 1;
            updates.push({
                id: this.draggingRowId,
                [this.fieldMap.parentId]: newParentId,
                [this.fieldMap.order]: movedOrder,
            });

            newSiblings.forEach((id, index) => {
                updates.push({
                    id,
                    [this.fieldMap.order]: index + 1,
                });
            });

            const newOverrides = { ...this.orderOverrides };
            oldSiblings.forEach((id, index) => {
                newOverrides[id] = index + 1;
            });
            newOverrides[this.draggingRowId] = movedOrder;
            newSiblings.forEach((id, index) => {
                newOverrides[id] = index + 1;
            });
            this.orderOverrides = newOverrides;

            this.$emit('trigger-event', {
                name: 'onReorder',
                event: {
                    movedId: this.draggingRowId,
                    parentId: newParentId,
                    previousParentId: currentParentId,
                    orderField: this.fieldMap.order,
                    parentIdField: this.fieldMap.parentId,
                    updates,
                },
            });
        },
        onDragEnd() {
            this.draggingRowId = null;
            this.draggingParentId = null;
            this.draggingRowDepth = null;
            this.dropTargetRowId = null;
        },
        canRenameNode(node) {
            const fieldName = `${this.fieldMap.renameVisible ?? ''}`.trim();

            if (!fieldName) {
                return true;
            }

            return node?.[fieldName] === true;
        },
        canDeleteNode(node) {
            const fieldName = `${this.fieldMap.deleteVisible ?? ''}`.trim();

            if (!fieldName) {
                return false;
            }

            return node?.[fieldName] === true;
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

    .fa {
        font-size: 16px;
        line-height: 1;
        font-weight: 900;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }

    .search-box {
        display: flex;
        align-items: center;
        flex: 1;
        background: #fff;
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
        background: #fff;
    }

    .tree-manager__content {
        flex: 1;
        overflow: auto;
        padding: 6px 0;
        scrollbar-width: thin;
        scrollbar-color: #b8c0cc transparent;
    }

    .tree-manager__content::-webkit-scrollbar {
        width: 8px;
    }

    .tree-manager__content::-webkit-scrollbar-track {
        background: transparent;
    }

    .tree-manager__content::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #c6cdd8, #aeb7c4);
        border-radius: 999px;
    }

    .tree-manager__content::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, #b8c0cc, #99a5b4);
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

    .tree-header {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 32px;
        padding: 0 8px;
        border-bottom: 1px solid #e9ecef;
        font-weight: 600;
        color: #495057;
        position: sticky;
        top: 0;
        background: #fff;
        z-index: 2;
    }

    .tree-header__indent,
    .toggle-placeholder {
        width: 36px;
        flex: 0 0 36px;
    }

    .tree-header__icon-spacer {
        width: 22px;
        flex: 0 0 22px;
    }

    .tree-header__actions-spacer {
        width: 84px;
        flex: 0 0 84px;
    }



    .tree-row:hover,
    .tree-row--selected,
    .tree-row--drag-over {
        background: var(--row-selected-bg);
    }

    .node-label {
        white-space: nowrap;
        flex: 1;
        color: #555
    }

    .tree-header__cell,
    .tree-cell {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
    }

    .tree-cell {
        color: #555;
    }

    .tree-cell--chiplist {
        overflow: visible;
        position: relative;
    }


    .node-label-edit {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex: 1;
    }

    .node-label-input {
        flex: 1;
        min-width: 0;
        border: 1px solid #ced4da;
        border-radius: 6px;
        padding: 4px 8px;
        outline: none;
    }

    .node-icon {
        font-size: 22px;
        color: var(--node-icon-color);
        background: var(--node-icon-bg);
        border-radius: 4px;
    }

    .node-icon--placeholder {
        display: inline-block;
    }


    .row-indent-spacer {
        flex: 0 0 auto;
    }

    .row-actions {
        display: inline-flex;
        gap: 4px;
        width: 84px;
        flex: 0 0 84px;
        justify-content: flex-end;
        visibility: hidden;
        pointer-events: none;
    }

    .row-actions--visible {
        visibility: visible;
        pointer-events: auto;
    }

    .row-actions .row-action-button,
    .row-actions .row-action-button:hover {
        background: transparent;
    }

    .row-action-button--cancel,
    .row-action-button--cancel:hover {
        background: #dc3545 !important;
        color: #fff !important;
    }

    .row-action-button--confirm,
    .row-action-button--confirm:hover {
        background: #198754 !important;
        color: #fff !important;
    }

    .row-action-button--cancel .node-icon,
    .row-action-button--confirm .node-icon {
        color: #fff;
    }


    .tree-cell-avatar {
        display: inline-flex;
        align-items: center;
        gap: 8px;
    }

    .tree-cell-avatar__image,
    .tree-cell-avatar__fallback {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        flex: 0 0 24px;
    }

    .tree-cell-avatar__image {
        object-fit: cover;
        border: 1px solid #dee2e6;
    }

    .tree-cell-avatar__fallback {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #e9ecef;
        color: #495057;
        font-size: 12px;
        font-weight: 600;
    }


    .tree-cell-div-color {
        display: inline-block;
    }

    .tree-cell-progress {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        width: 100%;
    }

    .tree-cell-progress__bar {
        flex: 1;
        min-width: 80px;
        height: 8px;
        border-radius: 999px;
        background: #e9ecef;
        overflow: hidden;
    }

    .tree-cell-progress__fill {
        height: 100%;
        background: #0d6efd;
        border-radius: 999px;
    }

    .tree-cell-progress__label {
        min-width: 40px;
        text-align: right;
        font-size: 12px;
        color: #495057;
    }


    .tree-cell-chip-list {
        position: relative;
        display: inline-flex;
        max-width: 100%;
    }

    .tree-cell-chip-list__chips {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        overflow: hidden;
        max-width: 100%;
    }

    .tree-cell-chip {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        line-height: 16px;
        white-space: nowrap;
        flex: 0 0 auto;
    }

    .tree-cell-chip--counter {
        background: #e5e7eb;
        color: #374151;
        font-weight: 600;
    }

    .tree-cell-chip-list__popup {
        position: absolute;
        z-index: 20;
        top: calc(100% + 6px);
        left: 0;
        min-width: 220px;
        max-width: 340px;
        padding: 10px;
        border-radius: 10px;
        border: 1px solid #e5e7eb;
        background: #fff;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .empty-state {
        padding: 12px;
        color: #6c757d;
    }
</style>
