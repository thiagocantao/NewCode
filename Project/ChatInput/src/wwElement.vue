<template>
    <div class="chat-input" data-capture>
        <div v-if="attachments.length" class="chat-input__attachments">
            <div
                v-for="item in attachments"
                :key="item.id"
                class="chat-input__attachment"
                :class="{ 'is-image': item.type === 'image' }"
            >
                <div class="chat-input__attachment-thumb">
                    <img v-if="item.type === 'image'" :src="item.previewUrl" :alt="item.name" />
                    <div v-else class="chat-input__file-icon">📄</div>
                </div>
                <div class="chat-input__attachment-info">
                    <span class="chat-input__attachment-name">{{ item.name }}</span>
                    <small class="chat-input__attachment-meta">{{ item.mime || 'Arquivo' }}</small>
                </div>
                <button type="button" class="chat-input__remove" @click="removeAttachment(item.id)">
                    ✕
                </button>
            </div>
        </div>

        <div class="chat-input__bar" :class="{ '-disabled': isReadonly }">
            <button class="chat-input__add" type="button" :disabled="isReadonly" @click="triggerFilePicker">
                +
            </button>

            <textarea
                ref="textareaRef"
                class="chat-input__textarea"
                :placeholder="placeholder"
                v-model="message"
                :disabled="isReadonly"
                rows="1"
                @keydown.enter.exact.prevent="handleSend"
            ></textarea>

            <button
                class="chat-input__send"
                type="button"
                :disabled="isReadonly || !canSend"
                @click="handleSend"
            >
                ▶
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
import { computed, onBeforeUnmount, ref, watch } from 'vue';

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

        const isReadonly = computed(() => !!props.content.readonly);
        const placeholder = computed(() => props.content.placeholder || 'Digite sua mensagem...');
        const accept = computed(() => props.content.accept || 'image/*,application/pdf,.doc,.docx,.txt');

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

        function normalizeAttachment(file) {
            const isImage = file.type?.startsWith('image/');
            const previewUrl = URL.createObjectURL(file);
            objectUrls.add(previewUrl);
            return {
                id: wwLib.wwUtils.getUid(),
                name: file.name,
                mime: file.type,
                size: file.size,
                type: isImage ? 'image' : 'file',
                previewUrl,
            };
        }

        function onFilesSelected(event) {
            const files = Array.from(event.target.files || []);
            if (!files.length) return;
            attachments.value.push(...files.map(normalizeAttachment));
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

        watch(message, syncVariables);
        watch(attachments, syncVariables, { deep: true });

        syncVariables();

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
            isReadonly,
            message,
            onFilesSelected,
            placeholder,
            removeAttachment,
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
    gap: 10px;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.chat-input__attachments {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 8px;
}

.chat-input__attachment {
    display: flex;
    align-items: center;
    padding: 8px;
    border-radius: 12px;
    background: #f7f7f8;
    border: 1px solid #e5e5e7;
    gap: 10px;
    position: relative;
}

.chat-input__attachment-thumb {
    width: 48px;
    height: 48px;
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

.chat-input__attachment-meta {
    color: #6f6f73;
    font-size: 12px;
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
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 8px;
    background: #ffffff;
    border: 1px solid #d9d9e3;
    border-radius: 999px;
    padding: 10px 14px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
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

.chat-input__add {
    background: #f7f7f8;
    color: #3d3d3f;
    border: 1px solid #e5e5e7;
}

.chat-input__add:hover {
    background: #ededf0;
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

.chat-input__textarea {
    width: 100%;
    border: none;
    resize: none;
    background: transparent;
    outline: none;
    font-size: 15px;
    line-height: 1.4;
    color: #171717;
    max-height: 200px;
    overflow-y: auto;
}

.chat-input__file-input {
    display: none;
}
</style>
