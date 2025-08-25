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
        userDatasource: {
            label: {
                en: 'User datasource',
                fr: 'Source de données utilisateurs',
            },
            type: 'array',
            bindable: true,
            defaultValue: [],
            description: 'Array of users with Name, ID, and PhotoURL',
        },
        groupBy: {
            label: { en: 'Group by column' },
            type: 'ObjectPropertyPath',
            options: content => ({ object: content.userDatasource?.[0] || {} }),
            defaultValue: '',
            bindable: true,
            description: 'Property name used to group users in the dropdown',
        },
        valueColumn: {
            label: { en: 'Value column' },
            type: 'ObjectPropertyPath',
            options: content => ({ object: content.userDatasource?.[0] || {} }),
            defaultValue: 'userID',
            bindable: true,
            description: 'Property used as the value for each option',
        },
        labelColumn: {
            label: { en: 'Label column' },
            type: 'ObjectPropertyPath',
            options: content => ({ object: content.userDatasource?.[0] || {} }),
            defaultValue: 'Username',
            bindable: true,
            description: 'Property used as the display label for each option',
        },
        nameFontFamily: {
            label: { en: 'Name font family' },
            type: 'text',
            defaultValue: 'inherit',
            bindable: true,
        },
        nameFontSize: {
            label: { en: 'Name font size' },
            type: 'text',
            defaultValue: '15px',
            bindable: true,
        },
        nameFontWeight: {
            label: { en: 'Name font weight' },
            type: 'text',
            defaultValue: '500',
            bindable: true,
        },
        initialFontFamily: {
            label: { en: 'Initial font family' },
            type: 'text',
            defaultValue: 'inherit',
            bindable: true,
        },
        initialFontSize: {
            label: { en: 'Initial font size' },
            type: 'text',
            defaultValue: '15px',
            bindable: true,
        },
        initialFontWeight: {
            label: { en: 'Initial font weight' },
            type: 'text',
            defaultValue: '400',
            bindable: true,
        },
        inputFontFamily: {
            label: { en: 'Input font family' },
            type: 'text',
            defaultValue: 'inherit',
            bindable: true,
        },
        inputFontSize: {
            label: { en: 'Input font size' },
            type: 'text',
            defaultValue: '15px',
            bindable: true,
        },
        inputFontWeight: {
            label: { en: 'Input font weight' },
            type: 'text',
            defaultValue: '500',
            bindable: true,
        },
        unassignedLabel: {
            label: { en: 'Unassigned label' },
            type: 'text',
            defaultValue: 'Não atribuído',
            bindable: true,
        },
        searchPlaceholder: {
            label: { en: 'Search placeholder' },
            type: 'text',
            defaultValue: 'Pesquisar usuário...',
            bindable: true,
        },
        initialSelectedId: {
            label: { en: 'Initial selected user ID' },
            type: 'text',
            defaultValue: '',
            bindable: true,
        },
        initialGroupId: {
            label: { en: 'Initial group ID' },
            type: 'text',
            defaultValue: '',
            bindable: true,
        },
        maxWidth: {
            label: { en: 'Max width' },
            type: 'text',
            defaultValue: '',
            bindable: true,
            description: 'Maximum width for the selector button (e.g., 150px, 10em, 100%)',
        },
        TableToSave: {
            label: { en: 'Table to Save' },
            type: 'text',
            defaultValue: '',
            bindable: true,
        },
        ColumnToSave: {
            label: { en: 'Column to Save' },
            type: 'text',
            defaultValue: '',
            bindable: true,
        },
        SupabaseFilterQuery: {
            label: { en: 'Supabase Filter Query' },
            type: 'text',
            defaultValue: '',
            bindable: true,
            description: 'Query string para filtrar o registro a ser atualizado, ex: id=eq.123 ou email=eq.teste@email.com',
        },
        SupabaseApiUrl: {
            label: { en: 'Supabase API URL' },
            type: 'text',
            defaultValue: '',
            bindable: true,
        },
        SupabaseApiKey: {
            label: { en: 'Supabase API Key' },
            type: 'text',
            defaultValue: '',
            bindable: true,
        },
        SupabaseAuthToken: {
            label: { en: 'Supabase Auth Token' },
            type: 'text',
            defaultValue: '',
            bindable: true,
        },
    },
    events: {
        onChange: {
            label: { en: 'On Change' },
            event: 'onChange',
            value: {
                type: 'text',
                label: { en: 'Selected User ID' }
            }
        }
    },
    triggerEvents: [
        {
            name: 'onChange',
            label: { en: 'On user changed' },
            event: { value: '' }
        }
    ],
};
