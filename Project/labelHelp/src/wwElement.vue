<template>
    <wwText :tag="tag" :text="text" v-bind="properties" :class="{ '-link': hasLink && !isEditing }"></wwText>
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
        isEditing() {
            /* wwEditor:start */
            return this.wwEditorState.editMode === wwLib.wwEditorHelper.EDIT_MODES.EDITION;
            /* wwEditor:end */
            // eslint-disable-next-line no-unreachable
            return false;
        },
    },
    /* wwEditor:start */
    watch: {
        'content._ww-text_text'() {
            this.checkListTags(this.content['_ww-text_text']);
        },
    },
    mounted() {
        this.checkListTags(this.content['_ww-text_text']);
    },
    /* wwEditor:end */
    methods: {
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
.-link {
    cursor: pointer;
}
</style>
