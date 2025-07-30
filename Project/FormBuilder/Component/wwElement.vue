<template>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
<div class="form-builder-container">
<!-- Debug Panel -->
<div v-if="isEditing" class="debug-panel">
  <h4>Debug Info</h4>
  <pre>{{ JSON.stringify(debugInfo, null, 2) }}</pre>
</div> 

<!-- Combined Form Builder with both field definition and form builder sections -->
<div class="dual-container">
<!-- Available Fields Section -->
<div class="field-definition-container">
<div class="container-header">
{{ content.availableFieldsTitle || translateText('Available Fields') }}
</div>
 
<div class="field-search">
<input 
type="text" 
class="search-input" 
v-model="searchQuery" 
:placeholder="translateText('Search for field...')"
/>
<span class="search-icon">
<i class="material-symbols-outlined-search">search</i>
</span>
</div>

<div 
class="available-fields-container"
ref="availableFieldsContainer"
>
<div class="fields-grid scrollable">
<DraggableField
v-for="field in filteredAvailableFields"
:key="field.ID + '-' + (usedFieldIds.has(field.ID) ? 'used' : 'free')"
:field="field"
:show-properties="false"
:show-actions="true" 
:is-editing="isEditing"
:show-field-component="false"
:is-disabled="usedFieldIds.has(field.ID)"
@edit-field="editField"
@remove-field="removeAvailableField"
@select-field="selectFieldForProperties"
/>
</div>
</div>


</div>

<!-- Form Builder Section -->
<div class="form-builder">
<div v-if="content.showCabecalhoFormBuilder" class="cabecalhoFormBuilder" v-html="content.cabecalhoHtml">

</div>
<div style="display: flex; width:100%; justify-content:end; align-items:end; height:50px; padding:12px">
<button 
v-if="!isEditing" 
class="add-button"
@click="showAddSectionModal"
>
{{ translateText('New section') }}
</button>
</div>

<div class="form-sections-container scrollable" ref="formSectionsContainer">
<FormSection
v-for="section in orderedSections"
:key="section.id"
:section="section"
:all-fields="allAvailableFields"
:is-editing="isEditing"
@update-section="updateFormState"
@edit-section="editSection"
@edit-field="editFormField"
@remove-field="removeFormField"
@select-field="selectFieldForProperties"
@remove-section="handleRemoveSection"
@update-field-in-use="updateFieldInUse"
class="section-spacing"
/>
</div>
</div>
<div class="properties-panel-container" v-if="!isEditing">
<FieldPropertiesPanel 
:selected-field="selectedFieldForProperties" 
@update-field="updateFieldProperties"
/>
</div>
</div>

<!-- Field Properties Panel -->



</div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import Sortable from 'sortablejs';
import DraggableField from './components/DraggableField.vue';
import FormSection from './components/FormSection.vue';
import FieldComponent from './components/FieldComponent.vue';
import FieldPropertiesPanel from './components/FieldPropertiesPanel.vue';

