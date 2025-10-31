export default {
    editor: {
        label: {
            en: 'Fields Criteria',
        },
        icon: 'filter',
        bubble: {
            icon: 'filter',
        },
        customSettingsPropertiesOrder: [
            'fields',
            'initialQueryJson',
            'actionButtonBackgroundColor',
            'actionButtonTextColor',
            'actionButtonHoverBackgroundColor',
            'actionButtonHoverTextColor',
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
        initialQueryJson: {
            label: { en: 'Initial query JSON' },
            type: 'Object',
            section: 'settings',
            bindable: true,
            defaultValue: null,
            /* wwEditor:start */
            bindingValidation: {
                type: ['string', 'object'],
                tooltip: 'JSON structure matching the public queryJson variable used to seed the builder.',
            },
            propertyHelp: {
                tooltip:
                    'Optional JSON payload mirroring the queryJson variable. Accepts either an object or JSON string.',
            },
            /* wwEditor:end */
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
        actionButtonHoverBackgroundColor: {
            label: { en: 'Action button hover background' },
            type: 'Color',
            section: 'style',
            defaultValue: '#1d4ed8',
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                cssSupports: 'color',
                type: 'string',
                tooltip: 'CSS color value applied to the “Add” buttons background when hovered.',
            },
            /* wwEditor:end */
        },
        actionButtonHoverTextColor: {
            label: { en: 'Action button hover text' },
            type: 'Color',
            section: 'style',
            defaultValue: '#ffffff',
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                cssSupports: 'color',
                type: 'string',
                tooltip: 'CSS color value applied to the “Add” buttons text when hovered.',
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
    actions: [
        {
            label: { en: 'Reset filters', pt: 'Resetar filtros' },
            action: 'resetFilters',
        },
    ],
};
