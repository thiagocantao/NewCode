export default {
    editor: {
        label: {
            en: 'Chat Input',
            pt: 'Chat Input',
        },
        icon: 'message',
        category: 'Inputs',
    },
    triggerEvents: [
        {
            name: 'onSend',
            label: { en: 'On send' },
            event: {
                message: '',
                attachments: [],
                json: '',
            },
        },
    ],
    options: {
        displayAllowedValues: ['block', 'flex', 'inline-flex'],
    },
    properties: {
        placeholder: { label: { en: 'Placeholder' }, type: 'Text', bindable: true },
        initialValue: { label: { en: 'Initial value' }, type: 'Text', bindable: true },
        readonly: { label: { en: 'Readonly' }, type: 'OnOff', bindable: true },
        accept: { label: { en: 'Accepted files' }, type: 'Text', bindable: true },
    },
};