export default {
name: 'FormBuilder',
components: {
DraggableField,
FormSection,
FieldComponent,
FieldPropertiesPanel
},
props: {
uid: {
type: String,
required: true
},
content: {
type: Object,
required: true
},
/* wwEditor:start */
wwEditorState: { type: Object, required: true },
/* wwEditor:end */
},
emits: ['trigger-event'],
setup(props, { emit }) {



// Editor state
const isEditing = computed(() => {
/* wwEditor:start */
return props.wwEditorState.isEditing;
/* wwEditor:end */
// eslint-disable-next-line no-unreachable
return false;
});

// Internal variables
const { value: formData, setValue: setFormData } = wwLib.wwVariable.useComponentVariable({
uid: props.uid,
name: 'formData',
type: 'object',
defaultValue: {}
});

const { value: fieldsData, setValue: setFieldsData } = wwLib.wwVariable.useComponentVariable({
uid: props.uid,
name: 'fieldsData',
type: 'array',
defaultValue: []
});

const { value: debugInfo, setValue: setDebugInfo } = wwLib.wwVariable.useComponentVariable({
  uid: props.uid,
  name: 'debugInfo',
  type: 'object',
  defaultValue: {
    lastAction: '',
    lastField: null,
    lastSection: null,
    error: null
  }
});

// Initialize global FormFieldsJsonSave variable if it doesn't exist
if (typeof window !== 'undefined' && window.FormFieldsJsonSave === undefined) {
window.FormFieldsJsonSave = {
form: {
id: null,
name: { "pt-BR": "Created Form" },
workspace_id: "00000000-0000-0000-0000-000000000000",
company_id: null,
is_current: true
},
sections: []
};
}

// State
const availableFields = ref([]);
const formSections = ref([]);
const availableFieldsContainer = ref(null);
const formSectionsContainer = ref(null);
const fieldModalVisible = ref(false);
const sectionModalVisible = ref(false);
const currentField = ref({});
const currentSection = ref({});
const isNewField = ref(false);
const isNewSection = ref(false);
const searchQuery = ref('');
const selectedFieldForProperties = ref(null);
const forceUpdate = ref(0);

// Track used field IDs to disable them in the available fields list
const usedFieldIds = computed(() => {
// Collect all field IDs that are currently used in the form
const usedIds = new Set();

formSections.value.forEach(section => {
if (section.fields && Array.isArray(section.fields)) {
section.fields.forEach(field => {
// Add the original field ID to the set of used IDs
if (field.field_id) {
usedIds.add(field.field_id);
}
});
}
});

return usedIds;
});

// Computed
const filteredAvailableFields = computed(() => {
if (!searchQuery.value) return availableFields.value;
const query = searchQuery.value.toLowerCase();
return availableFields.value.filter(field => 
(field.name || '').toLowerCase().includes(query)
);
});

// Computed
const allAvailableFields = computed(() => {
return [...availableFields.value];
});

// Adicione no setup()
const currentLang = computed(() => {
  if (typeof window !== 'undefined' && window.wwLib && window.wwLib.wwVariable) {
    return window.wwLib.wwVariable.getValue('aa44dc4c-476b-45e9-a094-16687e063342') || 'pt-BR';
  }
  return 'pt-BR';
});

// Initialize sortable
const initSortable = () => {
// Initialize the available fields container
if (availableFieldsContainer.value) {
try {
// Add defensive check to ensure DOM element is fully rendered
if (availableFieldsContainer.value && availableFieldsContainer.value.isConnected) {
// Check if the fields-grid element exists
const fieldsGrid = availableFieldsContainer.value.querySelector('.fields-grid');
if (!fieldsGrid) {
console.warn('Fields grid not found in available fields container');
return;
}

new Sortable(fieldsGrid, {
group: {
name: 'shared-fields',
pull: true,
put: false
},
animation: 100,
ghostClass: 'sortable-ghost',
chosenClass: 'sortable-chosen',
dragClass: 'sortable-drag',
draggable: '.single-draggable:not(.is-disabled)',
multiDrag: false,
forceFallback: false,
fallbackOnBody: false,
onEnd: (evt) => {
if (evt && evt.item && evt.item.parentNode) {
updateFormState();
}
},
onClone: (evt) => {
if (!evt || !evt.item) return;

try {
const originalFieldEl = evt.item;
const originalField = originalFieldEl.__draggableField__;

if (originalField) {
const clonedField = JSON.parse(JSON.stringify(originalField));
clonedField.id = null;
clonedField.field_id = originalField.ID;

if (evt.clone) {
evt.clone.__draggableField__ = clonedField;

evt.clone.dataset.fieldId = clonedField.field_id;
evt.clone.dataset.fieldType = clonedField.fieldType || 'text';
evt.clone.dataset.fieldName = clonedField.name;
evt.clone.dataset.columns = clonedField.columns || '1';

evt.clone.setAttribute('data-unique-id', `field-${clonedField.field_id}-${Date.now()}`);
}

// Encontra a seção de destino
const targetSection = evt.to.closest('.form-section');
if (targetSection) {
const sectionId = targetSection.querySelector('.section-title')?.dataset.sectionId;
const section = formSections.value.find(s => s.id === sectionId);
if (section) {
if (!section.fields) {
section.fields = [];
}

// Adiciona o campo à seção
section.fields.push(clonedField);
} else if (formSections.value.length > 0) {
// Fallback: adiciona à primeira seção se não encontrar a seção de destino
const firstSection = formSections.value[0];
if (!firstSection.fields) {
firstSection.fields = [];
}
firstSection.fields.push(clonedField);
}
}

updateFormState();

const index = availableFields.value.findIndex(f => f.ID === originalField.ID);
if (index !== -1) {
availableFields.value.splice(index, 1);
}
} else {
console.warn('Original field data not found during clone operation');

const fieldId = originalFieldEl.dataset.fieldId;
if (fieldId && evt.clone) {
Object.keys(originalFieldEl.dataset).forEach(key => {
evt.clone.dataset[key] = originalFieldEl.dataset[key];
});

evt.clone.__draggableField__ = {
ID: fieldId,
field_id: fieldId,
name: originalFieldEl.dataset.fieldName || 'Unnamed Field',
fieldType: originalFieldEl.dataset.fieldType || 'text',
columns: parseInt(originalFieldEl.dataset.columns || '1'),
is_mandatory: false,
is_readonly: false,
is_hide_legend: false
};
}
}

} catch (error) {
alert('Error in onClone handler:', error);
}
}
});
} else {
console.warn('Available fields container is not connected to DOM');
}
} catch (error) {
console.error('Error initializing Sortable in field definition container:', error);
}
}
}
// Initialize sortable for form sections
const initSectionsSortable = () => {
if (!formSectionsContainer.value) {
console.warn('Form sections container not found');
return;
}

try {
// Make sure the DOM element exists and is ready before initializing
if (formSectionsContainer.value && formSectionsContainer.value.isConnected) {
// Destroy previous instance if it exists
if (formSectionsContainer.value._sortable) {
formSectionsContainer.value._sortable.destroy();
}

// Create new Sortable instance with proper error handling
formSectionsContainer.value._sortable = new Sortable(formSectionsContainer.value, {
animation: 150,
handle: '.section-header',
ghostClass: 'sortable-ghost',
chosenClass: 'sortable-chosen',
dragClass: 'sortable-drag',
group: {
name: 'form-sections',
pull: false,
put: false
},
filter: '.sortable-container',
onEnd: (evt) => {
if (!evt || !formSectionsContainer.value) return;

try {
const newSections = [];
const sectionElements = formSectionsContainer.value.querySelectorAll('.form-section');

sectionElements.forEach((element) => {
const titleElement = element.querySelector('.section-title');
if (!titleElement) return;

const sectionId = titleElement.dataset.sectionId;
const section = formSections.value.find(s => s.id === sectionId);
if (section) {
newSections.push(section);
}
});

if (newSections.length > 0) {
formSections.value = newSections;
updateFormState();
}
} catch (error) {
console.error('Error updating sections order:', error);
}
},
fallbackOnBody: false,
forceFallback: false
            // The FormBuilderCadastros component doesn't use an onMove handler
            // and drag operations work reliably without additional checks.
            // Removing this handler avoids errors triggered when Sortable
            // tries to access DOM nodes that may not yet exist.
});

// Inicializa o Sortable para cada container de campos
const initFieldsContainers = () => {
  const fieldsContainers = formSectionsContainer.value.querySelectorAll('.fields-container');
  fieldsContainers.forEach(container => {
    new Sortable(container, {
      group: {
        name: 'shared-fields',
        pull: true,
        put: true
      },
      animation: 100,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      onAdd: (evt) => {
        if (!evt || !evt.item) return;

        try {
          // Verifica se o drop é em um container válido
          if (!evt.to.classList.contains('fields-container')) {
            evt.item.remove();
            return;
          }

          const targetSection = evt.to.closest('.form-section');
          if (!targetSection) {
            evt.item.remove();
            return;
          }

          const sectionId = targetSection.querySelector('.section-title')?.dataset.sectionId;
          const section = formSections.value.find(s => s.id === sectionId);
          if (!section) {
            evt.item.remove();
            return;
          }

          const originalFieldEl = evt.item;
          const originalField = originalFieldEl.__draggableField__;

          if (originalField) {
            const clonedField = JSON.parse(JSON.stringify(originalField));
            clonedField.id = null;
            clonedField.field_id = originalField.ID;

            if (!section.fields) {
              section.fields = [];
            }

            // Calcula a posição correta baseada no elemento alvo
            const targetElement = evt.to.children[evt.newIndex];
            const allElements = Array.from(evt.to.children);
            const targetIndex = allElements.indexOf(targetElement);

            // Se o elemento está sendo movido para o final
            if (targetIndex === allElements.length - 1) {
              section.fields.push(clonedField);
            } else {
              // Insere o campo na posição correta
              section.fields.splice(targetIndex, 0, clonedField);
            }

            updateFormState();

            const index = availableFields.value.findIndex(f => f.ID === originalField.ID);
            if (index !== -1) {
              availableFields.value.splice(index, 1);
            }
          }
        } catch (error) {
          console.error('Error in onAdd handler:', error);
          if (evt.item) {
            evt.item.remove();
          }
        }
      }
    });
  });
};

// Inicializa os containers de campos
initFieldsContainers();
} else {
console.warn('Form sections container is not connected to DOM');
}
} catch (error) {
console.error('Error initializing Sortable in form sections container:', error);
}
}

// Load data
const loadData = () => {
loadFieldsData();
loadFormData();
};

const loadFieldsData = () => {
try {
let data = [];

// Try to load from JSON string
if (props.content.fieldsJson) {
try {
data = JSON.parse(props.content.fieldsJson);
} catch (e) {
console.error('Failed to parse fields JSON:', e);
}
}

// If no data from JSON or parsing failed, use default fields
if (!data || !data.length) {
data = props.content.defaultFields || [];
}

availableFields.value = data;
setFieldsData(data);
} catch (error) {
console.error('Error loading fields data:', error);
}
};

const loadFormData = () => {
try {
let data = {};

// Try to load from JSON string
if (props.content.formJson) {
try {
// Verificar se o formJson é uma string ou um objeto
if (typeof props.content.formJson === 'string') {
data = JSON.parse(props.content.formJson);
} else {
// Se já for um objeto, use-o diretamente
data = props.content.formJson;
}

// Verificar se o JSON tem a estrutura esperada
if (!data.form || !data.sections) {
console.error('Form JSON has invalid structure. Expected {form, sections}');
// Criar estrutura padrão se o JSON for inválido
data = {
form: {
id: null,
name: { "pt-BR": 'Created Form' },
workspace_id: "00000000-0000-0000-0000-000000000000",
company_id: null,
is_current: true
},
sections: []
};
}
} catch (e) {
console.error('Failed to parse form JSON:', e);
}
}

// If no data from JSON or parsing failed, use default form structure
if (!data || !Object.keys(data).length) {
data = {
form: {
id: null, 
name: { "pt-BR": 'Created Form' },
workspace_id: "00000000-0000-0000-0000-000000000000",
company_id: null,
is_current: true
},
sections: []
};
}

// Initialize the global FormFieldsJsonSave variable
if (typeof window !== 'undefined') {
window.FormFieldsJsonSave = data;
}

// Convert sections array to the format expected by the component
formSections.value = data.sections || [];
setFormData(data);
} catch (error) {
console.error('Error loading form data:', error);
}
};

// Field operations
const showAddFieldModal = () => {
currentField.value = {
ID: null,
name: '',
fieldType: 'text',
columns: 1,
is_mandatory: false,
is_readonly: false,
is_hide_legend: false
};
isNewField.value = true;
fieldModalVisible.value = true;
};

const editField = (field) => {
currentField.value = { ...field };
isNewField.value = false;
fieldModalVisible.value = true;
};

const saveField = (field) => {
// Ensure columns is an integer between 1 and 4
field.columns = Math.min(Math.max(parseInt(field.columns) || 1, 1), 4);

if (isNewField.value) {
availableFields.value.push(field);
} else {
const index = availableFields.value.findIndex(f => f.ID === field.ID);
if (index !== -1) {
availableFields.value[index] = field;
}
}
updateFieldsState();
};

const removeAvailableField = (field) => {
const index = availableFields.value.findIndex(f => f.ID === field.ID);
if (index !== -1) {
availableFields.value.splice(index, 1);
updateFieldsState();
}
};

const updateFieldsState = () => {
setFieldsData([...availableFields.value]);
emit('trigger-event', {
name: 'fieldsUpdated',
event: { value: availableFields.value }
});
};

// Section operations
const showAddSectionModal = () => {
  // Create a new section with default title "New Section"
  const newSection = {
    id: Date.now() + "-NOVASECAOINCLUIDA",
    title: { "pt-BR": "New Section" },
    position: 0,
    deleted: false,
    fields: []
  };

// Add the new section directly to formSections
formSections.value.unshift(newSection);
updateFormState();
};

const editSection = (section) => {
currentSection.value = { ...section };
isNewSection.value = false;
sectionModalVisible.value = true;
};

const saveSection = (section) => {
if (isNewSection.value) {
formSections.value.push(section);
} else {
const index = formSections.value.findIndex(s => s.id === section.id);
if (index !== -1) {
formSections.value[index] = {
...formSections.value[index],
title: section.title
};
}
}
updateFormState();
};

const editFormField = (field) => {
currentField.value = { ...field };
isNewField.value = false;
fieldModalVisible.value = true;
};

const removeFormField = (field) => {

// Função auxiliar para normalizar os IDs do campo
const normalizeFieldIds = (f) => {
  return {
    id: f.id || f.ID || f.field_id,
    field_id: f.field_id || f.ID || f.id,
    ID: f.ID || f.field_id || f.id
  };
};

// Encontrar a seção que contém o campo
const section = formSections.value.find(section => {
  const targetIds = normalizeFieldIds(field);
  
  return section.fields.some(f => {
    const currentIds = normalizeFieldIds(f);
    
    const matches = 
      currentIds.id === targetIds.id ||
      currentIds.field_id === targetIds.field_id ||
      currentIds.ID === targetIds.ID;
     
    return matches;
  });
});

if (!section) {
  console.error('Section not found for field:', field);
  return;
}

// Encontrar o índice do campo na seção
const fieldIndex = section.fields.findIndex(f => {
  const targetIds = normalizeFieldIds(field);
  const currentIds = normalizeFieldIds(f);
  
  return (
    currentIds.id === targetIds.id ||
    currentIds.field_id === targetIds.field_id ||
    currentIds.ID === targetIds.ID
  );
});

if (fieldIndex === -1) {
  console.error('Field not found in section');
  return;
}

// Remover o campo da seção
const removedField = section.fields.splice(fieldIndex, 1)[0];

// Adicionar o campo de volta à lista de campos disponíveis
const fieldToAdd = {
  ID: removedField.field_id || removedField.ID,
  Name: removedField.Name || removedField.name,
  fieldType: removedField.fieldType || 'text',
  columns: parseInt(removedField.columns) || 1,
  is_mandatory: Boolean(removedField.is_mandatory),
  is_readonly: Boolean(removedField.is_readonly),
  is_hide_legend: Boolean(removedField.is_hide_legend)
};

// Verificar se o campo já existe na lista de campos disponíveis
const existingFieldIndex = availableFields.value.findIndex(f => f.ID === fieldToAdd.ID);

if (existingFieldIndex === -1) {
  availableFields.value.push(fieldToAdd);
  updateFieldsState();
}

// Atualizar o estado do formulário
updateFormState();
};

// Função auxiliar para normalizar valores booleanos
const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return false;
};

const updateFormState = () => {
const formDataValue = {
form: formData.value?.form || {
id: null,
name: { "pt-BR": 'New Form' }
},
sections: formSections.value.map((section, index) => ({
...section,
position: index + 1,
fields: (section.fields || []).map(field => {
// Ensure each field has the correct structure with all necessary properties
return {
id: field.id === field.field_id ? null : field.id || null,
field_id: field.field_id || field.ID,
position: field.position || 1,
columns: parseInt(field.columns) || 1,
is_mandatory: normalizeBoolean(field.is_mandatory),
is_readonly: normalizeBoolean(field.is_readonly),
is_hide_legend: normalizeBoolean(field.is_hide_legend),
tip_translations: field.tip_translations || { "pt-BR": field.tip || '' },
deleted: false,
// Include these properties to ensure the field displays correctly
name: field.name,
fieldType: field.fieldType
};
})
}))
};

// Update the global FormFieldsJsonSave variable
if (typeof window !== 'undefined') {
window.FormFieldsJsonSave = {
form: {
id: formDataValue.form.id,
name: formDataValue.form.name,
workspace_id: "00000000-0000-0000-0000-000000000000",
company_id: null,
is_current: true
},
sections: formDataValue.sections
};
}

setFormData(formDataValue);
emit('trigger-event', {
name: 'formUpdated',
event: { value: formDataValue }
});
}; 

// JSON operations
const saveFieldsToJson = () => {
const fieldsJson = JSON.stringify(availableFields.value);
emit('trigger-event', {
name: 'fieldsJsonGenerated',
event: { value: fieldsJson }
});
};

const importFieldsFromJson = () => {
emit('trigger-event', {
name: 'importFieldsRequested',
event: { value: true }
});
};

const saveFormToJson = () => {
// Use the global FormFieldsJsonSave variable
const formJson = JSON.stringify(window.FormFieldsJsonSave || {
form: formData.value?.form || {
id: null,
name: { "pt-BR": 'Created Form' }
},
sections: formSections.value
});

emit('trigger-event', {
name: 'formJsonGenerated',
event: { value: formJson }
});
};

const importFormFromJson = () => {
emit('trigger-event', {
name: 'importFormRequested',
event: { value: true }
});
};

// External actions
const importFieldsFromJsonData = (jsonData) => {
try {
const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
if (Array.isArray(data)) {
availableFields.value = data;
updateFieldsState();
return true;
}
return false;
} catch (error) {
console.error('Error importing fields from JSON:', error);
return false;
}
};

const importFormFromJsonData = (jsonData) => {
try {
const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
if (data && data.sections) {
formSections.value = data.sections;
updateFormState();
return true;
}
return false;
} catch (error) {
console.error('Error importing form from JSON:', error);
return false;
}
};

// Field properties management
const selectFieldForProperties = (field, sectionId) => {
  
  // Garantir que o campo tenha todas as propriedades necessárias
  selectedFieldForProperties.value = {
    ...field,
    columns: parseInt(field.columns) || 1,
    id: field.id || field.ID || field.field_id,
    field_id: field.field_id || field.ID || field.id,
    Name: field.Name || field.name,
    fieldType: field.fieldType || 'text',
    is_mandatory: Boolean(field.is_mandatory),
    is_readonly: Boolean(field.is_readonly),
    is_hide_legend: Boolean(field.is_hide_legend)
  };
  
};

const updateFieldProperties = (updatedField) => {
  
  if (!updatedField) return;

  // Normalizar o campo atualizado
  const normalizedField = {
    ...updatedField,
    columns: parseInt(updatedField.columns) || 1,
    id: updatedField.id || updatedField.ID || updatedField.field_id,
    field_id: updatedField.field_id || updatedField.ID || updatedField.id,
    Name: updatedField.Name || updatedField.name,
    fieldType: updatedField.fieldType || 'text',
    is_mandatory: Boolean(updatedField.is_mandatory),
    is_readonly: Boolean(updatedField.is_readonly),
    is_hide_legend: Boolean(updatedField.is_hide_legend)
  };

  // Find the section containing this field
  const sectionIndex = formSections.value.findIndex(section => 
    section.fields && section.fields.some(field => {
      const fieldIds = {
        id: field.id || field.ID || field.field_id,
        field_id: field.field_id || field.ID || field.id,
        ID: field.ID || field.field_id || field.id
      };
      
      return fieldIds.id === normalizedField.id ||
             fieldIds.field_id === normalizedField.field_id ||
             fieldIds.ID === normalizedField.ID;
    })
  );

  if (sectionIndex !== -1) {
    const section = formSections.value[sectionIndex];
    const fieldIndex = section.fields.findIndex(field => {
      const fieldIds = {
        id: field.id || field.ID || field.field_id,
        field_id: field.field_id || field.ID || field.id,
        ID: field.ID || field.field_id || field.id
      };
      
      return fieldIds.id === normalizedField.id ||
             fieldIds.field_id === normalizedField.field_id ||
             fieldIds.ID === normalizedField.ID;
    });

    if (fieldIndex !== -1) {
      // Update the field
      section.fields[fieldIndex] = {
        ...section.fields[fieldIndex],
        ...normalizedField
      };

      // Update the form state
      updateFormState();
    }
  }
};

const handleRemoveSection = (section) => {
  
  // Encontrar a seção
  const sectionIndex = formSections.value.findIndex(s => s.id === section.id);
  if (sectionIndex === -1) {
    console.error('Section not found:', section.id);
    return;
  }

  // Adicionar os campos de volta à lista de campos disponíveis
  section.fields.forEach(field => {
    // Verificar se o campo já existe na lista de campos disponíveis
    const fieldExists = allAvailableFields.value.some(f => 
      f.ID === field.ID || f.field_id === field.field_id
    );

    if (!fieldExists) {
      // Normalizar o campo antes de adicionar
      const normalizedField = {
        ...field,
        id: field.id || field.ID || field.field_id,
        field_id: field.field_id || field.ID,
        name: field.name || field.Name,
        fieldType: field.fieldType || 'text',
        columns: parseInt(field.columns) || 1,
        is_mandatory: Boolean(field.is_mandatory),
        is_readonly: Boolean(field.is_readonly),
        is_hide_legend: Boolean(field.is_hide_legend)
      };

      allAvailableFields.value.push(normalizedField);
    }
  });

  // Remover a seção
  formSections.value.splice(sectionIndex, 1);
  
  // Atualizar o estado do formulário
  updateFormState();
};

const updateFieldInUse = ({ fieldId, inUse }) => {
  // Procura o campo na lista de campos disponíveis e atualiza a flag
  const field = availableFields.value.find(f => (f.ID || f.field_id) === fieldId);
  if (field) {
    field.FieldInUseOnForm = inUse;
  }
};

// Função de tradução usando getLabel implementada localmente
const getLabel = (phrase) => {
  
  try {
    if (typeof wwLib.wwVariable === 'undefined') return phrase;
    const lang = window.wwLib.wwVariable.getValue('aa44dc4c-476b-45e9-a094-16687e063342');
    const jsonArr = window.wwLib.wwVariable.getValue('4bb37062-2a1b-4cb6-a115-ae6df0c557d2');
    const allLangs = window.wwLib.wwVariable.getValue('5abe8801-7f12-4c9c-b356-900431ab4491');


    if (!lang || !jsonArr || !allLangs) return phrase;
    const isoLangs = allLangs.map(l => l.Lang);
    function findIndexByKey(key) {
      return jsonArr.findIndex(obj => Object.prototype.hasOwnProperty.call(obj, key));
    }
    const part = phrase;
    const idx = findIndexByKey(part);
    if (idx === -1) {
      const labels = {};
      isoLangs.forEach(code => { labels[code] = part; });
      jsonArr.push({ [part]: labels });
      return part;
    } else {
      const entry = jsonArr[idx][part];
      return entry[lang] ?? part;
    }
  } catch (error) {
    return phrase;
  }
};

const translateText = (text) => {
  // Usa getLabel se possível, senão retorna o texto original
  return getLabel(text);
};

// Exemplo de como usar a tradução em métodos
const showTranslatedMessage = () => {
  const message = translateText('Form saved successfully!');
  console.log(message);
  // Aqui você pode usar wwLib.wwUtils.showNotification se estiver no WeWeb
};

// Lifecycle hooks
onMounted(() => {
loadData();

// Use a more reliable approach with multiple attempts and better error handling
const attemptInitialization = (attempts = 0, maxAttempts = 5) => {
if (attempts >= maxAttempts) {
console.warn(`Failed to initialize sortable after ${maxAttempts} attempts`);
return;
}

try {
// Check if the containers are ready
const availableFieldsReady = availableFieldsContainer.value && 
availableFieldsContainer.value.isConnected &&
availableFieldsContainer.value.querySelector('.fields-grid');

const formSectionsReady = formSectionsContainer.value && 
formSectionsContainer.value.isConnected;

if (availableFieldsReady && formSectionsReady) {
// Initialize sortable instances with proper error handling
setTimeout(() => {
try {
initSortable();
} catch (error) {
console.error('Error initializing field sortable:', error);
}

try {
initSectionsSortable();
} catch (error) {
console.error('Error initializing sections sortable:', error);
}
}, 100);
} else {
// Try again with exponential backoff
const delay = Math.min(200 * Math.pow(1.5, attempts), 2000);
setTimeout(() => attemptInitialization(attempts + 1, maxAttempts), delay);
}
} catch (error) {
console.error('Error during initialization attempt:', error);
// Still try again
const delay = Math.min(200 * Math.pow(1.5, attempts), 2000);
setTimeout(() => attemptInitialization(attempts + 1, maxAttempts), delay);
}
};

// Start the initialization process with a longer initial delay
setTimeout(() => attemptInitialization(), 300);
});

watch(() => props.content.fieldsJson, () => {
loadFieldsData();
});

watch(() => props.content.formJson, (newValue) => {
if (newValue) {
loadFormData();
}
}, { immediate: true, deep: true });

const onRemoveField = ({ sectionId, field }) => {
  removeFormField({ sectionId, field });
};

const orderedSections = computed(() => {
  return [...formSections.value].sort((a, b) => {
    const posA = parseInt(a.position) || 0;
    const posB = parseInt(b.position) || 0;
    return posA - posB;
  });
});

return {
isEditing,
availableFields,
formSections,
availableFieldsContainer,
formSectionsContainer,
fieldModalVisible,
sectionModalVisible,
currentField,
currentSection,
isNewField,
isNewSection,
allAvailableFields,
searchQuery,
filteredAvailableFields,
usedFieldIds,
showAddFieldModal,
editField,
saveField,
removeAvailableField,
updateFieldsState,
showAddSectionModal,
editSection,
saveSection,
editFormField,
removeFormField,
updateFormState,
saveFieldsToJson,
importFieldsFromJson,
saveFormToJson,
importFormFromJson,
importFieldsFromJsonData,
importFormFromJsonData,
selectedFieldForProperties,
selectFieldForProperties,
updateFieldProperties,
onRemoveField,
handleRemoveSection,
updateFieldInUse,
orderedSections,
translateText,
showTranslatedMessage
};
}
};
</script>

