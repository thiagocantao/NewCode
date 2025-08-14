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

        <div class="file-list">
            <div v-for="(file, index) in files" :key="index" class="file-item">
                <div class="file-icon">📄</div>
                <div class="file-name">{{ file.name }}</div>
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
            const selected = Array.from(event.target.files || []);
            files.value.push(...selected);
            event.target.value = '';
        }

        return { files, fileInput, triggerFileInput, onFilesSelected };
    },
};
</script>

<style lang="scss" scoped>
.attachments {
    display: flex;
    flex-direction: column;
}

.add-section {
    margin-bottom: 1rem;
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

.file-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.file-item {
    width: 120px;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 10px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    font-size: 12px;
}

.file-icon {
    font-size: 32px;
}
</style>
