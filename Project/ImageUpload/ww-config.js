export default {
  options: {
    lazyHydrate: true,
    linkable: true,
  },
  inherit: [{ type: 'ww-layout' }, { type: 'ww-background-video' }],
  editor: {
    label: {
      en: 'Image upload',
      pt: 'Envio de imagem',
    },
    icon: 'attach_file',
    bubble: {
      icon: 'attach_file',
    },
  },
  properties: {
    imageUrl: {
      label: {
        en: 'Image URL',
        pt: 'URL da imagem',
      },
      type: 'Text',
      bindable: true,
      defaultValue: '',
    },
    imageHeight: {
      label: {
        en: 'Image height',
        pt: 'Altura da imagem',
      },
      type: 'Select',
      bindable: true,
      defaultValue: 'medium',
      options: {
        options: [
          {
            label: { en: 'Small (150px)', pt: 'Pequena (150px)' },
            value: 'small',
          },
          {
            label: { en: 'Medium (200px)', pt: 'Média (200px)' },
            value: 'medium',
          },
          {
            label: { en: 'Large (300px)', pt: 'Grande (300px)' },
            value: 'large',
          },
        ],
      },
    },
    iconName: {
      label: {
        en: 'Icon name (Material Symbols)',
        pt: 'Nome do ícone (Material Symbols)',
      },
      type: 'Text',
      bindable: true,
      defaultValue: 'attach_file',
    },
    iconColor: {
      label: {
        en: 'Icon color',
        pt: 'Cor do ícone',
      },
      type: 'Color',
      bindable: true,
      defaultValue: '#475569',
    },
    iconSize: {
      label: {
        en: 'Icon size (px)',
        pt: 'Tamanho do ícone (px)',
      },
      type: 'Number',
      bindable: true,
      defaultValue: 32,
      options: {
        min: 8,
        max: 128,
        step: 1,
      },
    },
  },
  events: {
    onUpload: {
      label: { en: 'On image upload', pt: 'Ao enviar imagem' },
      event: 'onUpload',
      value: {
        type: 'object',
        label: { en: 'Upload payload' },
      },
    },
  },
  triggerEvents: [
    {
      name: 'onUpload',
      label: { en: 'On image upload' },
      event: {
        value: {
          bucket: '',
          storagePath: '',
          signedUrl: '',
          file: null,
        },
      },
    },
  ],
  actions: [{ label: { en: 'Remount component', pt: 'Remontar componente' }, action: 'remount' }],
};
