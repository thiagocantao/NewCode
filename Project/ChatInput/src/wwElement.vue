<template>
    <div class="chat-input" data-capture>
        <div class="chat-input__bar" :class="{ '-disabled': isReadonly, '-multiline': isMultiline }">
            <button
                class="chat-input__add"
                type="button"
                :disabled="isReadonly"
                :style="addButtonStyle"
                @click="triggerFilePicker"
            >
                <i class="fa-solid fa-plus" aria-hidden="true"></i>
            </button>

            <div class="chat-input__content">
                <div v-if="attachments.length" class="chat-input__attachments">
                    <div v-for="item in attachments" :key="item.id" class="chat-input__attachment"
                        :class="{ 'is-image': item.type === 'image' }">
                        <div class="chat-input__attachment-thumb">
                            <img
                                v-if="item.type === 'image'"
                                :src="attachmentThumbnailUrl(item)"
                                :alt="item.name"
                            />
                            <div v-else class="chat-input__file-icon">
                                <i :class="fileIconClass(item.kind)" :style="fileIconStyle(item.kind)" aria-hidden="true"></i>
                            </div>
                        </div>
                        <div v-if="item.type !== 'image'" class="chat-input__attachment-info">
                            <span class="chat-input__attachment-name">{{ item.name }}</span>
                        </div>
                        <button
                            type="button"
                            class="chat-input__remove"
                            title="Delete"
                            aria-label="Delete"
                            @click="removeAttachment(item.id)"
                        >
                            <i class="fa-solid fa-trash" aria-hidden="true"></i>
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
                :style="sendButtonStyle"
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
    import { SUPABASE_IMAGE_BUCKET } from './supabaseBuckets.js';

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
        const placeholder = computed(() => props.content.placeholder || 'Type your message...');
        const sendButtonStyle = computed(() => ({
            '--send-button-bg': props.content.sendButtonBackgroundColor || '#10a37f',
            '--send-icon-color': props.content.sendIconColor || '#ffffff',
        }));
        const addButtonStyle = computed(() => ({
            '--add-icon-color': props.content.addIconColor || '#3d3d3f',
        }));
        const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
        const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
        const accept = computed(
            () => props.content.accept || '.pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.gif,.webp',
        );

        const attachmentFiles = new Map();

        // variáveis do projeto
        const getVar = id => window?.wwLib?.wwVariable?.getValue?.(id);
        const workspaceVarId = '744511f1-3309-41da-a9fd-0721e7dd2f99';
        const ticketVarId = '7bebd888-f31e-49e7-bef2-4052c8cb6cf5';

        // plugins supabase
        let sb = window?.wwLib?.wwPlugins?.supabase;
        let supabase = sb?.instance || null;
        let auth = window?.wwLib?.wwPlugins?.supabaseAuth?.publicInstance || null;

        const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

        async function ensureAuthReady(maxMs = 4000) {
            try {
                if (!auth?.auth?.getUser) return true;
                const start = Date.now();
                while (Date.now() - start < maxMs) {
                    const { data, error } = await auth.auth.getUser();
                    if (data?.user && !error) return true;
                    await sleep(200);
                }
            } catch (_) {}
            return true;
        }

        async function waitForStorage(maxMs = 4000) {
            const start = Date.now();
            while (Date.now() - start < maxMs) {
                if (supabase && supabase.storage) return true;
                await sleep(100);
            }
            return false;
        }

        function extOf(name = '') {
            const seg = String(name).split('.').pop() || '';
            return seg.toLowerCase();
        }

        function guessContentType(name, fallback = 'application/octet-stream') {
            const ext = extOf(name);
            if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
                return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
            }
            if (ext === 'txt' || ext === 'log') return 'text/plain';
            if (ext === 'json') return 'application/json';
            if (ext === 'csv') return 'text/csv';
            return fallback;
        }

        function getPublicUrl(bucket, storagePath) {
            if (!bucket || !storagePath || !supabase?.storage) return null;
            try {
                const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
                return data?.publicUrl || null;
            } catch (e) {
                console.warn('[ChatInput] getPublicUrl error:', e);
                return null;
            }
        }

        const { setValue: setPayloadVariable } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'chatPayload',
            type: 'object',
            defaultValue: { message: '', attachments: [] },
        });

        const { setValue: setJsonVariable } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'chatPayloadJson',
            type: 'string',
            defaultValue: '',
            readonly: true,
        });

        const { setValue: setAttachmentsHtmlVariable } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'attachmentsHtml',
            type: 'string',
            defaultValue: '',
            readonly: true,
        });

        const isUploading = computed(() => attachments.value.some(item => item.status === 'uploading'));
        const canSend = computed(() => {
            const hasMessage = !!message.value.trim();
            const hasAttachments = attachments.value.length > 0;
            const hasQueuedAttachments = attachmentFiles.size > 0;

            return hasMessage || hasAttachments || hasQueuedAttachments;
        });

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
            attachmentFiles.delete(id);
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

        function attachmentThumbnailUrl(item) {
            return item?.publicUrl || item?.previewUrl || '';
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
                publicUrl: '',
                storagePath: '',
                status: 'pending',
                error: null,
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
                wwLib?.wwLog?.warn?.('Unsupported files ignored:', rejected.map(file => file.name));
            }

            allowed.forEach(file => {
                const attachment = normalizeAttachment(file);
                attachments.value.push(attachment);
                attachmentFiles.set(attachment.id, file);
                uploadAttachmentFile(attachment, file);
            });
            event.target.value = '';
            syncVariables();
        }

        async function uploadAttachmentFile(attachment, file) {
            if (!attachment || !file) return;
            attachment.status = 'uploading';
            attachment.error = null;

            try {
                await ensureAuthReady();
                const okStorage = await waitForStorage(4000);
                if (!okStorage || !supabase?.storage) {
                    throw new Error('Supabase Storage não está pronto. Tente novamente.');
                }

                const { data: userData, error: authErr } = auth?.auth?.getUser
                    ? await auth.auth.getUser()
                    : { data: { user: null }, error: null };
                if (auth && (authErr || !userData?.user)) {
                    throw new Error(
                        authErr
                            ? `Erro ao obter usuário do Supabase Auth: ${authErr.message || authErr}`
                            : 'Usuário não autenticado no Supabase.',
                    );
                }

                const workspace = getVar(workspaceVarId) || 'no-workspace';
                const ticket = getVar(ticketVarId) || 'no-ticket';
                const bucket = SUPABASE_IMAGE_BUCKET;

                const extension = extOf(file.name);
                const uniqueId = window.crypto?.randomUUID
                    ? window.crypto.randomUUID()
                    : `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
                const objectPath = `${workspace}/${ticket}/chat/${uniqueId}${extension ? `.${extension}` : ''}`;

                try {
                    const { data: allowed, error: rpcError } = sb?.callPostgresFunction
                        ? await supabase.rpc('rls_user_in_path_workspace', { obj_name: objectPath })
                        : { data: true, error: null };
                    if (rpcError) {
                        console.warn('[ChatInput] RLS check failed:', rpcError);
                    } else if (allowed === false) {
                        throw new Error('Você não tem permissão para salvar este arquivo.');
                    }
                } catch (rlsError) {
                    if (rlsError instanceof Error) throw rlsError;
                    throw new Error(String(rlsError));
                }

                const contentType = guessContentType(file.name, file.type || 'application/octet-stream');
                const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType,
                });
                if (uploadError) {
                    throw new Error(uploadError.message || uploadError);
                }

                const publicUrl = getPublicUrl(bucket, objectPath);
                if (!publicUrl) {
                    throw new Error('Unable to get public URL for uploaded file.');
                }

                attachment.status = 'done';
                attachment.publicUrl = publicUrl;
                attachment.storagePath = objectPath;
                syncVariables();
            } catch (error) {
                console.warn('[ChatInput] Upload failed:', error);
                attachment.status = 'error';
                attachment.error = error?.message || String(error);
                syncVariables();
            } finally {
                attachmentFiles.delete(attachment.id);
            }
        }

        function escapeHtml(text = '') {
            return String(text).replace(/[&<>"']/g, char => {
                switch (char) {
                    case '&':
                        return '&amp;';
                    case '<':
                        return '&lt;';
                    case '>':
                        return '&gt;';
                    case '"':
                        return '&quot;';
                    case "'":
                        return '&#39;';
                    default:
                        return char;
                }
            });
        }

        function buildAttachmentsHtml(list = attachments.value, textMessage = message.value) {
    const valid = (list || []).filter(item => item?.publicUrl);
    const text = (textMessage || '').trim();

    if (!valid.length && !text) return '';

    let html = '';

    valid.forEach(item => {
        const url = attachmentThumbnailUrl(item);
        if (!url) return;

        const safeName = escapeHtml(item.name || '');

        // ===== IMAGENS: uma por linha =====
        if (item.type === 'image') {
            html += [
                '<p class="ci-attachment ci-attachment--image" ',
                    'style="margin:4px 0;">',
                    '<img src="', url, '" alt="', safeName, '" ',
                        'style="max-width:40%;height:auto;object-fit:contain;',
                               'border-radius:8px;display:block;" />',
                '</p>'
            ].join('');
            return;
        }

        // ===== ARQUIVOS (PDF, DOC, XLS, etc.) =====
        const iconClass = fileIconClass(item.kind);
        const iconStyle = fileIconStyle(item.kind);
        const color = iconStyle?.color || '#3d3d3f';

        html += [
            '<p class="ci-attachment ci-attachment--file" ',
                'style="margin:4px 0;display:flex;align-items:center;gap:6px;',
                       'width:100%;box-sizing:border-box;',
                       'border:1px solid #f4f4f4;padding:10px;border-radius:10px;">',

                '<span class="ci-attachment__icon" ',
                    'style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;',
                           'font-size:22px;color:', color, ';">',
                    '<i class="', iconClass, '"></i>',
                '</span>',

                '<a href="', url, '" target="_blank" rel="noopener noreferrer" ',
                    'style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
                           'font-size:14px;font-weight:500;color:#111827;text-decoration:none;">',
                    safeName,
                '</a>',

            '</p>'
        ].join('');
    });

    // ===== MENSAGEM ABAIXO DOS ANEXOS =====
    if (text) {
        html += [
            '<p class="ci-message" ',
                'style="margin-top:18px;font-size:14px;line-height:1.5;',
                       'color:#111827;white-space:pre-wrap;">',
                escapeHtml(text),
            '</p>'
        ].join('');
    }

    return html;
}



        function buildPayload() {
        const uploadedAttachments = attachments.value.filter(item => item.publicUrl);
        const trimmedMessage = message.value.trim();
        
        const payload = {
        // continua tendo o texto puro, se você precisar em outro lugar
        message: trimmedMessage,
        attachments: uploadedAttachments.map(item => item.publicUrl),
        };
        
        // HTML já contém anexos + mensagem
        const attachmentsHtml = buildAttachmentsHtml(uploadedAttachments, trimmedMessage);
        
        return {
        ...payload,
        attachmentsHtml,
        json: JSON.stringify({ ...payload, attachmentsHtml }, null, 2),
        };
        }

        function syncVariables() {
            const payload = buildPayload();
            setPayloadVariable(payload);
            setJsonVariable(payload.json);
            setAttachmentsHtmlVariable(payload.attachmentsHtml);
        }

        function handleSend() {
            if (!canSend.value) return;
            const payload = buildPayload();
            const eventPayload = { ...payload, attachmentsHtml: payload.attachmentsHtml };

            emit('trigger-event', { name: 'onSend', event: eventPayload });
            message.value = '';
            attachments.value.splice(0);
            attachmentFiles.clear();
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
            attachmentFiles.clear();
        });

        return {
            accept,
            addButtonStyle,
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
            sendButtonStyle,
            fileIconClass,
            fileIconStyle,
            textareaRef,
            attachmentThumbnailUrl,
            triggerFilePicker,
        };
    },
};
</script>

<style>
    @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css');
</style>

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
        padding: 0px 10px;
        border-radius: 12px;
        background: #f7f7f8;
        border: 1px solid #e5e5e7;
        gap: 10px;
        position: relative;
        max-width: 260px;
        min-height: 48px;
    }

    .chat-input__attachment-thumb {
        width: 55px;
        height: 48px;
        /* border-radius: 10px; */
        overflow: hidden;
        /* background: #fff; */
        display: flex;
        align-items: center;
        justify-content: center;
        /* border: 1px solid #e5e5e7; */
    }

    .chat-input__attachment-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .chat-input__file-icon {
        font-size: 30px;
    }

    .chat-input__attachment-info {
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .chat-input__attachment-name {
        font-size: 13px;
        font-weight: 400;
        color: #161616;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .chat-input__remove {
        position: absolute;
        top: 6px;
        right: 6px;
        background: #000;
        border: none;
        color: #fff;
        cursor: pointer;
        font-size: 12px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0.2s ease;
    }

    .chat-input__attachment:hover .chat-input__remove {
        opacity: 1;
        visibility: visible;
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


    .chat-input__send {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.2s ease, color 0.2s ease;
        align-self: flex-end;
        background: var(--send-button-bg, #10a37f);
        color: var(--send-icon-color, #ffffff);
        box-shadow: 0 4px 12px rgba(16, 163, 127, 0.3);
    }

    .chat-input__add {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 19px;
        font-weight: 400;
        cursor: pointer;
        transition: background 0.2s ease, color 0.2s ease;
        align-self: flex-end;
    }

    .chat-input__bar.-multiline .chat-input__add,
    .chat-input__bar.-multiline .chat-input__send {
        align-self: end;
        margin-top: 2px;
    }

    .chat-input__add {
        color: var(--add-icon-color, #3d3d3f);
    }

    .chat-input__add:hover {
        cursor: pointer
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
        background: rgba(0, 0, 0, 0);
        outline: none;
        font-size: 14px;
        line-height: 40px;
        color: #171717;
        min-height: 44px;
        max-height: 280px;
        overflow-y: auto;
    }

    .chat-input__file-input {
        display: none;
    }

    .chat-input__attachment.is-image {
        width: 80px;
        height: 80px;
        max-width: 80px;
        padding: 1px;
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
