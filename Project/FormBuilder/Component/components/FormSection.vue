<template> 

<div 
class="form-section" 
:class="{ 'is-empty': !section.fields.length, 'expanded': isExpanded }" 
:data-section-id="section.id"
ref="sectionRef"
>
<div class="section-header">
<span class="drag-handle" ref="dragHandle">
<i class="material-symbols-outlined">drag_indicator</i>
</span>
<span 
class="action-icon-section" 
@click="toggleFields"
>
<i class="material-symbols-outlined">{{ isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down' }}</i>
</span>
<h4 
class="section-title" 
:data-section-id="section.id"
contenteditable="true"
@blur="updateSectionTitle"
@keydown.enter.prevent="$event.target.blur()"
>
{{ sectionTitle }}
</h4>

<div class="section-actions">
<button class="action-button" @click="removeSection">
<i class="material-symbols-outlined">delete</i>
</button>
</div>
</div>
<div 
class="sortable-container grid-layout" 
:data-section-id="section.id"
:id="`sortable-${section.id}`"
ref="sortableContainer"
v-show="isExpanded"
>
<DraggableField
v-for="field in sectionFields"
:key="field.id || field.field_id"
:field="field"
:show-properties="true"
:show-actions="true"
:is-editing="isEditing"
:show-field-component="true"
:is-in-form-section="true"
:class="draggableField"
@click="selectField(field)"
@edit-field="$emit('edit-field', field)"
@remove-field="$emit('remove-field', field, section.id)"
/>
</div>
</div>
</template>

<script>
import { computed, ref, onMounted, watch, nextTick } from 'vue';
import Sortable from 'sortablejs';
import DraggableField from './DraggableField.vue';

export default {
name: 'FormSection',
components: {
DraggableField
},
props: {
section: {
type: Object,
required: true
},
allFields: {
type: Array,
default: () => []
},
isEditing: {
type: Boolean,
default: false
}
},
emits: ['update-section', 'edit-section', 'edit-field', 'remove-field', 'select-field', 'remove-section', 'update-field-in-use'],
setup(props, { emit }) {
    const sectionRef = ref(null);
    const dragHandle = ref(null);
    const isExpanded = ref(true);
    const sortableContainer = ref(null);
    const sortableInstance = ref(null);

    const toggleFields = () => {
      isExpanded.value = !isExpanded.value;
    };

    const sectionTitle = computed(() => {
      if (typeof props.section.title === 'object') {
        return props.section.title[currentLang.value] || 'Section';
      }
      return props.section.title || 'Section';
    });

    const currentLang = computed(() => {
      if (typeof window !== 'undefined' && window.wwLib && window.wwLib.wwVariable) {
        return window.wwLib.wwVariable.getValue('aa44dc4c-476b-45e9-a094-16687e063342') || 'pt-BR';
      }
      return 'pt-BR';
    });

    const sectionFields = computed(() => {
      if (!props.section.fields) return [];

      // Ordena os campos pelo valor da propriedade position (ascendente)
      const sortedFields = [...props.section.fields].sort((a, b) => {
        const posA = parseInt(a.position) || 0;
        const posB = parseInt(b.position) || 0;
        return posA - posB;
      });

      return sortedFields.map(field => {
        // If the field has complete data, use it directly
        if (field.name) return field;

        // Otherwise, find the complete field data from allFields
        const completeField = props.allFields.find(f => f.ID === field.field_id);
        if (completeField) {
          return {
            ...completeField,
            ...field,
            // Preserve the section field ID
            id: field.id,
            field_id: field.field_id || completeField.ID,
            // Ensure these properties are properly set
            name: field.name || completeField.name,
            fieldType: field.fieldType || completeField.fieldType,
            columns: parseInt(field.columns) || parseInt(completeField.columns) || 1,
            is_mandatory: field.is_mandatory !== undefined ? field.is_mandatory : completeField.is_mandatory,
            is_readonly: field.is_readonly !== undefined ? field.is_readonly : completeField.is_readonly,
            is_hide_legend: field.is_hide_legend !== undefined ? field.is_hide_legend : completeField.is_hide_legend,
            tip_translations: field.tip_translations || completeField.tip_translations || { [currentLang.value]: field.tip || completeField.tip || '' }
          };
        }

        // Se não encontrar o campo completo, retorne o campo com valores padrão
        return {
          ...field,
          name: field.name || 'Unnamed Field',
          fieldType: field.fieldType || 'text',
          columns: parseInt(field.columns) || 1,
          is_mandatory: Boolean(field.is_mandatory),
          is_readonly: Boolean(field.is_readonly),
          is_hide_legend: Boolean(field.is_hide_legend),
          tip_translations: field.tip_translations || { [currentLang.value]: field.tip || '' }
        };
      });
    });

    const emptyRowClass = computed(() => {
      // Calculate how many columns are used in the last row
      const totalColumns = 4; // Total columns in a row
      let usedColumns = 0;

      if (sectionFields.value.length > 0) {
        // Calculate used columns in the current layout
        const fields = [...sectionFields.value];

        // Track columns used per row
        const rows = [];
        let currentRow = 0;
        let currentRowColumns = 0;

        fields.forEach(field => {
          const fieldColumns = parseInt(field.columns) || 1;
          // If adding this field would exceed row width, move to next row
          if (currentRowColumns + fieldColumns > totalColumns) {
            rows[currentRow] = currentRowColumns;
            currentRow++;
            currentRowColumns = fieldColumns;
          } else {
            currentRowColumns += fieldColumns;
          }
        });

        // Add the last row
        if (currentRowColumns > 0) {
          rows[currentRow] = currentRowColumns;
        }

        // Get columns used in the last row
        usedColumns = rows[currentRow] || 0;
      }

      // Return class for remaining columns
      const remainingColumns = totalColumns - usedColumns;
      return remainingColumns > 0 ? `col-span-${remainingColumns}` : 'hidden';
    });

    const updateSectionTitle = (event) => {
      const newTitle = event.target.innerText.trim();
      if (newTitle && newTitle !== sectionTitle.value) {
        // Update the section title based on its structure
        if (typeof props.section.title === 'object') {
          props.section.title[currentLang.value] = newTitle;
        } else {
          props.section.title = newTitle;
        }
        emit('update-section');
      } else {
        // If empty or unchanged, revert to original title
        event.target.innerText = sectionTitle.value;
      }
    };

    const addField = () => {
      // Implemente se necessário
    };

    const removeSection = () => {
      emit('remove-section', props.section);
    };

    const selectField = (field) => {
      emit('select-field', field, props.section.id);
    };

    const onRemoveField = (field) => {
      // Normaliza os IDs para comparação
      const normalize = f => f.id || f.ID || f.field_id;
      const fieldIdToRemove = normalize(field);

      // Captura o campo completo antes de remover
      const removedField = props.section.fields.find(f => normalize(f) === fieldIdToRemove);

      // Remove do array da section
      props.section.fields = props.section.fields.filter(f => normalize(f) !== fieldIdToRemove);

      // Emite evento para o pai atualizar o campo disponível, usando o id original
      if (removedField) {
        emit('update-field-in-use', { fieldId: removedField.id || removedField.ID || removedField.field_id, inUse: false });
      }

      emit('update-section');
    };

    const initSortable = () => {
      try {
        const containerElement = sortableContainer.value;
        if (!containerElement || !containerElement.isConnected) {
          console.warn('Sortable container is not connected to DOM');
          return;
        }

        // Destroy previous instance if it exists
        if (sortableInstance.value) {
          sortableInstance.value.destroy();
        }

        sortableInstance.value = new Sortable(containerElement, {
          group: {
            name: 'shared-fields',
            pull: true,
            put: function(to, from) {
              // Allow dropping from any container
              return true;
            }
          },
          animation: 150,
          ghostClass: 'sortable-ghost',
          chosenClass: 'sortable-chosen',
          dragClass: 'sortable-drag',
          draggable: '.single-draggable',
          handle: '.drag-handle',
          multiDrag: false,
          forceFallback: false,
          fallbackOnBody: false,
          filter: '.remove-icon, .action-icon',
          onStart: (evt) => {
            if (evt.originalEvent.target.closest('.remove-icon')) {
              evt.preventDefault();
              return false;
            }
          },
          onEnd: (evt) => {
            if (evt && evt.to && evt.oldIndex !== undefined && evt.newIndex !== undefined && evt.oldIndex !== evt.newIndex) {
              // Reordene o array fields conforme a nova ordem
              const movedField = props.section.fields.splice(evt.oldIndex, 1)[0];
              props.section.fields.splice(evt.newIndex, 0, movedField);

              // Atualize as posições dos campos conforme a nova ordem
              props.section.fields.forEach((field, idx) => {
                field.position = idx + 1;
              });

              emit('update-section');
            }
          },
          onAdd: (evt) => {
            if (!evt || !evt.to) return;

            // Get the section ID - use a fallback for null IDs
            const sectionId = evt.to.dataset.sectionId || `temp-${Date.now()}`;

            // Get the field data from the dragged element
            const fieldId = evt.item?.dataset?.fieldId;

            // Get the complete field data
            let fieldData = null;

            if (evt.item && evt.item.__draggableField__) {
              fieldData = evt.item.__draggableField__;
            } else if (fieldId) {
              const fieldType = evt.item?.dataset?.fieldType || 'text';
              const fieldName = evt.item?.dataset?.fieldName || 'Unnamed Field';

              fieldData = {
                ID: fieldId,
                name: fieldName,
                fieldType: fieldType,
                columns: parseInt(evt.item?.dataset?.columns || '1'),
                is_mandatory: false,
                is_readonly: false,
                is_hide_legend: false
              };
            }

            if (fieldId && fieldData) {
              // Verifica se o campo já existe na section (compara id, field_id e ID)
              const alreadyExists = props.section.fields.some(
                f => (f.field_id || f.ID || f.id) === (fieldData.ID || fieldData.field_id || fieldData.id)
              );
              if (alreadyExists) {
                return;
              }

              // Create a new field for the form section
              const newField = {
                id: fieldData.id || fieldData.ID || fieldData.field_id,
                field_id: fieldData.ID,
                position: evt.newIndex + 1,
                columns: parseInt(fieldData.columns) || 1,
                is_mandatory: Boolean(fieldData.is_mandatory),
                is_readonly: Boolean(fieldData.is_readonly),
                is_hide_legend: Boolean(fieldData.is_hide_legend),
                tip_translations: fieldData.tip_translations || { [currentLang.value]: fieldData.tip || '' },
                deleted: false,
                name: fieldData.name,
                fieldType: fieldData.fieldType || 'text'
              };

              // Add the field to the section at the correct position
              if (!props.section.fields) {
                props.section.fields = [];
              }
              props.section.fields.splice(evt.newIndex, 0, newField);
              props.section.fields = [...props.section.fields];

              // Atualize as posições dos campos conforme a nova ordem
              props.section.fields.forEach((field, idx) => {
                field.position = idx + 1;
              });

              // Notify parent component
              emit('update-section');
            }

            // Remove the dragged element
            if (evt.item && evt.item.parentNode) {
              evt.item.parentNode.removeChild(evt.item);
            }
          }
        });
      } catch (error) {
        console.error('Error initializing Sortable:', error);
      }
    };

    const handleDragStart = (event) => {
      // Prevent drag if clicking on interactive elements
      if (event.target.closest('.action-icon-section') || 
          event.target.closest('[contenteditable="true"]')) {
        event.preventDefault();
        return;
      }

      // Add dragging class
      event.currentTarget.classList.add('dragging');

      // Set drag data
      const dragData = {
        sectionId: props.section.id,
        section: props.section
      };

      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/json', JSON.stringify(dragData));
    };

    const handleDragEnd = (event) => {
      // Remove dragging class
      event.currentTarget.classList.remove('dragging');
    };

    onMounted(() => {
      // Initialize sortable when component is mounted
      nextTick(() => {
        initSortable();
      });

      // Add drag and drop event listeners
      const sectionElement = document.querySelector(`[data-section-id="${props.section.id}"]`);
      if (sectionElement) {
        sectionElement.addEventListener('dragstart', (event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('application/json', JSON.stringify({
            sectionId: props.section.id,
            section: props.section
          }));
        });

        sectionElement.addEventListener('dragend', () => {
          sectionElement.draggable = false;
        });
      }

      if (sectionRef.value && dragHandle.value) {
        const sortable = new Sortable(sectionRef.value, {
          handle: dragHandle.value,
          animation: 150,
          ghostClass: 'sortable-ghost',
          dragClass: 'sortable-drag',
          draggable: '.section-header',
          filter: '*',
          onStart: (evt) => {
            // Só permite o arrasto se o clique foi no dragHandle
            if (!evt.target.closest('.drag-handle')) {
              evt.preventDefault();
              return false;
            }
          },
          onEnd: (evt) => {
            if (evt.oldIndex !== evt.newIndex) {
              emit('reorder', {
                oldIndex: evt.oldIndex,
                newIndex: evt.newIndex
              })
            }
          }
        })
      }
    });

    watch(() => props.section, () => {
      // Use nextTick to ensure the DOM is updated
      nextTick(() => {
        initSortable();
      });
    }, { deep: true });

    return {
      sortableContainer,
      sectionTitle,
      sectionFields,
      emptyRowClass,
      updateSectionTitle,
      addField,
      removeSection,
      selectField,
      onRemoveField,
      isExpanded,
      toggleFields,
      handleDragStart,
      handleDragEnd
    };
}
};
</script>

<style scoped>
.form-section {
margin-bottom: 20px;
background-color: surface;
padding: 10px;
position: relative;
user-select: none;
transition: all 0.2s;
}

.form-section.dragging {
opacity: 0.5;
background: transparent;
}

.draggable-field {
border: 0px;
border-radius: 4px;
cursor: pointer;
height: 100%;
width: 100%;
}

.section-header {
display: flex;
justify-content: start;
align-items: center;
margin-bottom: 8px;
padding: 5px;
border-radius: 4px;
user-select: none;
background-color: transparent;
border: none;
position: relative;
}

.section-header:hover {
background-color: transparent;
}

.section-title {
margin: 0;
font-size: 16px;
font-weight: 400;
padding: 0;
color:#3e3f3f;
flex: 1;
cursor: text;
}

.section-title[contenteditable="true"] {
cursor: text;
outline: none;
padding: 2px 5px;
border-radius: 4px;
}

.section-title[contenteditable="true"]:hover {
borde: 1px solid #f5f5f5;
}

.section-title[contenteditable="true"]:focus {
background-color: #f0f0f0;
border: 1px solid #ddd;
}

.section-actions {
display: none;
gap: 5px;
}

.section-header:hover .section-actions {
display: flex;
}

.action-icon {
cursor: pointer; 
font-size: 14px;
opacity: 0.7;
}

.action-icon-section {
cursor: pointer;
font-size: 14px;
opacity: 0.7;
border-radius: 50%;
background-color: #f5f5f5;
border-color: #f5f5f5;
width:25px;
height:25px;
padding:5px 1px 3px 4px;
}

.action-icon:hover {
opacity: 1;
}

.sortable-container {
min-height: 50px;
border: 1px dashed #ccc;
border-radius: 4px;
padding: 10px;
background-color: surface;
}

.grid-layout {
display: grid;
grid-template-columns: repeat(4, 1fr);
gap: 10px;
overflow:auto; 
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

.empty-row {
min-height: 5px;
border: 1px dashed #ccc;
border-radius: 4px;
background-color: surface;
margin-top: 10px;
grid-column-start: auto;
padding: 0; /* Add this to ensure no extra padding */
}

.hidden {
display: none;
}

.sortable-ghost {
opacity: 0.5;
background: #c8ebfb;
}

.sortable-chosen {
background: #e9f5fb;
}

.sortable-drag {
opacity: 0.8;
}

.material-symbols-outlined {
font-size: 16px;
line-height: 1; 
vertical-align: middle;
}

.draggableField{
border:0px;
}

.empty-drop-target {
grid-column: 1 / -1;
min-height: 40px;
border: 1px dashed #ccc;
border-radius: 4px;
margin-top: 10px;
background-color: rgba(0, 0, 0, 0.02);
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
}

.drag-handle {
display: none;
cursor: grab;
color: #666;
padding: 4px;
margin-right: 8px;
border-radius: 4px;
position: relative;
z-index: 1;
}

.section-header:hover .drag-handle {
display: flex;
align-items: center;
justify-content: center;
}

.drag-handle:hover {
display: flex;
cursor: grab;
}

.drag-handle:active {
cursor: grabbing;
}

.action-button {
background: none;
border: none;
padding: 4px;
cursor: pointer;
color: #666;
border-radius: 4px;
display: flex;
align-items: center;
justify-content: center;
}

.action-button:hover {
background: rgba(0, 0, 0, 0.05);
color: #333;
}
</style> 