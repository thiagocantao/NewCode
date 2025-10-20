export default {
  options: {
    lazyHydrate: true,
    linkable: true,
  },
  inherit: [{ type: 'ww-layout' }, { type: 'ww-background-video' }],
  editor: {
    label: {
      en: 'Banner',
      pt: 'Banner',
    },
    icon: 'image',
    bubble: {
      icon: 'image',
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
