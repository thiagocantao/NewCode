<template>
<div 
class="draggable-field single-draggable" 
:class="{    
'is-required': field?.is_mandatory, 
'is-readonly': field?.is_readonly,
'is-disabled': isDisabled,
[`col-span-${Math.min(Math.max(parseInt(field?.columns) || 1, 1), 4)}`]: true
}" 
:data-field-id="field?.ID || field?.field_id"
:data-section-field-id="field?.id || null"
:data-columns="field?.columns || 1"
:data-field-type="field?.fieldType || 'text'"
:data-field-name="field?.Name || fieldName"
@click="onFieldClick"
ref="fieldElement"
>
<div class="field-content">
<!-- Ícone de arrastar -->
<div class="drag-handle">
<i class="material-symbols-outlined">drag_indicator</i>
</div>

<template v-if="showFieldComponent || isInFormSection">
<FieldComponent :field="field" />
</template>
<template v-else>
<i class="material-symbols-outlined" style="padding-right:10px; ">{{iconType}}</i>
<div class="field-name">{{ field?.Name || fieldName }}</div>
</template>

<!-- Ícone de exclusão -->
<div v-if="showActions && isInFormSection" class="action-icon remove-icon" @click.stop="onRemoveClick">
<i class="material-symbols-outlined">delete</i>
</div>
</div>
</div>
</template>

<script>
import { computed, onMounted, nextTick, ref } from 'vue';
import FieldComponent from './FieldComponent.vue';

export default {
name: 'DraggableField',
components: {
FieldComponent
},
props: {
field: {
type: Object,
required: true
},
showProperties: {
type: Boolean,
default: false
},
showActions: {
type: Boolean,
default: false
},
isEditing: {
type: Boolean,
default: false
},
showFieldComponent: {
type: Boolean,
default: false
},
isInFormSection: {
type: Boolean,
default: false
},
isDisabled: {
type: Boolean,
default: false
}
},
emits: ['edit-field', 'remove-field', 'click'],
setup(props, { emit }) {
const fieldElement = ref(null);

const fieldName = computed(() => {
// Try to get the name from different possible properties
return props.field?.Name || 
props.field?.name || 
(props.field?.title && typeof props.field.title === 'object' ? props.field.title[window.wwLib.wwVariable.getValue('aa44dc4c-476b-45e9-a094-16687e063342')] : props.field.title) || 
'Unnamed Field';
});

const iconType = computed(() => {
// Try to get the name from different possible properties
switch(props.field?.fieldType)
{
    case "SIMPLE_TEXT": return "insert_text";
    case "FORMATED_TEXT": return "insert_text";
    case "SIMPLE_LIST": return "list";
    case "DATE": return"calendar_month";
    case "DECIMAL": return "numbers";
    case "INTEGER": return "numbers";
    case "YES_NO": return "radio_button_checked";
    case "MULTILINE_TEXT": return "text_ad";

}




return;
});

// Store the field data in the DOM element for drag operations
onMounted(() => {
if (!props.field) {
console.warn('No field data provided to DraggableField');
return;
}

// Use nextTick to ensure DOM is updated
nextTick(() => {
try {
const fieldId = props.field.ID || props.field.field_id;
const sectionFieldId = props.field.id || 'null';

// Add null checks
if (!fieldId) {
console.warn('Field ID is missing');
return;
}

if (!fieldElement.value) {
console.warn('Field element reference not found');
return;
}

// Store a complete copy of the field data to ensure all properties are available during drag
const fieldData = JSON.parse(JSON.stringify(props.field));

// Make sure the field data has all required properties
fieldData.ID = fieldData.ID || fieldData.field_id;
fieldData.Name = fieldData.Name || 'Unnamed Field';
fieldData.fieldType = fieldData.fieldType || 'text';
fieldData.columns = parseInt(fieldData.columns) || 1;

// Store the data on the element
fieldElement.value.__draggableField__ = fieldData;

// Add a unique identifier to help with drag operations
const uniqueId = `field-${fieldId}-${sectionFieldId}-${Date.now()}`;
fieldElement.value.setAttribute('data-unique-id', uniqueId);

// Ensure all necessary data attributes are set
fieldElement.value.dataset.fieldId = fieldData.ID;
fieldElement.value.dataset.fieldType = fieldData.fieldType;
fieldElement.value.dataset.fieldName = fieldData.Name;
fieldElement.value.dataset.columns = fieldData.columns;
} catch (error) {
console.error('Error setting draggable field data:', error);
}
});
});

const onFieldClick = (event) => {
// Only emit click if this is a direct click on the field, not on action buttons
if (event.target.closest('.action-icon')) {
return; // Don't emit click if clicking on an action button
}

emit('click', props.field);
};

const onRemoveClick = (event) => {
  event.stopPropagation();
  event.preventDefault();
  
  // Garantir que o campo tenha todas as propriedades necessárias
  const fieldToRemove = {
    ...props.field,
    id: props.field.id || props.field.ID || props.field.field_id,
    field_id: props.field.field_id || props.field.ID,
    name: props.field.name || fieldName.value,
    fieldType: props.field.fieldType || 'text',
    columns: parseInt(props.field.columns) || 1
  };
  
  emit('remove-field', fieldToRemove);
};

return {
fieldName,
onFieldClick,
iconType,
onRemoveClick,
fieldElement
};
}
};
</script>

<style scoped>
.draggable-field {
background: #fff;
border: 1px solid #ddd;
border-radius: 4px;
transition: all 0.2s ease;
height: 100%;
box-sizing: border-box;
width: 99%;
min-height: 40px;
position: relative;
margin-right:10px;
align-items:center;
}

.draggable-field:hover {
box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.field-content {
display: flex;
align-items: center;
padding: 10px;
gap: 8px;
}

.drag-handle {
cursor: grab;
color: #999;
padding-right: 4px;
display: flex;
align-items: center;
justify-content: center;
opacity: 0;
transition: opacity 0.2s ease;
}

.draggable-field:hover .drag-handle {
opacity: 1;
}

.drag-handle:active {
cursor: grabbing;
}

.field-name {
flex: 1;
font-weight: 400;
font-size: 14px;
color: #3e3f3f;
}

.action-icon {
cursor: pointer;
padding: 5px;
color: #666;
transition: all 0.2s ease;
opacity: 0;
}

.draggable-field:hover .action-icon {
opacity: 1;
}

.action-icon:hover {
color: #ff4444;
}

.remove-icon {
margin-left: auto;
}

.field-status {
display: flex;
align-items: center;
}

.status-icon {
color: #4CAF50;
}

.is-required {
}

.is-readonly {
}

.is-disabled {
opacity: 0.5;
background-color: #f5f5f5;
cursor: not-allowed;
pointer-events: none;
border-left: 3px solid #999;
}

.grid-layout {
display: grid;
grid-template-columns: repeat(1, 1fr);
gap: 10px;
}

.col-span-1 {
grid-column: span 1;
}

.col-span-2 {
  grid-column: span 2;
}

.col-span-3 {
  grid-column: span 3;
}

.col-span-4 {
  grid-column: span 4;
}

.material-symbols-outlined {
font-size: 16px;
line-height: 1;
vertical-align: middle;
}

i.material-symbols-outlined {
font-family: 'Material Symbols Outlined';
font-weight: normal;
font-style: normal;
font-size: 18px;
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
color: rgb(105, 157, 140);
}
</style>