export default {
  editor: {
  label: {
  en: "Datagrid",
  },
  icon: "table",
  customStylePropertiesOrder: [
  ["layout", "height", "textColor", "borderColor"],
  [
  "headerTitle",
  "headerBackgroundColor",
  "headerTextColor",
  "headerFontWeight",
  "headerFontSize",
  "headerFontFamily",
  ],
  [
  "rowTitle",
  "rowBackgroundColor",
  "rowAlternateColor",
  "rowHoverColor",
  "rowVerticalPaddingScale",
  ],
  ["columnTitle", "columnHoverHighlight", "columnHoverColor"],
  [
  "cellTitle",
  "cellColor",
  "cellFontFamily",
  "cellFontSize",
  "cellSelectionBorderColor",
  ],
  ["menuTitle", "menuTextColor", "menuBackgroundColor"],
  [
  "selectionTitle",
  "selectedRowBackgroundColor",
  "selectionCheckboxColor",
  "focusShadow",
  "checkboxUncheckedBorderColor",
  ],
  [
  "actionTitle",
  "actionColor",
  "actionBackgroundColor",
  "actionPadding",
  "actionBorder",
  "actionBorderRadius",
  "actionFont",
  "actionFontSize",
  "actionFontFamily",
  "actionFontWeight",
  "actionFontStyle",
  "actionLineHeight",
  ],
  ],
  customSettingsPropertiesOrder: [
  "rowData",
  "idFormula",
  "generateColumns",
  "columns",
  ["pagination", "paginationPageSize"],
  [
  "rowSelection",
  "enableClickSelection",
  "disableCheckboxes",
    "selectAll",
    "selectAllRows",    
  ],
  "movableColumns",
  "resizableColumns",
  "initialFilters",
  "initialSort",
  ["lang", "localeText"],
  ],
  },
  triggerEvents: [
  {
  name: "action",
  label: { en: "On Action" },
  event: { actionName: "", row: null, id: 0, index: 0, displayIndex: 0 },
  getTestEvent: "getOnActionTestEvent",
  default: true,
  },
  {
  name: "cellValueChanged",
  label: { en: "On Cell Value Changed" },
  event: {
  oldValue: null,
  newValue: null,
  columnId: "id",
  row: null,
  },
  getTestEvent: "getOnCellValueChangedTestEvent",
  },
  {
  name: "rowSelected",
  label: { en: "On Row Selected" },
  event: {
  row: null,
  },
  getTestEvent: "getSelectionTestEvent",
  },
  {
  name: "rowDeselected",
  label: { en: "On Row Deselected" },
  event: {
  row: null,
  },
  getTestEvent: "getSelectionTestEvent",
  },
  {
  name: "filterChanged",
  label: { en: "On Filter Changed" },
  },
  {
  name: "sortChanged",
  label: { en: "On Sort Changed" },
  },
  {
  name: "rowClicked",
  label: { en: "On Row Clicked" },
  event: {
  row: null,
  id: 0,
  index: 0,
  displayIndex: 0,
  },
  getTestEvent: "getRowClickedTestEvent",
  },
  {
  name: "cellClicked",
  label: { en: "On Cell Clicked" },
  event: {
    row: null,
    id: 0,
    index: 0,
    displayIndex: 0,
    fieldDB: null,
    fieldID: null,
    colId: null
  },
  getTestEvent: "getCellClickedTestEvent"
},
  ],
  actions: [
  {
    action: 'deselectAllRows',
    label: { en: 'Deselect All Rows' },
    args: []
  },
  ],
  properties: {
  headerTitle: {
  type: "Title",
  label: "Header",
  editorOnly: true,
  },
  rowTitle: {
  type: "Title",
  label: "Row",
  editorOnly: true,
  },
  columnTitle: {
  type: "Title",
  label: "Column",
  editorOnly: true,
  },
  cellTitle: {
  type: "Title",
  label: "Cell",
  editorOnly: true,
  },
  menuTitle: {
  type: "Title",
  label: "Menu",
  editorOnly: true,
  },
  actionTitle: {
  type: "Title",
  label: "Action",
  editorOnly: true,
  },
  selectionTitle: {
  type: "Title",
  label: "Selection",
  editorOnly: true,
  },   
  layout: {
  type: "TextSelect",
  label: "Height Mode",
  options: {
  options: [
  { value: "fixed", label: "Fixed", default: true },
  { value: "auto", label: "Auto" },
  ],
  },
  bindable: true,
  responsive: true,
  propertyHelp: {
  tooltip:
  "Be cautious when using auto mode with a large number of rows, as it may slow down page rendering",
  },
  bindingValidation: {
  type: "string",
  tooltip: "fixed | auto",
  },
  },
  height: {
  label: { en: "Grid Height" },
  type: "Length",
  section: "style",
  options: {
  noRange: true,
  },
  bindable: true,
  classes: true,
  responsive: true,
  states: true,
  defaultValue: "400px",
  /* wwEditor:start */
  bindingValidation: {
  type: "string",
  tooltip: "Height of the grid (e.g., 400px)",
  },
  hidden: (content) => content.layout === "auto",
  /* wwEditor:end */
  },
  headerBackgroundColor: {
  type: "Color",
  label: "Background Color",
  options: {
  nullable: true,
  },
  responsive: true,
  bindable: true,
  states: true,
  classes: true,
  },
  headerTextColor: {
  type: "Color",
  label: "Text Color",
  options: {
  nullable: true,
  },
  responsive: true,
  bindable: true,
  states: true,
  classes: true,
  },
  headerFontWeight: {
  label: "Font weight",
  type: "TextSelect",
  category: "text",
  options: {
  options: [
  { value: null, label: "Default", default: true },
  { value: 100, label: "100 - Thin" },
  { value: 200, label: "200 - Extra Light" },
  { value: 300, label: "300 - Light" },
  { value: 400, label: "400 - Normal" },
  { value: 500, label: "500 - Medium" },
  { value: 600, label: "600 - Semi Bold" },
  { value: 700, label: "700 - Bold" },
  { value: 800, label: "800 - Extra Bold" },
  { value: 900, label: "900 - Black" },
  ],
  },
  responsive: true,
  states: true,
  classes: true,
  bindable: true,
  bindingValidation: {
  markdown: "font-weight",
  type: "string",
  cssSupports: "font-weight",
  },
  },
  headerFontSize: {
  label: "Font Size",
  type: "Length",
  options: {
  unitChoices: [
  { value: "px", label: "px", min: 1, max: 100, default: true },
  { value: "em", label: "em", min: 0, max: 10, digits: 3, step: 0.1 },
  { value: "rem", label: "rem", min: 0, max: 10, digits: 3, step: 0.1 },
  ],
  noRange: true,
  },
  responsive: true,
  states: true,
  classes: true,
  bindable: true,
  bindingValidation: {
  markdown: "font-size",
  type: "string",
  cssSupports: "font-size",
  },
  },
  cellStyleArray: {
  label: { en: "Cell Style Array" },
  type: "Array",
  section: "settings",
  bindable: true,
  defaultValue: [],
  options: {
  expandable: true,
  getItemLabel(_, index) {
  return `Style ${index + 1}`;
  },
  item: {
  type: "Object",
  defaultValue: {
  Valor: "valor1",
  CorFonte: "FFFFFF",
  CorFundo: "000000"
  },
  options: {
  item: {
  Valor: {
  label: "Valor",
  type: "Text",
  options: { placeholder: "Valor a comparar" }
  },
  CorFonte: {
  label: "Cor da Fonte",
  type: "Text",
  options: { placeholder: "Código hex sem #" }
  },
  CorFundo: {
  label: "Cor de Fundo",
  type: "Text",
  options: { placeholder: "Código hex sem #" }
  }
  }
  }
  }
  },
  /* wwEditor:start */
  bindingValidation: {
  type: 'Array',
  tooltip: 'Array de estilos para células: [{"Valor":"valor1", "CorFonte":"FFFFFF", "CorFundo":"000000"}]'
  },
  propertyHelp: {
  tooltip: 'Define estilos personalizados para células baseados no valor. Cada item deve ter Valor, CorFonte e CorFundo.'
  }
  /* wwEditor:end */
  },
  textColor: {
  label: "Text Color",
  type: "Color",
  category: "text",
  options: { nullable: true },
  bindable: true,
  bindingValidation: {
  markdown: "color",
  type: "string",
  cssSupports: "color",
  },
  responsive: true,
  states: true,
  classes: true,
  },
  headerFontFamily: {
  label: "Font family",
  type: "FontFamily",
  category: "text",
  responsive: true,
  states: true,
  classes: true,
  bindable: true,
  bindingValidation: {
  markdown: "font-family",
  type: "string",
  cssSupports: "font-family",
  },
  },
  borderColor: {
  type: "Color",
  label: "Border Color",
  options: {
  nullable: true,
  },
  responsive: true,
  bindable: true,
  states: true,
  classes: true,
  },
  cellColor: {
  type: "Color",
  label: "Text Color",
  options: {
  nullable: true,
  },
  responsive: true,
  bindable: true,
  states: true,
  classes: true,
  },
  cellFontFamily: {
  label: "Font family",
  type: "FontFamily",
  category: "text",
  responsive: true,
  states: true,
  classes: true,
  bindable: true,
  bindingValidation: {
  markdown: "font-family",
  type: "string",
  cssSupports: "font-family",
  },
  },
  cellFontSize: {
  type: "Length",
  label: "Font Size",
  options: {
  unitChoices: [
  { value: "px", label: "px", min: 1, max: 100, default: true },
  { value: "em", label: "em", min: 0, max: 10, digits: 3, step: 0.1 },
  { value: "rem", label: "rem", min: 0, max: 10, digits: 3, step: 0.1 },
  ],
  noRange: true,
  },
  responsive: true,
  states: true,
  classes: true,
  bindable: true,
  bindingValidation: {
  markdown: "font-size",
  type: "string",
  cssSupports: "font-size",
  },
  },
  useStyleArray: {
  label: "Usar Array de Estilos",
  type: "OnOff",
  hidden: (content, sidePanelContent, boundProperties, wwProps, array) =>
  array?.item?.cellDataType === "action" ||
  array?.item?.cellDataType === "image" ||
  array?.item?.cellDataType === "custom" ||
  array?.item?.useCustomLabel ||
  array?.item?.useCustomFormatter,
  /* wwEditor:start */
  bindingValidation: {
  type: "boolean",
  tooltip: "Ativa o uso do array de estilos para esta coluna"
  },
  propertyHelp: {
  tooltip: "Quando ativado, compara o valor da célula com o array de estilos e aplica o estilo correspondente"
  }
  /* wwEditor:end */
  },
  cellSelectionBorderColor: {
  type: "Color",
  label: "Selection Border Color",
  options: {
  nullable: true,
  },
  responsive: true,
  bindable: true,
  states: true,
  classes: true,
  bindingValidation: {
  markdown: "color",
  type: "string",
  cssSupports: "color",
  },
  },
  columnHoverHighlight: {
  type: "OnOff",
  label: "Hover Highlight",
  responsive: true,
  bindable: true,
  states: true,
  classes: true,
  },
  columnHoverColor: {
  type: "Color",
  label: "Hover Color",
  options: {
  nullable: true,
  },
  responsive: true,
  bindable: true,
  states: true,
  classes: true,
  propertyHelp: {
  tooltip: `Should be a semi-transparent color to allow the background color to show through.`,
  },
  hidden: (content) => !content.columnHoverHighlight,
  },
  rowBackgroundColor: {
  type: "Color",
  label: "Background Color",
  options: {
  nullable: true,
  },
  responsive: true,
  bindable: true,
  states: true,
  classes: true,
  },
  rowAlternateColor: {
  type: "Color",
  label: "Alternate Color",
  options: {
  nullable: true,
  },
  responsive: true,
  bindable: true,
  states: true,
  classes: true,
  },
  rowHoverColor: {
  type: "Color",
  label: "Hover Color",
  options: {
  nullable: true,
  },
  responsive: true,
  bindable: true,
  states: true,
  classes: true,
  propertyHelp: {
  tooltip: `Should be a semi-transparent color to allow the background color to show through.`,
  },
  },
  selectedRowBackgroundColor: {
  type: "Color",
  label: "Selected Background Color",
  options: {
  nullable: true,
  },
  responsive: true,
  bindable: true,
  states: true,
  classes: true,
  propertyHelp: {
  tooltip: `Should be a semi-transparent color to allow the background color to show through.`,
  },
  },
  selectionCheckboxColor: {
  type: "Color",
  label: "Selection Checkboxes Color",
  options: {
  nullable: true,
  },
  responsive: true,
  bindable: true,
  states: true,
  classes: true,
  bindingValidation: {
  markdown: "color",
  type: "string",
  cssSupports: "color",
  },
  },
  checkboxUncheckedBorderColor: {
  type: "Color",
  label: "Checkbox Unchecked Border Color",
  options: {
  nullable: true,
  },
  responsive: true,
  bindable: true,
  states: true,
  classes: true,
  bindingValidation: {
  markdown: "color",
  type: "string",
  cssSupports: "color",
  },
  },
  focusShadow: {
  type: "Shadows",
  label: "Focus Shadow",
  responsive: true,
  bindable: true,
  states: true,
  classes: true,
  bindingValidation: {
  markdown: "shadow",
  type: "string",
  cssSupports: "shadow",
  },
  },
  rowVerticalPaddingScale: {
  type: "Number",
  label: "Vertical Padding Scale",
  options: {
  min: 0,
  max: 5,
  step: 0.1,
  default: 1,
  },
  responsive: true,
  bindable: true,
  states: true,
  classes: true,
  },
  menuTextColor: {
  label: "Text color",
  type: "Color",
  category: "text",
  options: { nullable: true },
  bindable: true,
  bindingValidation: {
  markdown: "color",
  type: "string",
  cssSupports: "color",
  },
  responsive: true,
  states: true,
  classes: true,
  },
  menuBackgroundColor: {
  label: "Background color",
  type: "Color",
  category: "background",
  options: { nullable: true },
  bindable: true,
  bindingValidation: {
  markdown: "background-color",
  type: "string",
  cssSupports: "background-color",
  },
  responsive: true,
  states: true,
  classes: true,
  },
  actionColor: {
  label: "Text color",
  type: "Color",
  category: "text",
  options: { nullable: true },
  bindable: true,
  bindingValidation: {
  markdown: "color",
  type: "string",
  cssSupports: "color",
  },
  responsive: true,
  states: true,
  classes: true,
  },
  actionBackgroundColor: {
  label: "Background color",
  type: "Color",
  category: "background",
  options: { nullable: true },
  bindable: true,
  bindingValidation: {
  markdown: "background-color",
  type: "string",
  cssSupports: "background-color",
  },
  responsive: true,
  states: true,
  classes: true,
  },
  actionPadding: {
  label: "Padding",
  type: "Spacing",
  responsive: true,
  bindable: true,
  states: true,
  classes: true,
  bindingValidation: {
  markdown: "padding",
  type: "string",
  cssSupports: "padding",
  },
  },
  actionBorder: {
  label: "Border",
  type: "Border",
  responsive: true,
  bindable: true,
  states: true,
  classes: true,
  bindingValidation: {
  markdown: "border",
  type: "string",
  cssSupports: "border",
  },
  },
  actionBorderRadius: {
  label: "Border radius",
  type: "Spacing",
  options: {
  isCorner: true,
  unitChoices: [
  { value: "px", label: "px", min: 0, max: 50, default: true },
  { value: "%", label: "%", min: 0, max: 100, digits: 2, step: 1 },
  ],
  },
  responsive: true,
  bindable: true,
  states: true,
  classes: true,
  bindingValidation: {
  markdown: "border-radius",
  type: "string",
  cssSupports: "border-radius",
  },
  },
  actionFont: {
  label: "Typography",
  type: "Typography",
  category: "text",
  options: (content, sidepanelContent, boundProperties) => ({
  initialValue: {
  fontSize: content["actionFontSize"],
  fontFamily: content["actionFontFamily"],
  fontWeight: content["actionFontWeight"],
  fontStyle: content["actionFontStyle"],
  lineHeight: content["actionLineHeight"],
  },
  creationDisabled:
  boundProperties["actionFontSize"] ||
  boundProperties["actionFontFamily"] ||
  boundProperties["actionFontWeight"] ||
  boundProperties["actionFontStyle"] ||
  boundProperties["actionFontLineHeight"],
  creationDisabledMessage:
  "Cannot create typography from bound properties",
  }),
  bindable: true,
  responsive: true,
  states: true,
  classes: true,
  },
  actionFontSize: {
  label: "Size",
  type: "Length",
  category: "text",
  options: {
  unitChoices: [
  { value: "px", label: "px", min: 1, max: 100, default: true },
  { value: "em", label: "em", min: 0, max: 10, digits: 3, step: 0.1 },
  { value: "rem", label: "rem", min: 0, max: 10, digits: 3, step: 0.1 },
  ],
  noRange: true,
  },
  responsive: true,
  states: true,
  classes: true,
  bindable: true,
  hidden: (content, _, boundProps) =>
  content["actionFont"] || boundProps["actionFont"],
  bindingValidation: {
  markdown: "font-size",
  type: "string",
  cssSupports: "font-size",
  },
  },
  actionFontFamily: {
  label: "Font family",
  type: "FontFamily",
  category: "text",
  responsive: true,
  states: true,
  classes: true,
  bindable: true,
  hidden: (content, _, boundProps) =>
  content["actionFont"] || boundProps["actionFont"],
  bindingValidation: {
  markdown: "font-family",
  type: "string",
  cssSupports: "font-family",
  },
  },
  actionFontWeight: {
  label: "Font weight",
  type: "TextSelect",
  category: "text",
  options: {
  options: [
  { value: null, label: "Default", default: true },
  { value: 100, label: "100 - Thin" },
  { value: 200, label: "200 - Extra Light" },
  { value: 300, label: "300 - Light" },
  { value: 400, label: "400 - Normal" },
  { value: 500, label: "500 - Medium" },
  { value: 600, label: "600 - Semi Bold" },
  { value: 700, label: "700 - Bold" },
  { value: 800, label: "800 - Extra Bold" },
  { value: 900, label: "900 - Black" },
  ],
  },
  responsive: true,
  states: true,
  classes: true,
  bindable: true,
  hidden: (content, _, boundProps) =>
  content["actionFont"] || boundProps["actionFont"],
  bindingValidation: {
  markdown: "font-weight",
  type: "string",
  cssSupports: "font-weight",
  },
  },
  actionFontStyle: {
  label: "Font Style",
  type: "TextRadioGroup",
  category: "text",
  options: {
  choices: [
  {
  value: null,
  title: "Default",
  icon: "typo-default",
  default: true,
  },
  { value: "italic", title: "Italic", icon: "typo-italic" },
  ],
  },
  responsive: true,
  states: true,
  bindable: true,
  classes: true,
  hidden: (content, _, boundProps) =>
  content["actionFont"] || boundProps["actionFont"],
  bindingValidation: {
  markdown: "font-style",
  type: "string",
  cssSupports: "font-style",
  },
  },
  actionLineHeight: {
  label: "Line height",
  type: "Length",
  category: "text",
  options: {
  unitChoices: [
  { value: "normal", label: "auto", default: true },
  { value: "px", label: "px", min: 0, max: 100 },
  { value: "%", label: "%", min: 0, max: 100 },
  { value: "em", label: "em", min: 0, max: 10, digits: 3, step: 0.1 },
  { value: "rem", label: "rem", min: 0, max: 10, digits: 3, step: 0.1 },
  { value: "unset", label: "none" },
  ],
  noRange: true,
  },
  responsive: true,
  states: true,
  classes: true,
  bindable: true,
  hidden: (content, _, boundProps) =>
  content["actionFont"] || boundProps["actionFont"],
  bindingValidation: {
  markdown: "line-height",
  type: "string",
  cssSupports: "line-height",
  },
  },
  rowData: {
  label: { en: "Data" },
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
  idFormula: {
  type: "Formula",
  label: "Unique Row Id",
  options: (content) => ({
  template: wwLib.wwUtils.getDataFromCollection(content.rowData)?.[0],
  }),
  section: "settings",
  propertyHelp: {
  tooltip:
  "A unique id per row. Very useful for performance optimization.",
  },
  },
  generateColumns: {
  type: "Button",
  options: {
  text: "Generate columns",
  color: "blue",
  action: "generateColumns",
  },
  section: "settings",
  editorOnly: true,
  },
  columns: {
  label: {
  en: "Columns",
  },
  type: "Array",
  options: {
  item: {
  type: "Object",
  options: (
  content,
  sidePanelContent,
  boundProperties,
  wwProps,
  array
  ) => ({
  item: {
  headerName: {
  label: "Header Name",
  type: "Text",
  bindable: true,
  },
  cellDataType: {
  label: "Type",
  type: "TextSelect",
  options: {
  options: [
  { value: undefined, label: "Auto", default: true },
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "dateString", label: "Date" },
  { value: "image", label: "Image" },
  { value: "action", label: "Action" },
  { value: "custom", label: "Custom" },
  ],
  },
  },
  useCustomLabel: {
  label: "Custom display value",
  type: "OnOff",
  hidden:
  array?.item?.cellDataType === "action" ||
  array?.item?.cellDataType === "image" ||
  array?.item?.cellDataType === "custom",
  },
  displayLabelFormula: {
  label: "Display value",
  type: "Formula",
  options: {
  template: _.get(
  wwLib.wwUtils.getDataFromCollection(content.rowData)?.[0],
  array?.item?.field
  ),
  },
  hidden:
  array?.item?.cellDataType === "action" ||
  array?.item?.cellDataType === "image" ||
  !array?.item?.useCustomLabel ||
  array?.item?.cellDataType === "custom",
  },
  useCustomFormatter: {
  label: "Use Custom Formatter",
  type: "OnOff",
  hidden:
  array?.item?.cellDataType === "action" ||
  array?.item?.cellDataType === "image" ||
  array?.item?.cellDataType === "custom" ||
  array?.item?.useCustomLabel,
  },
  useStyleArray: {
  label: "Usar Array de Estilos",
  type: "OnOff",
  hidden:
  array?.item?.cellDataType === "action" ||
  array?.item?.cellDataType === "image" ||
  array?.item?.cellDataType === "custom" ||
  array?.item?.useCustomLabel ||
  array?.item?.useCustomFormatter,
  /* wwEditor:start */
  bindingValidation: {
  type: "boolean",
  tooltip: "Ativa o uso do array de estilos para esta coluna"
  },
  propertyHelp: {
  tooltip: "Quando ativado, compara o valor da célula com o array de estilos e aplica o estilo correspondente"
  }
  /* wwEditor:end */
  },
  formatter: {
  label: "Custom Formatter",
  type: "Script",
  options: {
  language: "javascript",
  placeholder: "// Write code that formats the cell value\n// Parameters: value, row, colDef, getRoundedSpanColor\n// Example: return getRoundedSpanColor(value, colorArray);"
  },
  hidden:
  array?.item?.cellDataType === "action" ||
  array?.item?.cellDataType === "image" ||
  array?.item?.cellDataType === "custom" ||
  !array?.item?.useCustomFormatter,
  /* wwEditor:start */
  bindingValidation: {
  type: "string",
  tooltip: "JavaScript code that formats the cell value. Receives value, row, colDef, and getRoundedSpanColor function parameters."
  },
  propertyHelp: {
  tooltip: "Write JavaScript code that returns the formatted value. Available parameters: value (cell value), row (entire row data), colDef (column definition), and getRoundedSpanColor function to create styled spans."
  },
  /* wwEditor:end */
  },
  widthAlgo: {
  type: "TextRadioGroup",
  label: "Width",
  options: {
  choices: [
  { value: "fixed", label: "Fixed", default: true },
  { value: "flex", label: "Flex" },
  ],
  },
  },
  flex: {
  label: "Flex",
  type: "Number",
  options: {
  min: 1,
  max: 10,
  step: 1,
  noRange: true,
  defaultValue: 1,
  },
  hidden: array?.item?.widthAlgo !== "flex",
  },
  width: {
  type: "Length",
  options: {
  noRange: true,
  unitChoices: [
  { value: "px", label: "px", min: 0, max: 1300 },
  { value: "auto", label: "auto" },
  ],
  },
  hidden: array?.item?.widthAlgo === "flex",
  },
  minWidth: {
  label: "Min Width",
  type: "Length",
  options: {
  noRange: true,
  unitChoices: [
  { value: "px", label: "px", min: 0, max: 1300 },
  { value: "auto", label: "auto" },
  ],
  },
  },
  maxWidth: {
  label: "Max Width",
  type: "Length",
  options: {
  noRange: true,
  unitChoices: [{value: "px", label: "px", min: 0, max: 1300 },
  { value: "auto", label: "auto" },
  ],
  },
  },
  pinned: {
  label: "Pinned",
  type: "TextRadioGroup",
  options: {
  choices: [
  { value: "none", label: "None", default: true },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  ],
  },
  },
  draggable: {
  label: "Draggable",
  type: "OnOff",
  defaultValue: true,
  bindable: true,
  /* wwEditor:start */
  bindingValidation: {
  type: "boolean",
  tooltip: "Whether this column can be moved via drag and drop"
  },
  propertyHelp: {
  tooltip: "When enabled, this column can be reordered by dragging. Columns with pinned=left will never be draggable regardless of this setting."
  }
  /* wwEditor:end */
  },
  hide: {
  label: "Hidden",
  type: "OnOff",
  bindable: true,
  bindingValidation: {
  type: "boolean",
  tooltip: "True to hide the column",
  },
  },
  editable: {
  label: "Editable",
  type: "OnOff",
  hidden:
  array?.item?.cellDataType === "action" ||
  array?.item?.cellDataType === "image" ||
  array?.item?.cellDataType === "custom",
  },
  filter: {
  label: "Filter",
  type: "OnOff",
  hidden:
  array?.item?.cellDataType === "action" ||
  array?.item?.cellDataType === "image",
  },
  sortable: {
  label: "Sortable",
  type: "OnOff",
  hidden:
  array?.item?.cellDataType === "action" ||
  array?.item?.cellDataType === "image",
  },
  textAlign: {
  label: "Text Alignment",
  type: "TextRadioGroup",
  options: {
  choices: [
  { value: "left", label: "Left", default: true },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  ],
  },
  hidden:
  array?.item?.cellDataType === "action" ||
  array?.item?.cellDataType === "image" ||
  array?.item?.cellDataType === "custom",
  /* wwEditor:start */
  bindingValidation: {
  type: "string",
  enum: ["left", "center", "right"],
  tooltip: "Alignment of text within the cell: left, center, or right"
  },
  propertyHelp: {
  tooltip: "Controls how text is aligned within each cell of this column"
  },
  /* wwEditor:end */
  },
  headerAlign: {
  label: "Header Alignment",
  type: "TextRadioGroup",
  options: {
  choices: [
  { value: "left", label: "Left", default: true },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  ],
  },
  hidden:
  array?.item?.cellDataType === "action" ||
  array?.item?.cellDataType === "image" ||
  array?.item?.cellDataType === "custom",
  /* wwEditor:start */
  bindingValidation: {
  type: "string",
  enum: ["left", "center", "right"],
  tooltip: "Alignment of text within the header cell: left, center, or right"
  },
  propertyHelp: {
  tooltip: "Controls how text is aligned within the header cell of this column"
  },
  /* wwEditor:end */
  },
  cursor: {
    label: "Cursor",
    type: "TextSelect",
    options: {
      choices: [
        { value: "default", label: "Default", default: true },
        { value: "pointer", label: "Pointer (mãozinha)" },
        { value: "text", label: "Text (texto)" },
        { value: "move", label: "Move (mover)" },
        { value: "crosshair", label: "Crosshair (mira)" },
        { value: "not-allowed", label: "Not Allowed (proibido)" },
        { value: "help", label: "Help (ajuda)" },
        { value: "wait", label: "Wait (aguarde)" },
        { value: "progress", label: "Progress (progresso)" },
        { value: "copy", label: "Copy (copiar)" },
        { value: "grab", label: "Grab (pegar)" },
        { value: "zoom-in", label: "Zoom In" },
        { value: "zoom-out", label: "Zoom Out" }
      ]
    },
    hidden:
      array?.item?.cellDataType === "action" ||
      array?.item?.cellDataType === "image" ||
      array?.item?.cellDataType === "custom",
    /* wwEditor:start */
    bindingValidation: {
      type: "string",
      tooltip: "Tipo de cursor ao passar o mouse sobre as células desta coluna"
    },
    propertyHelp: {
      tooltip: "Escolha o tipo de cursor do mouse para as células desta coluna."
    }
    /* wwEditor:end */
  },
  },
  }),
  },
  defaultValue: {
  filter: false,
  sortable: false,
  },
  movable: true,
  expandable: true,
  getItemLabel(item, index) {
  return item?.headerName?.length
  ? item?.headerName
  : item?.field?.length
  ? item?.field
  : `Column ${index + 1}`;
  },
  },
  defaultValue: [],
  section: "settings",
  bindable: true,
  },
  pagination: {
  label: { en: "Pagination" },
  type: "OnOff",
  section: "settings",
  bindable: true,
  defaultValue: false,
  /* wwEditor:start */
  bindingValidation: {
  type: "boolean",
  tooltip: "Enable or disable pagination",
  },
  /* wwEditor:end */
  },
  paginationPageSize: {
  label: { en: "Rows Per Page" },
  type: "Number",
  section: "settings",
  bindable: true,
  defaultValue: 10,
  options: {
  noRange: true,
  },
  /* wwEditor:start */
  bindingValidation: {
  type: "number",
  tooltip: "Number of rows to display per page",
  },
  hidden: (content) => !content.pagination,
  /* wwEditor:end */
  },
  rowSelection: {
  label: { en: "Row Selection" },
  type: "TextSelect",
  section: "settings",
  bindable: true,
  options: {
  options: [
  { value: "none", label: "None", default: true },
  { value: "single", label: "Single" },
  { value: "multiple", label: "Multiple" },
  ],
  },
  /* wwEditor:start */
  bindingValidation: {
  type: "string",
  tooltip: "Type of row selection: none or single or multiple",
  },
  /* wwEditor:end */
  },
  enableClickSelection: {
  label: { en: "Enable Click Selection" },
  type: "OnOff",
  section: "settings",
  bindable: true,
  /* wwEditor:start */
  bindingValidation: {
  type: "boolean",
  tooltip: "True to enable row selection on click",
  },
  hidden: (content) =>
  content.rowSelection === "none" || content.rowSelection === undefined,
  /* wwEditor:end */
  },
  disableCheckboxes: {
  label: { en: "Disable Checkboxes" },
  type: "OnOff",
  section: "settings",
  bindable: true,
  defaultValue: false,
  /* wwEditor:start */
  bindingValidation: {
  type: "boolean",
  tooltip: "True to disable checkboxes",
  },
  hidden: (content) =>
  content.rowSelection === "none" || content.rowSelection === undefined,
  /* wwEditor:end */
  },
  selectAll: {
  label: { en: "Select All behavior" },
  type: "TextSelect",
  section: "settings",
  bindable: true,
  defaultValue: "all",
  options: {
  options: [
  { value: "all", label: "All", default: true },
  { value: "filtered", label: "Filtered" },
  { value: "currentPage", label: "Current Page" },
  ],
    },
    /* wwEditor:start */
    bindingValidation: {
      type: "string",
      enum: ["all", "filtered", "currentPage"],
      tooltip:
        "Select all behavior: 'all' to select all rows, 'filtered' to select filtered rows, 'currentPage' to select current page rows",
    },
    hidden: (content) => content.rowSelection !== "multiple",
    /* wwEditor:end */
  },
  selectAllRows: {
    label: { en: "Select/Deselect All Rows" },
    type: "TextSelect",
    bindable: true,
    section: "settings",
    defaultValue: null,
    options: {
      options: [
        { value: null, label: "No Action", default: true },
        { value: "S", label: "Select All" },
        { value: "N", label: "Deselect All" }
      ]
    },
    propertyHelp: {
      tooltip: "Set to 'S' to select all rows, 'N' to deselect all rows, or null to do nothing. Has o mesmo efeito do checkbox do header."
    },
    bindingValidation: {
      type: ["string", "null"],
      enum: ["S", "N", null],
      tooltip: "'S' para selecionar todas, 'N' para desmarcar todas, null para não fazer nada"
    }
  },
  movableColumns: {
  label: { en: "Movable Columns" },
  type: "OnOff",
  section: "settings",
  bindable: true,
  /* wwEditor:start */
  bindingValidation: {
  type: "boolean",
  tooltip: "Enable or disable movable columns",
  },
  /* wwEditor:end */
  },
  resizableColumns: {
  label: { en: "Resizable Columns" },
  type: "OnOff",
  section: "settings",
  bindable: true,
  defaultValue: true,
  /* wwEditor:start */
  bindingValidation: {
  type: "boolean",
  tooltip: "Enable or disable resizable columns",
  },
  /* wwEditor:end */
  },
  initialFilters: {
  label: { en: "Initial Filters" },
  type: "RawObject",
  section: "settings",
  bindable: true,
  defaultValue: null,
  bindingValidation: {
  type: "object",
  tooltip: "An object representing the initial filter model",
  },
  },
  initialSort: {
  label: { en: "Initial Sort" },
  type: "RawObject",
  section: "settings",
  bindable: true,
  defaultValue: null,
  bindingValidation: {
  type: "array",
  tooltip: "An array representing the initial sort model",
  },
  },
  lang: {
  label: { en: "Language" },
  type: "TextSelect",
  section: "settings",
  bindable: true,
  options: {
  options: [
  { value: "en", label: "English", default: true },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "custom", label: "Custom" },
  ],
  },
  /* wwEditor:start */
  bindingValidation: {
  type: "string",
  tooltip:
  "Localisation to use. Default is English. Possible values: en, fr, es, de, pt, custom. Use custom to set your own locale texts.",
  },
  /* wwEditor:end */
  },
  localeText: {
  label: { en: "Locale texts" },
  type: "RawObject",
  section: "settings",
  bindable: true,
  defaultValue: {},
  hidden: (content) => content.lang !== "custom",
  /* wwEditor:start */
  bindingValidation: {
  type: "object",
  tooltip:
  'See <a href="https://github.com/ag-grid/ag-grid/blob/latest/community-modules/locale/src/en-US.ts" target="_blank">Aggrid website</a> for the list of texts to localise',
  },
  /* wwEditor:end */
  },
  },
  };
  
  function getRoundedSpanColor(value, colorArray) {
  if (!colorArray || !Array.isArray(colorArray) || !value) return null;
  
  const matchingStyle = colorArray.find(item => item.Valor === value);
  if (!matchingStyle) return null;
  
  return `<span style="height:30px; color: #${matchingStyle.CorFonte}; background:#${matchingStyle.CorFundo}; border: 1px solid #${matchingStyle.CorFundo}; border-radius: 10px; display: inline-flex; align-items: center; padding: 0 8px;">${value}</span>`;
  }
  
  function dateFormatter(dateValue, lang) {
  try {
  if (!dateValue) return '';
  const formatter = new Intl.DateTimeFormat(lang || 'en', {
  day: '2-digit', 
  month: '2-digit', 
  year: 'numeric', 
  hour: '2-digit', 
  minute: '2-digit'
  }); 
  return formatter.format(new Date(dateValue));
  } catch (error) {
  console.error('Error formatting date:', error);
  return dateValue;
  }
  }