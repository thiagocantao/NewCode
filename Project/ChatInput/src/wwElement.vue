<template>
    <div class="chat-input" data-capture>
        <div class="chat-input__bar" :class="{ '-disabled': isReadonly, '-multiline': isMultiline }">
            <button class="chat-input__add" type="button" :disabled="isReadonly" @click="triggerFilePicker">
                <i class="fa-solid fa-paperclip" aria-hidden="true"></i>
            </button>

            <div class="chat-input__content">
                <div v-if="attachments.length" class="chat-input__attachments">
                    <div
                        v-for="item in attachments"
                        :key="item.id"
                        class="chat-input__attachment"
                        :class="{ 'is-image': item.type === 'image' }"
                    >
                        <div class="chat-input__attachment-thumb">
                            <img v-if="item.type === 'image'" :src="item.previewUrl" :alt="item.name" />
                            <div v-else class="chat-input__file-icon">
                                <i :class="fileIconClass(item.kind)" :style="fileIconStyle(item.kind)" aria-hidden="true"></i>
                            </div>
                        </div>
                        <div v-if="item.type !== 'image'" class="chat-input__attachment-info">
                            <span class="chat-input__attachment-name">{{ item.name }}</span>
                        </div>
                        <button type="button" class="chat-input__remove" @click="removeAttachment(item.id)">
                            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>

                <textarea
                    ref="textareaRef"
                    class="chat-input__textarea"
                    :placeholder="placeholder"
                    v-model="message"
                    :disabled="isReadonly"
                    rows="1"
                    @input="handleInput"
                    @keydown.enter.exact.prevent="handleSend"
                ></textarea>
            </div>

            <button
                class="chat-input__send"
                type="button"
                :disabled="isReadonly || !canSend"
                @click="handleSend"
            >
                <i class="fa-solid fa-paper-plane" aria-hidden="true"></i>
            </button>

            <input
                ref="fileInputRef"
                class="chat-input__file-input"
                type="file"
                multiple
                :accept="accept"
                :disabled="isReadonly"
                @change="onFilesSelected"
            />
        </div>
    </div>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

export default {
    name: 'ChatInput',
    props: {
        content: { type: Object, required: true },
        uid: { type: String, required: true },
        wwElementState: { type: Object, required: true },
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
    },
    emits: ['trigger-event'],
    setup(props, { emit }) {
        const message = ref(props.content.initialValue || '');
        const attachments = ref([]);
        const fileInputRef = ref(null);
        const textareaRef = ref(null);
        const objectUrls = new Set();
        const isMultiline = ref(false);

        const isReadonly = computed(() => !!props.content.readonly);
        const placeholder = computed(() => props.content.placeholder || 'Digite sua mensagem...');
        const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
        const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
        const accept = computed(
            () => props.content.accept || '.pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.webp',
        );

        const { setValue: setPayloadVariable } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'chatPayload',
            type: 'object',
            defaultValue: {},
        });

        const { setValue: setJsonVariable } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'chatPayloadJson',
            type: 'string',
            defaultValue: '',
            readonly: true,
        });

        const canSend = computed(() => message.value.trim() || attachments.value.length);

        function triggerFilePicker() {
            fileInputRef.value?.click();
        }

        function fileIconClass(kind) {
            switch (kind) {
                case 'pdf':
                    return 'fa-solid fa-file-pdf';
                case 'document':
                    return 'fa-solid fa-file-word';
                case 'spreadsheet':
                    return 'fa-solid fa-file-excel';
                case 'text':
                    return 'fa-solid fa-file-lines';
                default:
                    return 'fa-solid fa-file';
            }
        }

        function fileIconStyle(kind) {
            switch (kind) {
                case 'pdf':
                    return { color: '#e63946' };
                case 'spreadsheet':
                    return { color: '#217346' };
                case 'document':
                    return { color: '#2b579a' };
                case 'text':
                    return { color: '#6f6f73' };
                default:
                    return { color: '#3d3d3f' };
            }
        }

        function removeAttachment(id) {
            const index = attachments.value.findIndex(item => item.id === id);
            if (index === -1) return;
            const [removed] = attachments.value.splice(index, 1);
            if (removed?.previewUrl && objectUrls.has(removed.previewUrl)) {
                URL.revokeObjectURL(removed.previewUrl);
                objectUrls.delete(removed.previewUrl);
            }
            syncVariables();
        }

        function getExtension(name = '') {
            return name.split('.').pop()?.toLowerCase();
        }

        function detectKind(file) {
            const ext = getExtension(file.name);
            const mime = file.type;
            if (mime?.startsWith('image/') || imageExtensions.includes(ext)) return 'image';
            if (ext === 'pdf') return 'pdf';
            if (ext === 'doc' || ext === 'docx') return 'document';
            if (ext === 'xls' || ext === 'xlsx') return 'spreadsheet';
            if (ext === 'txt') return 'text';
            return 'file';
        }

        function normalizeAttachment(file) {
            const kind = detectKind(file);
            const isImage = kind === 'image';
            const previewUrl = URL.createObjectURL(file);
            objectUrls.add(previewUrl);
            return {
                id: wwLib.wwUtils.getUid(),
                name: file.name,
                mime: file.type,
                size: file.size,
                type: isImage ? 'image' : 'file',
                kind,
                previewUrl,
            };
        }

        function adjustTextareaHeight() {
            const el = textareaRef.value;
            if (!el) return;
            el.style.height = 'auto';
            const newHeight = el.scrollHeight;
            el.style.height = `${newHeight}px`;
            const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
            isMultiline.value = newHeight > lineHeight + 2;
        }

        function handleInput() {
            adjustTextareaHeight();
        }

        function isAllowedFile(file) {
            const ext = getExtension(file.name);
            const mime = file.type;
            if (mime?.startsWith('image/')) return imageExtensions.includes(ext);
            return allowedExtensions.includes(ext);
        }

        function onFilesSelected(event) {
            const files = Array.from(event.target.files || []);
            if (!files.length) return;
            const allowed = files.filter(isAllowedFile);
            const rejected = files.filter(file => !allowed.includes(file));

            if (rejected.length) {
                wwLib?.wwLog?.warn?.('Arquivos não permitidos ignorados:', rejected.map(file => file.name));
            }

            attachments.value.push(...allowed.map(normalizeAttachment));
            event.target.value = '';
            syncVariables();
        }

        function buildPayload() {
            const base = {
                message: message.value.trim(),
                attachments: attachments.value.map(item => ({
                    id: item.id,
                    name: item.name,
                    mime: item.mime,
                    size: item.size,
                    type: item.type,
                    previewUrl: item.previewUrl,
                })),
            };

            return {
                ...base,
                json: JSON.stringify(base, null, 2),
            };
        }

        function syncVariables() {
            const payload = buildPayload();
            setPayloadVariable(payload);
            setJsonVariable(payload.json);
        }

        function handleSend() {
            if (!canSend.value) return;
            const payload = buildPayload();
            emit('trigger-event', { name: 'onSend', event: payload });
            message.value = '';
            attachments.value.splice(0);
            syncVariables();
            textareaRef.value?.focus();
        }

        watch(message, () => {
            syncVariables();
            nextTick(adjustTextareaHeight);
        });
        watch(attachments, syncVariables, { deep: true });

        syncVariables();

        onMounted(() => {
            adjustTextareaHeight();
        });

        onBeforeUnmount(() => {
            objectUrls.forEach(url => URL.revokeObjectURL(url));
            objectUrls.clear();
        });

        return {
            accept,
            attachments,
            canSend,
            fileInputRef,
            handleSend,
            handleInput,
            isReadonly,
            isMultiline,
            message,
            onFilesSelected,
            placeholder,
            removeAttachment,
            fileIconClass,
            fileIconStyle,
            textareaRef,
            triggerFilePicker,
        };
    },
};
</script>

