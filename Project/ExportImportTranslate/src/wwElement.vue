<template>
    <component
        :is="tag"
        class="ww-button"
        :class="{ button: tag, '-link': hasLink && !isEditing, active: isActive }"
        :type="buttonType"
        :style="buttonStyle"
        :data-ww-flag="'btn-' + content.buttonType"
        :disabled="content.disabled"
        v-bind="properties"
        @focus="isReallyFocused = true"
        @blur="onBlur($event)"
        @mousedown="onMouseActivate"
        @mouseup="onMouseDeactivate"
        @mouseleave="onMouseDeactivate"
        @touchstart="onTouchActivate"
        @touchend="onTouchDeactivate"
        @touchcancel="onTouchDeactivate"
        @keydown.enter="onKeyActivate"
        @keydown.space="onKeyActivate"
        @keyup.enter="onKeyDeactivate"
        @keyup.space="onKeyDeactivate"
        @keydown="onKeyDown"
        @keyup="onKeyUp"
        @click="onClick"
    >
        <wwElement v-if="content.hasLeftIcon && content.leftIcon" v-bind="content.leftIcon"></wwElement>
        <wwText tag="span" :text="text"></wwText>
        <wwElement v-if="content.hasRightIcon && content.rightIcon" v-bind="content.rightIcon"></wwElement>
        <input
            v-if="isImportMode"
            ref="fileInput"
            type="file"
            accept=".csv,text/csv"
            class="ww-button__file-input"
            @change="onFileChange"
        />
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
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
    },
    emits: [
        'update:content',
        'update:content:effect',
        'change-menu-visibility',
        'change-borders-style',
        'add-state',
        'remove-state',
        'trigger-event',
    ],
    setup(props) {
        /* wwEditor:start */
        const { createElement } = wwLib.useCreateElement();
        /* wwEditor:end */
        const {
            hasLink,
            tag: linkTag,
            properties,
        } = wwLib.wwElement.useLink({
            isDisabled: computed(() => props.content.disabled),
        });

        let importedData = null;
        let setImportedData = () => {};
        if (wwLib?.wwVariable?.useComponentVariable) {
            const variable = wwLib.wwVariable.useComponentVariable({
                uid: props.uid || props.wwElementState?.uid,
                name: 'importedData',
                type: 'object',
                defaultValue: null,
            });
            importedData = variable.value;
            setImportedData = variable.setValue;
        }
        return {
            /* wwEditor:start */
            createElement,
            /* wwEditor:end */
            hasLink,
            linkTag,
            properties,
            importedData,
            setImportedData,
        };
    },

    data() {
        return {
            isReallyFocused: false,
            isReallyActive: false,
        };
    },
    computed: {
        buttonStyle() {
            return {
                justifyContent: TEXT_ALIGN_TO_JUSTIFY[this.content['_ww-text_textAlign']] || 'center',
            };
        },
        isImportMode() {
            return (this.wwElementState?.props?.transferMode || 'export') === 'import';
        },
        isEditing() {
            /* wwEditor:start */
            return this.wwEditorState.editMode === wwLib.wwEditorHelper.EDIT_MODES.EDITION;
            /* wwEditor:end */
            // eslint-disable-next-line no-unreachable
            return false;
        },
        tag() {
            if (this.isEditing) return 'div';
            if (this.hasLink) {
                return this.linkTag;
            }
            if (
                this.content.buttonType === 'submit' ||
                this.content.buttonType === 'reset' ||
                this.content.buttonType === 'button'
            )
                return 'button';
            return 'div';
        },
        buttonType() {
            if (this.isEditing || this.hasLink) return '';
            if (
                this.content.buttonType === 'submit' ||
                this.content.buttonType === 'reset' ||
                this.content.buttonType === 'button'
            )
                return this.content.buttonType;
            return '';
        },
        text() {
            return this.wwElementState.props.text;
        },
        isFocused() {
            /* wwEditor:start */
            if (this.wwEditorState.isSelected) {
                return this.wwElementState.states.includes('focus');
            }
            /* wwEditor:end */
            return this.isReallyFocused;
        },
        isActive() {
            /* wwEditor:start */
            if (this.wwEditorState.isSelected) {
                return this.wwElementState.states.includes('active');
            }
            /* wwEditor:end */
            return this.isReallyActive;
        },
    },
    watch: {
        /* wwEditor:start */
        'content.hasRightIcon': {
            async handler(hasRightIcon) {
                if (this.wwEditorState.isACopy) {
                    return;
                }
                if (hasRightIcon && !this.content.rightIcon) {
                    const content = await this.createElement('ww-icon');
                    this.$emit('update:content:effect', { rightIcon: content });
                }
            },
        },
        'content.hasLeftIcon': {
            async handler(hasLeftIcon) {
                if (this.wwEditorState.isACopy) {
                    return;
                }
                if (hasLeftIcon && !this.content.leftIcon) {
                    const content = await this.createElement('ww-icon');
                    this.$emit('update:content:effect', { leftIcon: content });
                }
            },
        },
        /* wwEditor:end */
        'content.disabled': {
            immediate: true,
            handler(value) {
                if (value) {
                    this.$emit('add-state', 'disabled');
                } else {
                    this.$emit('remove-state', 'disabled');
                }
            },
        },
        isReallyFocused(isFocused, wasFocused) {
            if (isFocused && !wasFocused) {
                this.$emit('trigger-event', { name: 'focus' });
            } else if (!isFocused && wasFocused) {
                this.$emit('trigger-event', { name: 'blur' });
            }
        },
        isFocused: {
            immediate: true,
            handler(value) {
                if (value) {
                    this.$emit('add-state', 'focus');
                } else {
                    this.$emit('remove-state', 'focus');
                }
            },
        },
        isActive: {
            immediate: true,
            handler(value) {
                if (value) {
                    this.$emit('add-state', 'active');
                } else {
                    this.$emit('remove-state', 'active');
                }
            },
        },
    },
    methods: {
        /* wwEditor:start */
        selectParentFormContainer() {
            const parentUid = wwLib.selectParentByFlag(this.$el, 'form-container');
            if (!parentUid) {
                wwLib.wwNotification.open({
                    text: {
                        en: 'No parent form container found. Please, add this submit button into a form container.',
                        fr: 'Aucun formulaire parent trouvé. Veuillez intégrer ce bouton submit dans un form container.',
                    },
                    color: 'yellow',
                    duration: 6000,
                });
            }
        },
        /* wwEditor:end */
        onBlur() {
            this.isReallyFocused = false;
        },
        onActivate(event) {
            this.isReallyActive = true;
            // Emit the original event name
            const eventName = event.type;
            this.$emit('trigger-event', { name: eventName, event });
        },
        onDeactivate(event) {
            this.isReallyActive = false;
            // Emit the original event name
            const eventName = event.type;
            this.$emit('trigger-event', { name: eventName, event });
        },
        onTouchActivate() {
            this.isReallyActive = true;
        },
        onTouchDeactivate() {
            this.isReallyActive = false;
        },
        onMouseActivate() {
            this.isReallyActive = true;
        },
        onMouseDeactivate() {
            this.isReallyActive = false;
        },
        onKeyActivate() {
            this.isReallyActive = true;
        },
        onKeyDeactivate() {
            this.isReallyActive = false;
        },
        onKeyDown(event) {
            this.$emit('trigger-event', { name: 'keydown', event });
        },
        onKeyUp(event) {
            this.$emit('trigger-event', { name: 'keyup', event });
        },
        onClick(event) {
            if (this.isEditing) return;

            this.$emit('trigger-event', { name: 'click', event });
            if (this.content.disabled) {
                return;
            }
            if (this.isImportMode) {
                this.startImport();
            } else {
                this.handleExport();
            }
        },
        startImport() {
            if (this.content.disabled) {
                return;
            }
            const input = this.$refs.fileInput;
            if (!input) {
                this.notify('Campo de importação não disponível.');
                return;
            }
            input.click();
        },
        onFileChange(event) {
            const [file] = event?.target?.files || [];
            if (!file) {
                return;
            }

            if (!/\.csv$/i.test(file.name)) {
                this.notify('Selecione um arquivo CSV válido para importação.', 'warning');
                this.resetFileInput();
                this.$emit('trigger-event', { name: 'import-error', event: { reason: 'invalid-format' } });
                return;
            }

            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const text = e?.target?.result;
                    if (typeof text !== 'string') {
                        throw new Error('Conteúdo inválido no arquivo.');
                    }
                    this.handleImportContent(text);
                } catch (error) {
                    this.notify('Não foi possível processar o arquivo selecionado.');
                    this.$emit('trigger-event', { name: 'import-error', event: { reason: 'processing-error', error } });
                } finally {
                    this.resetFileInput();
                }
            };
            reader.onerror = () => {
                this.notify('Ocorreu um erro durante a leitura do arquivo.');
                this.resetFileInput();
                this.$emit('trigger-event', { name: 'import-error', event: { reason: 'read-error' } });
            };
            reader.readAsText(file);
        },
        handleImportContent(content) {
            const parsed = this.parseCsv(content);
            if (!parsed.headers.length) {
                this.notify('Não foram encontradas colunas no arquivo importado.');
                this.$emit('trigger-event', { name: 'import-error', event: { reason: 'missing-headers' } });
                return;
            }

            const expectedHeaders = this.getExpectedHeaders();
            if (expectedHeaders.length && !this.headersMatch(parsed.headers, expectedHeaders)) {
                this.notify('O arquivo importado não corresponde ao formato esperado.');
                this.$emit('trigger-event', {
                    name: 'import-error',
                    event: { reason: 'header-mismatch', headers: parsed.headers, expected: expectedHeaders },
                });
                return;
            }

            const jsonData = this.rowsToObjects(parsed.headers, parsed.rows);
            if (typeof this.setImportedData === 'function') {
                this.setImportedData(jsonData);
            }
            this.$emit('trigger-event', { name: 'import-success', event: { data: jsonData } });
        },
        parseCsv(content) {
            const rows = [];
            let current = '';
            let insideQuotes = false;
            let row = [];

            const pushValue = () => {
                row.push(current);
                current = '';
            };

            const pushRow = () => {
                if (row.length || current) {
                    pushValue();
                } else {
                    row.push('');
                }
                rows.push(row);
                row = [];
            };

            for (let i = 0; i < content.length; i++) {
                const char = content[i];
                if (char === '"') {
                    if (insideQuotes && content[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        insideQuotes = !insideQuotes;
                    }
                } else if (char === ',' && !insideQuotes) {
                    pushValue();
                } else if ((char === '\n' || char === '\r') && !insideQuotes) {
                    if (char === '\r' && content[i + 1] === '\n') {
                        i++;
                    }
                    pushRow();
                } else {
                    current += char;
                }
            }
            if (insideQuotes) {
                this.notify('O arquivo CSV não está formatado corretamente.');
                return { headers: [], rows: [] };
            }

            if (current || row.length) {
                pushRow();
            }

            while (rows.length && rows[rows.length - 1].every(value => value === '')) {
                rows.pop();
            }

            if (!rows.length) {
                return { headers: [], rows: [] };
            }

            const [headersRaw, ...dataRows] = rows;
            const headers = headersRaw.map(header => header.trim());
            const filteredRows = dataRows.filter(currentRow => currentRow.some(value => value !== ''));
            return { headers, rows: filteredRows };
        },
        headersMatch(headers, expected) {
            if (headers.length !== expected.length) {
                return false;
            }
            const normalizedHeaders = headers.map(header => header.trim());
            const expectedHeaders = expected.map(key => key.trim());
            return expectedHeaders.every(key => normalizedHeaders.includes(key));
        },
        rowsToObjects(headers, rows) {
            return rows.map(values => {
                const entry = {};
                headers.forEach((header, index) => {
                    entry[header.trim()] = values[index] !== undefined ? values[index] : '';
                });
                return entry;
            });
        },
        getJsonData({ notifyOnError = false } = {}) {
            const rawData = this.wwElementState?.props?.jsonData;
            if (typeof rawData === 'string') {
                if (!rawData.trim()) {
                    return null;
                }
                try {
                    return JSON.parse(rawData);
                } catch (error) {
                    if (notifyOnError) {
                        this.notify('Não foi possível interpretar o JSON informado.', 'warning');
                    }
                    return null;
                }
            }
            if (rawData && typeof rawData === 'object') {
                return rawData;
            }
            if (rawData == null) {
                return null;
            }
            if (notifyOnError) {
                this.notify('Os dados fornecidos não estão em um formato JSON válido.', 'warning');
            }
            return null;
        },
        getExpectedHeaders() {
            const data = this.getJsonData();
            if (Array.isArray(data) && data.length) {
                return this.collectHeaders(data);
            }
            if (data && typeof data === 'object' && !Array.isArray(data)) {
                return Object.keys(data);
            }
            return [];
        },
        handleExport() {
            const data = this.getJsonData({ notifyOnError: true });
            if (!data || (Array.isArray(data) && data.length === 0)) {
                this.notify('Não há dados JSON para exportar.', 'warning');
                this.$emit('trigger-event', { name: 'export-error', event: { reason: 'empty-data' } });
                return;
            }

            const arrayData = Array.isArray(data) ? data : [data];
            const headers = this.collectHeaders(arrayData);
            if (!headers.length) {
                this.notify('Não foi possível determinar as colunas para exportação.', 'warning');
                this.$emit('trigger-event', { name: 'export-error', event: { reason: 'missing-headers' } });
                return;
            }

            const csvContent = this.buildCsv(headers, arrayData);
            this.downloadCsv(csvContent, 'dados-exportados.csv');
            this.$emit('trigger-event', { name: 'export-success', event: { headers, count: arrayData.length } });
        },
        collectHeaders(dataArray) {
            const headerSet = new Set();
            dataArray.forEach(item => {
                if (item && typeof item === 'object' && !Array.isArray(item)) {
                    Object.keys(item).forEach(key => headerSet.add(key));
                }
            });
            return Array.from(headerSet);
        },
        buildCsv(headers, dataArray) {
            const csvRows = [];
            csvRows.push(headers.join(','));
            dataArray.forEach(item => {
                const row = headers.map(header => this.escapeCsvValue(item?.[header]));
                csvRows.push(row.join(','));
            });
            return csvRows.join('\n');
        },
        escapeCsvValue(value) {
            if (value === null || value === undefined) {
                return '';
            }
            const stringValue = String(value);
            if (/[",\n\r]/.test(stringValue)) {
                return '"' + stringValue.replace(/"/g, '""') + '"';
            }
            return stringValue;
        },
        downloadCsv(content, filename) {
            const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        },
        resetFileInput() {
            if (this.$refs.fileInput) {
                this.$refs.fileInput.value = '';
            }
        },
        notify(message, type = 'error') {
            if (!message) return;
            if (wwLib?.wwNotification?.open) {
                wwLib.wwNotification.open({ text: message, type, duration: 4000 });
            } else if (type === 'error') {
                console.error(message);
            } else {
                console.log(message);
            }
        },
    },
};
</script>

<style lang="scss" scoped>
.ww-button {
    justify-content: center;
    align-items: center;
    &.button {
        outline: none;
        border: none;
        background: none;
        font-family: inherit;
        font-size: inherit;
    }
    &.-link {
        cursor: pointer;
    }
}
.ww-button__file-input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    width: 0;
    height: 0;
}
</style>
