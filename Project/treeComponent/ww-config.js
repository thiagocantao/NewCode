export default {
    options: {
        lazyHydrate: true,
        displayAllowedValues: () => ['flex', 'block', 'inline-flex', 'inline-block'],
    },
    inherit: [],
    editor: {
        label: {
            en: 'Tree file manager',
        },
        icon: 'account_tree',
        bubble: {
            icon: 'account_tree',
        },
    },
    actions: [
        {
            label: { en: 'Select node by ID' },
            action: 'selectNodeById',
            args: [
                {
                    name: 'id',
                    type: 'text',
                    label: { en: 'Node ID' },
                },
            ],
        },
    ],
    properties: {
        data: {
            label: { en: 'JSON data source' },
            type: 'array',
            bindable: true,
            defaultValue: [],
        },
        labelField: {
            label: { en: 'Label field' },
            type: 'text',
            bindable: true,
            defaultValue: 'label',
        },
        idField: {
            label: { en: 'ID field' },
            type: 'text',
            bindable: true,
            defaultValue: 'id',
        },
        parentIdField: {
            label: { en: 'Parent ID field' },
            type: 'text',
            bindable: true,
            defaultValue: 'parentId',
        },
        iconField: {
            label: { en: 'Icon field (Material Symbols name)' },
            type: 'text',
            bindable: true,
            defaultValue: '',
        },
        deleteVisibleField: {
            label: { en: 'Delete visibility field' },
            type: 'text',
            bindable: true,
            defaultValue: '',
        },
        typeField: {
            label: { en: 'Type field' },
            type: 'text',
            bindable: true,
            defaultValue: 'type',
        },
        allowedChildrenTypes: {
            label: { en: 'Types allowed to have children (JSON: {"folder", "link"})' },
            type: 'text',
            bindable: true,
            defaultValue: '',
        },
        width: {
            label: { en: 'Width' },
            type: 'text',
            bindable: true,
            defaultValue: '100%',
        },
        height: {
            label: { en: 'Height' },
            type: 'text',
            bindable: true,
            defaultValue: '420px',
        },
        fontSize: {
            label: { en: 'Tree font size' },
            type: 'text',
            bindable: true,
            defaultValue: '14px',
        },
        iconButtonBackground: {
            label: { en: 'Icon button background' },
            type: 'text',
            bindable: true,
            defaultValue: '#f1f3f5',
        },
        iconButtonHoverBackground: {
            label: { en: 'Icon button hover background' },
            type: 'text',
            bindable: true,
            defaultValue: '#e2e6ea',
        },
        iconButtonColor: {
            label: { en: 'Icon button color' },
            type: 'text',
            bindable: true,
            defaultValue: '#263238',
        },
        iconButtonHoverColor: {
            label: { en: 'Icon button hover color' },
            type: 'text',
            bindable: true,
            defaultValue: '#0d6efd',
        },
        toggleButtonBackground: {
            label: { en: 'Collapse/expand button background' },
            type: 'text',
            bindable: true,
            defaultValue: 'transparent',
        },
        toggleButtonColor: {
            label: { en: 'Collapse/expand button icon color' },
            type: 'text',
            bindable: true,
            defaultValue: '#6c757d',
        },
        searchPlaceholder: {
            label: { en: 'Search placeholder' },
            type: 'text',
            bindable: true,
            defaultValue: 'Search...',
        },
        highlightColor: {
            label: { en: 'Search highlight color' },
            type: 'text',
            bindable: true,
            defaultValue: '#fff3bf',
        },
        selectedItemBackground: {
            label: { en: 'Selected/hover item background' },
            type: 'text',
            bindable: true,
            defaultValue: '#e7f1ff',
        },
        maxLevel: {
            label: { en: 'Max level' },
            type: 'number',
            bindable: true,
            defaultValue: 99,
        },
    },
    triggerEvents: [
        {
            name: 'onToolbarAdd',
            label: { en: 'On top add clicked' },
            event: { value: { parentId: null } },
        },
        {
            name: 'onAdd',
            label: { en: 'On add child clicked' },
            event: { value: { parentId: null } },
        },
        {
            name: 'onNodeClick',
            label: { en: 'On node clicked' },
            event: { value: { id: null, parentId: null, label: '' } },
        },
        {
            name: 'onRename',
            label: { en: 'On rename clicked' },
            event: { value: null },
        },
        {
            name: 'onDelete',
            label: { en: 'On delete clicked' },
            event: { value: null },
        },
    ],
};
