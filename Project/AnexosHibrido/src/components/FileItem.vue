<template>
    <li
        class="ww-file-item"
        :class="{ 'ww-file-item--disabled': isDisabled }"
        :style="fileItemStyles"
        role="listitem"
        :aria-label="`File: ${resolvedName || 'Attachment'}, Size: ${formattedSize}`"
    >
        <div
            v-if="status && status.uploadProgress !== undefined"
            class="ww-file-item__progress"
            :style="{
                width: `${Math.min(100, Math.round(status.uploadProgress))}%`,
                backgroundColor: content.progressBarColor || '#EEEEEE',
            }"
        ></div>

        <div class="ww-file-item__info">
            <button
                type="button"
                class="ww-file-item__preview"
                :disabled="isDisabled"
                @click="$emit('preview')"
                :aria-label="`Preview ${resolvedName || 'attachment'}`"
                :title="previewHint || null"
                :class="{ 'ww-file-item__preview--not-allowed': !canPreview }"
            >
                <img v-if="isImage && previewUrl" :src="previewUrl" alt="" class="ww-file-item__thumb" />
                <span v-else :class="['ww-file-item__file-icon', 'material-symbols-outlined', fileIconClass]">
                    {{ fileIcon }}
                </span>

                <div class="ww-file-item__actions">
                    <button
                        type="button"
                        class="ww-file-item__btn"
                        :disabled="isDisabled"
                        @click.stop="$emit('download')"
                        :style="actionButtonStyles"
                        aria-label="Download file"
                    >
                        <span class="material-symbols-outlined" aria-hidden="true">download</span>
                    </button>
                    <button
                        v-if="!isReadonly"
                        type="button"
                        class="ww-file-item__btn ww-file-item__btn--remove"
                        :disabled="isDisabled || isReadonly"
                        @click.stop="$emit('remove')"
                        :style="actionButtonStyles"
                        aria-label="Remove file"
                    >
                        <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                    </button>
                </div>
            </button>

            <div class="ww-file-item__meta">
                <div class="ww-file-item__name" :style="fileNameStyles">{{ resolvedName }}</div>
                <div class="ww-file-item__details" :style="fileDetailsStyles" v-if="showFileInfo">
                    <span>{{ formattedSize }}</span>
                    <span v-if="status && status.uploadProgress !== undefined">• {{ `${Math.round(status.uploadProgress)}%` }}</span>
                </div>
            </div>
        </div>
    </li>
</template>

<script>
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';

