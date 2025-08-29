export default {
  inherit: {
    type: "ww-layout",
  },
  editor: {
    label: {
      en: "Timeline",
    },
    icon: "history",
    customStylePropertiesOrder: [
      [
        "markerStyle",
        "markerShape",
        "markerSize",
        "markerBackgroundColor",
        "markerIconOnOff",
        "markerIcon",
        "markerIconColor",
        "markerIconSize",
      ],
      [
        "timelineStyle",
        "connectorColor",
        "connectorWidth",
        "timelineLayout",
        "eventsAlignment",
      ],
    ],
    customSettingsPropertiesOrder: [["dataSource", "data"]],
  },
  properties: {
    // Marker styling
    markerStyle: {
      type: "Title",
      label: { en: "Marker Style" },
      section: "style",
      editorOnly: true,
    },
    markerShape: {
      label: { en: "Marker Shape" },
      type: "TextRadioGroup",
      section: "style",
      bindable: true,
      responsive: true,
      classes: true,
      defaultValue: "circle",
      options: {
        choices: [
          { value: "circle", title: "Circle", icon: "16/circle-info" },
          { value: "square", title: "Square", icon: "16/minus" },
        ],
      },
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip:
          'The shape of the timeline markers: circle or square\n\nEither "circle" or "square"',
      },
      /* wwEditor:end */
    },
    markerIconOnOff: {
      label: { en: "Show Icon" },
      type: "OnOff",
      section: "style",
      bindable: true,
      responsive: true,
      classes: true,
      defaultValue: false,
      /* wwEditor:start */
      bindingValidation: {
        type: "boolean",
        tooltip:
          "Toggle marker icon visibility\n\nBoolean (either true or false)",
      },
      /* wwEditor:end */
    },
    markerIcon: {
      label: { en: "Marker Icon" },
      type: "SystemIcon",
      section: "style",
      bindable: true,
      responsive: true,
      classes: true,
      defaultValue: null,
      hidden: (content) => !content.markerIconOnOff,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip:
          'The icon to display in timeline markers\n\nString (icon name like "home", "calendar")',
      },
      /* wwEditor:end */
    },
    markerIconColor: {
      label: { en: "Marker Icon Color" },
      type: "Color",
      section: "style",
      bindable: true,
      responsive: true,
      classes: true,
      defaultValue: "#FFFFFF",
      hidden: (content) => !content.markerIconOnOff,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip:
          'The color of the icon in timeline markers\n\nColor string (e.g., "#FFFFFF", "rgba(255,255,255,0.5)")',
      },
      /* wwEditor:end */
    },
    markerIconSize: {
      label: { en: "Marker Icon Size" },
      type: "Length",
      section: "style",
      bindable: true,
      responsive: true,
      classes: true,
      defaultValue: "12px",
      hidden: (content) => !content.markerIconOnOff,
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip:
          'The size (width and height) of the icon in timeline markers\n\nLength in pixels (e.g., "12px")',
      },
      /* wwEditor:end */
    },
    markerSize: {
      label: { en: "Marker Size" },
      type: "Length",
      section: "style",
      bindable: true,
      responsive: true,
      classes: true,
      defaultValue: "16px",
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip:
          'The size (width and height) of timeline markers\n\nLength in pixels (e.g., "16px")',
      },
      /* wwEditor:end */
    },
    markerBackgroundColor: {
      label: { en: "Marker Background" },
      type: "Color",
      section: "style",
      bindable: true,
      responsive: true,
      classes: true,
      defaultValue: "#4B5563",
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip:
          'The background color of timeline markers\n\nColor string (e.g., "#4B5563", "rgba(75,85,99,0.8)")',
      },
      /* wwEditor:end */
    },

    // Timeline styling
    timelineStyle: {
      type: "Title",
      label: { en: "Timeline Style" },
      section: "style",
      editorOnly: true,
    },
    connectorColor: {
      label: { en: "Connector Color" },
      type: "Color",
      section: "style",
      bindable: true,
      responsive: true,
      classes: true,
      defaultValue: "#E5E7EB",
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip:
          'The color of the timeline connector line\n\nColor string (e.g., "#E5E7EB", "rgba(229,231,235,0.5)")',
      },
      /* wwEditor:end */
    },
    connectorWidth: {
      label: { en: "Connector Width" },
      type: "Length",
      section: "style",
      bindable: true,
      responsive: true,
      classes: true,
      defaultValue: "2px",
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip:
          'The width of the timeline connector line\n\nLength in pixels (e.g., "2px")',
      },
      /* wwEditor:end */
    },
    timelineLayout: {
      label: { en: "Layout" },
      type: "TextRadioGroup",
      section: "style",
      bindable: true,
      responsive: true,
      classes: true,
      defaultValue: "vertical",
      options: {
        choices: [
          { value: "vertical", title: "Vertical", icon: "type-rows" },
          { value: "horizontal", title: "Horizontal", icon: "type-columns" },
        ],
      },
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip:
          'The layout orientation of the timeline\n\nEither "vertical" or "horizontal"',
      },
      /* wwEditor:end */
    },
    eventsAlignment: {
      label: { en: "Events Alignment" },
      type: "TextRadioGroup",
      section: "style",
      bindable: true,
      responsive: true,
      classes: true,
      defaultValue: "left",
      options: (content) => {
        if (content.timelineLayout === "vertical") {
          return {
            choices: [
              { value: "left", title: "Left", icon: "16/alignment-left" },
              { value: "right", title: "Right", icon: "16/alignment-right" },
              {
                value: "alternate",
                title: "Alternate",
                icon: "16/alignment-justify",
              },
            ],
          };
        } else {
          return {
            choices: [
              { value: "top", title: "Top", icon: "16/arrow-top" },
              { value: "bottom", title: "Bottom", icon: "16/arrow-bottom" },
            ],
          };
        }
      },
      /* wwEditor:start */
      bindingValidation: {
        type: "string",
        tooltip:
          'The alignment of timeline events\n\nFor vertical: "left", "right", or "alternate"\nFor horizontal: "top" or "bottom"',
      },
      /* wwEditor:end */
    },

    dataSource: {
      label: { en: "Data Source" },
      type: "Text",
      section: "settings",
      bindable: true,
      defaultValue: "",
      /* wwEditor:start */
      bindingValidation: {
        validations: [
          { type: "array" },
          { type: "string" },
          { type: "object" },
        ],
        tooltip: "JSON array or string to initialize timeline data",
      },
      /* wwEditor:end */
    },

    data: {
      label: { en: "Timeline Data" },
      type: "ObjectList",
      options: {
        useSchema: true,
      },
      section: "settings",
      bindable: true,
      defaultValue: [],
      /* wwEditor:start */
      bindingValidation: {
        validations: [
          {
            type: "array",
          },
          {
            type: "object",
          },
        ],
        tooltip:
          "A collection or an array of data: \n\n`myCollection` or `[{}, {}, ...]`",
      },
      /* wwEditor:end */
    },

    // Hidden elements for child components
    timelineElement: {
      hidden: true,
      defaultValue: { isWwObject: true, type: "ww-flexbox" },
    },
  },
  triggerEvents: [
    {
      name: "timeline:click",
      label: { en: "On event click" },
      event: { value: null },
    },
    {
      name: "timeline:markerClick",
      label: { en: "On marker click" },
      event: { value: null },
    },
    {
      name: "timeline:commentDeleted",
      label: { en: "On comment deleted" },
      event: { value: { TicketCommentID: null } },
    },
    {
      name: "timeline:attachmentDeleted",
      label: { en: "On attachment deleted" },
      event: { value: { attachmentId: null } },
    },
    {
      name: "timeline:deleted",
      label: { en: "On deletion" },
      event: { value: { type: null, id: null, filename: null } },
    },
  ],
  actions: [{ label: { en: "Remount component" }, action: "remount" }],
};