<style lang="scss" scoped>
.form-builder-container {
font-family: Roboto-Regular, "Open Sans", Arial, sans-serif !important;
color: surface;
width: 100%;
}



.dual-container {
display: flex;
flex-direction: column;
gap: 20px;
width: 100%;
height: calc(100vh - 155px);

@media (min-width: 992px) {
flex-direction: row;
}
}

.form-builder {
    width: 100%;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    height: 100%;
    flex: 1;
    overflow-y: auto;
}

.field-definition-container{
max-width:300px;
width: 300px;
border: 1px solid #e0e0e0;
border-radius: 8px;
background-color: #fff;
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
@media (min-width: 992px) {
width: 50%;
}
}

.container-header {
    margin: 20px 24px 8px;
    height: 24px;
    color: rgb(48, 48, 48);
    font-size: 1.125rem;
    font-weight: 400;
}

.header-actions {
display: flex;
gap: 10px;
}

.add-button {
background-color:transparent;
color: rgb(105, 157, 140);
border: none;
border-radius: 4px;
padding: 6px 12px;
cursor: pointer;
font-size: 14px;
display: flex;
align-items: center;
}

.add-button:hover {
background-color: #d3d3d3;
}

.field-search {
position: relative;
padding: 15px 15px 0;
}

.search-input {
width: 100%;
padding: 10px 15px;
border: 1px solid #ddd;
border-radius: 20px;
font-size: 14px;
outline: none;
}

