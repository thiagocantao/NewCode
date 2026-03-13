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
            en: 'Anexos genérico',
            pt: 'Anexos genérico',
        },
        icon: 'attach_file',
        bubble: {
            icon: 'attach_file',
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
            hidden: (content, sidePanelContent, boundProps, wwProps) => !!(wwProps && wwProps.isFixed) || wwProps.noDropzone,
            bindable: 'repeatable',
            defaultValue: [],
            /* wwEditor:start */
            bindingValidation: {
                validations: [{ type: 'array' }, { type: 'object' }],
                tooltip: 'A collection or an array of data.',
            },
            /* wwEditor:end */
        },
        dataSource: {
            label: { en: 'Data Source', pt: 'Fonte de dados' },
            type: 'array',
            bindable: true,
            defaultValue: [],
            /* wwEditor:start */
            bindingValidation: { validations: [{ type: 'array' }] },
            /* wwEditor:end */
        },
        objectId: {
            label: { en: 'Associated object ID', pt: 'ID do objeto associado' },
            type: 'Text',
            bindable: true,
            defaultValue: '',
        },
        bucketName: {
            label: { en: 'Bucket name', pt: 'Nome do bucket' },
            type: 'Text',
            bindable: true,
            defaultValue: 'ticket',
        },
        thumbnailHeight: {
            label: {
                en: 'Thumbnail height (px)',
                pt: 'Altura das miniaturas (px)',
            },
            type: 'Number',
            options: {
                min: 40,
                max: 400,
                step: 5,
            },
            bindable: true,
            defaultValue: 130,
        },
    },
    triggerEvents: [
        {
            name: 'onInsert',
            label: { en: 'On insert', pt: 'Ao inserir' },
            event: { value: {} },
        },
        {
            name: 'onDelete',
            label: { en: 'On delete', pt: 'Ao excluir' },
            event: { value: {} },
        },
        {
            name: 'onEdit',
            label: { en: 'On edit', pt: 'Ao editar' },
            event: { value: {} },
        },
    ],
    actions: [
        { label: { en: 'Remount component', pt: 'Remontar componente' }, action: 'remount' },
        {
            label: { en: 'Insert attachment action', pt: 'Ação de inserir anexo' },
            action: 'runInsertAction',
            args: [
                { name: 'functionName', type: 'text', label: { en: 'Supabase function name', pt: 'Nome da função Supabase' } },
                { name: 'body', type: 'object', label: { en: 'Function body', pt: 'Body da função' } },
            ],
        },
        {
            label: { en: 'Delete attachment action', pt: 'Ação de excluir anexo' },
            action: 'runDeleteAction',
            args: [
                { name: 'functionName', type: 'text', label: { en: 'Supabase function name', pt: 'Nome da função Supabase' } },
                { name: 'body', type: 'object', label: { en: 'Function body', pt: 'Body da função' } },
            ],
        },
        {
            label: { en: 'Edit attachment action', pt: 'Ação de editar anexo' },
            action: 'runEditAction',
            args: [
                { name: 'functionName', type: 'text', label: { en: 'Supabase function name', pt: 'Nome da função Supabase' } },
                { name: 'body', type: 'object', label: { en: 'Function body', pt: 'Body da função' } },
            ],
        },
    ],
};
