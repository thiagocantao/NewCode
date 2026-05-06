<template>
    <component
        :is="tag"
        class="ww-button"
        :class="{ button: tag, '-link': hasLink && !isEditing, active: isActive }"
        :type="buttonType"
        :style="buttonStyle"
        :disabled="content.disabled"
        v-bind="properties"
        @focus="isReallyFocused = true"
        @blur="onBlur"
        @mousedown="onMouseActivate"
        @mouseup="onMouseDeactivate"
        @mouseleave="onMouseDeactivate"
        @keydown="onKeyDown"
        @keyup="onKeyUp"
        @click="onClick"
    >
        <wwElement v-if="content.hasLeftIcon && content.leftIcon" v-bind="content.leftIcon"></wwElement>
        <wwText tag="span" :text="text"></wwText>
        <wwElement v-if="content.hasRightIcon && content.rightIcon" v-bind="content.rightIcon"></wwElement>
        <input ref="fileInput" type="file" accept=".csv,.xlsx,.xls" class="ww-button__file-input" @change="onFileChange" />
    </component>
</template>

<script>
import { computed } from 'vue';

const TEXT_ALIGN_TO_JUSTIFY = {
    center: 'center',
    right: 'flex-end',
    left: 'flex-start',
    justify: 'center',
};

export default {
    props: {
        content: { type: Object, required: true },
        uid: { type: String, required: false },
        wwFrontState: { type: Object, required: true },
        wwElementState: { type: Object, required: true },
        wwEditorState: { type: Object, required: true },
    },
    emits: ['update:content', 'update:content:effect', 'add-state', 'remove-state', 'trigger-event'],
    setup(props) {
        const { createElement } = wwLib.useCreateElement();
        const { hasLink, tag: linkTag, properties } = wwLib.wwElement.useLink({
            isDisabled: computed(() => props.content.disabled),
        });

        const variable = wwLib?.wwVariable?.useComponentVariable
            ? wwLib.wwVariable.useComponentVariable({
                  uid: props.uid || props.wwElementState?.uid,
                  name: 'importedData',
                  type: 'array',
                  defaultValue: [],
              })
            : null;

        return {
            createElement,
            hasLink,
            linkTag,
            properties,
            importedData: variable?.value || [],
            setImportedData: variable?.setValue,
        };
    },
    data() {
        return { isReallyFocused: false, isReallyActive: false };
    },
    computed: {
        buttonStyle() {
            return { justifyContent: TEXT_ALIGN_TO_JUSTIFY[this.content['_ww-text_textAlign']] || 'center' };
        },
        isEditing() {
            return this.wwEditorState.editMode === wwLib.wwEditorHelper.EDIT_MODES.EDITION;
        },
        tag() {
            if (this.isEditing) return 'div';
            if (this.hasLink) return this.linkTag;
            return 'button';
        },
        buttonType() {
            return this.isEditing || this.hasLink ? '' : 'button';
        },
        text() {
            return this.wwElementState.props.text;
        },
        isActive() {
            return this.isReallyActive;
        },
    },
    methods: {
        async onFileChange(event) {
            const [file] = event?.target?.files || [];
            if (!file) return;

            try {
                const parsedRows = await this.parseSpreadsheet(file);
                if (!parsedRows.length) {
                    this.notify('A planilha está vazia.', 'warning');
                    return;
                }

                const [rawHeader, ...rawRows] = parsedRows;
                const headers = rawHeader.map(header => String(header ?? '').trim());
                if (!headers.some(Boolean)) {
                    this.notify('A primeira linha da planilha deve conter os nomes das colunas.', 'warning');
                    return;
                }

                const jsonData = rawRows
                    .filter(row => row.some(value => value !== null && value !== undefined && String(value).trim() !== ''))
                    .map(row => {
                        const item = {};
                        headers.forEach((header, index) => {
                            if (!header) return;
                            item[header] = row[index] ?? '';
                        });
                        return item;
                    });

                this.importedData = jsonData;
                if (typeof this.setImportedData === 'function') {
                    this.setImportedData(jsonData);
                }

                this.$emit('trigger-event', { name: 'import-success', event: { data: jsonData } });
            } catch (error) {
                this.notify(error?.message || 'Erro ao processar a planilha.');
                this.$emit('trigger-event', { name: 'import-error', event: { error } });
            } finally {
                this.resetFileInput();
            }
        },
        onBlur() { this.isReallyFocused = false; },
        onMouseActivate() { this.isReallyActive = true; },
        onMouseDeactivate() { this.isReallyActive = false; },
        onKeyDown(event) { this.$emit('trigger-event', { name: 'keydown', event }); },
        onKeyUp(event) { this.$emit('trigger-event', { name: 'keyup', event }); },
        onClick(event) {
            if (this.isEditing || this.content.disabled) return;
            this.$emit('trigger-event', { name: 'click', event });
            this.$refs.fileInput?.click();
        },
        async parseSpreadsheet(file) {
            const name = file.name.toLowerCase();
            if (name.endsWith('.csv')) {
                const content = await file.text();
                return this.parseCsv(content);
            }

            if ((name.endsWith('.xlsx') || name.endsWith('.xls')) && typeof window !== 'undefined' && window.XLSX) {
                const buffer = await file.arrayBuffer();
                const workbook = window.XLSX.read(buffer, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                return window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            }

            throw new Error('Formato não suportado. Use CSV ou disponibilize XLSX no contexto da aplicação.');
        },
        parseCsv(content) {
            return content
                .split(/\r?\n/)
                .filter(line => line.trim() !== '')
                .map(line => line.split(',').map(part => part.trim()));
        },
        resetFileInput() {
            if (this.$refs.fileInput) this.$refs.fileInput.value = '';
        },
        notify(message, type = 'error') {
            if (wwLib?.wwNotification?.open) {
                wwLib.wwNotification.open({ text: message, type, duration: 4000 });
            }
        },
    },
};
</script>

<style lang="scss" scoped>
.ww-button { justify-content: center; align-items: center; }
.ww-button__file-input { position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; }
</style>
