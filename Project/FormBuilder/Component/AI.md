---
name: dynamic-form-builder
description: A unified form building system with drag-and-drop field management, combining available fields and form builder in a single component.
keywords: form builder, dynamic forms, drag and drop, field management, form sections, grid layout, field properties
---

#### Dynamic Form Builder

***Purpose:***
This component provides a complete form building system that combines available fields management and form building in a single unified interface, allowing users to drag fields from the available list to build multi-section forms.

***Features:***
- Unified interface with both available fields and form builder in a single component
- Grid-based layout that respects field column width (1-4 columns)
- Drag-and-drop interface for moving fields between containers
- Drag-and-drop interface for reordering sections within the form builder
- Field property customization (type, required, read-only, column width)
- Field properties panel for editing field attributes without modal dialogs
- Multiple field types (text, number, date, memo, list, checkbox, email, phone)
- Actual field components rendered based on field type in the form builder
- Section management for organizing form fields
- Inline section title editing directly in the form builder
- One-click section creation with default "New Section" title
- JSON import/export for both fields and form structures
- Real-time state updates as fields are moved or modified
- Field search functionality for available fields
- Grid layout for available fields for better organization
- Fixed form header with styled title input and empty select fields for priority, categories, assignment, and status
- Sections can be dragged and reordered but cannot be nested within other sections
- Sections cannot be dragged outside the form builder container
- Action buttons are always visible when fields are in the form builder
- Fields are disabled in the available fields list once added to the form builder
- Fields remain in the available fields container when added to the form builder
- Fields are re-enabled when removed from the form builder
- Multilingual tip support through tip_translations object
- Deleted fields automatically return to the available fields container
- Form structure automatically saved to global FormFieldsJsonSave variable
- Empty drop target at the end of each section allows moving fields to a new line even when the current row isn't full

***Properties:***
- availableFieldsTitle: string - Custom heading for the available fields container
- formBuilderTitle: string - Custom heading for the form builder container
- fieldsJson: string - JSON string containing field definitions
- defaultFields: array - Default fields to show when no JSON is provided
- formJson: string - JSON string containing form definition with sections

***Events:***
- fieldsUpdated: Triggered when fields are added, removed, or reordered. Payload: { value: [fields] }
- formUpdated: Triggered when the form structure changes. Payload: { value: {form, sections} }
- fieldsJsonGenerated: Triggered when fields are exported to JSON. Payload: { value: "json-string" }
- formJsonGenerated: Triggered when form is exported to JSON. Payload: { value: "json-string" }
- importFieldsRequested: Triggered when user requests to import fields. Payload: { value: true }
- importFormRequested: Triggered when user requests to import form. Payload: { value: true }

***Exposed Actions:***
- `importFieldsFromJsonData`: Imports fields from JSON data. Args: jsonData (string|object)
- `importFormFromJsonData`: Imports form from JSON data. Args: jsonData (string|object)

***Exposed Variables:***
- fieldsData: Array of field definitions in the available fields container. (path: variables['current_element_uid-fieldsData'])
- formData: Form structure with sections and fields in the form builder container. (path: variables['current_element_uid-formData'])
- FormFieldsJsonSave: Global variable containing the current form structure in JSON format (accessible via window.FormFieldsJsonSave)

***Notes:***
- Each field can have properties like type (text, number, date, etc.), columns (1-4), required status, read-only status, and more
- Fields can be dragged between containers to add or remove them from the form
- Both containers support loading and saving data via JSON
- The form structure follows a specific format with sections containing fields
- In grid mode, fields will occupy exactly the number of columns specified in their properties (1-4)
- Fields will automatically flow to the next row when the current row is filled (max 4 columns per row)
- The available fields container includes a search box to filter fields by name
- Available fields are displayed in a grid layout for better organization and visibility
- When fields are added to the form builder, they render as actual input components based on their field type
- Form sections can be reordered by dragging their headers within the form builder
- Sections cannot be nested within other sections to maintain a clean form structure
- Sections cannot be dragged outside the form builder container to prevent accidental removal
- Action buttons (edit, delete) are always visible when fields are in the form builder for easier management
- Fields that have been added to the form builder are disabled in the available fields list to prevent duplication
- Fields remain visible in the available fields container even after being added to the form builder
- Fields become available again when removed from the form builder, allowing them to be reused if needed
- Field tips support multilingual content through the tip_translations object, which displays the appropriate translation based on the userLanguage global variable
- All form changes are automatically saved to a global variable called FormFieldsJsonSave in the specified JSON format
- Section titles can be edited directly by clicking on them, providing a more intuitive editing experience
- Adding a new section automatically creates it with the default name "New Section" without opening a modal
- Sections can be reordered by dragging their headers, allowing users to customize the form structure
- Each section includes an empty drop target at the end that allows users to explicitly place fields on a new line, even when the current row isn't completely filled
- The field properties panel allows users to edit field properties without opening a modal dialog
- Clicking on a field in the form builder selects it and displays its properties in the properties panel