export default { 
    editor: {
    label: {
    en: 'Dynamic Form Builder Cadastros'
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
    showCabecalhoFormBuilder: {
        label: { en: 'Show Form Header' },
        type: 'OnOff',
        section: 'settings',
        bindable: true,
        defaultValue: true,
    /* wwEditor:start */
    bindingValidation: {
    type: 'boolean',
    tooltip: 'Show or hide the form builder header section'
    },
        propertyHelp: {
        tooltip: 'Toggle visibility of the header area above the form builder'
        }
        /* wwEditor:end */
        },
        cabecalhoHtml: {
            label: { en: 'Header HTML' },
            type: 'Text',
            section: 'settings',
            bindable: true,
            defaultValue: '',
            /* wwEditor:start */
            bindingValidation: {
            type: 'string',
            tooltip: 'HTML content to display inside the form header'
            },
            propertyHelp: {
            tooltip: 'Custom HTML markup for the header area of the form builder'
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
    }
    ]
    };
