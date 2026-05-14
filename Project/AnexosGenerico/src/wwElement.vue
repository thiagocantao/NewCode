<template>
    <div :key="`upload-${componentRenderKey}`" class="ww-file-upload" :class="{
            'ww-file-upload--dragging': isDragging && !isDisabled && !isReadonly,
            'ww-file-upload--disabled': isDisabled,
            'ww-file-upload--readonly': isReadonly,
            'ww-file-upload--has-files': hasFiles,
        }" @dragover.prevent="handleDragOver" @dragleave.prevent="handleDragLeave" @drop.prevent="handleDrop"
        role="region" aria-label="File upload area">
        <div class="ww-file-upload__grid">
            <button
                v-if="!isReadonly"
                type="button"
                ref="dropzoneEl"
                class="ww-file-upload__add-tile"
                :disabled="isDisabled"
                :aria-label="labelMessage || 'Adicionar anexo'"
                @click="openFileExplorer"
                @mousemove="handleMouseMove"
            >
                <span class="ww-file-upload__add-icon">+</span>
            </button>

            <!-- File list -->
            <FileList v-if="shouldRenderFileList && hasFiles" :key="`file-list-${componentRenderKey}`" :files="fileList"
                :status="status" :type="type" :can-reorder="reorder" :is-readonly="isReadonly" :is-disabled="isDisabled"
                :can-preview="canPreviewFile" :get-preview-hint="getPreviewHint" @remove="removeFile"
                @download="downloadFileByIndex" @preview="previewFileByIndex" @reorder="reorderFiles" />
        </div>

        <!-- Hidden file input -->
        <input
            v-if="!isReadonly"
            ref="fileInput"
            :key="`input-${componentRenderKey}`"
            type="file"
            class="ww-file-upload__input"
            :multiple="type === 'multi'"
            :accept="acceptedFileTypes"
            :required="required && !hasFiles"
            :disabled="isDisabled || isReadonly"
            :aria-label="labelMessage"
            @change="handleFileSelection"
        />
    </div>

    <div v-if="isPreviewModalOpen" class="ww-preview-modal__overlay" @click.self="closePreviewModal">
        <div class="ww-preview-modal__content">
            <div class="ww-preview-modal__actions">
                <button type="button" class="ww-preview-modal__action-button" @click="downloadFileByIndex(previewIndex)">
                    <span class="material-symbols-outlined" aria-hidden="true">download</span>
                </button>
                <button type="button" class="ww-preview-modal__action-button" @click="closePreviewModal">
                    <span class="material-symbols-outlined" aria-hidden="true">close</span>
                </button>
            </div>

            <div class="ww-preview-modal__body">
                <template v-if="previewFile && previewMode === 'image'">
                    <img :src="previewSource" :alt="previewFile.name || 'Attachment preview'" class="ww-preview-modal__image" />
                </template>

                <template v-else-if="previewFile && previewMode === 'pdf'">
                    <iframe :src="previewSource" class="ww-preview-modal__iframe" title="PDF preview"></iframe>
                </template>

                <template v-else-if="previewFile && previewMode === 'text'">
                    <pre class="ww-preview-modal__text">{{ previewText }}</pre>
                </template>

                <template v-else-if="previewFile && previewMode === 'office'">
                    <iframe :src="previewSource" class="ww-preview-modal__iframe" title="Document preview"></iframe>
                </template>

                <template v-else>
                    <div class="ww-preview-modal__not-viewable">{{ previewUnavailableMessage }}</div>
                </template>
            </div>

            <div v-if="previewFile" class="ww-preview-modal__name">{{ previewFile.name }}</div>
        </div>
    </div>
</template>

<script>
    import { ref, computed, watch, provide, inject, nextTick } from 'vue';
import FileList from './components/FileList.vue';
import { validateFile } from './utils/fileValidation';
import { fileToBase64, fileToBinary } from './utils/fileProcessing';
import { useDragAnimation } from './composables/useDragAnimation';
import { translatePhrase } from './translation';

/* wwEditor:start */
import useParentSelection from './editor/useParentSelection';
/* wwEditor:end */

