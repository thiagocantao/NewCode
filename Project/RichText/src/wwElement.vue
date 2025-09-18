<template>
    <div
        class="ww-rich-text"
        :class="{ '-readonly': isReadonly, editing: isEditing, 'html-mode': isHtmlMode }"
        data-capture
    >
        <template v-if="richEditor">
            <div class="ww-rich-text__menu native-menu" v-if="!hideMenu && !content.customMenu" :style="menuStyles">
                <!-- Texte type (normal, ...) -->
                <select id="rich-size" v-model="currentTextType" :disabled="!isEditable || isHtmlMode" v-if="menu.textType">
                    <option v-for="option in textTypeOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </option>
                </select>

                <span class="separator" v-if="menu.textType"></span>

                <!-- Bold, Italic, Underline -->
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="toggleBold"
                    :class="{ 'is-active': richEditor.isActive('bold') }"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.bold"
                    title="Bold"
                >
                    <div class="icon" v-html="iconHTMLs.bold"></div>
                </button>
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="toggleItalic"
                    :class="{ 'is-active': richEditor.isActive('italic') }"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.italic"
                    title="Italic"
                >
                    <div class="icon" v-html="iconHTMLs.italic"></div>
                </button>
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="toggleUnderline"
                    :class="{ 'is-active': richEditor.isActive('underline') }"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.underline"
                    title="Underline"
                >
                    <div class="icon" v-html="iconHTMLs.underline"></div>
                </button>
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="toggleStrike"
                    :class="{ 'is-active': richEditor.isActive('strike') }"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.strike"
                    title="Strikethrough"
                >
                    <div class="icon" v-html="iconHTMLs.strikethrough"></div>
                </button>

                <!-- Show the separator only if at least on of the previous block are visible -->
                <span class="separator" v-if="menu.bold || menu.italic || menu.underline || menu.strike"></span>

                <!-- Text align -->
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="setTextAlign('left')"
                    :class="{ 'is-active': isTextAlignActive('left') }"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.alignLeft"
                    title="Align left"
                >
                    <div class="icon" v-html="iconHTMLs['align-left']"></div>
                </button>

                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="setTextAlign('center')"
                    :class="{ 'is-active': isTextAlignActive('center') }"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.alignCenter"
                    title="Align center"
                >
                    <div class="icon" v-html="iconHTMLs['align-center']"></div>
                </button>

                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="setTextAlign('right')"
                    :class="{ 'is-active': isTextAlignActive('right') }"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.alignRight"
                    title="Align right"
                >
                    <div class="icon" v-html="iconHTMLs['align-right']"></div>
                </button>

                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="setTextAlign('justify')"
                    :class="{ 'is-active': isTextAlignActive('justify') }"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.alignJustify"
                    title="Align justify"
                >
                    <div class="icon" v-html="iconHTMLs['align-justify']"></div>
                </button>

                <span
                    class="separator"
                    v-if="menu.alignLeft || menu.alignCenter || menu.alignRight || menu.alignJustify"
                ></span>

                <!-- Color -->
                <label
                    class="ww-rich-text__menu-item"
                    :for="`rich-color-${randomUid}`"
                    @click="richEditor.commands.focus()"
                    v-if="menu.textColor"
                    title="Text color"
                >
                    <div class="icon" v-html="iconHTMLs.palette"></div>
                    <input
                        :id="`rich-color-${randomUid}`"
                        type="color"
                        @input="setColor($event.target.value)"
                        :value="richEditor.getAttributes('textStyle').color"
                        style="display: none"
                        :disabled="!isEditable || isHtmlMode"
                    />
                </label>

                <span class="separator" v-if="menu.textColor"></span>

                <!-- List (Bullet, number) -->
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="toggleBulletList"
                    :class="{ 'is-active': richEditor.isActive('bulletList') }"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.bulletList"
                    title="Bullet list"
                >
                    <div class="icon" v-html="iconHTMLs.list"></div>
                </button>
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="toggleOrderedList"
                    :class="{ 'is-active': richEditor.isActive('orderedList') }"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.orderedList"
                    title="Ordered list"
                >
                    <div class="icon" v-html="iconHTMLs['list-ordered']"></div>
                </button>
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="toggleTaskList"
                    :class="{ 'is-active': richEditor.isActive('taskList') }"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.taskList"
                >
                    <div class="icon" v-html="iconHTMLs['check-square']"></div>
                </button>

                <!-- Table -->
                <span class="separator" v-if="menu.table"></span>

                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    :class="{ 'is-highlighted': richEditor.isActive('table') }"
                    @click="insertTable"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.table"
                >
                    <table-icon icon="table-insert" />
                </button>
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    :class="{ 'is-highlighted': richEditor.isActive('table') }"
                    @click="insertRow('before')"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.table && richEditor.isActive('table')"
                >
                    <table-icon icon="row-insert-before" />
                </button>
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    :class="{ 'is-highlighted': richEditor.isActive('table') }"
                    @click="insertRow('after')"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.table && richEditor.isActive('table')"
                >
                    <table-icon icon="row-insert-after" />
                </button>
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    :class="{ 'is-highlighted': richEditor.isActive('table') }"
                    @click="insertColumn('before')"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.table && richEditor.isActive('table')"
                >
                    <table-icon icon="column-inster-before" />
                </button>
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    :class="{ 'is-highlighted': richEditor.isActive('table') }"
                    @click="insertColumn('after')"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.table && richEditor.isActive('table')"
                >
                    <table-icon icon="column-insert-after" />
                </button>
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    :class="{ 'is-highlighted': richEditor.isActive('table') }"
                    @click="deleteRow"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.table && richEditor.isActive('table')"
                >
                    <table-icon icon="row-delete" />
                </button>
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    :class="{ 'is-highlighted': richEditor.isActive('table') }"
                    @click="deleteColumn"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.table && richEditor.isActive('table')"
                >
                    <table-icon icon="column-delete" />
                </button>
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    :class="{ 'is-highlighted': richEditor.isActive('table') }"
                    @click="deleteTable"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.table && richEditor.isActive('table')"
                >
                    <table-icon icon="table-delete" />
                </button>

                <span class="separator" v-if="menu.bulletList || menu.orderedList || menu.taskList"></span>

                <!-- Link -->
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="setLink()"
                    :class="{ 'is-active': richEditor.isActive('link') }"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.link"
                >
                    <div class="icon" v-html="iconHTMLs.link"></div>
                </button>

                <!-- Image -->
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="setImage()"
                    :disabled="!isEditable || isHtmlMode || isUploadingImage"
                    v-if="menu.image"
                >
                    <div class="icon" v-html="iconHTMLs.image"></div>
                </button>

                <span
                    class="separator"
                    v-if="selectedImage && isEditable && !isHtmlMode"
                ></span>

                <div
                    v-if="selectedImage && isEditable && !isHtmlMode"
                    class="ww-rich-text__image-resize"
                    ref="imageResizePanel"
                >
                    <label class="ww-rich-text__image-resize-field">
                        <span>Largura (px)</span>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            v-model="imageResizeInputs.width"
                            @change="applySelectedImageWidth"
                            @focus="handleImageResizeFocus"
                            @blur="handleImageResizeBlur"
                        />
                    </label>
                    <label class="ww-rich-text__image-resize-field">
                        <span>Altura (px)</span>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            v-model="imageResizeInputs.height"
                            @change="applySelectedImageHeight"
                            @focus="handleImageResizeFocus"
                            @blur="handleImageResizeBlur"
                        />
                    </label>
                    <button
                        type="button"
                        class="ww-rich-text__image-resize-reset"
                        @click="resetSelectedImageSize"
                        @focus="handleImageResizeFocus"
                        @blur="handleImageResizeBlur"
                    >
                        Redefinir
                    </button>
                </div>

                <!-- HTML editor -->
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="toggleHtmlMode"
                    :class="{ 'is-active': isHtmlMode }"
                    :disabled="!isEditable && !isHtmlMode"
                    v-if="menu.htmlEditor"
                    title="HTML editor"
                >
                    <div class="icon" v-html="iconHTMLs.htmlEditor"></div>
                </button>

                <!-- Code -->
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="toggleCodeBlock"
                    :class="{ 'is-active': richEditor.isActive('codeBlock') }"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.codeBlock"
                >
                    <div class="icon" v-html="iconHTMLs.code"></div>
                </button>

                <!-- Quote -->
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="toggleBlockquote"
                    :class="{ 'is-active': richEditor.isActive('blockquote') }"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.blockquote"
                    title="Blockquote"
                >
                    <div class="icon" v-html="iconHTMLs.quote"></div>
                </button>

                <!-- Math -->
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="insertInlineMath()"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.inlineMath"
                    title="Inline math"
                >
                    <div class="icon" v-html="iconHTMLs['square-function']"></div>
                </button>
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="insertBlockMath()"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.blockMath"
                    title="Block math"
                >
                    <div class="icon" v-html="iconHTMLs.sigma"></div>
                </button>

                <span
                    class="separator"
                    v-if="
                        menu.link ||
                        menu.image ||
                        menu.codeBlock ||
                        menu.blockquote ||
                        menu.inlineMath ||
                        menu.blockMath
                    "
                ></span>

                <!-- Undo/Redo -->
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="undo"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.undo"
                    title="Undo"
                >
                    <div class="icon" v-html="iconHTMLs.undo"></div>
                </button>
                <button
                    type="button"
                    class="ww-rich-text__menu-item"
                    @click="redo"
                    :disabled="!isEditable || isHtmlMode"
                    v-if="menu.redo"
                    title="Redo"
                >
                    <div class="icon" v-html="iconHTMLs.redo"></div>
                </button>
            </div>
            <wwElement class="ww-rich-text__menu" v-else-if="content.customMenu" v-bind="content.customMenuElement" />
            <editor-content
                v-if="!isHtmlMode"
                class="ww-rich-text__input"
                :editor="richEditor"
                :style="richStyles"
            />
            <div v-else class="ww-rich-text__html-wrapper" :style="richStyles">
                <textarea
                    class="ww-rich-text__html-textarea"
                    :value="htmlEditorValue"
                    :disabled="!isEditable"
                    @input="handleHtmlInput"
                ></textarea>
            </div>
        </template>
    </div>