.search-icon {
position: absolute;
right: 25px;
top: 22px;
color: #999;
width:30px;
height:30px;
}

.available-fields-container {
padding: 15px;
min-height: 100px;
display: flex;
flex-direction: column;
gap: 15px;
}

.fields-grid {
display: grid;
grid-template-columns: repeat(auto-fill, minmax(100%, 1fr));
gap: 5px;
max-height: calc(100vh - 295px); /* Ajuste conforme seu layout */
overflow-y: auto;
}

/* Aplica para qualquer div com rolagem */
.scrollable:hover::-webkit-scrollbar {
  width: 6px; /* largura da barra vertical */
  height: 6px; /* altura da barra horizontal (se necessário) */
}

/* Invisível por padrão */
.scrollable::-webkit-scrollbar {
  width: 0px;
  height: 0px;
}

/* Cor do trilho (fundo da barra) */
.scrollable:hover::-webkit-scrollbar-track {
  background: transparent;
  cursor:default;
}

/* Cor do "thumb" (a barra em si) */
.scrollable:hover::-webkit-scrollbar-thumb {
  background-color: #c0c0c0;
  border-radius: 3px;
  cursor:default;
}

.form-sections-container {
padding: 15px;
}

.container-footer {
padding: 10px;
border-top: 1px solid #e0e0e0;
display: flex;
justify-content: flex-end;
gap: 10px;
}

