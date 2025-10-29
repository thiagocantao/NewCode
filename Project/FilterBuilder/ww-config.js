export default {
    editor: {
        label: {
            en: 'Filter Builder',
        },
        icon: 'filter',
        bubble: {
            icon: 'filter',
        },
        customSettingsPropertiesOrder: [
            'fields',
            'actionButtonBackgroundColor',
            'actionButtonTextColor',
            'removeButtonTextColor',
        ],
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
        actionButtonBackgroundColor: {
            label: { en: 'Action button background' },
            type: 'Color',
            section: 'style',
            defaultValue: '#2563eb',
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                cssSupports: 'color',
                type: 'string',
                tooltip: 'CSS color value applied to the “Add” buttons background.',
            },
            /* wwEditor:end */
        },
        actionButtonTextColor: {
            label: { en: 'Action button text' },
            type: 'Color',
            section: 'style',
            defaultValue: '#ffffff',
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                cssSupports: 'color',
                type: 'string',
                tooltip: 'CSS color value applied to the “Add” buttons text.',
            },
            /* wwEditor:end */
        },
        removeButtonTextColor: {
            label: { en: 'Remove button text' },
            type: 'Color',
            section: 'style',
            defaultValue: '#ef4444',
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                cssSupports: 'color',
                type: 'string',
                tooltip: 'CSS color value applied to the “Remove” buttons text.',
            },
            /* wwEditor:end */
        },
    },
};
