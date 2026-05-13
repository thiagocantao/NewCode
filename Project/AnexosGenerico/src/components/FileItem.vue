<template>
    <div class="ww-file-item" :class="{ 'ww-file-item--disabled': isDisabled }" :style="fileItemStyles" role="listitem"
        :aria-label="`File: ${resolvedName || 'Attachment'}, Size: ${formattedSize}`">
        <div v-if="status && status.uploadProgress !== undefined" class="ww-file-item__progress" :style="{
                width: `${Math.min(100, Math.round(status.uploadProgress))}%`,
                backgroundColor: content.progressBarColor || '#EEEEEE',
            }"></div>

        <div class="ww-file-item__info">
            <div class="ww-file-item__preview" :class="{ 'ww-file-item__preview--not-allowed': !canPreview }"
                role="button" tabindex="0" :aria-label="`Preview ${resolvedName || 'attachment'}`"
                :title="previewHint || null" @click="handlePreview" @keydown.enter.prevent="handlePreview"
                @keydown.space.prevent="handlePreview">
                <img
                    v-if="isImage && thumbnailSrc"
                    :src="thumbnailSrc"
                    :alt="resolvedName || 'Imagem'"
                    class="ww-file-item__thumb"
                    loading="lazy"
                    @error="handleThumbError"
                />

                <span v-else :class="['ww-file-item__file-icon', 'material-symbols-outlined', fileIconClass]">
                    {{ fileIcon }}
                </span>

                <div class="ww-file-item__actions" @click.stop>
                    <button
                        type="button"
                        class="ww-file-item__btn"
                        :disabled="isDisabled"
                        @click="handleDownload"
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
                        @click="handleRemove"
                        :style="actionButtonStyles"
                        aria-label="Remove file"
                    >
                        <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                    </button>
                </div>
            </div>

            <div class="ww-file-item__meta">
                <div class="ww-file-item__name" :style="fileNameStyles" :title="resolvedName">{{ resolvedName }}</div>
                <div class="ww-file-item__details" :style="fileDetailsStyles" v-if="showFileInfo">
                    <span>{{ formattedSize }}</span>
                    <span v-if="status && status.uploadProgress !== undefined">{{ `${Math.round(status.uploadProgress)}%` }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';

export default {
    name: 'FileItem',
    props: {
        file: { type: Object, required: true },
        status: { type: Object, default: () => ({}) },
        index: { type: Number, required: true },
        isReadonly: { type: Boolean, default: false },
        isDisabled: { type: Boolean, default: false },
        canPreview: { type: Boolean, default: true },
        previewHint: { type: String, default: '' },
    },
    emits: ['remove', 'download', 'preview'],
    setup(props, { emit }) {
        const fileUpload = inject('_wwFileUpload', { files: computed(() => []), content: computed(() => ({})) });
        const content = computed(() => fileUpload.content?.value || {});
        const showFileInfo = computed(() => content.value?.showFileInfo !== false);

        const objectUrl = ref('');
        const signedThumbUrl = ref('');
        const thumbLoadFailed = ref(false);
        const resolvingThumb = ref(false);

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
            const n = Number(props.file?.size || props.file?.SizeBytes || props.file?.sizeBytes || 0);
            if (!n) return '0 B';
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(n) / Math.log(1024));
            return `${(n / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
        });

        const IMAGE_EXTENSIONS = new Set([
            'apng', 'avif', 'bmp', 'cur', 'gif', 'heic', 'heif', 'ico', 'jfif', 'jpeg', 'jpg', 'pjpeg', 'pjp',
            'png', 'svg', 'tif', 'tiff', 'webp',
        ]);

        const getExtension = value => {
            if (!value || typeof value !== 'string') return '';
            const sanitized = decodeURIComponent(value.split('?')[0].split('#')[0]);
            const parts = sanitized.split('.');
            return parts.length > 1 ? parts.pop().toLowerCase() : '';
        };

        const isNativeFile = value => {
            if (!value || typeof File === 'undefined') return false;
            if (value instanceof File) return true;
            return Object.prototype.toString.call(value) === '[object File]';
        };

        const getLocalFile = () => {
            if (isNativeFile(props.file)) return props.file;
            if (isNativeFile(props.file?.file)) return props.file.file;
            return null;
        };

        const isValidImageUrl = value => {
            if (!value || typeof value !== 'string') return false;
            return /^(blob:|data:image\/|https?:\/\/)/i.test(value);
        };

        const isImage = computed(() => {
            if (props.file?.isImage === true) return true;
            if (resolvedType.value.startsWith('image/')) return true;
            if (getLocalFile()?.type?.startsWith('image/')) return true;

            const dataUrl = props.file?.base64 || props.file?.base64Data || props.file?.Base64Data || '';
            if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) return true;

            const extensionCandidates = [
                resolvedName.value,
                props.file?.url,
                props.file?.previewUrl,
                props.file?.thumbnailUrl,
                props.file?.displayUrl,
                props.file?.signedUrl,
                props.file?.downloadUrl,
                props.file?.downloadURL,
                props.file?.storagePath,
                props.file?.StoragePath,
                props.file?.path,
            ]
                .map(getExtension)
                .filter(Boolean);

            return extensionCandidates.some(ext => IMAGE_EXTENSIONS.has(ext));
        });

        const getDataUrlFromBase64 = value => {
            if (!value || typeof value !== 'string') return '';
            if (value.startsWith('data:image/')) return value;
            if (value.startsWith('data:')) return '';
            const sanitized = value.replace(/\s/g, '');
            if (!sanitized) return '';
            const mime = resolvedType.value && resolvedType.value.startsWith('image/') ? resolvedType.value : 'image/png';
            return `data:${mime};base64,${sanitized}`;
        };

        const rebuildObjectUrl = () => {
            if (objectUrl.value) {
                URL.revokeObjectURL(objectUrl.value);
                objectUrl.value = '';
            }

            const localFile = getLocalFile();
            if (localFile && isImage.value) {
                objectUrl.value = URL.createObjectURL(localFile);
            }
        };

        const getSupabase = () => {
            try {
                return wwLib?.wwPlugins?.supabase?.instance || window?.wwLib?.wwPlugins?.supabase?.instance || null;
            } catch (e) {
                return null;
            }
        };

        const isHttpUrl = value => typeof value === 'string' && /^https?:\/\//i.test(value);
        const sanitizeBucket = value => (typeof value === 'string' ? value.trim().replace(/^\/+|\/+$/g, '') : '');
        const sanitizeStoragePath = value =>
            typeof value === 'string' ? value.trim().replace(/^\/+/, '').replace(/\?.*$/, '') : '';

        const resolveStorageLocation = file => {
            const rawBucket = sanitizeBucket(
                file?.bucket || file?.storageBucket || file?.StorageBucket || file?.storagebucket || ''
            );
            let rawPath = sanitizeStoragePath(
                file?.storagePath || file?.StoragePath || file?.storagepath || file?.path || ''
            );

            if (!rawPath && isHttpUrl(file?.url)) {
                return { bucket: rawBucket, storagePath: '', directUrl: file.url };
            }

            if (rawPath && rawBucket && rawPath.startsWith(`${rawBucket}/`)) {
                rawPath = rawPath.slice(rawBucket.length + 1);
            }

            if (!rawBucket && rawPath.includes('/')) {
                const [bucketFromPath, ...rest] = rawPath.split('/');
                return {
                    bucket: sanitizeBucket(bucketFromPath),
                    storagePath: sanitizeStoragePath(rest.join('/')),
                    directUrl: isHttpUrl(file?.url) ? file.url : null,
                };
            }

            return { bucket: rawBucket, storagePath: rawPath, directUrl: isHttpUrl(file?.url) ? file.url : null };
        };

        const resolveSignedThumbnailUrl = async () => {
            if (!isImage.value || resolvingThumb.value) return;

            const supabase = getSupabase();
            const { bucket, storagePath } = resolveStorageLocation(props.file);

            if (!supabase?.storage || !bucket || !storagePath) return;

            resolvingThumb.value = true;
            try {
                const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 3600, {
                    transform: { width: 400, resize: 'contain' },
                });

                if (!error && data?.signedUrl) {
                    signedThumbUrl.value = data.signedUrl;
                    thumbLoadFailed.value = false;

                    // Mantém o objeto atualizado para o preview/download do componente pai também reutilizar a URL.
                    if (props.file && typeof props.file === 'object') {
                        props.file.thumbnailUrl = data.signedUrl;
                        props.file.previewUrl = props.file.previewUrl || data.signedUrl;
                        props.file.url = props.file.url || data.signedUrl;
                    }
                }
            } catch (error) {
                console.warn('Erro ao resolver miniatura da imagem:', error);
            } finally {
                resolvingThumb.value = false;
            }
        };

        const preferredImageUrl = computed(() => {
            // Para arquivo recém-selecionado, o objectUrl é sempre a miniatura mais confiável.
            if (objectUrl.value) return objectUrl.value;

            return (
                getDataUrlFromBase64(props.file?.base64) ||
                getDataUrlFromBase64(props.file?.base64Data) ||
                getDataUrlFromBase64(props.file?.Base64Data) ||
                props.file?.thumbnailUrl ||
                signedThumbUrl.value ||
                props.file?.previewUrl ||
                props.file?.displayUrl ||
                props.file?.url ||
                props.file?.signedUrl ||
                props.file?.downloadUrl ||
                props.file?.downloadURL ||
                ''
            );
        });

        const thumbnailSrc = computed(() => {
            if (!isImage.value) return '';
            const src = preferredImageUrl.value;
            return isValidImageUrl(src) ? src : '';
        });

        const fileIcon = computed(() => {
            const ext = getExtension(resolvedName.value);
            if (isImage.value) return 'image';
            if (ext === 'pdf') return 'picture_as_pdf';
            if (['doc', 'docx', 'docm'].includes(ext)) return 'description';
            if (['xls', 'xlsx', 'xlsm', 'xlsb', 'csv'].includes(ext)) return 'table_chart';
            if (['ppt', 'pptx'].includes(ext)) return 'slideshow';
            if (['txt', 'log', 'json', 'xml', 'html', 'css', 'js', 'md'].includes(ext)) return 'article';
            return 'insert_drive_file';
        });

        const fileIconClass = computed(() => {
            const ext = getExtension(resolvedName.value);
            if (isImage.value) return 'ww-file-item__file-icon--image';
            if (ext === 'pdf') return 'ww-file-item__file-icon--pdf';
            if (['doc', 'docx', 'docm'].includes(ext)) return 'ww-file-item__file-icon--word';
            if (['xls', 'xlsx', 'xlsm', 'xlsb', 'csv'].includes(ext)) return 'ww-file-item__file-icon--excel';
            if (['ppt', 'pptx'].includes(ext)) return 'ww-file-item__file-icon--powerpoint';
            if (['txt', 'log', 'json', 'xml', 'html', 'css', 'js', 'md'].includes(ext)) return 'ww-file-item__file-icon--text';
            return '';
        });

        const handlePreview = () => {
            if (props.isDisabled || !props.canPreview) return;
            emit('preview');
        };

        const handleDownload = () => {
            if (props.isDisabled) return;
            emit('download');
        };

        const handleRemove = () => {
            if (props.isDisabled || props.isReadonly) return;
            emit('remove');
        };

        const handleThumbError = () => {
            // Se a URL direta falhar, tenta gerar uma signed URL do Supabase antes de desistir da imagem.
            if (signedThumbUrl.value && thumbnailSrc.value === signedThumbUrl.value) return;
            signedThumbUrl.value = '';
            resolveSignedThumbnailUrl();
        };

        watch(
            () => [
                props.file,
                resolvedName.value,
                resolvedType.value,
                props.file?.previewUrl,
                props.file?.thumbnailUrl,
                props.file?.url,
                props.file?.storagePath,
                props.file?.StoragePath,
                props.file?.bucket,
                props.file?.StorageBucket,
            ],
            () => {
                thumbLoadFailed.value = false;
                signedThumbUrl.value = '';
                rebuildObjectUrl();
                resolveSignedThumbnailUrl();
            },
            { immediate: true }
        );

        onBeforeUnmount(() => {
            if (objectUrl.value) URL.revokeObjectURL(objectUrl.value);
        });

        return {
            content,
            showFileInfo,
            formattedSize,
            fileNameStyles,
            fileDetailsStyles,
            actionButtonStyles,
            isImage,
            thumbnailSrc,
            fileIcon,
            fileItemStyles,
            resolvedName,
            fileIconClass,
            handlePreview,
            handleDownload,
            handleRemove,
            handleThumbError,
        };
    },
};
</script>

<style lang="scss" scoped>
    .ww-file-item {
        position: relative;

        &--disabled {
            opacity: 0.6;
            pointer-events: none;
        }

        &__info {
            width: v-bind('content?.fileTileWidth || "120px"');
        }

        &__preview {
            width: 100%;
            height: v-bind('content?.fileTileHeight || "120px"');
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            background: #fff;
            overflow: hidden;
            cursor: pointer;
            user-select: none;
        }

        &__preview--not-allowed {
            cursor: default;
        }

        &__preview:focus-visible {
            outline: 2px solid #2563eb;
            outline-offset: 2px;
        }

        &__thumb {
            width: 100%;
            height: 100%;
            object-fit: contain;
            object-position: center;
            display: block;
            background: #f8fafc;
        }

        &__file-icon {
            font-size: 42px;
            color: #64748b;
            line-height: 1;
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

        &__preview:hover &__actions,
        &__preview:focus-within &__actions {
            opacity: 1;
            pointer-events: auto;
        }

        &__btn {
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            background: #fff;
            color: #111827;
            cursor: pointer;
            padding: 0;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
        }

        &__btn:disabled {
            cursor: not-allowed;
            opacity: 0.6;
        }

        &__meta {
            text-align: center;
            margin-top: 6px;
            min-width: 0;
        }

        &__name {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        &__details {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
    }

    .ww-file-item__file-icon--image {
        color: #64748b;
    }

    .ww-file-item__file-icon--pdf {
        color: #e53935;
    }

    .ww-file-item__file-icon--word {
        color: #3b73b9;
    }

    .ww-file-item__file-icon--excel {
        color: #2e7d32;
    }

    .ww-file-item__file-icon--powerpoint {
        color: #d84315;
    }

    .ww-file-item__file-icon--text {
        color: #546e7a;
    }
</style>
