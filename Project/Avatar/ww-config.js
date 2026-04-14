export default {
    editor: {
        label: 'Avatar',
        icon: 'user',
        bubble: { icon: 'user' },
        customSettingsPropertiesOrder: ['NameValue', 'initialValue'],
        customStylePropertiesOrder: [
            {
                label: 'Avatar',
                isCollapsible: true,
                properties: ['initialLetterColor', 'avatarBackgroundColor', 'avatarBorderColor'],
            },
        ],
    },
    options: {
        displayAllowedValues: ['flex', 'inline-flex', 'block'],
    },
    triggerEvents: [
        {
            name: 'change',
            label: { en: 'On file selected' },
            event: { file: null },
            default: true,
        },
    ],
    properties: {
        NameValue: {
            label: { en: 'NameValue' },
            type: 'Text',
            section: 'settings',
            defaultValue: '',
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Text used for hint and first-letter fallback.',
            },
            /* wwEditor:end */
        },
        initialValue: {
            label: { en: 'Initial Value (image url or null)' },
            type: 'Text',
            section: 'settings',
            defaultValue: null,
            bindable: true,
            options: {
                nullable: true,
            },
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'When filled, must be an image URL shown inside the avatar.',
            },
            /* wwEditor:end */
        },
        initialLetterColor: {
            label: { en: 'Initial letter color' },
            type: 'Color',
            section: 'style',
            defaultValue: '#FFFFFF',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
        },
        avatarBackgroundColor: {
            label: { en: 'Avatar background color' },
            type: 'Color',
            section: 'style',
            defaultValue: 'rgba(1, 48, 157, 0.635)',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
        },
        avatarBorderColor: {
            label: { en: 'Avatar border color' },
            type: 'Color',
            section: 'style',
            defaultValue: '#FFFFFF',
            bindable: true,
            classes: true,
            states: true,
            responsive: true,
        },
    },
};
