<template>
    <div class="file-manager" :class="{ 'is-disabled': isDisabled, 'is-readonly': isReadonly }">
        <div class="toolbar" v-if="!isReadonly">
            <button type="button" class="toolbar-button" @click="pickFiles" :disabled="isDisabled" title="Adicionar arquivos">
                <i class="fa-solid fa-file-circle-plus" aria-hidden="true"></i>
            </button>
            <button type="button" class="toolbar-button" @click="createFolder" :disabled="isDisabled" title="Adicionar pasta">
                <i class="fa-solid fa-folder-plus" aria-hidden="true"></i>
            </button>
        </div>

        <div class="layout">
            <aside class="tree-panel">
                <div class="tree-title">Pastas</div>
                <ul class="tree-root">
                    <TreeNode
                        v-if="rootFolder"
                        :node="rootFolder"
                        :active-path="activePathString"
                        :is-readonly="isReadonly"
                        :is-disabled="isDisabled"
                        @select-folder="selectFolder"
                        @rename-entry="renameEntry"
                        @remove-entry="removeEntry"
                    />
                </ul>
            </aside>

            <section class="content-panel">
                <div class="path">/{{ currentPath.join('/') || rootFolder?.name }}</div>
                <div class="list">
                    <div class="item" v-for="entry in currentEntries" :key="entry.id">
                        <span class="entry-name" @dblclick="entry.type === 'folder' ? selectFolder(entry.pathSegments) : null">
                            <i :class="entry.type === 'folder' ? 'fa-solid fa-folder' : 'fa-solid fa-file'" aria-hidden="true"></i>
                            {{ entry.name }}
                        </span>
                        <span class="actions" v-if="!isReadonly">
                            <button type="button" @click.stop="renameEntry(entry)" :disabled="isDisabled">Renomear</button>
                            <button type="button" @click.stop="removeEntry(entry)" :disabled="isDisabled">Remover</button>
                        </span>
                    </div>
                    <div v-if="!currentEntries.length" class="empty">Sem arquivos ou pastas.</div>
                </div>
            </section>
        </div>

        <input ref="fileInput" class="hidden" type="file" multiple @change="handleFileSelection" :disabled="isDisabled || isReadonly" />
    </div>
</template>

<script>
import { ref, computed, watch, inject, defineComponent } from 'vue';

const TreeNode = defineComponent({
    name: 'TreeNode',
    props: {
        node: { type: Object, required: true },
        activePath: { type: String, default: '' },
        isReadonly: { type: Boolean, default: false },
        isDisabled: { type: Boolean, default: false },
    },
    emits: ['select-folder', 'rename-entry', 'remove-entry'],
    computed: {
        nodePath() {
            return (this.node.pathSegments || []).join('/');
        },
        isActive() {
            return this.activePath === this.nodePath;
        },
        childFolders() {
            return (this.node.children || []).filter(item => item.type === 'folder');
        },
    },
    template: `
        <li class="tree-node">
            <div class="tree-row" :class="{ active: isActive }" @click="$emit('select-folder', node.pathSegments || [])">
                <span class="tree-label">
                    <i class="fa-solid fa-folder" aria-hidden="true"></i>
                    {{ node.name }}
                </span>
                <span class="tree-actions" v-if="!isReadonly">
                    <button type="button" @click.stop="$emit('rename-entry', node)" :disabled="isDisabled">R</button>
                    <button type="button" @click.stop="$emit('remove-entry', node)" :disabled="isDisabled || node.id === 'root'">X</button>
                </span>
            </div>
            <ul v-if="childFolders.length" class="tree-children">
                <TreeNode
                    v-for="child in childFolders"
                    :key="child.id"
                    :node="child"
                    :active-path="activePath"
                    :is-readonly="isReadonly"
                    :is-disabled="isDisabled"
                    @select-folder="$emit('select-folder', $event)"
                    @rename-entry="$emit('rename-entry', $event)"
                    @remove-entry="$emit('remove-entry', $event)"
                />
            </ul>
        </li>
    `,
});

