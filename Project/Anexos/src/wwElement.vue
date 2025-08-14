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

        return { files, fileInput, triggerFileInput, onFilesSelected };
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
    max-width: 100%;
    max-height: 80px;
    object-fit: cover;
    border-radius: 4px;
}
</style>
