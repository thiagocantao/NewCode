<template>
    <div class="attachments">
        <input
            ref="fileInput"
            type="file"
            multiple
            class="hidden-input"
            @change="onFilesSelected"
        />

        <div class="file-list">
            <div class="add-item" @click="triggerFileInput">
                <div class="add-icon">+</div>
            </div>
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

.hidden-input {
    display: none;
}

.file-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.add-item {
    width: 120px;
    height: 120px;
    border: 2px dashed #bbb;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #999;
}

.add-icon {
    font-size: 32px;
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

