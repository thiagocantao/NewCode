export default {
    editor: {
        label: {
            en: 'Icon selector',
        },
        icon: 'apps',
    },
    properties: {
        availableIcons: {
            label: {
                en: 'Json available icons',
            },
            type: 'Textarea',
            defaultValue: `[
  { "name": "support", "label": "Support", "category": "suporte" },
  { "name": "help", "label": "Help", "category": "suporte" },
  { "name": "help_center", "label": "Help Center", "category": "suporte" },
  { "name": "contact_support", "label": "Contact Support", "category": "suporte" },
  { "name": "live_help", "label": "Live Help", "category": "suporte" },
  { "name": "forum", "label": "Forum", "category": "suporte" },
  { "name": "question_answer", "label": "Question Answer", "category": "suporte" },
  { "name": "chat", "label": "Chat", "category": "suporte" }
]`,
            bindable: true,
        },
        currentSelectedItem: {
            label: {
                en: 'Current selected item',
            },
            type: 'Text',
            defaultValue: '',
            bindable: true,
            readonly: true,
        },
        selectedIcon: {
            label: {
                en: 'Selected icon',
            },
            type: 'Text',
            defaultValue: '',
            bindable: true,
            readonly: true,
        },
    },
};
