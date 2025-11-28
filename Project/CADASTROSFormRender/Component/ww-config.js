export default {
    editor: {
        label: {
            en: 'Dynamic Form Builder'
        },
        icon: 'collection' 
    },
    properties: {
        availableFieldsTitle: {
            label: { en: 'Available Fields Title' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: 'Available Fields',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'The title to display at the top of the available fields container'
            },
            propertyHelp: {
                tooltip: 'Set the heading text for the available fields container'
            }
            /* wwEditor:end */
        },
        formBuilderTitle: {
            label: { en: 'Form Builder Title' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: 'Form Builder',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'The title to display at the top of the form builder container'
            },
            propertyHelp: {
                tooltip: 'Set the heading text for the form builder container'
            }
            /* wwEditor:end */
        },
        fieldsJson: {
            label: { en: 'Fields JSON' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'JSON string containing field definitions'
            },
            propertyHelp: {
                tooltip: 'Provide a JSON string with field definitions to load into the Field Definition container'
            }
            /* wwEditor:end */
        },
        defaultFields: {
            label: { en: 'Default Fields' },
            type: 'Array',
            section: 'settings',
            bindable: true,
            defaultValue: [
                { ID: 'f1', Name: 'Name', fieldType: 'text', columns: 2, is_mandatory: true },
                { ID: 'f2', Name: 'Email', fieldType: 'email', columns: 2 },
                { ID: 'f3', Name: 'Phone', fieldType: 'phone', columns: 1 }
            ],
            options: {
                expandable: true,
                getItemLabel(item) {
                    return item.Name || `Field ${item.ID}`;
                },
                item: {
                    type: 'Object',
                    options: {
                        item: {
                            ID: {
                                label: 'ID',
                                type: 'Text',
                                options: { placeholder: 'Unique ID' }
                            },
                            Name: {
                                label: 'Name',
                                type: 'Text',
                                options: { placeholder: 'Field name' }
                            },
                            fieldType: {
                                label: 'Field Type',
                                type: 'TextSelect',
                                options: {
                                    options: [
                                        { value: 'text', label: 'Text' },
                                        { value: 'number', label: 'Number' },
                                        { value: 'date', label: 'Date' },
                                        { value: 'memo', label: 'Memo' },
                                        { value: 'list', label: 'List' },
                                        { value: 'checkbox', label: 'Checkbox' },
                                        { value: 'email', label: 'Email' },
                                        { value: 'phone', label: 'Phone' }
                                    ]
                                }
                            },
                            columns: {
                                label: 'Columns',
                                type: 'Number',
                                options: { min: 1, max: 4 }
                            },
                            is_mandatory: {
                                label: 'Required',
                                type: 'OnOff'
                            },
                            is_readonly: {
                                label: 'Read-only',
                                type: 'OnOff'
                            },
                            is_hide_legend: {
                                label: 'Hide Legend',
                                type: 'OnOff'
                            }
                        }
                    }
                }
            },
            /* wwEditor:start */
            bindingValidation: {
                type: 'array',
                tooltip: 'Array of default field objects to display when no fields JSON is provided'
            },
            propertyHelp: {
                tooltip: 'Define default fields to show when no fields JSON is provided'
            }
            /* wwEditor:end */
        },
        formJson: {
            label: { en: 'Form JSON' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'JSON string containing form definition with sections and fields'
            },
            propertyHelp: {
                tooltip: 'Provide a JSON string with form definition to load into the Form Builder container'
            }
            /* wwEditor:end */
        },
        apiKey: {
            label: { en: 'API Key' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'API Key para autenticação nas APIs de listas'
            },
            propertyHelp: {
                tooltip: 'Informe a API Key para autenticação nas chamadas de API de listas'
            }
            /* wwEditor:end */
        },
        apiAuthorization: {
            label: { en: 'API Authorization' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Authorization header para autenticação nas APIs de listas'
            },
            propertyHelp: {
                tooltip: 'Informe o valor do header Authorization para autenticação nas chamadas de API de listas'
            }
            /* wwEditor:end */
        },
        listRequestBody: {
            label: { en: 'List request body (JSON)' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'JSON string com o body para chamadas das listas'
            },
            propertyHelp: {
                tooltip: 'Informe o JSON que deve ser enviado no body das requisições de listas'
            }
            /* wwEditor:end */
        },
        apiUrl: {
            label: { en: 'API URL' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'URL base para chamadas de API de listas'
            },
            propertyHelp: {
                tooltip: 'Informe a URL base para as chamadas de API de listas'
            }
            /* wwEditor:end */
        },
        ticketId: {
            label: { en: 'Ticket ID' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'ID do ticket a ser utilizado pelo componente'
            },
            propertyHelp: {
                tooltip: 'Informe o ID do ticket para uso no componente'
            }
            /* wwEditor:end */
        },
        language: {
            label: { en: 'Language' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Language for the form'
            },
            propertyHelp: {
                tooltip: 'Set the language for the form'
            }
            /* wwEditor:end */
        },
        companyId: {
            label: { en: 'Company ID' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Company ID for the form'
            },
            propertyHelp: {
                tooltip: 'Set the company ID for the form'
            }
            /* wwEditor:end */
        },
        userId: {
            label: { en: 'User ID' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'User ID for the form'
            },
            propertyHelp: {
                tooltip: 'Set the user ID for the form'
            }
            /* wwEditor:end */
        },
        formHeight: {
            label: { en: 'Form Height' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Height of the form container (e.g., 400px, 60vh)'
            },
            propertyHelp: {
                tooltip: 'Content above this height will scroll vertically'
            }
            /* wwEditor:end */
        },
        autoSave: {
            label: { en: 'Auto save fields' },
            type: 'boolean',
            section: 'settings',
            bindable: true,
            defaultValue: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'boolean',
                tooltip: 'Automatically persist field values when they change'
            },
            propertyHelp: {
                tooltip: 'Disable to require manual saving of field values'
            }
            /* wwEditor:end */
        },
        isReadonly: {
            label: { en: 'Read-only form' },
            type: 'OnOff',
            section: 'settings',
            bindable: true,
            defaultValue: false,
            /* wwEditor:start */
            bindingValidation: {
                type: 'boolean',
                tooltip: 'Toggle to make the entire form read-only'
            },
            propertyHelp: {
                tooltip: 'Enable to prevent editing while keeping the existing field appearance'
            }
            /* wwEditor:end */
        },
        isMobile: {
            label: { en: 'Mobile layout' },
            type: 'Responsive',
            section: 'settings',
            bindable: true,
            defaultValue: {
                value: false
            },
            options: {
                property: {
                    type: 'OnOff',
                    defaultValue: false
                }
            },
            /* wwEditor:start */
            bindingValidation: {
                type: 'boolean',
                tooltip: 'Toggle mobile layout with single-column fields'
            },
            propertyHelp: {
                tooltip: 'Enable to display each field on its own row for mobile layouts'
            }
            /* wwEditor:end */
        }
    },
    triggerEvents: [
        {
            name: 'fieldsUpdated',
            label: { en: 'On fields updated' },
            event: { value: [] }
        },
        {
            name: 'formUpdated',
            label: { en: 'On form updated' },
            event: { value: {} }
        },
        {
            name: 'fieldsJsonGenerated',
            label: { en: 'On fields JSON generated' },
            event: { value: '' }
        },
        {
            name: 'formJsonGenerated',
            label: { en: 'On form JSON generated' },
            event: { value: '' }
        },
        {
            name: 'importFieldsRequested',
            label: { en: 'On import fields requested' },
            event: { value: true }
        },
        {
            name: 'importFormRequested',
            label: { en: 'On import form requested' },
            event: { value: true }
        }
    ],
    actions: [
        {
            action: 'importFieldsFromJsonData',
            label: { en: 'Import fields from JSON' },
            args: [
                {
                    name: 'jsonData',
                    type: 'string',
                    label: { en: 'JSON Data' }
                }
            ]
        },
        {
            action: 'importFormFromJsonData',
            label: { en: 'Import form from JSON' },
            args: [
                {
                    name: 'jsonData',
                    type: 'string',
                    label: { en: 'JSON Data' }
                }
            ]
        },
        {
            action: 'validateRequiredFields',
            label: { en: 'Validate required fields' },
            args: []
        }
    ]
};