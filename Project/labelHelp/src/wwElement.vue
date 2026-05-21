<template>
    <div class="label-help-wrapper">
        <wwText :tag="tag" :text="text" v-bind="properties" :class="{ '-link': hasLink && !isEditing }"></wwText>

        <span v-if="helpText" class="label-help" :aria-label="helpText">
            <i class="fa-solid fa-circle-info label-help-icon" aria-hidden="true"></i>
            <span class="label-help-balloon">{{ helpText }}</span>
        </span>
    </div>
</template>

<script>
export default {
    props: {
        content: { type: Object, required: true },
        wwElementState: { type: Object, required: true },
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
    },
    emits: ['update-content', 'update:content:effect'],
    setup() {
        const { hasLink, tag, properties } = wwLib.wwElement.useLink();
        return { hasLink, linkTag: tag, properties };
    },
    computed: {
        tag() {
            return this.hasLink ? this.linkTag : this.content.tag;
        },
        text() {
            return this.wwElementState.props.text;
        },
        helpText() {
            const candidates = [
                this.content?.helpText,
                this.content?._wwText_helpText,
                this.content?.['_ww-text_helpText'],
                this.content?._ww_text_helpText,
                this.content?._ww_textarea_helpText,
                this.content?.['custom-0']?.helpText,
                this.wwElementState?.props?.helpText,
                this.wwElementState?.props?.['custom-0']?.helpText,
            ];

            const rawValue = candidates.find(value => value !== undefined && value !== null && value !== '');
            if (!rawValue) return '';

            if (typeof rawValue === 'object') {
                const lang = wwLib?.wwLang?.lang;
                const textByLang = (lang && rawValue[lang]) || rawValue.en || rawValue.pt || rawValue.pt_br;
                return (textByLang || '').toString().trim();
            }

            return rawValue.toString().trim();
        },
        isEditing() {
            /* wwEditor:start */
            return this.wwEditorState.editMode === wwLib.wwEditorHelper.EDIT_MODES.EDITION;
            /* wwEditor:end */
            // eslint-disable-next-line no-unreachable
            return false;
        },
    },
    mounted() {
        this.ensureFontAwesome();
        /* wwEditor:start */
        this.checkListTags(this.content['_ww-text_text']);
        /* wwEditor:end */
    },
    /* wwEditor:start */
    watch: {
        'content._ww-text_text'() {
            this.checkListTags(this.content['_ww-text_text']);
        },
    },
    /* wwEditor:end */
    methods: {
        ensureFontAwesome() {
            if (typeof document === 'undefined') return;
            const id = 'label-help-fontawesome-6';
            if (document.getElementById(id)) return;

            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css';
            link.referrerPolicy = 'no-referrer';
            document.head.appendChild(link);
        },
        /* wwEditor:start */
        checkListTags(text) {
            if (this.content.tag === 'p' && text && text[wwLib.wwLang.lang] && text[wwLib.wwLang.lang].indexOf) {
                const notAllowedInP = ['<ul', '<li', '<ol'];
                const isInP = notAllowedInP.reduce(
                    (isInText, el) => isInText || text[wwLib.wwLang.lang].indexOf(el) !== -1,
                    false
                );
                if (isInP) {
                    wwLib.wwNotification.open({
                        text: {
                            en: `<div>
                                    <div>Lists are not allowed in a <b>P</b> tag.</div>
                                    <div>The tag of this text has been changed to <b>DIV</b>.</div>
                                </div>
                                `,
                            fr: `<div>
                                    <div>Les listes ne sont pas autorisées dans une balise <b>P</b>.</div>
                                    <div>La balise de ce texte a été changée en <b>DIV</b>.</div>
                                </div>
                                `,
                        },
                        color: 'blue',
                        duration: 3000,
                    });
                    this.$emit('update-content', { tag: 'div' });
                }
            }
        },
        /* wwEditor:end */
    },
};
</script>

<style lang="scss" scoped>
.label-help-wrapper,
.label-help-wrapper.ww-element {
    display: inline-flex !important;
    align-items: center;
    gap: 6px;
    vertical-align: middle;
}

.-link {
    cursor: pointer;
}

.label-help {
    position: relative;
    display: inline-flex;
    align-items: center;
    color: #699d8c;
    cursor: help;
    line-height: 1;
}

.label-help-icon {
    font-size: 0.9em;
    min-width: 1em;
    text-align: center;
}

.label-help-icon::before {
    font-family: 'Font Awesome 6 Free', 'Font Awesome 5 Free';
    font-weight: 900;
}

.label-help-icon:empty::after {
    content: 'ⓘ';
    font-family: inherit;
}

.label-help-balloon {
    position: absolute;
    left: calc(100% + 10px);
    top: calc(50% - 12px);
    transform: translateY(-100%);
    min-width: 180px;
    max-width: 320px;
    background: #fff;
    color: #556;
    border: 2px solid #c6d7d1;
    border-radius: 26px;
    padding: 10px 14px;
    line-height: 1.35;
    font-size: 12px;
    box-shadow: 0 10px 18px rgba(0, 0, 0, 0.12);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.2s ease;
    z-index: 30;
}

.label-help-balloon::before,
.label-help-balloon::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #c6d7d1;
}

.label-help-balloon::before {
    left: -14px;
    top: calc(100% - 10px);
    width: 10px;
    height: 10px;
}

.label-help-balloon::after {
    left: -24px;
    top: calc(100% - 2px);
    width: 7px;
    height: 7px;
}

.label-help:hover .label-help-balloon {
    opacity: 1;
    visibility: visible;
}
</style>