.action-button {background-color: #f8f9fa;
border: 1px solid #ddd;
border-radius: 4px;padding: 8px 16px;
cursor: pointer;
font-size: 12px;
}

.action-button:hover {
background-color:#e9ecef;
}

.import-button {
background-color: #6c757d;
border: 1px solid #6c757d;
color: white;
}

.import-button:hover {
background-color: #5a6268;
}

.sortable-ghost {
opacity: 0.5;
background: #c8ebfb;
}

.sortable-chosen {background: #e9f5fb;
}

.sortable-drag {
opacity: 0.8;
}

.form-sections-container {
max-height: calc(100vh - 345px); /* Ajuste conforme seu layout */
overflow-y: auto;
}

.section-header {

}

.form-section {
margin: 0;
padding: 0;
}

.form-section .section-header {
margin: 0;
padding: 10px;
}

i.material-symbols-outlined {
font-family: 'Material Symbols Outlined';
font-weight: normal;
font-style: normal;
font-size: 16px;
line-height: 1;
letter-spacing: normal;
text-transform: none;
display: inline-block;
white-space: nowrap;
word-wrap: normal;
direction: ltr;
-webkit-font-feature-settings: 'liga';
-webkit-font-smoothing: antialiased;
vertical-align: middle;
}

i.material-symbols-outlined-search {
font-family: 'Material Symbols Outlined';
font-weight: normal;
font-style: normal;
font-size: 24px;
line-height: 1;
letter-spacing: normal;
text-transform: none;
display: inline-block;
white-space: nowrap;
word-wrap: normal;
direction: ltr;
-webkit-font-feature-settings: 'liga';
-webkit-font-smoothing: antialiased;
vertical-align: middle;
}

