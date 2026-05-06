export default {
    inherit: 'ww-text',
    options: {
        autoByContent: true,
        displayAllowedValues: ['flex', 'inline-flex'],
        linkable: true,
    },
    editor: {
        label: { en: 'Import Spreadsheet', pt: 'Importar Planilha' },
        icon: 'upload',
    },
    states: ['focus', 'disabled', 'active'],
    triggerEvents: [
        { name: 'click', label: { en: 'On click' }, event: null },
        { name: 'keydown', label: { en: 'On key down' }, event: null },
        { name: 'keyup', label: { en: 'On key up' }, event: null },
        { name: 'import-success', label: { en: 'On import success' }, event: null },
        { name: 'import-error', label: { en: 'On import error' }, event: null },
    ],
    properties: {
        disabled: {
            label: { en: 'Disabled' },
            type: 'OnOff',
            section: 'settings',
            defaultValue: false,
            bindable: true,
        },
        hasLeftIcon: { label: { en: 'Left icon' }, section: 'settings', type: 'OnOff' },
        leftIcon: { hidden: true, isArray: false },
        hasRightIcon: { label: { en: 'Right icon' }, type: 'OnOff', section: 'settings' },
        rightIcon: { hidden: true, isArray: false },
    },
};
