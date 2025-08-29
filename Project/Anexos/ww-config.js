export default {
    options: {
        lazyHydrate: true,
        displayAllowedValues: (content, wwProps) => wwProps?.overrideDisplayValues ?? [
            'flex',
            'block',
            'grid',
            'table-cell',
            'table-row',
            'table-header-group',
            'inline-flex',
            'inline-block',
            'inline-grid',
        ],
        linkable: true, 
    },
    inherit: [{ type: 'ww-layout' }, { type: 'ww-background-video' }],
    editor: {
        label: {
            en: 'Flexbox',
        },
        icon: 'border',
        bubble: {
            icon: 'border',
        },
        customStylePropertiesOrder: ['children'],
    },
    properties: {
        children: {
            label: {
                en: 'Items',
                fr: 'Items',
            },
            type: 'Repeat',
            options: {
                text: { en: 'Elements to repeat' },
            },
            hidden: (content, sidePanelContent, boundProps, wwProps) => !!(wwProps && wwProps.isFixed) || wwProps.noDropzone,
            bindable: 'repeatable',
            defaultValue: [],
            /* wwEditor:start */
            bindingValidation: {
                validations: [
                    {
                        type: 'array',
                    },
                    {
                        type: 'object',
                    },
                ],
                tooltip:
                    'A collection or an array of data: \n\n`myCollection` or `[{}, {}, ...] || ["string1", "string2", ...] || [1, 2, ...]`',
            },
            /* wwEditor:end */
        },
        dataSource: {
            label: {
                en: 'Data Source',
            },
            type: 'array',
            bindable: true,
            defaultValue: [],
            /* wwEditor:start */
            bindingValidation: {
                validations: [
                    {
                        type: 'array',
                    },
                ],
            },
            /* wwEditor:end */
        },
    },
    events: {
        onUpload: {
            label: { en: 'On Upload' },
            event: 'onUpload',
            value: {
                type: 'object',
                label: { en: 'Uploaded file data' },
            },
        },
    },
    triggerEvents: [
        {
            name: 'onUpload',
            label: { en: 'On file uploaded' },
            event: {
                value: {
                    p_action: '',
                    p_workspace_id: '',
                    p_ticket_id: '',
                    p_LoggerUserID: '',
                    p_filename: '',
                    p_fileextension: '',
                    p_filesize: 0,
                    p_bucket: '',
                    p_objectpath: '',
                    p_attachment_id: '',
                    file: null,
                },
            },
        },
    ],
};
