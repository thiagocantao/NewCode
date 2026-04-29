<template>
    <div class="explorer" :class="{ 'is-disabled': isDisabled, 'is-readonly': isReadonly }">
        <div class="toolbar" v-if="!isReadonly">
            <button type="button" @click="createFolder()" :disabled="isDisabled">+ Pasta</button>
            <button type="button" @click="pickFiles()" :disabled="isDisabled">+ Arquivos</button>
            <button type="button" @click="createLink()" :disabled="isDisabled">+ Link</button>
        </div>

        <div class="path">/{{ currentPath.join('/') }}</div>

        <div class="list">
            <div class="item nav" v-if="currentPath.length" @click="goUp()">..</div>
            <div
                class="item"
                v-for="entry in currentEntries"
                :key="entry.id"
                :class="`type-${entry.type}`"
                @dblclick="openEntry(entry)"
            >
                <span class="name" @click="entry.type === 'folder' ? openEntry(entry) : null">{{ entry.name }}</span>
                <span class="actions" v-if="!isReadonly">
                    <button type="button" @click.stop="renameEntry(entry)" :disabled="isDisabled">Renomear</button>
                    <button type="button" @click.stop="removeEntry(entry)" :disabled="isDisabled">Remover</button>
                </span>
            </div>
        </div>

        <input ref="fileInput" class="hidden" type="file" multiple @change="handleFileSelection" :disabled="isDisabled || isReadonly" />
    </div>
</template>

<script>
import { ref, computed, watch, inject } from 'vue';

export default {
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

        const currentEntries = computed(() => getFolderByPath()?.children || []);

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

        const createLink = () => {
            const linkName = window.prompt('Nome do link');
            if (!linkName) return;
            const url = window.prompt('URL do link');
            if (!url) return;
            const parent = getFolderByPath();
            parent.children.push({ id: `l-${Date.now()}`, name: linkName.trim(), type: 'link', url: url.trim() });
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

        const openEntry = entry => {
            if (entry.type === 'folder') currentPath.value = [...currentPath.value, entry.name];
        };

        const goUp = () => {
            currentPath.value = currentPath.value.slice(0, -1);
        };

        const renameEntry = entry => {
            const newName = window.prompt('Novo nome', entry.name);
            if (!newName) return;
            entry.name = newName.trim();
            commitChange();
        };

        const removeEntry = entry => {
            const parent = getFolderByPath();
            parent.children = (parent.children || []).filter(item => item.id !== entry.id);
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
            currentEntries,
            fileInput,
            createFolder,
            createLink,
            pickFiles,
            handleFileSelection,
            openEntry,
            goUp,
            renameEntry,
            removeEntry,
        };
    },
};
</script>

<style scoped>
.explorer { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; background: #fff; }
.toolbar { display: flex; gap: 8px; margin-bottom: 8px; }
.path { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
.list { border: 1px solid #e5e7eb; border-radius: 6px; min-height: 160px; }
.item { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
.item:last-child { border-bottom: none; }
.item.nav { cursor: pointer; color: #2563eb; }
.name { cursor: pointer; }
.actions { display: flex; gap: 6px; }
.hidden { display: none; }
.is-disabled { opacity: 0.7; }
</style>
