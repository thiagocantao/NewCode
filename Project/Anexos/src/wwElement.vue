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
                <img
                    :src="file.url"
                    alt=""
                    class="file-preview"
                    @click="openModal(index)"
                />
            </template>
            <template v-else>
                <div class="file-icon" @click="openModal(index)">📄</div>
            </template>
            <div class="file-name">{{ file.file.name }}</div>
            <div class="file-actions">
                <button type="button" class="action-button" @click="downloadFile(file)">
                    <i class="material-symbols-outlined">download</i>
                </button>
                <button
                    type="button"
                    class="action-button"
                    @click="removeFile(index)"
                >
                    <i class="material-symbols-outlined">delete</i>
                </button>
            </div>
        </div>
    </div>
    <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
            <button class="close-button" @click="closeModal">&times;</button>
            <button
                class="nav-button prev"
                @click="prevFile"
                :disabled="currentIndex === 0"
            >&lt;</button>
            <div class="modal-body">
                <template v-if="currentFile && currentFile.url">
                    <img :src="currentFile.url" alt="" class="modal-image" />
                </template>
                <template v-else>
                    <p class="no-preview">Preview not available for this file type.</p>
                </template>
            </div>
            <button
                class="nav-button next"
                @click="nextFile"
                :disabled="currentIndex === files.length - 1"
            >&gt;</button>
        </div>
    </div>
</template>

<script>
import { ref, computed } from 'vue';

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
        const isModalOpen = ref(false);
        const currentIndex = ref(0);
        const currentFile = computed(() => files.value[currentIndex.value]);

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

        function openModal(index) {
            currentIndex.value = index;
            isModalOpen.value = true;
        }

        function closeModal() {
            isModalOpen.value = false;
        }

        function nextFile() {
            if (currentIndex.value < files.value.length - 1) currentIndex.value++;
        }

        function prevFile() {
            if (currentIndex.value > 0) currentIndex.value--;
        }

        return {
            files,
            fileInput,
            triggerFileInput,
            onFilesSelected,
            removeFile,
            downloadFile,
            isModalOpen,
            currentIndex,
            currentFile,
            openModal,
            closeModal,
            nextFile,
            prevFile,
        };
    },
};

</script>

<style lang="scss" scoped>
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined');

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
    width: 100%;
    height: 90px;
    object-fit: contain;
    background-color: rgb(245, 246, 250);
    border-radius: 6px;
    margin-bottom: 4px;
    cursor: pointer;
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

.material-symbols-outlined {
    font-size: 16px;
    line-height: 1;
    vertical-align: middle;
}

i.material-symbols-outlined {
    font-family: 'Material Symbols Outlined';
    font-weight: normal;
    font-style: normal;
    font-size: 18px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
    vertical-align: middle;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: transparent;
    padding: 0;
    border-radius: 0;
    max-width: 80%;
    max-height: 80%;
    display: flex;
    align-items: center;
    position: relative;
}

.modal-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    max-height: 100%;
    margin: 0;
}

.modal-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.close-button {
    position: absolute;
    top: 8px;
    right: 8px;
    background: transparent;
    border: none;
    font-size: 24px;
    cursor: pointer;
}

.nav-button {
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    border: none;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 24px;
}

.nav-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.no-preview {
    font-size: 14px;
    color: #333;
}
</style>
