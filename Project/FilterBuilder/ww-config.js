export default {
    editor: {
        label: {
            en: 'Filter Builder',
        },
        icon: 'filter',
        bubble: {
            icon: 'filter',
        },
        customSettingsPropertiesOrder: ['fields'],
    },
    properties: {
        fields: {
            label: { en: 'Available fields' },
            type: 'Array',
            section: 'settings',
            bindable: true,
            defaultValue: ['Body', 'Subject', 'To', 'From'],
            options: {
                addable: true,
                removable: true,
                editable: true,
                item: {
                    type: 'Text',
                    options: {
                        placeholder: 'Field name',
                    },
                },
            },
            /* wwEditor:start */
            bindingValidation: {
                type: 'array',
                tooltip: 'Array of field names (e.g. ["Body", "Subject"])',
            },
            propertyHelp: {
                tooltip: 'List of fields that can be used when defining filter conditions',
            },
            /* wwEditor:end */
        },
        rootGroup: {
            type: 'Object',
            hidden: true,
            defaultValue: null,
        },
    },
};
