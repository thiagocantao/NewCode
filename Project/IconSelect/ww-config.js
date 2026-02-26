export default {
    editor: {
        label: {
            en: 'Icon selector',
        },
        icon: 'apps',
    },
    properties: {
        availableIcons: {
            label: {
                en: 'Available icons (1 per line)',
            },
            type: 'Textarea',
            defaultValue: `support
help
help_center
contact_support
live_help
forum
question_answer
chat`,
            bindable: true,
        },
        selectedIcon: {
            label: {
                en: 'Selected icon',
            },
            type: 'Text',
            defaultValue: '',
            bindable: true,
            readonly: true,
        },
    },
};
