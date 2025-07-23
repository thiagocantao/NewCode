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
                en: 'Component datasource',
                fr: 'Source de données composants',
            },
            type: 'array',
            bindable: true,
            defaultValue: [],
            description: 'Array of components with Name, ID, and PhotoURL',
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
            defaultValue: 'Pesquisar componente...',
            bindable: true,
        },
        initialSelectedId: {
            label: { en: 'Initial selected component ID' },
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
        valueField: {
            label: { en: 'Value field' },
            type: 'text',
            defaultValue: 'ID',
            bindable: true,
            description: 'Nome da coluna usada como value de cada item.'
        },
        labelField: {
            label: { en: 'Label field' },
            type: 'text',
            defaultValue: 'Name',
            bindable: true,
            description: 'Nome da coluna usada como label de cada item.'
        },
        ApiURL: {
            label: { en: 'API URL' },
            type: 'text',
            defaultValue: '',
            bindable: true,
            description: 'URL da API para integração customizada.'
        },
        ApiBody: {
            label: { en: 'API Body' },
            type: 'object',
            defaultValue: {},
            bindable: true,
            description: 'Objeto para ser enviado como body em requisições customizadas.'
        },
        readOnly: {
            label: { en: 'Read only' },
            type: 'boolean',
            defaultValue: false,
            bindable: true,
            description: 'Se verdadeiro, o dropdown ficará somente leitura.'
        },
        listTitle: {
            label: { en: 'Dropdown list title' },
            type: 'text',
            defaultValue: '',
            bindable: true,
            description: 'Texto de título a ser exibido no topo da lista do dropdown, não selecionável.'
        },
    },
    events: {
        onChange: {
            label: { en: 'On Change' },
            event: 'onChange',
            value: {
                type: 'text',
                label: { en: 'Selected Component ID' }
            }
        }
    },
    triggerEvents: [
        {
            name: 'onChange',
            label: { en: 'On component changed' },
            event: { value: '' }
        }
    ],
};