</template>

<script>
import 'katex/dist/katex.min.css';
import { Editor, EditorContent } from '@tiptap/vue-3';
import { NodeSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import TaskItem from '@tiptap/extension-task-item';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import { Mathematics } from '@tiptap/extension-mathematics';

import { computed, inject } from 'vue';
import suggestion from './suggestion.js';
import { Markdown } from 'tiptap-markdown';
import TableIcon from './icons/table-icon.vue';

const AlignableImage = Image.extend({
    addAttributes() {
        const parentAttributes = this.parent?.() ?? {};

        return {
            ...parentAttributes,
            textAlign: {
                default: null,
                parseHTML: element =>
                    element.getAttribute('data-align') || element.style.textAlign || element.getAttribute('align') || null,
                renderHTML: attributes => {
                    if (!attributes.textAlign) return {};

                    return {
                        'data-align': attributes.textAlign,
                    };
                },
            },
            supabasePath: {
                default: null,
                parseHTML: element => element.getAttribute('data-supabase-path') || null,
                renderHTML: attributes => {
                    if (!attributes.supabasePath) return {};
                    return { 'data-supabase-path': attributes.supabasePath };
                },
            },
            supabaseBucket: {
                default: null,
                parseHTML: element => element.getAttribute('data-supabase-bucket') || null,
                renderHTML: attributes => {
                    if (!attributes.supabaseBucket) return {};
                    return { 'data-supabase-bucket': attributes.supabaseBucket };
                },
            },
            supabaseAttachmentId: {
                default: null,
                parseHTML: element => element.getAttribute('data-supabase-attachment') || null,
                renderHTML: attributes => {
                    if (!attributes.supabaseAttachmentId) return {};
                    return { 'data-supabase-attachment': attributes.supabaseAttachmentId };
                },
            },
            width: {
                default: null,
                parseHTML: element => element.getAttribute('width') || element.style.width || null,
                renderHTML: attributes => {
                    if (!attributes.width) return {};
                    return { width: attributes.width };
                },
            },
            height: {
                default: null,
                parseHTML: element => element.getAttribute('height') || element.style.height || null,
                renderHTML: attributes => {
                    if (!attributes.height) return {};
                    return { height: attributes.height };
                },
            },
        };
    },
});

function extractMentions(acc, currentNode) {
    if (currentNode.type === 'mention') {
        acc.push(currentNode.attrs.id);
        return acc;
    } else if (currentNode.content) {
        return currentNode.content.reduce(extractMentions, acc);
    } else {
        return acc;
    }
}

const TAGS_MAP = {
    p: 0,
    h1: 1,
    h2: 2,
    h3: 3,
    h4: 4,
    h5: 5,
    h6: 6,
};

const WORKSPACE_VAR_ID = '744511f1-3309-41da-a9fd-0721e7dd2f99';

const TICKET_VAR_ID = '7bebd888-f31e-49e7-bef2-4052c8cb6cf5';
const IMAGE_BUCKET = 'ticket';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export default {
    components: {
        EditorContent,
        TableIcon,
    },
    props: {
        content: { type: Object, required: true },
        uid: { type: String, required: true },
        wwElementState: { type: Object, required: true },
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        wwFrontState: { type: Object, required: true },
        /* wwEditor:end */
        useForm: { type: Boolean, default: true },
    },
    emits: ['trigger-event', 'update:content:effect', 'update:sidepanel-content'],
    setup(props, { emit }) {
        const { value: variableValue, setValue } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'value',
            type: 'string',
            defaultValue: computed(() => String(props.content.initialValue ?? '')),
        });

        const { value: variableMentions, setValue: setMentions } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'mentions',
            type: 'array',
            defaultValue: [],
            readonly: true,
        });

        const { value: states, setValue: setStates } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'states',
            type: 'object',
            defaultValue: {},
            readonly: true,
        });

        /* wwEditor:start */
        const { createElement } = wwLib.useCreateElement();
        /* wwEditor:end */

        const randomUid = wwLib.wwUtils.getUid();

        const useForm = inject('_wwForm:useForm', () => {});

        const fieldName = computed(() => props.content.fieldName);
        const validation = computed(() => props.content.validation);
        const customValidation = computed(() => props.content.customValidation);

        useForm(
            variableValue,
            { fieldName, validation, customValidation },
            { elementState: props.wwElementState, emit, sidepanelFormPath: 'form' }
        );

        return {
            variableValue,
            setValue,
            variableMentions,
            setMentions,
            states,
            setStates,
            randomUid,
            /* wwEditor:start */
            createElement,
            /* wwEditor:end */
        };
    },
    data: () => ({
        richEditor: null,
        loading: false,
        iconHTMLs: {},
        isHtmlMode: false,
        htmlEditorValue: '',
        isDebouncing: false,
        debounce: null,
        supabasePlugin: null,
        supabase: null,
        supabaseAuth: null,
        isUploadingImage: false,
        selectedImage: null,
        imageResizeInputs: {
            width: '',
            height: '',
        },
        imageSelectionRetries: 0,
        isEditingImageSize: false,
    }),

    watch: {
        'content.initialValue'(value) {
            if (!this.richEditor) {
                const stringValue = String(value ?? '');
                this.setValue(stringValue);
                this.htmlEditorValue = stringValue;
                this.$emit('trigger-event', { name: 'initValueChange', event: { value } });
                return;
            }
            if (value !== this.getContent()) {
                this.richEditor.commands.setContent(value ?? '');
                this.setValue(value ?? '');
                this.$nextTick(() => {
                    this.refreshSupabaseImageUrls();
                });
            }
            this.$emit('trigger-event', { name: 'initValueChange', event: { value } });

            if (this.isReadonly) this.handleOnUpdate();
            this.htmlEditorValue = String(value ?? '');
        },
        isEditable(value) {
            if (!this.richEditor) return;
            if (!value) this.clearSelectedImage({ force: true });
            this.richEditor.setEditable(value && !this.isHtmlMode);
        },
        variableValue(value, oldValue) {
            if (!this.richEditor) {
                this.htmlEditorValue = String(value ?? '');
                return;
            }

            this.htmlEditorValue = String(value ?? '');

            if (this.isHtmlMode) return;

            const currentContent = this.getContent();
            if (value !== currentContent) {
                this.richEditor.commands.setContent(value ?? '');
                this.setValue(this.getContent());
                this.$nextTick(() => {
                    this.refreshSupabaseImageUrls();
                });
            }
        },
        /* wwEditor:start */
        editorConfig() {
            this.loadEditor();
        },
        'wwEditorState.boundProps.mentionList'(isBind) {
            if (!isBind)
                this.$emit('update:content:effect', {
                    mentionIdPath: null,
                    mentionLabelPath: null,
                });
        },
        // For updating legacy elements before introduction of custom menu
        'content.customMenu': {
            async handler(value) {
                if (value && !this.content.customMenuElement) {
                    const element = await this.createElement('ww-flexbox', {
                        _state: {
                            name: 'Custom menu container',
                            style: {
                                default: {
                                    width: '100%',
                                },
                            },
                        },
                    });
                    this.$emit('update:content:effect', {
                        customMenuElement: element,
                    });
                }
            },
            immediate: true,
        },
        'wwEditorState.isSelected'() {
            this.$emit('update:sidepanel-content', { path: 'selectedTag', value: null });
        },
        /* wwEditor:end */
        isReadonly: {
            immediate: true,
            handler(value) {
                if (value) {
                    this.$emit('add-state', 'readonly');
                } else {
                    this.$emit('remove-state', 'readonly');
                }
            },
        },
        editorStates: {
            deep: true,
            immediate: true,
            handler(value) {
                this.setStates(value);
            },
        },
        isHtmlMode(value) {
            if (!this.richEditor) return;
            if (value) this.clearSelectedImage({ force: true });
            this.richEditor.setEditable(!value && this.isEditable);
        },
    },
    computed: {
        isEditing() {
            /* wwEditor:start */
            return this.wwEditorState.editMode === wwLib.wwEditorHelper.EDIT_MODES.EDITION;
            /* wwEditor:end */
            // eslint-disable-next-line no-unreachable
            return false;
        },
        editorStates() {
            if (!this.richEditor) return {};
            return {
                textType: Object.keys(TAGS_MAP).find(key => TAGS_MAP[key] === this.currentTextType),
                textColor: this.currentColor,
                bold: this.richEditor.isActive('bold'),
                italic: this.richEditor.isActive('italic'),
                underline: this.richEditor.isActive('underline'),
                strike: this.richEditor.isActive('strike'),
                bulletList: this.richEditor.isActive('bulletList'),
                orderedList: this.richEditor.isActive('orderedList'),
                checkList: this.richEditor.isActive('taskList'),
                link: this.richEditor.isActive('link'),
                codeBlock: this.richEditor.isActive('codeBlock'),
                blockquote: this.richEditor.isActive('blockquote'),
                textAlign: this.richEditor.isActive({ textAlign: 'left' })
                    ? 'left'
                    : this.richEditor.isActive({ textAlign: 'center' })
                    ? 'center'
                    : this.richEditor.isActive({ textAlign: 'right' })
                    ? 'right'
                    : this.richEditor.isActive({ textAlign: 'justify' })
                    ? 'justify'
                    : false,
                table: this.richEditor.isActive('table'),
                inlineMath: false,
                blockMath: false,
            };
        },
        currentColor() {
            if (this.richEditor.getAttributes('textStyle')?.color)
                return this.richEditor.getAttributes('textStyle')?.color;
            else if (this.richEditor.isActive('link')) return this.content.a.color;
            else if (this.richEditor.isActive('codeBlock')) return this.content.code.color;
            else if (this.richEditor.isActive('blockquote')) return this.content.blockquote.color;
            else return this.content[Object.keys(TAGS_MAP).find(key => TAGS_MAP[key] === this.currentTextType)]?.color;
        },
        mentionList() {
            const data = wwLib.wwCollection.getCollectionData(this.content.mentionList);
            if (!Array.isArray(data)) return [];
            return data.map(mention => ({
                id: wwLib.resolveObjectPropertyPath(mention, this.content.mentionIdPath || 'id') || '',
                label: wwLib.resolveObjectPropertyPath(mention, this.content.mentionLabelPath || 'label') || '',
            }));
        },
        mentionListLength() {
            if (!this.content.mentionListLength || isNaN(this.content.mentionListLength)) return 5;
            return this.content.mentionListLength;
        },
        isReadonly() {
            return this.wwElementState.props.readonly === undefined
                ? this.content.readonly
                : this.wwElementState.props.readonly;
        },
        isEditable() {
            return !this.isReadonly && this.content.editable;
        },
        hideMenu() {
            return this.content.hideMenu || this.isReadonly;
        },
        menu() {
            return {
                textType: this.content.parameterTextType ?? true,
                bold: this.content.parameterBold ?? true,
                italic: this.content.parameterItalic ?? true,
                underline: this.content.parameterUnderline ?? true,
                strike: this.content.parameterStrike ?? true,
                alignLeft: this.content.parameterAlignLeft ?? false,
                alignCenter: this.content.parameterAlignCenter ?? false,
                alignRight: this.content.parameterAlignRight ?? false,
                alignJustify: this.content.parameterAlignJustify ?? false,
                textColor: this.content.parameterTextColor ?? true,
                bulletList: this.content.parameterBulletList ?? true,
                orderedList: this.content.parameterOrderedList ?? true,
                taskList: this.content.parameterTaskList ?? false,

                table: this.content.parameterTable ?? false,

                link: this.content.parameterLink ?? true,
                image: this.content.parameterImage ?? false,
                codeBlock: this.content.parameterCodeBlock ?? true,
                htmlEditor: this.content.parameterHtmlEditor ?? false,
                blockquote: this.content.parameterQuote ?? true,
                inlineMath: this.content.parameterInlineMath ?? false,
                blockMath: this.content.parameterBlockMath ?? false,
                undo: this.content.parameterUndo ?? true,
                redo: this.content.parameterRedo ?? true,
            };
        },
        editorConfig() {
            return {
                placeholder: wwLib.wwLang.getText(this.content.placeholder),
                autofocus: this.content.autofocus,
                image: {
                    inline: this.content.img?.inline,
                    allowBase64: true,
                },
                mention: {
                    enabled: this.content.enableMention,
                    list: this.mentionList,
                    allowSpaces: this.content.mentionAllowSpaces,
                    char: this.content.mentionChar,
                },
            };
        },
        currentTextType: {
            get() {
                const currentType = this.textTypeOptions.find(option => option.active);
                return currentType ? currentType.value : 0;
            },
            set(value) {
                this.setTag(value);
            },
        },
        textTypeOptions() {
            if (!this.richEditor) return [];
            return [
                { label: 'Paragraph', value: 0, active: this.richEditor.isActive('paragraph') },
                { label: 'Heading 1', value: 1, active: this.richEditor.isActive('heading', { level: 1 }) },
                { label: 'Heading 2', value: 2, active: this.richEditor.isActive('heading', { level: 2 }) },
                { label: 'Heading 3', value: 3, active: this.richEditor.isActive('heading', { level: 3 }) },
                { label: 'Heading 4', value: 4, active: this.richEditor.isActive('heading', { level: 4 }) },
                { label: 'Heading 5', value: 5, active: this.richEditor.isActive('heading', { level: 5 }) },
                { label: 'Heading 6', value: 6, active: this.richEditor.isActive('heading', { level: 6 }) },
            ];
        },
        menuStyles() {
            return {
                '--menu-color': this.content.menuColor,
                'flex-wrap': this.content.wrapMenu ? 'wrap' : 'nowrap',
            };
        },
        richStyles() {
            return {
                display: 'flex',
                flex: 1,
                overflow: 'auto',
                // H1
                '--h1-fontSize': this.content.h1.fontSize,
                '--h1-fontFamily': this.content.h1.fontFamily,
                '--h1-fontWeight': this.content.h1.fontWeight,
                '--h1-textAlign': this.content.h1.textAlign,
                '--h1-color': this.content.h1.color,
                '--h1-lineHeight': this.content.h1.lineHeight,
                '--h1-margin-top': this.content.h1.marginTop,
                '--h1-margin-bottom': this.content.h1.marginBottom,
                // H2
                '--h2-fontSize': this.content.h2.fontSize,
                '--h2-fontFamily': this.content.h2.fontFamily,
                '--h2-fontWeight': this.content.h2.fontWeight,
                '--h2-textAlign': this.content.h2.textAlign,
                '--h2-color': this.content.h2.color,
                '--h2-lineHeight': this.content.h2.lineHeight,
                '--h2-margin-top': this.content.h2.marginTop,
                '--h2-margin-bottom': this.content.h2.marginBottom,
                // H3
                '--h3-fontSize': this.content.h3.fontSize,
                '--h3-fontFamily': this.content.h3.fontFamily,
                '--h3-fontWeight': this.content.h3.fontWeight,
                '--h3-textAlign': this.content.h3.textAlign,
                '--h3-color': this.content.h3.color,
                '--h3-lineHeight': this.content.h3.lineHeight,
                '--h3-margin-top': this.content.h3.marginTop,
                '--h3-margin-bottom': this.content.h3.marginBottom,
                // H4
                '--h4-fontSize': this.content.h4.fontSize,
                '--h4-fontFamily': this.content.h4.fontFamily,
                '--h4-fontWeight': this.content.h4.fontWeight,
                '--h4-textAlign': this.content.h4.textAlign,
                '--h4-color': this.content.h4.color,
                '--h4-lineHeight': this.content.h4.lineHeight,
                '--h4-margin-top': this.content.h4.marginTop,
                '--h4-margin-bottom': this.content.h4.marginBottom,
                // H5
                '--h5-fontSize': this.content.h5.fontSize,
                '--h5-fontFamily': this.content.h5.fontFamily,
                '--h5-fontWeight': this.content.h5.fontWeight,
                '--h5-textAlign': this.content.h5.textAlign,
                '--h5-color': this.content.h5.color,
                '--h5-lineHeight': this.content.h5.lineHeight,
                '--h5-margin-top': this.content.h5.marginTop,
                '--h5-margin-bottom': this.content.h5.marginBottom,
                // H6
                '--h6-fontSize': this.content.h6.fontSize,
                '--h6-fontFamily': this.content.h6.fontFamily,
                '--h6-fontWeight': this.content.h6.fontWeight,
                '--h6-textAlign': this.content.h6.textAlign,
                '--h6-color': this.content.h6.color,
                '--h6-lineHeight': this.content.h6.lineHeight,
                '--h6-margin-top': this.content.h6.marginTop,
                '--h6-margin-bottom': this.content.h6.marginBottom,
                // p
                '--p-fontSize': this.content.p.fontSize,
                '--p-fontFamily': this.content.p.fontFamily,
                '--p-fontWeight': this.content.p.fontWeight,
                '--p-textAlign': this.content.p.textAlign,
                '--p-color': this.content.p.color,
                '--p-lineHeight': this.content.p.lineHeight,
                '--p-margin-top': this.content.p.marginTop,
                '--p-margin-bottom': this.content.p.marginBottom,
                // mention
                '--mention-fontSize': this.content.mention.fontSize,
                '--mention-fontFamily': this.content.mention.fontFamily,
                '--mention-fontWeight': this.content.mention.fontWeight,
                '--mention-color': this.content.mention.color,
                '--mention-borderSize': this.content.mention.borderSize,
                '--mention-border-radius': this.content.mention.borderRadius,
                // a
                '--a-fontSize': this.content.a.fontSize,
                '--a-fontFamily': this.content.a.fontFamily,
                '--a-fontWeight': this.content.a.fontWeight,
                '--a-textAlign': this.content.a.textAlign,
                '--a-color': this.content.a.color,
                '--a-lineHeight': this.content.a.lineHeight,
                '--a-underline': this.content.a.isUnderline ? 'underline' : 'none',
                // blockquote
                '--blockquote-color': this.content.blockquote.color,
                '--blockquote-border-color': this.content.blockquote.borderColor,
                '--blockquote-margin-top': this.content.blockquote.marginTop,
                '--blockquote-margin-bottom': this.content.blockquote.marginBottom,
                // code
                '--code-color': this.content.code.color,
                '--code-bg-color': this.content.code.bgColor,
                '--code-border-radius': this.content.code.borderRadius,
                '--code-padding-y': this.content.code.paddingY,
                '--code-padding-x': this.content.code.paddingX,
                '--code-font-size': this.content.code.fontSize,
                // img
                '--img-max-width': this.content.img?.maxWidth,
                '--img-max-height': this.content.img?.maxHeight,
                // checkbox
                '--checkbox-color': this.content.checkbox?.color,
                // table
                '--table-border-color': this.content.table?.borderColor || '#C7C7C7',
                '--table-border-width': this.content.table?.borderWidth || '1px',
                '--table-header-bg-color': this.content.table?.headerBgColor || '#f5f5f5',
                '--table-header-color': this.content.table?.headerColor || '#000',
                '--table-pair-cell-bg-color': this.content.table?.pairCellBgColor || '#fff',
                '--table-odd-cell-bg-color': this.content.table?.oddCellBgColor || '#FDFDFD',
                '--table-cell-color': this.content.table?.cellColor || '#000',
                '--table-cell-padding-x': this.content.table?.cellPaddingX || '8px',
                '--table-cell-padding-y': this.content.table?.cellPaddingY || '6px',
            };
        },
        delay() {
            return wwLib.wwUtils.getLengthUnit(this.content.debounceDelay)[0];
        },
    },
    methods: {
        async loadIcons() {
            try {
                const { getIcon } = wwLib.useIcons();
                const names = [
                    'lucide/bold',
                    'lucide/italic',
                    'lucide/underline',
                    'lucide/strikethrough',
                    'lucide/align-left',
                    'lucide/align-center',
                    'lucide/align-right',
                    'lucide/align-justify',
                    'lucide/palette',
                    'lucide/list',
                    'lucide/list-ordered',
                    'lucide/list-checks',
                    'lucide/link',
                    'lucide/image',
                    'lucide/file-code',
                    'lucide/code',
                    'lucide/quote',
                    'lucide/square-function',
                    'lucide/sigma',
                    'lucide/undo',
                    'lucide/redo',
                ];
                const results = await Promise.all(
                    names.map(async n => {
                        try {
                            const html = await getIcon(n);
                            return html || null;
                        } catch (e) {
                            return null;
                        }
                    })
                );
                this.iconHTMLs = {
                    bold: results[0],
                    italic: results[1],
                    underline: results[2],
                    strikethrough: results[3],
                    'align-left': results[4],
                    'align-center': results[5],
                    'align-right': results[6],
                    'align-justify': results[7],
                    palette: results[8],
                    list: results[9],
                    'list-ordered': results[10],
                    'check-square': results[11],
                    link: results[12],
                    image: results[13],
                    htmlEditor: results[14],
                    code: results[15],
                    quote: results[16],
                    'square-function': results[17],
                    sigma: results[18],
                    undo: results[19],
                    redo: results[20],
                };
            } catch (e) {
                this.iconHTMLs = {};
            }
        },
        parseSizeValue(value) {
            if (value === null || value === undefined) return null;
            if (typeof value === 'number') {
                return Number.isFinite(value) ? value : null;
            }
            if (typeof value !== 'string') return null;
            const trimmed = value.trim();
            if (!trimmed || trimmed.endsWith('%')) return null;
            const normalized = trimmed.toLowerCase().endsWith('px')
                ? trimmed.slice(0, -2)
                : trimmed;
            const numeric = Number.parseFloat(normalized);
            return Number.isFinite(numeric) ? numeric : null;
        },
        clearSelectedImage(options) {
            const force = Boolean(options && options.force);

            if (!force && this.isEditingImageSize) {
                return;
            }

            if (!this.selectedImage && !this.imageResizeInputs.width && !this.imageResizeInputs.height) {
                if (force) this.isEditingImageSize = false;
                return;
            }
            this.selectedImage = null;
            this.imageResizeInputs = { width: '', height: '' };
            this.imageSelectionRetries = 0;
            this.isEditingImageSize = false;
        },
        handleEditorSelectionUpdate() {
            if (!this.richEditor || this.isHtmlMode || !this.isEditable) {
                this.clearSelectedImage();
                return;
            }

            const { state, view } = this.richEditor;
            if (!state || !view) {
                this.clearSelectedImage();
                return;
            }

            const { selection } = state;
            const isImageSelection = selection instanceof NodeSelection && selection.node?.type?.name === 'image';

            if (!isImageSelection) {
                if (this.isEditingImageSize && this.selectedImage) {
                    return;
                }
                this.clearSelectedImage();
                return;
            }

            const pos = selection.from;
            const attrs = selection.node.attrs || {};
            const domNode = typeof view.nodeDOM === 'function' ? view.nodeDOM(pos) : null;

            let width = this.parseSizeValue(attrs.width);
            let height = this.parseSizeValue(attrs.height);

            let naturalWidth = null;
            let naturalHeight = null;

            if (domNode instanceof HTMLImageElement) {
                naturalWidth = domNode.naturalWidth || null;
                naturalHeight = domNode.naturalHeight || null;

                if (!width) {
                    const rect = domNode.getBoundingClientRect();
                    width = rect?.width || domNode.width || domNode.clientWidth || naturalWidth;
                }

                if (!height) {
                    const rect = domNode.getBoundingClientRect();
                    height = rect?.height || domNode.height || domNode.clientHeight || naturalHeight;
                }
            } else if (domNode && typeof domNode.getBoundingClientRect === 'function') {
                const rect = domNode.getBoundingClientRect();
                if (!width && rect?.width) width = rect.width;
                if (!height && rect?.height) height = rect.height;
            }

            if (!width && this.selectedImage?.width) width = this.selectedImage.width;
            if (!height && this.selectedImage?.height) height = this.selectedImage.height;

            if (width) width = Math.max(1, Math.round(width));
            if (height) height = Math.max(1, Math.round(height));

            const ratio = naturalWidth && naturalHeight
                ? naturalWidth / naturalHeight
                : width && height
                ? width / height
                : this.selectedImage?.ratio || null;

            this.selectedImage = {
                pos,
                width: width || null,
                height: height || null,
                naturalWidth: naturalWidth ? Math.round(naturalWidth) : null,
                naturalHeight: naturalHeight ? Math.round(naturalHeight) : null,
                ratio: ratio && Number.isFinite(ratio) ? ratio : null,
            };

            const missingDimensions = !width || !height;

            if (missingDimensions) {
                if (this.imageSelectionRetries < 5 && typeof window !== 'undefined') {
                    const retryCount = this.imageSelectionRetries + 1;
                    this.imageSelectionRetries = retryCount;
                    window.setTimeout(() => {
                        const currentSelection = this.richEditor?.state?.selection;
                        if (
                            currentSelection instanceof NodeSelection &&
                            currentSelection.from === pos
                        ) {
                            this.handleEditorSelectionUpdate();
                        }
                    }, retryCount * 100);
                }
            } else {
                this.imageSelectionRetries = 0;
            }

            this.imageResizeInputs = {
                width: width ? String(width) : '',
                height: height ? String(height) : '',
            };
        },
        handleImageResizeFocus() {
            this.isEditingImageSize = true;
        },
        handleImageResizeBlur() {
            if (typeof window === 'undefined') return;

            window.setTimeout(() => {
                const panel = this.$refs.imageResizePanel;
                const activeElement = window.document?.activeElement;
                const isInsidePanel = panel && activeElement instanceof HTMLElement && panel.contains(activeElement);

                if (isInsidePanel) {
                    return;
                }

                this.isEditingImageSize = false;

                if (this.richEditor?.isActive?.('image')) {
                    this.handleEditorSelectionUpdate();
                    return;
                }

                this.clearSelectedImage({ force: true });
            }, 0);
        },
        applySelectedImageWidth() {
            if (!this.selectedImage || !this.isEditable || this.isHtmlMode) return;
            const width = Number(this.imageResizeInputs.width);
            if (!width || width <= 0) {
                this.imageResizeInputs.width = this.selectedImage.width ? String(this.selectedImage.width) : '';
                return;
            }
            this.updateSelectedImageSize({ width });
        },
        applySelectedImageHeight() {
            if (!this.selectedImage || !this.isEditable || this.isHtmlMode) return;
            const height = Number(this.imageResizeInputs.height);
            if (!height || height <= 0) {
                this.imageResizeInputs.height = this.selectedImage.height ? String(this.selectedImage.height) : '';
                return;
            }
            this.updateSelectedImageSize({ height });
        },
        updateSelectedImageSize({ width = null, height = null } = {}) {
            if (!this.selectedImage || !this.richEditor) return;

            let newWidth = width != null ? Math.round(width) : null;
            let newHeight = height != null ? Math.round(height) : null;
            const ratio = this.selectedImage.ratio && this.selectedImage.ratio > 0 ? this.selectedImage.ratio : null;

            if (newWidth != null && (newHeight == null || newHeight <= 0)) {
                if (ratio) {
                    newHeight = Math.max(1, Math.round(newWidth / ratio));
                } else if (this.selectedImage.height) {
                    newHeight = this.selectedImage.height;
                }
            }

            if (newHeight != null && (newWidth == null || newWidth <= 0)) {
                if (ratio) {
                    newWidth = Math.max(1, Math.round(newHeight * ratio));
                } else if (this.selectedImage.width) {
                    newWidth = this.selectedImage.width;
                }
            }

            if (!newWidth || !newHeight) return;

            this.selectedImage = {
                ...this.selectedImage,
                width: newWidth,
                height: newHeight,
            };

            this.imageResizeInputs = {
                width: String(newWidth),
                height: String(newHeight),
            };

            this.richEditor
                .chain()
                .focus()
                .updateAttributes('image', { width: newWidth, height: newHeight })
                .run();
        },
        resetSelectedImageSize() {
            if (!this.selectedImage || !this.richEditor || !this.isEditable || this.isHtmlMode) return;

            this.richEditor.chain().focus().updateAttributes('image', { width: null, height: null }).run();

            const width = this.selectedImage.naturalWidth || '';
            const height = this.selectedImage.naturalHeight || '';

            this.imageResizeInputs = {
                width: width ? String(width) : '',
                height: height ? String(height) : '',
            };

            this.imageSelectionRetries = 0;

            if (typeof window !== 'undefined') {
                window.setTimeout(() => {
                    this.handleEditorSelectionUpdate();
                }, 0);
            }
        },
        isTextAlignActive(textAlign) {
            if (!this.richEditor) return false;

            if (this.richEditor.isActive({ textAlign })) return true;

            if (!this.richEditor.isActive('image')) return false;

            const imageAttributes = this.richEditor.getAttributes('image') || {};
            const imageAlign = imageAttributes.textAlign;

            if (textAlign === 'left') {
                return !imageAlign || imageAlign === 'left';
            }

            if (textAlign === 'justify') {
                return false;
            }

            return imageAlign === textAlign;
        },
        refreshSupabaseInstances() {
            this.supabasePlugin = window?.wwLib?.wwPlugins?.supabase || null;
            this.supabase = this.supabasePlugin?.instance || null;
            this.supabaseAuth = window?.wwLib?.wwPlugins?.supabaseAuth?.publicInstance || null;
        },
        getWeWebVariable(id) {
            return window?.wwLib?.wwVariable?.getValue?.(id);
        },
        async ensureAuthReady(maxMs = 4000) {
            try {
                if (!this.supabaseAuth?.auth?.getUser) return true;
                const start = Date.now();
                while (Date.now() - start < maxMs) {
                    const { data, error } = await this.supabaseAuth.auth.getUser();
                    if (data?.user && !error) return true;
                    await sleep(200);
                }
            } catch (e) {
                console.warn('[RichText] ensureAuthReady error:', e);
            }
            return true;
        },
        async waitForStorage(maxMs = 4000) {
            const start = Date.now();
            while (Date.now() - start < maxMs) {
                if (this.supabase && this.supabase.storage) return true;
                await sleep(100);
            }
            return false;
        },
        guessContentType(name, fallback = 'application/octet-stream') {
            const ext = (String(name).split('.').pop() || '').toLowerCase();
            if (ext === 'txt' || ext === 'log') return 'text/plain';
            if (ext === 'json') return 'application/json';
            if (ext === 'csv') return 'text/csv';
            if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
                const normalized = ext === 'jpg' ? 'jpeg' : ext;
                return `image/${normalized}`;
            }
            if (ext === 'pdf') return 'application/pdf';
            return fallback;
        },
        async getFreshSignedUrl(file, { forceDownloadName, transformImage } = {}) {
            if (!file?.bucket || !file?.storagePath || !this.supabase?.storage) return null;
            await this.ensureAuthReady();
            const options = {};
            if (transformImage && file.isImage) options.transform = transformImage;
            if (forceDownloadName) options.download = forceDownloadName;
            try {
                const { data, error } = await this.supabase.storage
                    .from(file.bucket)
                    .createSignedUrl(file.storagePath, 60 * 60, options);
                if (error) {
                    console.warn('[RichText] createSignedUrl failed:', error);
                    return null;
                }
                return data?.signedUrl || null;
            } catch (e) {
                console.warn('[RichText] createSignedUrl error:', e);
                return null;
            }
        },
        async uploadImageToSupabase(file) {
            if (!file) throw new Error('Nenhuma imagem selecionada.');

            const extension = (file.name.split('.').pop() || '').toLowerCase();
            const isImage =
                file.type?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension);
            if (!isImage) throw new Error('Selecione um arquivo de imagem.');

            this.refreshSupabaseInstances();

            const WorkspaceID = this.getWeWebVariable(WORKSPACE_VAR_ID);

            const TicketID = this.getWeWebVariable(TICKET_VAR_ID);

            const { data: userData, error: authErr } = this.supabaseAuth?.auth?.getUser
                ? await this.supabaseAuth.auth.getUser()
                : { data: { user: null }, error: null };

            if (this.supabaseAuth && (authErr || !userData?.user)) {
                throw new Error(
                    authErr
                        ? `Erro ao obter usuário do Supabase Auth: ${authErr.message || authErr}`
                        : 'Usuário não autenticado no Supabase.'
                );
            }

            const storageReady = await this.waitForStorage(4000);
            if (!storageReady || !this.supabase?.storage) {
                throw new Error('Supabase Storage não está pronto. Tente novamente em alguns segundos.');
            }

            const unique =
                (window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36)) +
                (extension ? `.${extension}` : '');
            const pathObject = `${WorkspaceID || 'no-workspace'}/${TicketID || 'no-ticket'}/${unique}`;

            try {
                if (this.supabasePlugin?.callPostgresFunction && this.supabase?.rpc) {
                    const { data: allowed, error: rpcCheckErr } = await this.supabase.rpc('rls_user_in_path_workspace', {
                        obj_name: pathObject,
                    });
                    if (rpcCheckErr) {
                        console.warn('[RichText] rls_user_in_path_workspace error:', rpcCheckErr);
                    } else if (allowed === false) {
                        throw new Error('Você não tem permissão para salvar a imagem neste workspace.');
                    }
                }
            } catch (e) {
                if (e instanceof Error) throw e;
                throw new Error(String(e));
            }

            const contentType = this.guessContentType(file.name, file.type || 'application/octet-stream');

            const { error: upErr } = await this.supabase.storage
                .from(IMAGE_BUCKET)
                .upload(pathObject, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType,
                });
            if (upErr) {
                throw new Error(`Erro no upload para o Supabase Storage: ${upErr.message || upErr}`);
            }


            let signedUrl = await this.getFreshSignedUrl(
                { bucket: IMAGE_BUCKET, storagePath: pathObject, isImage: true },
                { transformImage: { width: 1200, resize: 'contain' } }
            );

            if (!signedUrl && this.supabase?.storage?.from) {
                try {
                    const { data: publicData } = this.supabase.storage.from(IMAGE_BUCKET).getPublicUrl(pathObject);
                    if (publicData?.publicUrl) signedUrl = publicData.publicUrl;
                } catch (e) {
                    console.warn('[RichText] getPublicUrl failed:', e);
                }
            }

            if (!signedUrl) {
                throw new Error('Não foi possível gerar o link da imagem.');
            }

            return {
                url: signedUrl,
                bucket: IMAGE_BUCKET,
                storagePath: pathObject,

            };
        },
        notifyError(message) {
            if (!message) return;
            if (wwLib?.wwNotification?.open) {
                wwLib.wwNotification.open({ text: message, type: 'error', duration: 4000 });
            } else {
                console.error(message);
            }
        },
        async refreshSupabaseImageUrls() {
            if (!this.richEditor) return;
            this.refreshSupabaseInstances();

            const nodes = [];
            this.richEditor.state.doc.descendants((node, pos) => {
                if (node.type.name !== 'image') return;
                const bucket = node.attrs.supabaseBucket;
                const storagePath = node.attrs.supabasePath;
                if (bucket && storagePath) {
                    nodes.push({ pos, bucket, storagePath });
                }
            });

            if (!nodes.length) return;

            const storageReady = await this.waitForStorage(1500);
            if (!storageReady || !this.supabase?.storage) {
                window?.setTimeout?.(() => this.refreshSupabaseImageUrls(), 1000);
                return;
            }
            await this.ensureAuthReady();

            for (const nodeInfo of nodes) {
                const signedUrl = await this.getFreshSignedUrl(
                    { bucket: nodeInfo.bucket, storagePath: nodeInfo.storagePath, isImage: true },
                    { transformImage: { width: 1200, resize: 'contain' } }
                );
                if (!signedUrl) continue;

                this.richEditor.commands.command(({ state, tr, dispatch }) => {
                    const node = state.doc.nodeAt(nodeInfo.pos);
                    if (!node) return false;
                    if (node.attrs.src === signedUrl) return true;
                    const newAttrs = { ...node.attrs, src: signedUrl };
                    tr.setNodeMarkup(nodeInfo.pos, undefined, newAttrs);
                    if (!dispatch) return false;
                    dispatch(tr);
                    return true;
                });
            }
        },
        loadEditor() {
            if (this.loading) return;
            this.loading = true;
            this.clearSelectedImage({ force: true });
            if (this.richEditor) {
                this.richEditor.off?.('selectionUpdate', this.handleEditorSelectionUpdate);
                this.richEditor.off?.('transaction', this.handleEditorSelectionUpdate);
                this.richEditor.off?.('blur', this.clearSelectedImage);
                this.richEditor.destroy();
            }
            this.richEditor = new Editor({
                content: String(this.content.initialValue ?? ''),
                editable: this.isEditable,
                autofocus: this.editorConfig.autofocus,
                onFocus: ({ editor, event }) => {
                    this.$emit('trigger-event', { name: 'focus', event: { editor, event } });
                },
                onBlur: ({ editor, event }) => {
                    this.$emit('trigger-event', { name: 'blur', event: { editor, event } });
                },
                extensions: [
                    StarterKit,
                    Link.configure({
                        HTMLAttributes: {
                            rel: 'noopener noreferrer',
                        },
                    }),
                    TextStyle,
                    Color,
                    Underline,
                    Table.configure({
                        resizable: true,
                    }),
                    TableCell,
                    TableHeader,
                    TableRow,
                    TaskList,
                    TaskItem.configure({
                        nested: true,
                    }),
                    TextAlign.configure({
                        types: ['heading', 'paragraph'],
                    }),
                    Placeholder.configure({
                        placeholder: this.editorConfig.placeholder,
                    }),
                    Markdown.configure({ breaks: true }),
                    AlignableImage.configure({ ...this.editorConfig.image }),
                    this.editorConfig.mention.enabled &&
                        Mention.configure({
                            HTMLAttributes: {
                                class: 'mention',
                            },
                            suggestion: {
                                items: ({ query }) =>
                                    this.editorConfig.mention.list
                                        .filter(({ label }) => label.toLowerCase().startsWith(query.toLowerCase()))
                                        .slice(0, this.mentionListLength),
                                render: suggestion.render,
                                allowSpaces: this.editorConfig.mention.allowSpaces,
                                char: this.editorConfig.mention.char,
                            },
                        }),
                ],
                onCreate: () => {
                    this.setValue(this.getContent());
                    this.setMentions(this.richEditor.getJSON().content.reduce(extractMentions, []));
                    this.htmlEditorValue = this.getContent();
                    this.refreshSupabaseImageUrls();
                    this.handleEditorSelectionUpdate();
                },
                onUpdate: this.handleOnUpdate,
                editorProps: {
                    handleClickOn: (view, pos, node) => {
                        if (node.type.name === 'image') {
                            const { state, dispatch } = view;
                            const selection = NodeSelection.create(state.doc, pos);

                            dispatch(state.tr.setSelection(selection));

                            return true;
                        }

                        if (node.type.name === 'mention') {
                            this.$emit('trigger-event', {
                                name: 'mention:click',
                                event: { mention: { id: node.attrs.id, label: node.attrs.label } },
                            });
                        }
                    },
                },
            });
            this.richEditor.on('selectionUpdate', this.handleEditorSelectionUpdate);
            this.richEditor.on('transaction', this.handleEditorSelectionUpdate);
            this.richEditor.on('blur', this.clearSelectedImage);
            this.handleEditorSelectionUpdate();
            this.loading = false;
        },
        handleOnUpdate() {
            let htmlValue = this.getContent();
            if (this.variableValue === htmlValue) {
                this.htmlEditorValue = htmlValue;
                return;
            }
            this.emitValueChange(htmlValue);
            this.setMentions(this.richEditor.getJSON().content.reduce(extractMentions, []));
            this.htmlEditorValue = htmlValue;
        },
        setLink(url) {
            if (this.richEditor.isActive('link')) {
                this.richEditor.chain().focus().unsetLink().run();
                return;
            }

            const previousUrl = this.richEditor.getAttributes('link').href;
            const selectedUrl = url ?? window.prompt('URL', previousUrl);

            // cancelled
            if (selectedUrl === null) {
                return;
            }

            // empty
            if (selectedUrl === '') {
                this.richEditor.chain().focus().extendMarkRange('link').unsetLink().run();

                return;
            }

            // update link
            this.richEditor.chain().focus().extendMarkRange('link').setLink({ href: selectedUrl }).run();
        },
        async setImage(srcOrOptions, alt = '', title = '') {
            const options =
                srcOrOptions && typeof srcOrOptions === 'object'
                    ? { ...srcOrOptions }
                    : { src: srcOrOptions, alt, title };

            if (options.src) {
                this.richEditor.chain().focus().setImage(options).run();
                return;
            }

            let windowRef;
            /* wwEditor:start */
            windowRef = wwLib.getEditorWindow();
            /* wwEditor:end */
            /* wwFront:start */
            windowRef = wwLib.getFrontWindow();
            /* wwFront:end */

            if (!windowRef && typeof window !== 'undefined') {
                windowRef = window;
            }

            const imageFile = await this.getImageFromDevice(windowRef);
            if (!imageFile) return;

            this.isUploadingImage = true;
            try {
                const { url, bucket, storagePath } = await this.uploadImageToSupabase(imageFile);

                const imageOptions = {
                    src: url,
                    alt: options.alt || imageFile.name,
                    title: options.title || '',
                    supabaseBucket: bucket,
                    supabasePath: storagePath,
                };


                this.richEditor.chain().focus().setImage(imageOptions).run();
            } catch (error) {
                this.notifyError(error?.message || String(error));
            } finally {
                this.isUploadingImage = false;
            }
        },
        getImageFromDevice(windowRef) {
            if (!windowRef || !windowRef.document) return Promise.resolve(null);

            return new Promise(resolve => {
                const documentRef = windowRef.document;
                const input = documentRef.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.style.display = 'none';

                let resolved = false;
                const finalize = value => {
                    if (resolved) return;
                    resolved = true;
                    cleanup();
                    resolve(value);
                };

                function onWindowFocus() {
                    windowRef.setTimeout(() => {
                        if (!resolved && (!input.files || !input.files.length)) {
                            finalize(null);
                        }
                    }, 0);
                }

                function cleanup() {
                    windowRef.removeEventListener('focus', onWindowFocus, true);
                    if (input.parentNode) {
                        input.parentNode.removeChild(input);
                    }
                }

                const onChange = () => {
                    const file = input.files && input.files[0];
                    finalize(file || null);
                };

                input.addEventListener('change', onChange, { once: true });
                windowRef.addEventListener('focus', onWindowFocus, { once: true, capture: true });

                const parent = documentRef.body || documentRef.documentElement;
                if (!parent) {
                    finalize(null);
                    return;
                }

                parent.appendChild(input);
                input.click();
            });
        },

        focusEditor() {
            this.richEditor.chain().focus().run();
        },
        setTag(tag) {
            if (typeof tag === 'string') {
                tag = tag.toLocaleLowerCase().trim();
                if (tag in TAGS_MAP) tag = TAGS_MAP[tag];
            }
            if (tag === 0) this.richEditor.chain().focus().setParagraph().run();
            if (tag !== 0)
                this.richEditor
                    .chain()
                    .focus()
                    .toggleHeading({ level: Number(tag) })
                    .run();
        },
        toggleUnderline() {
            this.richEditor.chain().focus().toggleMark('underline').run();
        },
        toggleBold() {
            this.richEditor.chain().focus().toggleBold().run();
        },
        toggleItalic() {
            this.richEditor.chain().focus().toggleItalic().run();
        },
        toggleUnderline() {
            this.richEditor.chain().focus().toggleUnderline().run();
        },
        toggleStrike() {
            this.richEditor.chain().focus().toggleStrike().run();
        },
        setTextAlign(textAlign) {
            if (this.richEditor.isActive('image') && !this.editorConfig.image?.inline) {
                const alignValue = ['center', 'right'].includes(textAlign) ? textAlign : null;
                this.richEditor.chain().focus().updateAttributes('image', { textAlign: alignValue }).run();
                return;
            }

            this.richEditor.chain().focus().setTextAlign(textAlign).run();
        },
        setColor(color) {
            this.richEditor.chain().focus().setColor(color).run();
        },
        toggleBulletList() {
            this.richEditor.chain().focus().toggleBulletList().run();
        },
        toggleOrderedList() {
            this.richEditor.chain().focus().toggleOrderedList().run();
        },
        toggleTaskList() {
            this.richEditor.chain().focus().toggleTaskList().run();
        },
        toggleCodeBlock() {
            this.richEditor.chain().focus().toggleCodeBlock().run();
        },
        toggleBlockquote() {
            this.richEditor.chain().focus().toggleBlockquote().run();
        },
        undo() {
            this.richEditor.chain().undo().run();
        },
        redo() {
            this.richEditor.chain().redo().run();
        },
        getContent() {
            if (this.content.output === 'markdown') return this.richEditor.storage.markdown.getMarkdown();
            return this.richEditor.getHTML();
        },
        /* Table */
        insertTable() {
            this.richEditor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        },
        insertRow(direction) {
            direction === 'before'
                ? this.richEditor.chain().focus().addRowBefore().run()
                : this.richEditor.chain().focus().addRowAfter().run();
        },
        insertColumn(direction) {
            direction === 'before'
                ? this.richEditor.chain().focus().addColumnBefore().run()
                : this.richEditor.chain().focus().addColumnAfter().run();
        },
        deleteRow() {
            this.richEditor.chain().focus().deleteRow().run();
        },
        deleteColumn() {
            this.richEditor.chain().focus().deleteColumn().run();
        },
        deleteTable() {
            this.richEditor.chain().focus().deleteTable().run();
        },
        emitValueChange(value) {
            this.setValue(value);
            if (this.content.debounce) {
                this.isDebouncing = true;
                if (this.debounce) {
                    clearTimeout(this.debounce);
                }
                this.debounce = setTimeout(() => {
                    this.$emit('trigger-event', { name: 'change', event: { value: this.variableValue } });
                    this.isDebouncing = false;
                }, this.delay);
            } else {
                this.$emit('trigger-event', { name: 'change', event: { value: this.variableValue } });
            }
        },
        toggleHtmlMode() {
            if (!this.richEditor) return;

            if (!this.isHtmlMode) {
                this.htmlEditorValue = this.getContent();
                this.isHtmlMode = true;
                return;
            }

            const value = this.htmlEditorValue ?? '';

            try {
                this.richEditor.commands.setContent(value);
                this.isHtmlMode = false;
                this.$nextTick(() => {
                    this.richEditor.commands.focus();
                });
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error(error);
            }
        },
        handleHtmlInput(event) {
            const value = event?.target?.value ?? '';
            const currentValue = this.variableValue ?? '';
            if (value === currentValue) {
                this.htmlEditorValue = value;
                return;
            }

            this.htmlEditorValue = value;
            this.emitValueChange(value);
            this.updateMentionsFromHtml(value);
        },
        updateMentionsFromHtml(html) {
            if (typeof window === 'undefined' || !window.document) return;
            const container = window.document.createElement('div');
            container.innerHTML = html;
            const mentions = Array.from(container.querySelectorAll('[data-type="mention"]'))
                .map(element => element.getAttribute('data-id'))
                .filter(Boolean);
            this.setMentions(mentions);
        },
    },
    mounted() {
        this.refreshSupabaseInstances();
        this.loadEditor();
        this.loadIcons();
    },
    beforeUnmount() {
        if (this.richEditor) {
            this.richEditor.off?.('selectionUpdate', this.handleEditorSelectionUpdate);
            this.richEditor.off?.('transaction', this.handleEditorSelectionUpdate);
            this.richEditor.off?.('blur', this.clearSelectedImage);
            this.richEditor.destroy();
        }
        if (this.debounce) {
            clearTimeout(this.debounce);
            this.debounce = null;
        }
        this.clearSelectedImage({ force: true });
    },
};
</script>