export default {
    props: {
        file: { type: Object, required: true },
        status: { type: Object, required: true },
        index: { type: Number, required: true },
        isReadonly: { type: Boolean, default: false },
        isDisabled: { type: Boolean, default: false },
        canPreview: { type: Boolean, default: true },
        previewHint: { type: String, default: '' },
    },
    emits: ['remove', 'download', 'preview'],
    setup(props) {
        const fileUpload = inject('_wwFileUpload', { files: computed(() => []), content: computed(() => ({})) });
        const content = computed(() => fileUpload.content?.value || {});
        const showFileInfo = computed(() => content.value?.showFileInfo);

        const fileItemStyles = computed(() => ({
            backgroundColor: content.value?.fileItemBackground || '#fff',
            borderColor: content.value?.fileItemBorderColor || '#eee',
        }));
        const fileNameStyles = computed(() => ({ fontSize: content.value?.fileNameFontSize || '14px' }));
        const fileDetailsStyles = computed(() => ({ fontSize: content.value?.fileDetailsFontSize || '12px' }));
        const actionButtonStyles = computed(() => ({
            width: content.value?.actionButtonSize || '28px',
            height: content.value?.actionButtonSize || '28px',
        }));

        

        const resolvedName = computed(
            () => props.file?.name || props.file?.fileName || props.file?.FileName || props.file?.originalName || ''
        );
        const resolvedType = computed(() =>
            (
                props.file?.type ||
                props.file?.mimeType ||
                props.file?.contentType ||
                props.file?.ContentType ||
                props.file?.mime_type ||
                ''
            ).toLowerCase()
        );

        const formattedSize = computed(() => {
            const n = props.file.size || 0;
            if (!n) return '0 B';
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(n) / Math.log(1024));
            return `${(n / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
        });

        const isImage = computed(() => {
            const type = resolvedType.value;
            if (type.startsWith('image/')) return true;
            const ext = (resolvedName.value || '').split('.').pop()?.toLowerCase();
            return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
        });

        const previewUrl = ref(null);
        const getDataUrlFromBase64 = value => {
            if (!value || typeof value !== 'string') return null;
            if (value.startsWith('data:')) return value;
            const sanitized = value.replace(/\s/g, '');
            if (!sanitized) return null;
            const mime = resolvedType.value || 'image/png';
            return `data:${mime};base64,${sanitized}`;
        };

        const updatePreviewUrl = () => {
            const base64Preview =
                getDataUrlFromBase64(props.file?.base64) ||
                getDataUrlFromBase64(props.file?.base64Data) ||
                getDataUrlFromBase64(props.file?.Base64Data);
            previewUrl.value =
                props.file?.previewUrl ||
                props.file?.url ||
                props.file?.downloadUrl ||
                props.file?.downloadURL ||
                props.file?.thumbnailUrl ||
                base64Preview ||
                null;
            const localFile = props.file instanceof File ? props.file : props.file?.file;
            if (!previewUrl.value && localFile instanceof File && isImage.value) {
                previewUrl.value = URL.createObjectURL(localFile);
            }
        };

        const fileIcon = computed(() => {
            const ext = (resolvedName.value || '').split('.').pop()?.toLowerCase();
            if (ext === 'pdf') return 'picture_as_pdf';
            if (['doc', 'docx'].includes(ext)) return 'description';
            if (['xls', 'xlsx', 'csv'].includes(ext)) return 'table_chart';
            if (['ppt', 'pptx'].includes(ext)) return 'slideshow';
            if (['txt', 'log'].includes(ext)) return 'article';
            return 'insert_drive_file';
        });
        const fileIconClass = computed(() => {
            const ext = (resolvedName.value || '').split('.').pop()?.toLowerCase();
            if (ext === 'pdf') return 'ww-file-item__file-icon--pdf';
            if (['doc', 'docx'].includes(ext)) return 'ww-file-item__file-icon--word';
            if (['xls', 'xlsx', 'csv'].includes(ext)) return 'ww-file-item__file-icon--excel';
            if (['ppt', 'pptx'].includes(ext)) return 'ww-file-item__file-icon--powerpoint';
            if (['txt', 'log'].includes(ext)) return 'ww-file-item__file-icon--text';
            return '';
        });

        onMounted(updatePreviewUrl);
        watch(
            () => [
                props.file?.previewUrl,
                props.file?.url,
                props.file?.downloadUrl,
                props.file?.downloadURL,
                props.file?.thumbnailUrl,
                props.file?.base64,
                props.file?.base64Data,
                props.file?.Base64Data,
                resolvedName.value,
                resolvedType.value,
            ],
            updatePreviewUrl,
            { immediate: true }
        );
        onBeforeUnmount(() => {
            if (previewUrl.value && previewUrl.value.startsWith('blob:')) URL.revokeObjectURL(previewUrl.value);
        });

        return { content, showFileInfo, formattedSize, fileNameStyles, fileDetailsStyles, actionButtonStyles, isImage, previewUrl, fileIcon, fileItemStyles, resolvedName, fileIconClass };
    },
};
</script>

<style lang="scss" scoped>
.ww-file-item { position: relative;
&__info { width: v-bind('content?.fileTileWidth || "120px"'); }
&__preview { width: 100%; height: v-bind('content?.fileTileHeight || "120px"'); display: flex; align-items: center; justify-content: center; position: relative; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; overflow: hidden; }
&__thumb { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
&__file-icon { font-size: 42px; color: #64748b; line-height: 1; }
&__actions { position: absolute; top: 6px; right: 6px; display: flex; gap: 4px; opacity: 0; pointer-events: none; transition: opacity .2s; }
&__preview:hover &__actions { opacity: 1; pointer-events: auto; }
&__btn { display:flex; align-items:center; justify-content:center; border:1px solid #e5e7eb; border-radius:4px; background:#fff; cursor:pointer; }
&__meta { text-align:center; margin-top: 6px; }
}
.ww-file-item__file-icon--pdf { color: #e53935; }
.ww-file-item__file-icon--word { color: #3b73b9; }
.ww-file-item__file-icon--excel { color: #2e7d32; }
.ww-file-item__file-icon--powerpoint { color: #d84315; }
.ww-file-item__file-icon--text { color: #546e7a; }
</style>