export default {
    components: { TreeNode },
    props: {
        content: { type: Object, required: true },
        wwFrontState: { type: Object, required: true },
        wwEditorState: { type: Object, required: true },
        uid: { type: String, required: true },
        wwElementState: { type: Object, required: true },
    },
    emits: ['trigger-event', 'add-state', 'remove-state'],
    setup(props, { emit }) {
        const isDisabled = computed(() => props.wwElementState.props.disabled || false);
        const isReadonly = computed(() => props.wwElementState.props.readonly || props.content?.readonly || false);
        const fileInput = ref(null);
        const currentPath = ref([]);

        const { value: files, setValue: setFiles } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'value',
            defaultValue: [],
            type: 'any',
            componentType: 'element',
        });

        const ensureTree = () => {
            if (!Array.isArray(files.value) || files.value.length === 0) {
                setFiles([{ id: 'root', name: 'root', type: 'folder', children: [] }]);
            }
        };

        const getRoot = () => {
            ensureTree();
            return files.value[0];
        };

        const getFolderByPath = (path = currentPath.value) => {
            let node = getRoot();
            for (const segment of path) {
                node = (node.children || []).find(item => item.type === 'folder' && item.name === segment);
                if (!node) return null;
            }
            return node;
        };

        const annotatePaths = (node, parentPath = []) => {
            node.pathSegments = [...parentPath, node.name].filter(name => name !== 'root');
            (node.children || []).forEach(child => {
                if (child.type === 'folder') annotatePaths(child, node.pathSegments);
            });
            return node;
        };

        const rootFolder = computed(() => annotatePaths(getRoot(), []));
        const currentEntries = computed(() => {
            const folder = getFolderByPath();
            return (folder?.children || []).map(entry => ({ ...entry, pathSegments: [...currentPath.value, entry.name] }));
        });
        const activePathString = computed(() => currentPath.value.join('/'));

        const commitChange = () => {
            setFiles([...files.value]);
            emit('trigger-event', { name: 'change', event: { value: files.value } });
        };

        const createFolder = () => {
            const folderName = window.prompt('Nome da pasta');
            if (!folderName) return;
            const parent = getFolderByPath();
            parent.children.push({ id: `f-${Date.now()}`, name: folderName.trim(), type: 'folder', children: [] });
            commitChange();
        };

        const pickFiles = () => fileInput.value?.click();

        const handleFileSelection = event => {
            const selectedFiles = Array.from(event.target.files || []);
            if (!selectedFiles.length) return;
            const parent = getFolderByPath();
            selectedFiles.forEach(file => {
                parent.children.push({ id: `a-${Date.now()}-${Math.random()}`, name: file.name, type: 'file', size: file.size });
            });
            commitChange();
            event.target.value = '';
        };

        const selectFolder = path => {
            currentPath.value = Array.isArray(path) ? path : [];
        };

        const renameEntry = entry => {
            if (entry.id === 'root') return;
            const newName = window.prompt('Novo nome', entry.name);
            if (!newName) return;
            entry.name = newName.trim();
            commitChange();
        };

        const removeEntry = entry => {
            if (entry.id === 'root') return;
            const parentPath = (entry.pathSegments || []).slice(0, -1);
            const parent = getFolderByPath(parentPath);
            if (!parent) return;
            parent.children = (parent.children || []).filter(item => item.id !== entry.id);
            if ((entry.pathSegments || []).join('/') === currentPath.value.join('/')) {
                currentPath.value = parentPath;
            }
            commitChange();
        };

        watch(isReadonly, value => emit(value ? 'add-state' : 'remove-state', 'readonly'), { immediate: true });
        watch(isDisabled, value => emit(value ? 'add-state' : 'remove-state', 'disabled'), { immediate: true });

        const useForm = inject('_wwForm:useForm', () => {});
        useForm(files, { fieldName: computed(() => props.content.fieldName) }, { elementState: props.wwElementState, emit, sidepanelFormPath: 'form', setValue: setFiles });

        ensureTree();

        return {
            isDisabled,
            isReadonly,
            currentPath,
            rootFolder,
            currentEntries,
            activePathString,
            fileInput,
            createFolder,
            pickFiles,
            handleFileSelection,
            selectFolder,
            renameEntry,
            removeEntry,
        };
    },
};
</script>

<style scoped>
.file-manager { border: 1px solid #d1d5db; border-radius: 8px; background: #fff; overflow: hidden; }
.toolbar { display: flex; gap: 8px; padding: 10px; border-bottom: 1px solid #e5e7eb; }
.toolbar-button { width: 34px; height: 34px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; }
.layout { display: grid; grid-template-columns: 260px 1fr; min-height: 280px; }
.tree-panel { border-right: 1px solid #e5e7eb; padding: 10px; }
.tree-title { font-size: 12px; color: #6b7280; margin-bottom: 8px; text-transform: uppercase; }
.tree-root, .tree-children { list-style: none; margin: 0; padding: 0; }
.tree-children { padding-left: 12px; }
.tree-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; border-radius: 6px; cursor: pointer; }
.tree-row.active { background: #eff6ff; }
.tree-label { display: inline-flex; align-items: center; gap: 8px; }
.tree-actions { display: inline-flex; gap: 4px; }
.content-panel { padding: 10px; }
.path { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
.list { border: 1px solid #e5e7eb; border-radius: 6px; min-height: 210px; }
.item { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
.item:last-child { border-bottom: none; }
.entry-name { display: inline-flex; align-items: center; gap: 8px; }
.actions { display: flex; gap: 6px; }
.empty { color: #6b7280; padding: 10px; }
.hidden { display: none; }
.is-disabled { opacity: 0.7; pointer-events: none; }
</style>
