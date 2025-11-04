export default {
    editor: {
        label: {
            en: 'Query Builder',
            pt: 'Construtor de Consultas',
        },
        icon: 'query_stats',
        bubble: {
            icon: 'query_stats',
        },
        customSettingsPropertiesOrder: [
            'fieldsConfig',
            'initialQueryJson',
            'actionButtonBackgroundColor',
            'actionButtonTextColor',
            'actionButtonHoverBackgroundColor',
            'actionButtonHoverTextColor',
            'removeButtonTextColor',
        ],
    },
    properties: {
        fieldsConfig: {
            label: { en: 'Fields configuration', pt: 'Configuração de campos' },
            type: 'Array',
            section: 'settings',
            bindable: true,
            defaultValue: [
                {
                    ID: 'f014ad88-6ab1-4209-bedd-28d7b3f37c07',
                    Name: 'Assigned To',
                    Type: 'CONTROLLED_LIST',
                    DataSource: {
                        kind: 'controlled_list',
                        transform: {
                            label: 'name',
                            value: 'id',
                        },
                        functionName: 'getUsers',
                    },
                    Operators: ['=', '<>', 'IN', 'NOT_IN', 'IS_NULL', 'IS_NOT_NULL'],
                },
                {
                    ID: '0c7db984-e0e7-4caf-b660-35e1e14fcb5a',
                    Name: 'Category Level 3',
                    Type: 'CONTROLLED_LIST',
                    DataSource: {
                        kind: 'controlled_list',
                        transform: {
                            label: 'name',
                            value: 'id',
                        },
                        functionName: 'getCategoryLevel3',
                    },
                    Operators: ['=', '<>', 'IN', 'NOT_IN', 'IS_NULL', 'IS_NOT_NULL'],
                },
                {
                    ID: 'e6a7a0ff-4828-4cd4-adaf-b9e090a15eaa',
                    Name: 'Status',
                    Type: 'CONTROLLED_LIST',
                    DataSource: {
                        kind: 'controlled_list',
                        transform: {
                            label: 'name',
                            value: 'id',
                        },
                        functionName: 'getStatus',
                    },
                    Operators: ['=', '<>', 'IN', 'NOT_IN', 'IS_NULL', 'IS_NOT_NULL'],
                },
            ],
            options: {
                addable: true,
                removable: true,
                editable: true,
                item: {
                    type: 'Object',
                },
            },
            /* wwEditor:start */
            bindingValidation: {
                type: 'array',
                tooltip:
                    'Array of objects describing the available fields, including ID, Name, Type, Operators and DataSource.',
            },
            propertyHelp: {
                tooltip:
                    'Define os campos disponíveis para seleção, seus operadores permitidos e a configuração de preenchimento.',
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
            label: { en: 'Reset query', pt: 'Resetar consulta' },
            action: 'resetFilters',
        },
    ],
};