.properties-panel-container {
width: 255px;
}


:deep(.inputCabecalhoDiv) {
    width: 100%;
    height: 32px;
}

.cabecalhoFormBuilder
{
    display: flex;
    flex-direction: column;
    background: rgb(245, 246, 250);
    border-radius: 10px 10px 0px 0px;
    padding: 10px 24px;
    border-bottom: 1px solid rgb(218, 220, 222);  
}

:deep(.inputCabecalho) {
    font-size: 1.25rem;
    font-family: Roboto-Light, "Open Sans", Arial, sans-serif;
    border-radius: 4px;
    height: 30px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border: 1px solid transparent;
    padding: 4px 8px;
    background: transparent;
    width: 100%;
    color: rgb(79, 79, 79);
    padding-block: 3px;
    padding-inline: 4px;
}

:deep(.inputCabecalho:hover) {
    background-color: #dedede;
}

:deep(.inputCabecalho:focus) {
    background-color: transparent;
    border: 1px solid rgb(79, 79, 79);
    outline: none;
}


:deep(.elementsformBuilderTop) {
    width: 100%;
    display: flex;
    -webkit-box-align: center;
    align-items: center;
    -webkit-box-pack: justify;
    justify-content: space-between;
    margin-top: 12px;
    column-gap: 24px;
}


