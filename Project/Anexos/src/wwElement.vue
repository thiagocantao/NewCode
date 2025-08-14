<template>
    <div class="attachments">
        <div class="add-section">
            <button type="button" class="upload-button" @click="triggerFileInput">
                <span class="upload-icon">+</span>
            </button>
            <input
                ref="fileInput"
                type="file"
                multiple
                class="hidden-input"
                @change="onFilesSelected"
            />
        </div>

        <div
            v-for="(file, index) in files"
            :key="index"
            class="file-item"
        >
            <template v-if="file.url">
                <img :src="file.url" alt="" class="file-preview" />
            </template>
            <template v-else>
                <div class="file-icon">📄</div>
            </template>
            <div class="file-name">{{ file.file.name }}</div>
            <div class="file-actions">
                <button type="button" class="action-button" @click="downloadFile(file)">⬇️</button>
                <button
                    type="button"
                    class="action-button"
                    @click="removeFile(index)"
                >
                    🗑️
                </button>
            </div>
        </div>
    </div>
</template>

<script>
import { ref } from 'vue';

export default {
    name: 'Anexos',
    props: {
        content: { type: Object, required: true },
        wwElementState: { type: Object, required: true },
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
    },
    setup() {
        const files = ref([]);
        const fileInput = ref(null);

        function triggerFileInput() {
            if (fileInput.value) fileInput.value.click();
        }

        function onFilesSelected(event) {
            const selected = Array.from(event.target.files || []).map(file => ({
                file,
                url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            }));
            files.value.push(...selected);
            event.target.value = '';
        }

        function removeFile(index) {
            const removed = files.value.splice(index, 1)[0];
            if (removed && removed.url) URL.revokeObjectURL(removed.url);
        }

        function downloadFile(file) {
            const url = file.url || URL.createObjectURL(file.file);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.file.name;
            link.click();
            if (!file.url) URL.revokeObjectURL(url);
        }

        return {
            files,
            fileInput,
            triggerFileInput,
            onFilesSelected,
            removeFile,
            downloadFile,
        };
    },
};
</script>

<style lang="scss" scoped>
.attachments {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.upload-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 150px;
    height: 140px;
    padding: 12px;
    border: 2px dashed #ccc;
    border-radius: 6px;
    background: #FFFFFF;
    color: #555;
    cursor: pointer;
    gap: 8px;
}

.upload-icon {
    font-size: 55px;
    line-height: 1;
    font-weight: 300;
}

.upload-text {
    font-size: 12px;
}

.hidden-input {
    display: none;
}

.file-item {
    position: relative;
    width: 150px;
    height: 140px;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 10px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 12px;
    background: #fff;
}

.file-icon {
    font-size: 32px;
}

.file-preview {
    position: relative;
    height: 90px;
    background-position: center center;
    background-repeat: no-repeat;
    background-size: cover, 65px;
    background-color: rgb(245, 246, 250);
    border-radius: 6px;
    margin-bottom: 4px;
    cursor: pointer;
    display: flex;
}

.file-actions {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
}

.file-item:hover .file-actions {
    opacity: 1;
}

.action-button {
    width: 24px;
    height: 24px;
    border: none;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
}
</style>