export default {
    components: {
        FileList,
    },
    props: {
        content: { type: Object, required: true },
        /* wwEditor:start */
        wwFrontState: { type: Object, required: true },
        wwEditorState: { type: Object, required: true },
        parentSelection: { type: Object, default: () => ({ allow: false, texts: {} }) },
        /* wwEditor:end */
        uid: { type: String, required: true },
        wwElementState: { type: Object, required: true },
    },
    emits: ['trigger-event', 'add-state', 'remove-state'],
    setup(props, { emit }) {

        const isEditing = computed(() => {
            /* wwEditor:start */
            return props.wwEditorState?.isEditing;
            /* wwEditor:end */
            // eslint-disable-next-line no-unreachable
            return false;
        });

        /* wwEditor:start */
        const { selectParentElement } = useParentSelection(props, emit);
        /* wwEditor:end */

        const { getIcon } = wwLib.useIcons();

        const fileInput = ref(null);
        const dropzoneEl = ref(null);
        const circleEl = ref(null);
        const iconText = ref(null);
        const isProcessing = ref(false);
        const isPreviewModalOpen = ref(false);
        const previewIndex = ref(-1);
        const previewSource = ref('');
        const previewText = ref('');
        const previewMode = ref('unsupported');

        const extensionsMessage = computed(() => props.content?.extensionsMessage || null);
        const maxFileMessage = computed(() => props.content?.maxFileMessage || null);
        const labelMessage = computed(() => props.content?.labelMessage || null);

        const type = computed(() => props.content?.type || 'single');
        const reorder = computed(() => props.content?.reorder || false);
        const drop = computed(() => props.content?.drop !== false);
        const maxFileSize = computed(() => props.content?.maxFileSize || 10);
        const minFileSize = computed(() => props.content?.minFileSize || 0);
        const maxTotalFileSize = computed(() => props.content?.maxTotalFileSize || 50);
        const maxFiles = computed(() => props.content?.maxFiles || 10);
        const required = computed(() => props.content?.required || false);
        const initialValue = computed(() => props.content?.initialValue || []);
        const extensions = computed(() => props.content?.extensions || 'any');
        const customExtensions = computed(() => props.content?.customExtensions || '');
        const exposeBase64 = computed(() => props.content?.exposeBase64 || false);
        const exposeBinary = computed(() => props.content?.exposeBinary || false);
        const showUploadIcon = computed(() => props.content?.showUploadIcon !== false);
        const uploadIcon = computed(() => props.content?.uploadIcon || 'upload');
        const uploadIconColor = computed(() => props.content?.uploadIconColor || '#666666');
        const uploadIconPosition = computed(() => props.content?.uploadIconPosition || 'top');
        const uploadIconSize = computed(() => props.content?.uploadIconSize || '24px');
        const uploadIconMargin = computed(() => props.content?.uploadIconMargin || '8px');
        const enableCircleAnimation = computed(() => props.content?.enableCircleAnimation !== false);
        const circleSize = computed(() => props.content?.circleSize || '80px');
        const circleColor = computed(() => props.content?.circleColor || safeProgressBarColor.value);
        const circleOpacity = computed(() =>
            props.content?.circleOpacity !== undefined ? props.content.circleOpacity : 0.5
        );
        const animationSpeed = computed(() =>
            props.content?.animationSpeed !== undefined ? props.content.animationSpeed : 0.5
        );

        const safeDropzoneBorderWidth = computed(() => props.content?.dropzoneBorderWidth || '2px');
        const safeDropzoneBorderStyle = computed(() => props.content?.dropzoneBorderStyle || 'dashed');
        const safeDropzoneBorderColor = computed(() => props.content?.dropzoneBorderColor || '#CCCCCC');
        const safeDropzoneBorderRadius = computed(() => props.content?.dropzoneBorderRadius || '8px');
        const safeDropzonePadding = computed(() => props.content?.dropzonePadding || '20px');
        const safeDropzoneMinHeight = computed(() => props.content?.dropzoneMinHeight || '120px');
        const safeDropzoneBackground = computed(() => props.content?.dropzoneBackground || 'rgba(0, 0, 0, 0)');
        const safeDropzoneBackgroundHover = computed(
            () => props.content?.dropzoneBackgroundHover || 'rgba(0, 0, 0, 0.01)'
        );
        const safeLabelFontSize = computed(() => props.content?.labelFontSize || '16px');
        const safeLabelFontFamily = computed(() => props.content?.labelFontFamily || 'inherit');
        const safeLabelFontWeight = computed(() => props.content?.labelFontWeight || 'normal');
        const safeLabelColor = computed(() => props.content?.labelColor || '#333333');
        const safeFileDetailsFontSize = computed(() => props.content?.fileDetailsFontSize || '12px');
        const safeFileDetailsColor = computed(() => props.content?.fileDetailsColor || '#888888');
        const safeProgressBarColor = computed(() => props.content?.progressBarColor || '#EEEEEE');
        const safeLabelMarginBottom = computed(() => {
            const labelMargin = props.content?.labelMargin || '0 0 4px 0';
            return labelMargin.split(' ')[2] || '4px';
        });
        const safeProgressBarBackground = computed(() => {
            const color = safeProgressBarColor.value;
            if (!color) return 'rgba(85, 85, 85, 0.05)';

            try {
                const r = parseInt(color.slice(1, 3), 16) || 85;
                const g = parseInt(color.slice(3, 5), 16) || 85;
                const b = parseInt(color.slice(5, 7), 16) || 85;
                return `rgba(${r}, ${g}, ${b}, 0.05)`;
            } catch (e) {
                return 'rgba(85, 85, 85, 0.05)';
            }
        });

        const safeDropzoneBackgroundDragging = computed(
            () => props.content?.dropzoneBackgroundDragging || 'rgba(0, 0, 0, 0.05)'
        );

        // Extensions message styling
        const extensionsMessageStyle = computed(() => ({
            fontFamily: props.content?.extensionsMessageFontFamily || 'inherit',
            fontSize: props.content?.extensionsMessageFontSize || '12px',
            fontWeight: props.content?.extensionsMessageFontWeight || 'normal',
            color: props.content?.extensionsMessageColor || '#888888',
            margin: props.content?.extensionsMessageMargin || '0 0 4px 0',
        }));

        // Max file message styling
        const maxFileMessageStyle = computed(() => ({
            fontFamily: props.content?.maxFileMessageFontFamily || 'inherit',
            fontSize: props.content?.maxFileMessageFontSize || '12px',
            fontWeight: props.content?.maxFileMessageFontWeight || 'normal',
            color: props.content?.maxFileMessageColor || '#888888',
            margin: props.content?.maxFileMessageMargin || '0 0 4px 0',
        }));

        // Label message styling
        const labelMessageStyle = computed(() => ({
            fontFamily: props.content?.labelFontFamily || 'inherit',
            fontSize: props.content?.labelFontSize || '16px',
            fontWeight: props.content?.labelFontWeight || 'normal',
            color: props.content?.labelColor || '#333333',
            margin: props.content?.labelMargin || '0 0 4px 0',
        }));

        const isDisabled = computed(() => props.wwElementState.props.disabled || false);
        const isReadonly = computed(() => {
            /* wwEditor:start */
            if (props.wwEditorState?.isSelected) {
                return props.wwElementState.states.includes('readonly');
            }
            /* wwEditor:end */
            return props.wwElementState.props.readonly === undefined
                ? props.content?.readonly || false
                : props.wwElementState.props.readonly;
        });

        const { value: files, setValue: setFiles } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'value',
            defaultValue: [],
            type: 'file',
            componentType: 'element',
        });

        const { value: status, setValue: setStatus } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'status',
            defaultValue: {},
            type: 'any',
        });

        const { value: deletedFile, setValue: setDeletedFile } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'deletedFile',
            defaultValue: [],
            type: 'any',
        });

        const { value: deletedFilesCount, setValue: setDeletedFilesCount } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'deletedFilesCount',
            defaultValue: 0,
            type: 'number',
        });

        const useForm = inject('_wwForm:useForm', () => {});
        const fieldName = computed(() => props.content.fieldName);
        const validation = computed(() => props.content.validation);
        const customValidation = computed(() => props.content.customValidation);

        useForm(
            files,
            { fieldName, validation, customValidation, required },
            { elementState: props.wwElementState, emit, sidepanelFormPath: 'form', setValue: setFiles }
        );

        const rawFileList = computed(() => (Array.isArray(files.value) ? files.value : []));
        const manualClearActive = ref(false);
        const componentRenderKey = ref(0);
        const shouldRenderFileList = ref(true);

        // Lista efetiva usada pela UI e pelo contexto local.
        // Quando a action Clear files é executada, essa lista fica vazia mesmo que o
        // runtime do WeWeb ainda esteja sincronizando a variável interna do componente.
        const fileList = computed(() => (manualClearActive.value ? [] : rawFileList.value));
        const hasFiles = computed(() => fileList.value.length > 0);
        const previousInitialValueHash = ref('');

        const getFileKind = fileName => {
            const ext = (fileName || '').split('.').pop()?.toLowerCase();

            if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif', 'heic', 'heif', 'jfif', 'tif', 'tiff', 'ico'].includes(ext)) return 'image';
            if (ext === 'pdf') return 'pdf';

            if (['txt', 'log', 'csv', 'json', 'xml', 'html', 'css', 'js', 'md'].includes(ext)) {
                return 'text';
            }

            return 'file';
        };

        const normalizeInitialValue = value => {
            if (!Array.isArray(value)) return [];
            return value
                .map(item => {
                    const name = item?.FileName || item?.fileName || item?.name || item?.originalName;
                    const storageBucket = item?.StorageBucket || item?.storageBucket || item?.bucket;
                    const storagePath = item?.StoragePath || item?.storagePath || item?.path;
                    const directUrl = item?.Url || item?.url || item?.signedUrl || null;
                    if (!name || (!storageBucket && !storagePath && !directUrl)) return null;
                    const kind = getFileKind(name);
                    return {
                        id: item?.AttachmentID || item?.attachmentId || item?.id || `init-${storagePath || name}`,
                        name,
                        size: Number(item?.SizeBytes || item?.size || 0),
                        type: item?.ContentType || item?.contentType || 'application/octet-stream',
                        mimeType: item?.ContentType || item?.contentType || 'application/octet-stream',
                        attachmentId: item?.AttachmentID || item?.attachmentId || item?.id || null,
                        bucket: storageBucket || null,
                        storagePath: storagePath || '',
                        url: directUrl,
                        previewUrl: directUrl,
                        thumbnailUrl: directUrl,
                        createdDate: item?.CreatedDate || null,
                        createdBy: item?.CreatedBy || null,
                        isImage: kind === 'image',
                        isPdf: kind === 'pdf',
                        isTxt: kind === 'text',
                        isText: kind === 'text',
                        isFromInitialValue: true,
                    };
                })
                .filter(Boolean);
        };

        watch([status, fileList], ([newStatus, newFiles]) => {
            if (newStatus && typeof newStatus === 'object') {
                const fileNames = newFiles.map(file => file.name);
                const updatedStatus = Object.fromEntries(
                    Object.entries(newStatus).filter(([key]) => fileNames.includes(key))
                );

                if (Object.keys(updatedStatus).length !== Object.keys(newStatus).length) {
                    setStatus(updatedStatus);
                }
            }
        });

        watch(
            initialValue,
            newValue => {
                const hash = JSON.stringify(newValue || []);

                // Se o JSON inicial é o mesmo, não reaplica automaticamente.
                // Isso impede que os anexos voltem logo após executar Clear files.
                if (hash === previousInitialValueHash.value) return;

                previousInitialValueHash.value = hash;
                manualClearActive.value = false;
                shouldRenderFileList.value = true;
                componentRenderKey.value += 1;

                const normalized = normalizeInitialValue(newValue);
                setFiles(normalized);

                emit('trigger-event', {
                    name: 'initValueChange',
                    event: { value: normalized },
                });
            },
            { immediate: true, deep: true }
        );

        const getFileStatus = file => {
            if (!status.value || !file.name || !status.value[file.name]) {
                return {
                    uploadProgress: 0,
                    isUploading: false,
                    isUploaded: false,
                };
            }

            return status.value[file.name];
        };

        const acceptedFileTypes = computed(() => {
            switch (extensions.value) {
                case 'image':
                    return 'image/*';
                case 'video':
                    return 'video/*';
                case 'audio':
                    return 'audio/*';
                case 'pdf':
                    return '.pdf';
                case 'csv':
                    return '.csv';
                case 'excel':
                    return '.xls,.xlsx,.xlsm,.xlsb';
                case 'word':
                    return '.doc,.docx,.docm';
                case 'json':
                    return '.json';
                case 'custom':
                    return customExtensions.value;
                default:
                    return '';
            }
        });

        watch(
            () => uploadIcon.value,
            async icon => {
                if (icon && showUploadIcon.value) {
                    try {
                        iconText.value = await getIcon(icon);
                    } catch (error) {
                        iconText.value = null;
                    }
                } else {
                    iconText.value = null;
                }
            },
            { immediate: true }
        );

        const iconHTML = computed(() => {
            /* wwEditor:start */
            return (
                iconText.value ||
                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-upload"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>'
            );
            /* wwEditor:end */
            return iconText.value;
        });

        const isNativeFile = file => {
            if (!file) return false;
            if (typeof File !== 'undefined' && file instanceof File) return true;
            return Object.prototype.toString.call(file) === '[object File]';
        };

        const toFileUploadValue = file => {
            if (!file) return file;

            // Arquivos recém anexados precisam continuar sendo o próprio File nativo.
            // O plugin do Supabase "Upload a file" precisa desse objeto real para gravar o binário.
            if (isNativeFile(file) && !file.isFromInitialValue) {
                return file;
            }

            // Arquivos vindos do Initial Value são apenas metadados de arquivos já salvos.
            // Esses objetos servem para exibição, preview, download e exclusão, mas não devem ser enviados ao Upload.
            const plainObject = {};
            for (const key in file) {
                if (Object.prototype.hasOwnProperty.call(file, key)) {
                    plainObject[key] = file[key];
                }
            }
            plainObject.name = file.name;
            plainObject.size = file.size;
            plainObject.type = file.type;
            plainObject.lastModified = file.lastModified;
            plainObject.mimeType = file.mimeType;
            plainObject.id = file.id;
            plainObject.isFromInitialValue = Boolean(file.isFromInitialValue);
            plainObject.isNewFile = Boolean(file.isNewFile);

            if (file.base64) plainObject.base64 = file.base64;
            if (file.binary) plainObject.binary = file.binary;

            return plainObject;
        };

        const localData = ref({
            fileUpload: {
                value: computed(() => fileList.value.map(toFileUploadValue)),
                status: status,
                deletedFile: deletedFile,
                deletedFilesCount: deletedFilesCount,
            },
        });

        provide('_wwFileUpload', {
            files: fileList,
            status: status,
            acceptedTypes: acceptedFileTypes,
            isDisabled,
            isReadonly,
            isSingleMode: computed(() => type.value === 'single'),
            content: computed(() => props.content || {}),
        });

        // Drag and drop animation
        const {
            isDragging,
            mouseX,
            mouseY,
            targetX,
            targetY,
            isAnimating,
            handleDragOver: animationHandleDragOver,
            handleDragLeave: animationHandleDragLeave,
            handleDrop: animationHandleDrop,
            handleMouseMove: animationHandleMouseMove,
        } = useDragAnimation({
            dropzoneRef: dropzoneEl,
            circleRef: circleEl,
            isDisabled,
            isReadonly,
            dropEnabled: drop,
            circleOpacity,
            animationSpeed,
            isEditing,
        });

        // Methods
        const openFileExplorer = () => {
            if (!isDisabled.value && !isReadonly.value && !isEditing.value) {
                fileInput.value.click();
            }
        };

        const handleDrop = async event => {
            const animationHandled = animationHandleDrop(event);
            if (!animationHandled || isDisabled.value || isReadonly.value || !drop.value) return;

            const items = event.dataTransfer.files;
            if (!items.length) return;

            // Wait for the circle animation to complete before processing files
            setTimeout(async () => {
                await processFiles(items);
            }, 1050);
        };

        const handleFileSelection = async event => {
            const selectedFiles = event.target.files;
            if (!selectedFiles.length) return;

            await processFiles(selectedFiles);
            event.target.value = '';
        };

        const processFiles = async fileList => {
            manualClearActive.value = false;
            shouldRenderFileList.value = true;
            componentRenderKey.value += 1;
            isProcessing.value = true;
            const filesToProcess = Array.from(fileList);

            // Single mode handling
            if (type.value === 'single') {
                if (filesToProcess.length > 1) {
                    emit('trigger-event', {
                        name: 'error',
                        event: {
                            code: 'SINGLE_MODE_MULTIPLE_FILES',
                            data: {
                                message: 'Multiple files provided in single file mode',
                                count: filesToProcess.length,
                                acceptedCount: 1,
                            },
                        },
                    });
                }

                filesToProcess.splice(1);
                setFiles([]);
            }

            let availableSlots = Infinity;
            if (type.value === 'multi' && maxFiles.value > 0) {
                availableSlots = maxFiles.value - files.value.length;
                if (availableSlots <= 0) {
                    emit('trigger-event', {
                        name: 'error',
                        event: {
                            code: 'MAX_FILES_REACHED',
                            data: {
                                message: `Maximum number of files (${maxFiles.value}) reached`,
                                maxFiles: maxFiles.value,
                                currentCount: files.value.length,
                            },
                        },
                    });

                    wwLib.wwNotification.open({
                        text: { en: `Maximum number of files (${maxFiles.value}) reached` },
                        color: 'warning',
                    });

                    isProcessing.value = false;
                    return;
                } else if (filesToProcess.length > availableSlots) {
                    emit('trigger-event', {
                        name: 'error',
                        event: {
                            code: 'TOO_MANY_FILES',
                            data: {
                                message: `Only ${availableSlots} more files can be added`,
                                providedCount: filesToProcess.length,
                                availableSlots: availableSlots,
                                maxFiles: maxFiles.value,
                                currentCount: files.value.length,
                            },
                        },
                    });
                }
            }

            // Process valid files
            const limitedFiles = filesToProcess.slice(0, availableSlots);
            const processedFiles = [];

            // Only calculate currentTotalSize for multi-file mode
            const currentTotalSize =
                type.value === 'multi' && Array.isArray(files.value)
                    ? files.value.reduce((sum, f) => sum + (f.size || 0), 0)
                    : 0;

            for (const file of limitedFiles) {
                const validationResult = validateFile(file, {
                    maxFileSize: maxFileSize.value,
                    minFileSize: minFileSize.value,
                    // Only apply maxTotalFileSize in multi-file mode
                    maxTotalFileSize: type.value === 'multi' ? maxTotalFileSize.value : undefined,
                    currentTotalSize: type.value === 'multi' ? currentTotalSize : 0,
                    acceptedTypes: acceptedFileTypes.value,
                });

                if (validationResult.valid) {
                    file.id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    file.mimeType = file.type;
                    file.isFromInitialValue = false;
                    file.isNewFile = true;
                    file.bucket = null;
                    file.storagePath = '';
                    file.url = null;
                    file.previewUrl = null;
                    file.thumbnailUrl = null;

                    const kind = getFileKind(file.name);
                    file.isImage = kind === 'image';
                    file.isPdf = kind === 'pdf';
                    file.isTxt = kind === 'text';
                    file.isText = kind === 'text';

                    if (file.isImage && !file.previewUrl) {
                        file.previewUrl = URL.createObjectURL(file);
                        file.url = file.previewUrl;
                        file.thumbnailUrl = file.previewUrl;
                    }

                    if (exposeBase64.value) file.base64 = await fileToBase64(file);
                    if (exposeBinary.value) file.binary = await fileToBinary(file);
                    processedFiles.push(file);
                } else {
                    console.warn(`File validation failed: ${validationResult.reason}`);
                    emit('trigger-event', {
                        name: 'error',
                        event: {
                            code: 'VALIDATION_ERROR',
                            data: {
                                message: validationResult.reason,
                                fileName: file.name,
                                fileSize: file.size,
                                fileType: file.type,
                                constraint: validationResult.constraint,
                            },
                        },
                    });

                    /* wwEditor:start */
                    wwLib.wwNotification.open({
                        text: { en: validationResult.reason },
                        color: 'error',
                    });
                    /* wwEditor:end */
                }
            }

            if (processedFiles.length > 0) {
                if (type.value === 'single') {
                    setFiles(processedFiles);
                    emit('trigger-event', {
                        name: 'change',
                        event: { value: processedFiles },
                    });
                    isProcessing.value = false;
                } else {
                    const currentFiles = [...files.value];
                    let newFiles = [...currentFiles];

                    const addNextFile = index => {
                        newFiles = [...newFiles, processedFiles[index]];
                        setFiles(newFiles);

                        if (index < processedFiles.length - 1) {
                            setTimeout(() => addNextFile(index + 1), 150);
                        } else {
                            emit('trigger-event', {
                                name: 'change',
                                event: { value: newFiles },
                            });
                            isProcessing.value = false;
                        }
                    };

                    // Start adding files with a small initial delay
                    setTimeout(() => addNextFile(0), 50);
                    return;
                }
            }

            isProcessing.value = false;
        };

        const removeFile = index => {
            if (isDisabled.value || isReadonly.value) return;

            const removedFile = fileList.value[index] || null;
            if (removedFile) {
                const deletedFileEntry = {
                    ...removedFile,
                    id: removedFile.id || `deleted-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    isFromInitialValue: Boolean(removedFile.isFromInitialValue),
                };
                setDeletedFile([...(Array.isArray(deletedFile.value) ? deletedFile.value : []), deletedFileEntry]);
                setDeletedFilesCount((deletedFilesCount.value || 0) + 1);
            }

            const updatedFiles = [...files.value.filter((_, i) => i !== index)];
            setFiles(updatedFiles);

            emit('trigger-event', {
                name: 'change',
                event: { value: updatedFiles },
            });
        };

        const getSupabase = () => wwLib?.wwPlugins?.supabase?.instance || null;

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

        const resolveFileUrl = async (file, { download = false } = {}) => {
            if (!file) return null;

            if (!download && (file.thumbnailUrl || file.previewUrl || file.url)) {
                return file.thumbnailUrl || file.previewUrl || file.url;
            }

            const localFile = file instanceof File ? file : file?.file;

            if (localFile instanceof File) {
                if (!file.previewUrl) {
                    file.previewUrl = URL.createObjectURL(localFile);
                }

                if (!file.url) {
                    file.url = file.previewUrl;
                }

                return file.previewUrl;
            }

            const supabase = getSupabase();
            const { bucket, storagePath, directUrl } = resolveStorageLocation(file);

            if (!supabase?.storage || !bucket || !storagePath) {
                return directUrl || file.url || file.previewUrl || null;
            }

            const options = {};

            if (download) {
                options.download = file.name || 'download';
            }

            if (file?.isImage && !download) {
                options.transform = { width: 400, resize: 'contain' };
            }

            const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 3600, options);

            if (error) {
                console.warn('Erro ao gerar signed URL do arquivo:', error);
                return directUrl || file.url || file.previewUrl || null;
            }

            const signedUrl = data?.signedUrl || null;

            if (!download && signedUrl) {
                file.url = signedUrl;
                file.previewUrl = signedUrl;
                file.thumbnailUrl = file.thumbnailUrl || signedUrl;
            }

            file.bucket = bucket;
            file.storagePath = storagePath;

            return signedUrl || directUrl || file.url || file.previewUrl || null;
        };

        const previewUnavailableMessage = computed(() => translatePhrase('Preview not available for this file type.'));

        const getFileExtension = file =>
            (file?.name || '')
                .split('.')
                .pop()
                ?.toLowerCase() || '';

        const getPreviewMode = file => {
            const ext = getFileExtension(file);
            const type = (file?.type || file?.mimeType || file?.contentType || '').toLowerCase();

            if (
                type.startsWith('image/') ||
                ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)
            ) {
                return 'image';
            }

            if (type === 'application/pdf' || ext === 'pdf') {
                return 'pdf';
            }

            if (
                type.startsWith('text/') ||
                ['txt', 'log', 'csv', 'json', 'xml', 'html', 'css', 'js', 'md'].includes(ext)
            ) {
                return 'text';
            }

            if (['xls', 'xlsx', 'xlsm', 'xlsb', 'doc', 'docx', 'ppt', 'pptx'].includes(ext)) {
                return 'office';
            }

            return 'unsupported';
        };

        const canPreviewFile = file => getPreviewMode(file) !== 'unsupported';

        const getPreviewHint = file => (canPreviewFile(file) ? '' : previewUnavailableMessage.value);
        const previewFile = computed(() => fileList.value[previewIndex.value] || null);

        const closePreviewModal = () => {
            isPreviewModalOpen.value = false;
            previewIndex.value = -1;
            previewSource.value = '';
            previewText.value = '';
            previewMode.value = 'unsupported';
        };

        const previewFileByIndex = async index => {
            const file = fileList.value[index];
            if (!file) return;

            const mode = getPreviewMode(file);
            if (mode === 'unsupported') return;

            const url = await resolveFileUrl(file);
            if (!url) return;

            previewIndex.value = index;
            previewMode.value = mode;
            previewSource.value = '';
            previewText.value = '';

            if (mode === 'office') {
                previewSource.value = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
            } else if (mode === 'text') {
                try {
                    const response = await fetch(url, { method: 'GET', cache: 'no-store' });
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);

                    previewText.value = await response.text();
                } catch (error) {
                    console.warn('Erro ao carregar preview de texto:', error);
                    previewText.value = 'Não foi possível carregar o preview deste arquivo.';
                }
            } else {
                previewSource.value = url;
            }

            isPreviewModalOpen.value = true;
        };

        const downloadFileByIndex = async index => {
            const file = fileList.value[index];
            if (!file) return;

            const url = await resolveFileUrl(file, { download: true });
            if (!url) return;

            const fileName = file.name || 'download';

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    cache: 'no-store',
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');

                a.href = blobUrl;
                a.download = fileName;
                a.style.display = 'none';

                document.body.appendChild(a);
                a.click();

                setTimeout(() => {
                    a.remove();
                    URL.revokeObjectURL(blobUrl);
                }, 100);
            } catch (error) {
                console.warn('Download via fetch falhou, usando fallback por link:', error);

                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.style.display = 'none';

                document.body.appendChild(a);
                a.click();

                setTimeout(() => {
                    a.remove();
                }, 100);
            }
        };

        watch(
            fileList,
            async list => {
                const items = Array.isArray(list) ? list : [];
                let changed = false;

                await Promise.all(
                    items.map(async file => {
                        if (!file || !file.isImage || file.thumbnailUrl) return;

                        const preview = await resolveFileUrl(file);

                        if (preview) {
                            file.previewUrl = file.previewUrl || preview;
                            file.url = file.url || preview;
                            file.thumbnailUrl = preview;
                            changed = true;
                        }
                    })
                );

                if (changed) {
                    setFiles([...items]);
                }
            },
            { immediate: true, deep: true }
        );

        const reorderFiles = (fromIndex, toIndex) => {
            if (isDisabled.value || isReadonly.value || !reorder.value) return;

            const newFiles = [...files.value];
            const [movedItem] = newFiles.splice(fromIndex, 1);
            newFiles.splice(toIndex, 0, movedItem);
            setFiles(newFiles);

            emit('trigger-event', {
                name: 'change',
                event: { value: newFiles },
            });
        };

        const clearFiles = async () => {
            // Trava visualmente e funcionalmente a lista como vazia.
            // Isso resolve casos em que o WeWeb demora ou falha em propagar setFiles([])
            // quando há múltiplos anexos.
            manualClearActive.value = true;
            shouldRenderFileList.value = false;
            componentRenderKey.value += 1;

            // Limpa a variável principal do componente e todos os estados auxiliares.
            setFiles([]);
            setStatus({});

            // Fecha e limpa o preview, caso o usuário execute a action com o modal aberto.
            isPreviewModalOpen.value = false;
            previewIndex.value = -1;
            previewSource.value = '';
            previewText.value = '';
            previewMode.value = 'unsupported';

            // Limpa o input nativo para permitir selecionar novamente os mesmos arquivos.
            if (fileInput.value) {
                fileInput.value.value = '';
            }

            await nextTick();

            // Força desmontagem/remontagem de FileList e input.
            componentRenderKey.value += 1;
            shouldRenderFileList.value = true;

            emit('trigger-event', {
                name: 'change',
                event: { value: [] },
            });

            emit('trigger-event', {
                name: 'clear',
                event: { value: [] },
            });
        };

        const getAllowedTypesLabel = () => {
            switch (extensions.value) {
                case 'image':
                    return 'Images';
                case 'video':
                    return 'Videos';
                case 'audio':
                    return 'Audio files';
                case 'pdf':
                    return 'PDF files';
                case 'csv':
                    return 'CSV files';
                case 'excel':
                    return 'Excel files';
                case 'word':
                    return 'Word documents';
                case 'json':
                    return 'JSON files';
                case 'custom':
                    return customExtensions.value;
                default:
                    return 'All files';
            }
        };

        wwLib.wwElement.useRegisterElementLocalContext('fileUpload', localData.value.fileUpload, {
            clearFiles: {
                description: 'Clear all files',
                method: () => clearFiles(),
                editor: { label: 'Clear Files', group: 'File Upload', icon: 'trash' },
            },
        });

        watch(
            isReadonly,
            value => {
                if (value) {
                    emit('add-state', 'readonly');
                } else {
                    emit('remove-state', 'readonly');
                }
            },
            { immediate: true }
        );

        watch(
            isDisabled,
            value => {
                if (value) {
                    emit('add-state', 'disabled');
                } else {
                    emit('remove-state', 'disabled');
                }
            },
            { immediate: true }
        );

        // Connect drag animation handlers
        const handleDragOver = animationHandleDragOver;
        const handleDragLeave = animationHandleDragLeave;
        const handleMouseMove = animationHandleMouseMove;

        return {
            status,
            fileInput,
            isDragging,
            fileList,
            hasFiles,
            componentRenderKey,
            shouldRenderFileList,
            isDisabled,
            isReadonly,
            acceptedFileTypes,
            extensionsMessage,
            maxFileMessage,
            openFileExplorer,
            handleDragOver,
            handleDragLeave,
            handleDrop,
            handleFileSelection,
            removeFile,
            downloadFileByIndex,
            previewFileByIndex,
            isPreviewModalOpen,
            previewFile,
            previewSource,
            previewText,
            previewMode,
            previewIndex,
            closePreviewModal,
            previewUnavailableMessage,
            canPreviewFile,
            getPreviewHint,
            reorderFiles,
            getAllowedTypesLabel,
            iconHTML,
            uploadIconPosition,
            handleMouseMove,
            extensionsMessageStyle,
            maxFileMessageStyle,
            labelMessage,
            labelMessageStyle,
            type,
            reorder,
            drop,
            maxFileSize,
            minFileSize,
            maxFiles,
            required,
            extensions,
            customExtensions,
            showUploadIcon,
            uploadIcon,
            uploadIconColor,
            uploadIconSize,
            uploadIconMargin,
            enableCircleAnimation,
            circleSize,
            circleColor,
            circleOpacity,
            animationSpeed,

            safeDropzoneBorderWidth,
            safeDropzoneBorderStyle,
            safeDropzoneBorderColor,
            safeDropzoneBorderRadius,
            safeDropzonePadding,
            safeDropzoneMinHeight,
            safeDropzoneBackground,
            safeDropzoneBackgroundHover,
            safeDropzoneBackgroundDragging,
            safeLabelFontSize,
            safeLabelFontFamily,
            safeLabelFontWeight,
            safeLabelColor,
            safeFileDetailsFontSize,
            safeFileDetailsColor,
            safeProgressBarColor,
            safeLabelMarginBottom,
            safeProgressBarBackground,
            dropzoneEl,
            circleEl,
            mouseX,
            mouseY,
            targetX,
            targetY,
            isAnimating,
            isProcessing,
            isEditing,

            clearFiles,

            /* wwEditor:start */
            selectParentElement,
            /* wwEditor:end */
        };
    },
};
</script>

<style lang="scss" scoped>
    .ww-file-upload {
        display: flex;
        flex-direction: column;
        width: 100%;
        position: relative;

        &__input {
            opacity: 0;
            background: rgba(0, 0, 0, 0);
            border: 0;
            bottom: -1px;
            font-size: 0;
            height: 1px;
            left: 0;
            outline: none;
            padding: 0;
            position: absolute;
            right: 0;
            width: 100%;
        }

        &__grid {
            display: flex;
            flex-wrap: wrap;
            align-items: flex-start;
            gap: 8px;
        }

        &__add-tile {
            width: v-bind('content?.fileTileWidth || "120px"');
            height: v-bind('content?.fileTileHeight || "120px"');
            border: 1px dashed v-bind('safeDropzoneBorderColor');
            border-radius: 6px;
            background-color: v-bind('safeDropzoneBackground');
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            flex-shrink: 0;
            transition: all 0.2s ease;

            &:hover {
                background-color: v-bind('safeDropzoneBackgroundHover');
            }

            &:disabled {
                cursor: not-allowed;
                opacity: 0.6;
            }
        }

        &__add-icon {
            font-size: 34px;
            line-height: 1;
            color: v-bind('safeDropzoneBorderColor');
        }

        &__content {
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            width: 100%;
            pointer-events: none;
            position: relative;
            z-index: 2;

            &--top {
                flex-direction: column;
            }

            &--right {
                flex-direction: row-reverse;
                justify-content: center;
                text-align: right;
            }

            &--bottom {
                flex-direction: column-reverse;
            }

            &--left {
                flex-direction: row;
                justify-content: center;
                text-align: left;
            }
        }

        &__text {
            display: flex;
            flex-direction: column;
            pointer-events: none;
        }

        &__icon {
            font-size: v-bind('uploadIconSize');
            color: v-bind('uploadIconColor');
            width: 1em;
            height: 1em;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-shrink: 0;
            pointer-events: none;
            margin: v-bind('uploadIconMargin');

            > :deep(svg) {
                width: 100%;
                height: 100%;
            }
        }

        &__info {
            display: block;
        }

        &--dragging {
            .ww-file-upload__add-tile {
                background-color: v-bind('safeDropzoneBackgroundDragging');
            }
        }

        &--disabled {
            opacity: 0.6;
            pointer-events: none;

            .ww-file-upload__add-tile {
                cursor: not-allowed;
            }
        }

        &--readonly {
            .ww-file-upload__add-tile {
                cursor: default;
            }
        }

        &__hover-circle {
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
            z-index: -1;
            transform: translate(-50%, -50%);
            transition: opacity 0.3s ease-out, transform 0.3s ease-out;
            will-change: transform, opacity;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            backface-visibility: hidden;
        }
    }

    .ww-preview-modal {
        &__overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 24px;
        }

        &__content {
            height: 95vh;
            position: relative;
            width: 90%;
            max-height: 90vh;
            background: #fff;
            border-radius: 12px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        &__actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
        }

        &__action-button {
            width: 36px;
            height: 36px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: #fff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        &__body {
            min-height: calc(100% - 90px);
            max-height: calc(100% - 90px);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
        }

        &__image,
        &__iframe {
            max-width: 100%;
            max-height: 100%;
            min-height: 240px;
            border: 0;
            object-fit: contain;
        }

        &__text {
            width: 100%;
            height: 100%;
            min-height: 240px;
            margin: 0;
            padding: 16px;
            overflow: auto;
            white-space: pre-wrap;
            word-break: break-word;
            font-family: Consolas, Monaco, 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.5;
            color: #111827;
            background: #f9fafb;
        }

        &__name {
            font-size: 14px;
            text-align: center;
            color: #374151;
            word-break: break-word;
        }

        &__not-viewable {
            color: #6b7280;
            padding: 24px;
            text-align: center;
        }
    }
</style>
