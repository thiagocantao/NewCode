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
                attachmentsHtml: '',
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
        sendButtonBackgroundColor: {
            label: { en: 'Send button background' },
            type: 'Color',
            bindable: true,
        },
        sendIconColor: { label: { en: 'Send icon color' }, type: 'Color', bindable: true },
        addIconColor: { label: { en: 'Add icon color' }, type: 'Color', bindable: true },
    },
};