:deep(.css-fvhee8 .header-footer-div) {
    width: 50%;
    gap: 8px;
    display: flex;
    -webkit-box-align: center;
    align-items: center;
    flex-shrink: inherit;
    flex-flow: row;
    overflow: hidden;
}

:deep(.css-fvhee8 .header-footer-div > div.template-header) {
    max-width: 23%;
}

:deep(.status-header-display) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  background: transparent;
  font-family: Roboto, sans-serif;
  font-size: 14px;
}

:deep(.status-tags) {
  display: flex;
  gap: 8px;
}

:deep(.tag) {
  border: 1px solid #c0c0c0;
  border-radius: 999px;
  padding: 4px 12px;
  background-color: #f7f8fa;
  color: #333;
  white-space: nowrap;
  font-size: 13px;
}

:deep(.status-user) {
  display: flex;
  align-items: center;
  gap: 16px;
}

:deep(.user-info) {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #2f2f2f;
  font-size: 14px;
}

:deep(.user-icon) {
  width: 24px;
  height: 24px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  background: #f0f0f0;
  border: 1px dashed #bbb;
  border-radius: 50%;
  font-size: 14px;
}

:deep(.status-label) {
  background-color: #5c74a4;
  color: #fff;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: bold;
}

.debug-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px;
  border-radius: 4px;
  max-width: 400px;
  max-height: 300px;
  overflow: auto;
  z-index: 9999;
}

.debug-panel pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.section-spacing {
  margin-bottom: 20px;
}

</style>