<style scoped>
.chat-input {
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.chat-input__attachment {
    display: flex;
    align-items: center;
    padding: 6px 10px;
    border-radius: 12px;
    background: #f7f7f8;
    border: 1px solid #e5e5e7;
    gap: 10px;
    position: relative;
    max-width: 200px;
    min-height: 48px;
}

.chat-input__attachment-thumb {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    overflow: hidden;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #e5e5e7;
}

.chat-input__attachment-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.chat-input__file-icon {
    font-size: 20px;
}

.chat-input__attachment-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.chat-input__attachment-name {
    font-size: 14px;
    font-weight: 600;
    color: #161616;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.chat-input__remove {
    position: absolute;
    top: 6px;
    right: 6px;
    background: transparent;
    border: none;
    color: #8a8a8e;
    cursor: pointer;
    font-size: 14px;
}

.chat-input__bar {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #ffffff;
    border: 1px solid #d9d9e3;
    border-radius: 999px;
    padding: 10px 14px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.chat-input__bar.-multiline {
    border-radius: 28px;
    align-items: flex-start;
}

.chat-input__bar.-disabled {
    opacity: 0.6;
    pointer-events: none;
}

.chat-input__add,
.chat-input__send {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease;
}

.chat-input__bar.-multiline .chat-input__add,
.chat-input__bar.-multiline .chat-input__send {
    align-self: end;
    margin-top: 2px;
}

.chat-input__add {
    color: #3d3d3f;
}

.chat-input__add:hover {
    cursor: pointer
}

.chat-input__send {
    background: #10a37f;
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(16, 163, 127, 0.3);
}

.chat-input__send:disabled {
    background: #c8c8cc;
    box-shadow: none;
    cursor: not-allowed;
}

.chat-input__content {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
}

.chat-input__attachments {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.chat-input__textarea {
    width: 100%;
    border: none;
    resize: none;
    background: transparent;
    outline: none;
    font-size: 15px;
    line-height: 36px;
    color: #171717;
    min-height: 40px;
    max-height: 200px;
    overflow-y: auto;
}

.chat-input__file-input {
    display: none;
}

.chat-input__attachment.is-image {
    width: 56px;
    height: 56px;
    max-width: 56px;
    padding: 4px;
    justify-content: center;
}

.chat-input__attachment.is-image .chat-input__attachment-thumb {
    width: 100%;
    height: 100%;
}

.chat-input__attachment.is-image .chat-input__remove {
    top: 4px;
    right: 4px;
}
</style>