<style lang="scss">
.ww-rich-text {
    --menu-color: unset;
    flex-direction: column;

    &.editing .ww-rich-text__input {
        position: relative;
        &::before {
            content: '';
            position: absolute;
            inset: 0;
            z-index: 1;
        }
    }

    &.editing .native-menu {
        position: relative;
        &::before {
            content: '';
            position: absolute;
            inset: 0;
            z-index: 1;
        }
    }

    .separator {
        background: rgb(235, 236, 240);
        width: 1px;
        height: 24px;
        margin: 0px 8px;

        &:last-child {
            display: none;
        }
    }

    &__html-wrapper {
        display: flex;
        flex: 1;
        width: 100%;
    }

    &__html-textarea {
        flex: 1;
        width: 100%;
        resize: none;
        border: none;
        padding: 8px;
        font-family: 'JetBrainsMono', monospace;
        font-size: 14px;
        line-height: 1.5;
        color: var(--p-color);
        background-color: transparent;
        outline: none;
        box-sizing: border-box;
    }

    &__html-textarea:disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }

    &__menu {
        display: flex;
        flex-direction: row;
        align-items: center;
        margin-bottom: 4px;
        gap: 4px;
        overflow-x: auto;
        min-height: 32px;
        select {
            padding: 8px;
            appearance: none;
            border: none;
            font-weight: 700;
            cursor: pointer;
            color: var(--menu-color);
            background-color: transparent;
            &:hover {
                background-color: rgb(245, 245, 245);
            }
        }
        &-item {
            padding: 2px;
            color: var(--menu-color);
            cursor: pointer;
            text-align: center;
            border-radius: 4px;
            position: relative;
            overflow: hidden;
            i {
                width: 24px;
            }
            .icon {
                color: var(--menu-color);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                position: relative;
                z-index: 1;
            }
            .icon svg {
                width: 16px;
                height: 16px;
                display: block;
                position: relative;
                z-index: 1;
            }
            /* Table toolbar icons come as <svg class="icon"> from TableIcon */
            svg.icon {
                width: 16px !important;
                height: 16px !important;
                display: block;
                position: relative;
                z-index: 1;
            }
            /* Support class-based font icons like .icon-x, .icon-foo-bar */
            [class^='icon-'],
            [class*=' icon-'] {
                color: var(--menu-color);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                font-size: 16px;
                line-height: 16px;
                position: relative;
                z-index: 1;
            }
            &:hover {
                background-color: rgb(245, 245, 245);
            }
            &.is-active {
                color: var(--menu-color);
            }
            &.is-active::before {
                content: '';
                position: absolute;
                inset: 0;
                background-color: currentColor;
                opacity: 0.2;
                border-radius: inherit;
                pointer-events: none;
                z-index: 0;
            }
        }
    }

    &__image-resize {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0 4px;
        flex-wrap: wrap;
    }

    &__image-resize-field {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: var(--menu-color);

        span {
            white-space: nowrap;
        }

        input {
            width: 72px;
            padding: 4px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 12px;
            color: inherit;
            background-color: #fff;
            box-shadow: none;
        }
    }

    &__image-resize-reset {
        border: 1px solid #d1d5db;
        background-color: transparent;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
        color: var(--menu-color);
        transition: background-color 0.2s ease;

        &:hover {
            background-color: rgba(0, 0, 0, 0.04);
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    .ProseMirror {
        /* Basic editor styles */
        cursor: text;
        max-height: 100%;
        width: 100%;
        overflow: auto;
        padding: 8px;
        font-size: var(--p-fontSize);
        font-family: var(--p-fontFamily);
        font-weight: var(--p-fontSize);
        text-align: var(--p-textAlign);
        color: var(--p-color);
        line-height: var(--p-lineHeight);
        &-focused {
            outline: unset;
        }
        > * + * {
            margin-top: 0.75em;
        }

        /* Placeholder (at the top) */
        & p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #adb5bd;
            pointer-events: none;
            height: 0;
        }

        h1 {
            font-size: var(--h1-fontSize);
            font-family: var(--h1-fontFamily);
            font-weight: var(--h1-fontWeight);
            text-align: var(--h1-textAlign);
            color: var(--h1-color);
            line-height: var(--h1-lineHeight);
            margin-top: var(--h1-margin-top);
            margin-bottom: var(--h1-margin-bottom);
        }
        h2 {
            font-size: var(--h2-fontSize);
            font-family: var(--h2-fontFamily);
            font-weight: var(--h2-fontWeight);
            text-align: var(--h2-textAlign);
            color: var(--h2-color);
            line-height: var(--h2-lineHeight);
            margin-top: var(--h2-margin-top);
            margin-bottom: var(--h2-margin-bottom);
        }
        h3 {
            font-size: var(--h3-fontSize);
            font-family: var(--h3-fontFamily);
            font-weight: var(--h3-fontWeight);
            text-align: var(--h3-textAlign);
            color: var(--h3-color);
            line-height: var(--h3-lineHeight);
            margin-top: var(--h3-margin-top);
            margin-bottom: var(--h3-margin-bottom);
        }
        h4 {
            font-size: var(--h4-fontSize);
            font-family: var(--h4-fontFamily);
            font-weight: var(--h4-fontWeight);
            text-align: var(--h4-textAlign);
            color: var(--h4-color);
            line-height: var(--h4-lineHeight);
            margin-top: var(--h4-margin-top);
            margin-bottom: var(--h4-margin-bottom);
        }
        h5 {
            font-size: var(--h5-fontSize);
            font-family: var(--h5-fontFamily);
            font-weight: var(--h5-fontWeight);
            text-align: var(--h5-textAlign);
            color: var(--h5-color);
            line-height: var(--h5-lineHeight);
            margin-top: var(--h5-margin-top);
            margin-bottom: var(--h5-margin-bottom);
        }
        h6 {
            font-size: var(--h6-fontSize);
            font-family: var(--h6-fontFamily);
            font-weight: var(--h6-fontWeight);
            text-align: var(--h6-textAlign);
            color: var(--h6-color);
            line-height: var(--h6-lineHeight);
            margin-top: var(--h6-margin-top);
            margin-bottom: var(--h6-margin-bottom);
        }
        p {
            font-size: var(--p-fontSize);
            font-family: var(--p-fontFamily);
            font-weight: var(--p-fontWeight);
            text-align: var(--p-textAlign);
            color: var(--p-color);
            line-height: var(--p-lineHeight);
            margin-top: var(--p-margin-top);
            margin-bottom: var(--p-margin-bottom);
        }
        a {
            display: initial;
            text-decoration: var(--a-underline);
            font-size: var(--a-fontSize);
            font-family: var(--a-fontFamily);
            font-weight: var(--a-fontWeight);
            text-align: var(--a-textAlign);
            color: var(--a-color);
            line-height: var(--a-lineHeight);
            cursor: pointer;
        }

        .mention {
            border: var(--mention-borderSize) solid var(--mention-color);
            border-radius: var(--mention-border-radius);
            padding: 0.1rem 0.3rem;
            box-decoration-break: clone;
            cursor: pointer;
            font-size: var(--mention-fontSize);
            font-family: var(--mention-fontFamily);
            font-weight: var(--mention-fontSize);
            color: var(--mention-color);
        }

        table {
            border-collapse: collapse;
            margin: 0;
            overflow: hidden;
            display: table;
            width: 100%;

            td,
            th {
                text-align: left;
                border: var(--table-border-width) solid var(--table-border-color);
                box-sizing: border-box;
                min-width: 1em;
                padding: var(--table-cell-padding-y) var(--table-cell-padding-x);
                position: relative;
                vertical-align: top;

                > * {
                    margin-bottom: 0;
                }
            }

            th {
                color: var(--table-header-color);
                font-style: normal;
                font-weight: 500;
                font-size: 15px;
                line-height: 18px;
                letter-spacing: -0.08px;
                background-color: var(--table-header-bg-color);
            }

            td {
                background-color: var(--table-pair-cell-bg-color);
                color: var(--table-cell-color);
            }

            tr:nth-child(odd) td {
                background-color: var(--table-odd-cell-bg-color);
            }

            /*
            .selectedCell:after {
                background: blue;
                content: '';
                left: 0;
                right: 0;
                top: 0;
                bottom: 0;
                pointer-events: none;
                position: absolute;
                z-index: 2;
            }
                */

            .column-resize-handle {
                background-color: red;
                bottom: -2px;
                pointer-events: none;
                position: absolute;
                right: -2px;
                top: 0;
                width: 4px;
            }
        }

        .tableWrapper {
            margin: 1.5rem 0;
            overflow-x: auto;
        }

        &.resize-cursor {
            cursor: ew-resize;
            cursor: col-resize;
        }

        blockquote {
            color: var(--blockquote-color);
            border-left: 0.2rem solid var(--blockquote-border-color);
            margin: 1rem 0;
            padding: 0.25rem 0 0.25rem 1rem;
            margin-top: var(--blockquote-margin-top);
            margin-bottom: var(--blockquote-margin-bottom);
        }

        pre {
            background: var(--code-bg-color);
            color: var(--code-color);
            font-family: 'JetBrainsMono', monospace;
            padding: var(--code-padding-y) var(--code-padding-x);
            border-radius: var(--code-border-radius);

            code {
                color: inherit;
                padding: 0;
                background: none;
                font-size: var(--code-font-size);
            }
        }

        img {
            max-width: var(--img-max-width);
            max-height: var(--img-max-height);
        }

        img[data-align='center'],
        img[data-align='right'],
        img[data-align='left'] {
            display: block;
        }

        img[data-align='center'] {
            margin-left: auto;
            margin-right: auto;
        }

        img[data-align='right'] {
            margin-left: auto;
            margin-right: 0;
        }

        img[data-align='left'] {
            margin-left: 0;
            margin-right: auto;
        }

        ul[data-type='taskList'] {
            list-style: none;
            padding: 0;

            p {
                margin: 0;
            }

            li {
                display: flex;

                > label {
                    flex: 0 0 auto;
                    margin-right: var(--ww-spacing-01);
                    user-select: none;
                }

                > div {
                    flex: 1 1 auto;
                }

                ul li,
                ol li {
                    display: list-item;
                }

                ul[data-type='taskList'] > li {
                    display: flex;
                }

                input[type='checkbox'] {
                    cursor: pointer;
                    accent-color: var(--checkbox-color);
                }
            }
        }
    }

    &.-readonly .ProseMirror {
        cursor: inherit;
    }

    // Mathematics extension styles
    .Tiptap-mathematics-editor {
        background: #202020;
        color: #fff;
        font-family: monospace;
        padding: 0.2rem 0.5rem;
        border-radius: 0.25rem;
        display: inline-block;
    }

    .Tiptap-mathematics-render {
        padding: 0 0.25rem;
        border-radius: 0.25rem;
        display: inline-block;

        &--editable {
            cursor: pointer;
            transition: background 0.2s;

            &:hover {
                background: #eee;
            }
        }
    }
}
</style>
