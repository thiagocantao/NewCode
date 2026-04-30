<template>
    <li
        class="ww-file-item"
        :class="{ 'ww-file-item--disabled': isDisabled }"
        :style="fileItemStyles"
        role="listitem"
        :aria-label="`File: ${file.name}, Size: ${formattedSize}`"
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
                :aria-label="`Preview ${file.name}`"
                :title="previewHint || null"
                :class="{ 'ww-file-item__preview--not-allowed': !canPreview }"
            >
                <img v-if="isImage && previewUrl" :src="previewUrl" alt="" class="ww-file-item__thumb" />
                <i v-else :class="['ww-file-item__file-icon', fileIcon]" aria-hidden="true"></i>

                <div class="ww-file-item__actions">
                    <button
                        type="button"
                        class="ww-file-item__btn"
                        :disabled="isDisabled"
                        @click.stop="$emit('download')"
                        :style="actionButtonStyles"
                        aria-label="Download file"
                    >
                        <i class="fa-solid fa-download" aria-hidden="true"></i>
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
                        <i class="fa-regular fa-trash-can" aria-hidden="true"></i>
                    </button>
                </div>
            </button>
            <div class="ww-file-item__meta">
                <div class="ww-file-item__name" :style="fileNameStyles">{{ file.name }}</div>
                <div class="ww-file-item__details" :style="fileDetailsStyles" v-if="showFileInfo">
                    <span>{{ formattedSize }}</span>
                    <span v-if="status && status.uploadProgress !== undefined">
                        • {{ `${Math.round(status.uploadProgress)}%` }}
                    </span>
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
        const fileUpload = inject('_wwFileUpload', {
            files: computed(() => []),
            content: computed(() => ({})),
        });

        const content = computed(() => fileUpload.content?.value || {});
        const showFileInfo = computed(() => content.value?.showFileInfo);

        const fileItemStyles = computed(() => ({
            backgroundColor: content.value?.fileItemBackground || '#fff',
            borderColor: content.value?.fileItemBorderColor || '#eee',
            borderRadius: content.value?.fileItemBorderRadius || '6px',
            padding: content.value?.fileItemPadding || '12px',
            margin: content.value?.fileItemMargin || '0 0 8px 0',
            boxShadow: content.value?.fileItemShadow || '0 2px 4px rgba(0, 0, 0, 0.05)',
        }));

        const fileNameStyles = computed(() => ({
            fontFamily: content.value?.fileNameFontFamily || 'inherit',
            fontSize: content.value?.fileNameFontSize || '14px',
            fontWeight: content.value?.fileNameFontWeight || 500,
            color: content.value?.fileNameColor || 'inherit',
        }));

        const fileDetailsStyles = computed(() => ({
            fontFamily: content.value?.fileDetailsFontFamily || 'inherit',
            fontSize: content.value?.fileDetailsFontSize || '12px',
            fontWeight: content.value?.fileDetailsFontWeight || 'normal',
            color: content.value?.fileDetailsColor || '#888',
        }));

        const actionButtonStyles = computed(() => ({
            width: content.value?.actionButtonSize || '28px',
            height: content.value?.actionButtonSize || '28px',
            backgroundColor: content.value?.actionButtonBackground || '#fff',
            color: content.value?.actionButtonColor || '#666',
            borderRadius: content.value?.actionButtonBorderRadius || '4px',
        }));

        const formattedSize = computed(() => {
            const fileSizeInBytes = props.file.size || 0;
            if (fileSizeInBytes === 0) return '0 B';
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(fileSizeInBytes) / Math.log(1024));
            return `${(fileSizeInBytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
        });

        const isImage = computed(() => {
            const type = (props.file?.type || props.file?.mimeType || props.file?.contentType || '').toLowerCase();
            if (type.startsWith('image/')) return true;
            const ext = (props.file?.name || '').split('.').pop()?.toLowerCase();
            return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
        });

        const previewUrl = ref(null);

        const updatePreviewUrl = () => {
            const currentValue = props.file?.previewUrl || props.file?.url || null;
            if (currentValue) {
                previewUrl.value = currentValue;
                return;
            }

            const localFile = props.file instanceof File ? props.file : props.file?.file;
            if (localFile instanceof File && isImage.value) {
                previewUrl.value = URL.createObjectURL(localFile);
                return;
            }

            previewUrl.value = null;
        };

        const fileIcon = computed(() => {
            const ext = (props.file?.name || '').split('.').pop()?.toLowerCase();
            if (ext === 'pdf') return 'fa-regular fa-file-pdf';
            if (['doc', 'docx'].includes(ext)) return 'fa-regular fa-file-word';
            if (['xls', 'xlsx', 'csv'].includes(ext)) return 'fa-regular fa-file-excel';
            if (['ppt', 'pptx'].includes(ext)) return 'fa-regular fa-file-powerpoint';
            if (['txt', 'log'].includes(ext)) return 'fa-regular fa-file-lines';
            if (['zip', 'rar', '7z'].includes(ext)) return 'fa-regular fa-file-zipper';
            if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'fa-regular fa-file-video';
            if (['mp3', 'wav', 'ogg', 'aac'].includes(ext)) return 'fa-regular fa-file-audio';
            return 'fa-regular fa-file';
        });

        onMounted(updatePreviewUrl);
        watch(() => [props.file?.previewUrl, props.file?.url, props.file?.name, props.file?.type], updatePreviewUrl, {
            immediate: true,
        });

        onBeforeUnmount(() => {
            if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl.value);
            }
        });

        return {
            content,
            showFileInfo,
            fileItemStyles,
            fileNameStyles,
            fileDetailsStyles,
            actionButtonStyles,
            formattedSize,
            isImage,
            previewUrl,
            fileIcon,
        };
    },
};
</script>

<style lang="scss" scoped>
.ww-file-item {
    display: flex;
    align-items: center;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &__progress {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        z-index: 0;
        transition: width 0.4s ease;
        opacity: 0.2;
    }

    &__info {
        width: v-bind('content?.fileTileWidth || "120px"');
        height: v-bind('content?.fileTileHeight || "120px"');
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
    }

    &__preview {
        width: 100%;
        height: calc(100% - 30px);
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        background: #f8fafc;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        cursor: pointer;
        position: relative;

        &:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
    }

    &__preview--not-allowed {
        cursor: not-allowed;
    }

    &__meta {
        width: 100%;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    &__thumb {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 6px;
    }

    &__file-icon {
        font-size: 40px;
        color: #64748b;
    }

    &__actions {
        position: absolute;
        top: 6px;
        right: 6px;
        display: flex;
        gap: 4px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
        z-index: 2;
    }

    &__preview:hover &__actions {
        opacity: 1;
        pointer-events: auto;
    }

    &__btn {
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #d1d5db;
        background: #fff;
        color: #374151;
        cursor: pointer;

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    &__name {
        width: 100%;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
}

.ww-file-item__file-icon.fa-file-pdf {
    color: #e53935;
}
.ww-file-item__file-icon.fa-file-word {
    color: #3b73b9;
}
.ww-file-item__file-icon.fa-file-excel {
    color: #2e7d32;
}
.ww-file-item__file-icon.fa-file-powerpoint {
    color: #d84315;
}
.ww-file-item__file-icon.fa-file-lines {
    color: #546e7a;
}
</style>
