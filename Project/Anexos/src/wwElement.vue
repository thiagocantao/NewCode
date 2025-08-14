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

        <div v-for="(file, index) in files" :key="index" class="file-item">
            <template v-if="file.isImage">
                <img
                    :src="file.url"
                    alt=""
                    class="file-preview"
                    @click="openModal(index)"
                />
            </template>
            <template v-else>
                <i
                    :class="['file-icon', getFileIcon(file.file.name)]"
                    @click="openModal(index)"
                ></i>
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
        <div class="modal-content" :class="{ 'pdf-viewer': currentFile && currentFile.isPdf }">
            <div class="modal-top-actions">
                <button
                    v-if="currentFile && !currentFile.isPdf"
                    class="modal-action-button"
                    @click="downloadFile(currentFile)"
                >
                    <i class="material-symbols-outlined">download</i>
                </button>
                <button
                    class="modal-action-button"
                    @click="closeModal"
                >
                    <i class="material-symbols-outlined">close</i>
                </button>
            </div>
            <button
                class="nav-button prev"
                @click="prevFile"
                :disabled="currentIndex === 0"
            ><i class="material-symbols-outlined zoom-button">arrow_back_ios</i></button>
            <div class="modal-body">
                <template v-if="currentFile && currentFile.isImage">
                    <img
                        :src="currentFile.url"
                        alt=""
                        class="modal-image"
                        :style="{ transform: `scale(${zoom})` }"
                    />
                    <div class="modal-file-name">{{ currentFile.file.name }}</div>
                    <div class="zoom-controls">
                        <button class="zoom-button" @click="zoomOut"><i class="material-symbols-outlined zoom-button">zoom_out</i></button>
                        <button class="zoom-button" @click="zoomIn"><i class="material-symbols-outlined zoom-button">zoom_in</i></button>
                    </div>
                </template>
                <template v-else-if="currentFile && currentFile.isPdf">
                    <iframe
                        :src="currentFile.url"
                        class="modal-pdf"
                    ></iframe>
                    <div class="modal-file-name">{{ currentFile.file.name }}</div>
                </template>
                <template v-else>
                    <div class="file-not-viewable">
                        <i
                            v-if="currentFile"
                            :class="['modal-file-icon', getFileIcon(currentFile.file.name)]"
                        ></i>
                        <p class="no-preview">This file cannot be viewed</p>
                    </div>
                </template>
            </div>
            <button
                class="nav-button next"
                @click="nextFile"
                :disabled="currentIndex === files.length - 1"
            ><i class="material-symbols-outlined zoom-button">arrow_forward_ios</i></button>
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
        const zoom = ref(1);

        function triggerFileInput() {
            if (fileInput.value) fileInput.value.click();
        }

        function onFilesSelected(event) {
            const selected = Array.from(event.target.files || []).map(file => ({
                file,
                url:
                    file.type.startsWith('image/') || file.type === 'application/pdf'
                        ? URL.createObjectURL(file)
                        : null,
                isImage: file.type.startsWith('image/'),
                isPdf: file.type === 'application/pdf',
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

        function getFileIcon(name) {
            const ext = name.split('.').pop().toLowerCase();
            switch (ext) {
                case 'pdf':
                    return 'fa-solid fa-file-pdf';
                case 'doc':
                case 'docx':
                    return 'fa-solid fa-file-word';
                case 'xls':
                case 'xlsx':
                    return 'fa-solid fa-file-excel';
                case 'ppt':
                case 'pptx':
                    return 'fa-solid fa-file-powerpoint';
                default:
                    return 'fa-solid fa-file';
            }
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

        function zoomIn() {
            zoom.value += 0.1;
        }

        function zoomOut() {
            zoom.value = Math.max(0.1, zoom.value - 0.1);
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
            zoom,
            zoomIn,
            zoomOut,
            getFileIcon,
        };
    },
};

</script>

<style lang="scss" scoped>
    @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined');
    @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');

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
        font-size: 90px;
        cursor: pointer;
    }

    .fa-file-pdf {
        color: #e53935;
    }

    .fa-file-word {
        color: #3b73b9;
    }

    .fa-file-excel {
        color: #2e7d32;
    }

    .fa-file-powerpoint {
        color: #d84315;
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

    .file-name {
        width: 100%;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
        color: #e0e0e0;
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

    .modal-content.pdf-viewer {
        max-width: none;
        max-height: none;
        width: 95vw;
        height: 95vh;
    }

    .modal-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        max-height: 100%;
        margin: 0;
        width: 100%;
        height: 100%;
    }

    .modal-image {
        width: 600px;
        height: 400px;
        object-fit: contain;
        position: relative;
        z-index: 1;
    }

    .modal-pdf {
        width: 100%;
        height: 100%;
        flex: 1;
        border: none;
        position: relative;
        z-index: 1;
    }

    .modal-file-name {
        margin-top: 8px;
        color: #fff;
        position: relative;
        z-index: 2;
    }

    .zoom-controls {
        margin-top: 8px;
        display: flex;
        gap: 8px;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 4px;
        padding: 5px;
        align-items: center;
        text-align: center;
        z-index: 100;
        position: relative;
    }

    .zoom-button {
        border: none;
        color: #fff;
        cursor: pointer;
        font-size: 22px !important;
    }

    .modal-top-actions {
        position: absolute;
        top: 10px;
        right: 10px;
        display: flex;
        gap: 8px;
        z-index: 2;
    }

    .modal-action-button {
        width: 40px;
        height: 40px;
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        border: none;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    .modal-action-button i.material-symbols-outlined {
        font-size: 24px;
        color: #fff;
    }

    .nav-button {
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        border: none;
        width: 40px;
        height: 40px;
        cursor: pointer;
        font-size: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        z-index: 2;
    }

    .nav-button.prev {
        left: -75px;
    }

    .nav-button.next {
        right: -75px;
    }

    .nav-button:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .nav-button i.material-symbols-outlined {
        color: #fff;
    }

    .file-not-viewable {
        width: 600px;
        height: 400px;
        background: #fff;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
    }

    .modal-file-icon {
        font-size: 120px;
        margin-bottom: 16px;
    }

    .no-preview {
        font-size: 14px;
        color: #333;
    }
</style>
