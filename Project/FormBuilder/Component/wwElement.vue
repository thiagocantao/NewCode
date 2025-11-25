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
            :key="field.ID + '-' + (isFieldDisabled(field) ? 'disabled' : 'free')"
            :field="field"
            :show-properties="false"
            :show-actions="true"
            :is-editing="isEditing"
            :show-field-component="false"
            :is-disabled="isFieldDisabled(field)"
            @edit-field="editField"
            @remove-field="removeAvailableField"
            @select-field="selectFieldForProperties"
          />
        </div>
</div>


</div>

<!-- Form Builder Section -->
<div class="form-builder">
    <div v-if="content.showCabecalhoFormBuilder" class="cabecalhoFormBuilder">
      <div class="header-row header-row-title">
        <div class="header-title">
          <input
            type="text"
            class="inputCabecalho"
            v-model="headerTitle"
            :placeholder="translateText('Insert text')"
          />
        </div>
      </div>
      <div class="header-row header-row-controls">
        <div class="header-tags">
          <div
            class="select-wrapper tag-select-wrapper"
            :style="computeSelectWidthStyle(headerPriority, translateText('Select priority'))"
          >
            <select disabled="true" class="tag-selectPriority" v-model="headerPriority">
              <option
                v-for="option in priorityOptions"
                :key="option.value ?? option.label ?? option"
                :value="option.value ?? option.label ?? option"
              >
                {{ option.label ?? option.value ?? option }}
              </option>
            </select>
            <span v-if="!headerPriority" class="select-placeholder">
              {{ translateText('Select priority') }}
            </span>
          </div>
          <div
            class="select-wrapper tag-select-wrapper"
            :style="computeSelectWidthStyle(headerCategory, translateText('Category'))"
          >
            <select disabled="true" class="tag-selectCat1" v-model="headerCategory"></select>
            <span v-if="!headerCategory" class="select-placeholder">
              {{ translateText('Category') }}
            </span>
          </div>
          <div
            class="select-wrapper tag-select-wrapper"
            :style="computeSelectWidthStyle(headerSubcategory, translateText('Subcategory'))"
          >
            <select disabled="true" class="tag-selectCat2" v-model="headerSubcategory"></select>
            <span v-if="!headerSubcategory" class="select-placeholder">
              {{ translateText('Subcategory') }}
            </span>
          </div>
          <div
            class="select-wrapper tag-select-wrapper"
            :style="computeSelectWidthStyle(headerThirdLevelCategory, translateText('Third-level category'))"
          >
            <select disabled="true" class="tag-selectCat3" v-model="headerThirdLevelCategory"></select>
            <span v-if="!headerThirdLevelCategory" class="select-placeholder">
              {{ translateText('Third-level category') }}
            </span>
          </div>
        </div>
        <div class="header-tags-rigth">
          <div class="assignee-wrapper">
            <span class="user-icon">
              <i class="material-symbols-outlined">{{ translateText('person') }}</i>
            </span>
            <div
              class="select-wrapper assignee-select-wrapper"
              :style="computeSelectWidthStyle(headerAssignee, translateText('Unassigned'))"
            >
              <select disabled="true" class="user-select" v-model="headerAssignee"></select>
              <span v-if="!headerAssignee" class="select-placeholder">
                {{ translateText('Unassigned') }}
              </span>
            </div>
          </div>
          <div class="status-wrapper">
            <div
              class="select-wrapper status-select-wrapper"
              :style="computeSelectWidthStyle(headerStatus, translateText('New'))"
            >
              <select disabled="true" class="status-select" v-model="headerStatus"></select>
              <span v-if="!headerStatus" class="select-placeholder status-placeholder">
                {{ translateText('New') }}
              </span>
            </div>
          </div>
        </div>
      </div>
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
@field-value-change="handleFieldValueChange"
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
import { translateTerm } from './translation.js';

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

function normalizeOptions(raw) {
  function toOpt(o) {
    if (o && typeof o === 'object') {
      var value = o.value != null ? o.value : (o.id != null ? o.id : (o.ID != null ? o.ID : (o.key != null ? o.key : (o.Key != null ? o.Key : (o.name != null ? o.name : o.Name)))));
      var label = o.label != null ? o.label : (o.Label != null ? o.Label : (o.name != null ? o.name : (o.Name != null ? o.Name : (value != null ? String(value) : ''))));
      var v = value != null ? value : label;
      return v != null ? { value: v, label: String(label != null ? label : v) } : null;
    }
    if (o == null) return null;
    return { value: o, label: String(o) };
  }
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(toOpt).filter(Boolean);
  if (typeof raw === 'string') {
    var s = raw.trim();
    if (!s) return [];
    try { var parsed = JSON.parse(s); if (Array.isArray(parsed)) return parsed.map(toOpt).filter(Boolean); } catch (e) {}
    return s.split(',').map(function(x){return x.trim();}).filter(Boolean).map(function(x){return { value: x, label: x };});
  }
  if (typeof raw === 'object') return Object.values(raw).map(toOpt).filter(Boolean);
  return [];
}

function resolveFullById(fieldId) {
  var id = fieldId != null ? String(fieldId) : null;
  if (!id) return null;
  function byId(arr) {
    return (arr || []).find(function(c){
      var cid = c && (c.ID != null ? c.ID : (c.id != null ? c.id : (c.field_id != null ? c.field_id : c.FieldId)));
      return cid != null && String(cid) === id;
    });
  }
  try {
    // 1) availableFields.value (se existir no escopo)
    if (typeof availableFields !== 'undefined' && availableFields && Array.isArray(availableFields.value)) {
      var f1 = byId(availableFields.value);
      if (f1) return f1;
    }
  } catch (e) {}
  try {
    // 2) fontes globais
    if (typeof window !== 'undefined') {
      if (Array.isArray(window.__fieldsMaster)) {
        var f2 = byId(window.__fieldsMaster); if (f2) return f2;
      }
      if (Array.isArray(window.__fieldsCatalog)) {
        var f3 = byId(window.__fieldsCatalog); if (f3) return f3;
      }
      if (Array.isArray(window.__allFieldsFull)) {
        var f4 = byId(window.__allFieldsFull); if (f4) return f4;
      }
    }
  } catch (e) {}
  return null;
}





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
name: { "en-US": "Created Form" },
workspace_id: "00000000-0000-0000-0000-000000000000",
company_id: null,
is_current: true
},
sections: []
};
}

const cloneDeep = (value) => {
  if (value === undefined) {
    return undefined;
  }
  try {
    console.log(JSON.parse(JSON.stringify(value)))
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to clone value', error);
    return value;
  }
};

// State
const availableFields = ref([]);

// ===== Helpers: cache/normalize list options for SIMPLE_LIST/CONTROLLED_LIST =====
function __toOptionLike(opt) {
  if (opt && typeof opt === 'object') {
    const value = opt.value ?? opt.id ?? opt.ID ?? opt.key ?? opt.Key ?? opt.name ?? opt.Name ?? null;
    const label = opt.label ?? opt.Label ?? opt.name ?? opt.Name ?? (value != null ? String(value) : '');
    const v = value != null ? value : label;
    return v != null ? { value: v, label: String(label ?? v) } : null;
  }
  if (opt == null) return null;
  return { value: opt, label: String(opt) };
}
function __parseOptionList(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(__toOptionLike).filter(Boolean);
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(__toOptionLike).filter(Boolean);
    } catch (_) {}
    return s.split(',').map(x => x.trim()).filter(Boolean).map(x => ({ value: x, label: x }));
  }
  if (typeof raw === 'object') {
    const values = Object.values(raw);
    return Array.isArray(values) ? values.map(__toOptionLike).filter(Boolean) : [];
  }
  return [];
}
function __isListType(t) {
  const x = String(t || '').toUpperCase();
  return x === 'SIMPLE_LIST' || x === 'CONTROLLED_LIST' || x === 'LIST';
}
function __withOptionsCache(field) {
  const f = { ...field };
  try {
    const rawLO =
      f.list_options ?? f.listOptions ?? f.ListOptions ??
      f?.dataSource?.list_options ?? f?.DataSource?.list_options ?? null;
    const cache = __parseOptionList(rawLO);
    // Armazena o cache sem quebrar o que já existe
    f.__optionsCache = cache;
    if (__isListType(f.fieldType) && (!Array.isArray(f.options) || f.options.length === 0) && cache.length) {
      f.options = cache;
      f.list_options = cache;
      f.listOptions = cache;
    }
  } catch (_) {}
  return f;
}
// ===== End Helpers =====

// ===== Helpers: inflate/normalize list options from JSON/DataSource =====
function toOptionLike(opt) {
  if (opt && typeof opt === 'object') {
    const value = opt.value ?? opt.id ?? opt.ID ?? opt.key ?? opt.Key ?? opt.name ?? opt.Name ?? null;
    const label = opt.label ?? opt.Label ?? opt.name ?? opt.Name ?? (value != null ? String(value) : '');
    const v = value != null ? value : label;
    return v != null ? { value: v, label: String(label ?? v) } : null;
  }
  if (opt == null) return null;
  return { value: opt, label: String(opt) };
}
function parseOptionList(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(toOptionLike).filter(Boolean);
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(toOptionLike).filter(Boolean);
    } catch (_) {}
    // CSV fallback
    return s.split(',').map(x => x.trim()).filter(Boolean).map(x => ({ value: x, label: x }));
  }
  if (typeof raw === 'object') {
    const values = Object.values(raw);
    return Array.isArray(values) ? values.map(toOptionLike).filter(Boolean) : [];
  }
  return [];
}
function isListType(t) {
  const x = String(t || '').toUpperCase();
  return x === 'SIMPLE_LIST' || x === 'CONTROLLED_LIST' || x === 'LIST';
}
function inflateFieldFromJson(field) {
  const f = field || {};
  try {
    const rawLO =
      f.list_options ?? f.listOptions ?? f.ListOptions ??
      f?.dataSource?.list_options ?? f?.DataSource?.list_options ?? null;
    const opts = parseOptionList(rawLO);
    if (opts.length) {
      f.list_options = opts;
      f.listOptions  = opts;
      f.options      = Array.isArray(f.options) && f.options.length ? f.options : opts;
    }
  } catch (e) { /* ignore */ }
  return f;
}
// ===== End Helpers =====

const formSections = ref([]);
const fieldDefinitionCache = new Map();
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

const cloneFieldDefinition = (field) => {
  if (!field || typeof field !== 'object') {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(field));
  } catch (error) {
    console.warn('Failed to clone field definition for cache', error);
    return { ...field };
  }
};

const getFieldCacheKey = (field) => {
  if (!field || typeof field !== 'object') {
    return null;
  }

  const rawId =
    field.ID ||
    field.id ||
    field.field_id ||
    field.FieldId ||
    null;

  if (rawId == null) {
    return null;
  }

  return String(rawId);
};

const rememberFieldDefinition = (field) => {
  const cacheKey = getFieldCacheKey(field);
  if (!cacheKey) {
    return;
  }

  const cloned = cloneFieldDefinition(field);
  if (cloned) {
    fieldDefinitionCache.set(cacheKey, cloned);
  }
};

const rememberFieldDefinitions = (fields) => {
  if (!Array.isArray(fields)) {
    return;
  }

  fields.forEach(field => rememberFieldDefinition(field));
};

const getCachedFieldDefinition = (fieldId) => {
  if (fieldId == null) {
    return null;
  }

  return fieldDefinitionCache.get(String(fieldId)) || null;
};

// Form header state
const headerTitle = ref('');
const headerPriority = ref('');
const headerCategory = ref('');
const headerSubcategory = ref('');
const headerThirdLevelCategory = ref('');
const headerAssignee = ref('');
const headerStatus = ref('');

const normalizePriorityOption = option => {
  if (option == null) {
    return null;
  }

  if (typeof option !== 'object') {
    const primitiveValue = String(option);
    return { value: primitiveValue, label: primitiveValue };
  }

  const rawValue =
    option.value ??
    option.Value ??
    option.id ??
    option.ID ??
    option.Id ??
    option.key ??
    option.Key ??
    option.slug ??
    option.Slug ??
    null;

  const rawLabel =
    option.label ??
    option.Label ??
    option.name ??
    option.Name ??
    option.title ??
    option.Title ??
    option.description ??
    option.Description ??
    null;

  const normalizedValueCandidate =
    rawValue != null && typeof rawValue !== 'object'
      ? String(rawValue)
      : rawLabel != null && typeof rawLabel !== 'object'
        ? String(rawLabel)
        : null;

  if (!normalizedValueCandidate) {
    return null;
  }

  const normalizedLabelCandidate =
    rawLabel != null && typeof rawLabel !== 'object'
      ? String(rawLabel)
      : normalizedValueCandidate;

  return {
    value: normalizedValueCandidate,
    label: normalizedLabelCandidate
  };
};

const priorityOptions = computed(() => {
 
  const collectionData = wwLib.wwCollection.getCollection("913fd277-8f18-420e-977e-ce52b6a751f9").data;

  if (!Array.isArray(collectionData)) {
    return [];
  }

  const seenValues = new Set();

  return collectionData
    .map(normalizePriorityOption)
    .filter(option => {
      if (!option || !option.value) {
        return false;
      }

      if (seenValues.has(option.value)) {
        return false;
      }

      seenValues.add(option.value);
      return true;
    });
});

watch(priorityOptions, newOptions => {
  if (!newOptions.some(option => option.value === headerPriority.value)) {
    headerPriority.value = '';
  }
});

const getDisplayLength = (value) => {
  if (!value && value !== 0) {
    return 0;
  }
  if (typeof value === 'string') {
    return value.length;
  }
  if (typeof value === 'number') {
    return value.toString().length;
  }
  if (value && typeof value === 'object') {
    if (typeof value.label === 'string') {
      return value.label.length;
    }
    if (typeof value.name === 'string') {
      return value.name.length;
    }
  }
  return String(value).length;
};

const computeSelectWidthStyle = (value, fallbackLabel = '') => {
  const fallbackLength = typeof fallbackLabel === 'string' ? fallbackLabel.length : 0;
  const valueLength = getDisplayLength(value);
  const computedLength = Math.max(valueLength, fallbackLength, 6);

  return {
    '--select-placeholder-length': computedLength
  };
};

// Tag controls that must remain disabled in the available fields list
const ALWAYS_DISABLED_TAG_CONTROLS = new Set([
  'STATUSID',
  'PRIORITYID',
  'CATEGORYID',
  'SUBCATEGORYID',
  'CATEGORYLEVEL3ID',
  'RESPONSIBLEUSERID'
]);

const getFieldTagControl = field =>
  (field?.TagControl ?? field?.tagControl ?? field?.tagcontrol ?? '')
    .toString()
    .toUpperCase();

const isFieldPermanentlyDisabled = field =>
  ALWAYS_DISABLED_TAG_CONTROLS.has(getFieldTagControl(field));

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

const isFieldDisabled = field => {
  if (isFieldPermanentlyDisabled(field)) {
    return true;
  }

  const fieldId = field?.ID || field?.field_id;
  return fieldId ? usedFieldIds.value.has(fieldId) : false;
};

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
    return window.wwLib.wwVariable.getValue('aa44dc4c-476b-45e9-a094-16687e063342') || 'en-US';
  }
  return 'en-US';
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
onStart: () => {
setSectionsSortableDisabled(true);
},
onEnd: (evt) => {
setSectionsSortableDisabled(false);
if (evt && evt.item && evt.item.parentNode) {
updateFormState();
}
},
      onClone: (evt) => {
      try {
        var _fid = null;
        try { _fid = evt.clone && evt.clone.dataset && evt.clone.dataset.fieldId ? evt.clone.dataset.fieldId : null; } catch(e){}
        if (!_fid) {
          try { _fid = evt.item && evt.item.dataset && evt.item.dataset.fieldId ? evt.item.dataset.fieldId : null; } catch(e){}
        }
        var full = resolveFullById(_fid) || (evt.clone && evt.clone.__draggableField__) || (evt.item && evt.item.__draggableField__) || null;
        var rawLO = full && (full.list_options != null ? full.list_options :
                            (full.listOptions != null ? full.listOptions :
                            (full.ListOptions != null ? full.ListOptions :
                            (full.dataSource && full.dataSource.list_options) ? full.dataSource.list_options :
                            (full.DataSource && full.DataSource.list_options) ? full.DataSource.list_options : null)));
        var norm = normalizeOptions(rawLO);
        try { evt.clone.dataset.listOptionsJson = JSON.stringify(norm); } catch(e){}
        try { evt.clone.dataset.dataSourceJson  = JSON.stringify(full && (full.dataSource || full.DataSource) || null); } catch(e){}
               
      } catch (e) {
        try { console.warn('[FB-LIST][onClone:set] error', e); } catch(_){}

      }


        if (!evt || !evt.item || !evt.clone) {
          return;
        }

        try {
          const originalFieldEl = evt.item;
          const elementFieldId = originalFieldEl.dataset?.fieldId || null;
          const storedField = originalFieldEl.__draggableField__ || null;

          const findFieldById = (id) => {
            if (!id) return null;
            return (
              availableFields.value.find(candidate => {
                const candidateId =
                  candidate.ID || candidate.id || candidate.field_id || candidate.FieldId;
                return candidateId != null && String(candidateId) === String(id);
              }) || null
            );
          };

          const sourceField = storedField || findFieldById(elementFieldId);
          if (!sourceField) {
            return;
          }

          const clonedField = JSON.parse(JSON.stringify(sourceField));

          const normalizedId =
            clonedField.field_id ||
            clonedField.FieldId ||
            clonedField.ID ||
            clonedField.id ||
            elementFieldId ||
            null;
          const normalizedName =
            clonedField.Name || clonedField.name || clonedField.title || 'Unnamed Field';
          const normalizedFieldType =
            clonedField.fieldType || clonedField.FieldType || clonedField.type || 'text';
          const normalizedColumns =
            parseInt(clonedField.columns ?? clonedField.Columns ?? 1, 10) || 1;

          clonedField.ID = normalizedId;
          clonedField.id = clonedField.id || normalizedId;
          clonedField.field_id = clonedField.field_id || normalizedId;
          clonedField.FieldId = clonedField.FieldId || clonedField.field_id;
          clonedField.Name = normalizedName;
          clonedField.name = clonedField.name || normalizedName;
          clonedField.fieldType = normalizedFieldType;
          clonedField.FieldType = clonedField.FieldType || normalizedFieldType;
          clonedField.columns = normalizedColumns;
          clonedField.Columns = clonedField.Columns || normalizedColumns;

          evt.clone.__draggableField__ = clonedField;
          evt.clone.dataset.fieldId = normalizedId != null ? String(normalizedId) : '';
          evt.clone.dataset.fieldType = normalizedFieldType;
          evt.clone.dataset.fieldName = normalizedName;
          
          try {
            const srcField = evt.clone.__draggableField__ || storedField || sourceField || {};
            const cache = srcField.__optionsCache || [];
            evt.clone.dataset.cachedOptionsJson = JSON.stringify(cache);
          } catch (_) {}
evt.clone.dataset.columns = String(normalizedColumns);
          
          try {
            const srcField = evt.clone.__draggableField__ || storedField || sourceField || {};
            const cache = srcField.__optionsCache || [];
            evt.clone.dataset.cachedOptionsJson = JSON.stringify(cache);
          } catch (_) {}
evt.clone.setAttribute('data-unique-id', `field-${normalizedId ?? 'temp'}-${Date.now()}`);
        } catch (error) {
          console.error('Error preparing cloned field metadata:', error);
        }
      }
    });
} else {
}
} catch (error) {
console.error('Error initializing Sortable in field definition container:', error);
}
}
}
// Helper to temporarily disable the sections Sortable instance while dragging fields
function setSectionsSortableDisabled(disabled) {
  const sortableInstance =
    formSectionsContainer.value && formSectionsContainer.value._sortable;

  if (sortableInstance && typeof sortableInstance.option === 'function') {
    sortableInstance.option('disabled', !!disabled);
  }
}

// Initialize sortable for form sections
const initSectionsSortable = () => {
if (!formSectionsContainer.value) {

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
forceFallback: false,
onMove: (evt) => {
// Verifica se o elemento relacionado existe e está conectado ao DOM
if (!evt.related || !evt.related.parentNode) {
return false;
}

// Verifica se o elemento está sendo movido para um container válido
const targetContainer = evt.to;
if (!targetContainer || !targetContainer.isConnected) {
return false;
}

// Verifica se o elemento tem filhos antes de tentar acessar lastElementChild
if (targetContainer.children && targetContainer.children.length > 0) {
const lastChild = targetContainer.lastElementChild;
if (!lastChild || !lastChild.isConnected) {
return false;
}
}

return true;
}
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
      onStart: () => {
        setSectionsSortableDisabled(true);
      },
      onAdd: (evt) => {
        if (!evt || !evt.item) {
          setSectionsSortableDisabled(false);
          return;
        }

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
            
          try {
            const ds = evt.item?.dataset || {};
            if (ds.cachedOptionsJson && ds.cachedOptionsJson !== 'undefined') {
              const cache = JSON.parse(ds.cachedOptionsJson);
              if (Array.isArray(cache) && cache.length) {
                clonedField.options = cache; clonedField.list_options = cache; clonedField.listOptions = cache;
              }
            }
          } catch (_) {}
const normalizedSourceId =
              originalField.field_id ||
              originalField.FieldId ||
              originalField.ID ||
              originalField.id ||
              originalFieldEl.dataset?.fieldId ||
              null;
            const cachedDefinition = getCachedFieldDefinition(normalizedSourceId);
            if (cachedDefinition) {
              let clonedCached;
              try {
                clonedCached = JSON.parse(JSON.stringify(cachedDefinition));
              } catch (cacheError) {
                console.warn('Failed to clone cached field definition', cacheError);
                clonedCached = { ...cachedDefinition };
              }

              if (clonedField.dataSource == null && clonedCached) {
                clonedField.dataSource = clonedCached.dataSource ?? clonedCached.DataSource ?? clonedField.dataSource;
              }

              if (clonedField.DataSource == null && clonedCached) {
                clonedField.DataSource = clonedCached.DataSource ?? clonedCached.dataSource ?? clonedField.DataSource;
              }

              if (clonedField.list_options == null && clonedCached?.list_options != null) {
                clonedField.list_options = Array.isArray(clonedCached.list_options)
                  ? clonedCached.list_options.map(option =>
                      option && typeof option === 'object' ? { ...option } : option
                    )
                  : clonedCached.list_options;
              }

              if (clonedField.listOptions == null && clonedCached?.listOptions != null) {
                clonedField.listOptions = Array.isArray(clonedCached.listOptions)
                  ? clonedCached.listOptions.map(option =>
                      option && typeof option === 'object' ? { ...option } : option
                    )
                  : clonedCached.listOptions;
              }

              if (clonedField.options == null && clonedCached?.options != null) {
                clonedField.options = Array.isArray(clonedCached.options)
                  ? clonedCached.options.map(option =>
                      option && typeof option === 'object' ? { ...option } : option
                    )
                  : clonedCached.options;
              }

              if (clonedField.default_value === undefined && clonedCached?.default_value !== undefined) {
                clonedField.default_value = clonedCached.default_value;
              }

              if (clonedField.defaultValue === undefined && clonedCached?.defaultValue !== undefined) {
                clonedField.defaultValue = clonedCached.defaultValue;
              }

              if (clonedField.value === undefined && clonedCached?.value !== undefined) {
                clonedField.value = clonedCached.value;
              }
            }
            const normalizedFieldType =
              originalField.fieldType || originalField.FieldType || 'text';
            const normalizedName =
              originalField.Name || originalField.name || 'Unnamed Field';
            const normalizedColumns =
              parseInt(originalField.columns ?? originalField.Columns ?? 1, 10) || 1;

            clonedField.id = null;
            clonedField.ID = normalizedSourceId;
            clonedField.field_id = normalizedSourceId;
            clonedField.FieldId = originalField.FieldId || normalizedSourceId;
            clonedField.fieldType = normalizedFieldType;
            clonedField.FieldType = originalField.FieldType || normalizedFieldType;
            clonedField.Name = normalizedName;
            clonedField.name = originalField.name || normalizedName;
            clonedField.columns = normalizedColumns;
            clonedField.Columns = originalField.Columns || normalizedColumns;
            if (clonedField.dataSource && !clonedField.DataSource) {
              clonedField.DataSource = clonedField.dataSource;
            }
            if (clonedField.DataSource && !clonedField.dataSource) {
              clonedField.dataSource = clonedField.DataSource;
            }

            // Preserve list options metadata for SIMPLE_LIST fields
            if (
              clonedField.fieldType === 'SIMPLE_LIST' &&
              clonedField.list_options == null &&
              clonedField.listOptions == null &&
              Array.isArray(clonedField.options)
            ) {
              const optionsClone = clonedField.options.map(option => ({ ...option }));
              clonedField.list_options = optionsClone;
              clonedField.listOptions = optionsClone;
            }

            if (
              clonedField.fieldType === 'SIMPLE_LIST' &&
              clonedField.options == null &&
              Array.isArray(clonedField.list_options)
            ) {
              clonedField.options = clonedField.list_options.map(option => ({ ...option }));
            }

            if (!section.fields) {
              section.fields = (Array.isArray((Array.isArray([]) ? [].map(inflateFieldFromJson) : [])) ? (Array.isArray([]) ? [].map(inflateFieldFromJson) : []).map(__withOptionsCache) : (Array.isArray([]) ? [].map(inflateFieldFromJson) : []));
            }

            // Calcula a posição correta baseada no elemento alvo
            const targetElement = evt.to.children[evt.newIndex];
            const allElements = Array.from(evt.to.children);
            const targetIndex = allElements.indexOf(targetElement);

            // Se o elemento está sendo movido para o final
            if (targetIndex === allElements.length - 1) {
              /* ensure options populated before insert */
          try {
            if (!Array.isArray(clonedField.options) || clonedField.options.length === 0) {
              if (Array.isArray(clonedField.__optionsCache) && clonedField.__optionsCache.length) {
                clonedField.options = clonedField.__optionsCache; clonedField.list_options = clonedField.__optionsCache; clonedField.listOptions = clonedField.__optionsCache;
              } else {
                const rawLO = clonedField.list_options ?? clonedField.listOptions ?? clonedField.ListOptions ?? clonedField?.dataSource?.list_options ?? clonedField?.DataSource?.list_options ?? null;
                const opts = __parseOptionList(rawLO);
                if (opts.length) { clonedField.options = opts; clonedField.list_options = opts; clonedField.listOptions = opts; }
              }
            }
          } catch (_) {}
section.fields.push(clonedField);
            } else {
              // Insere o campo na posição correta
              section.fields.splice(targetIndex, 0, clonedField);
            }

            updateFormState();

            const index = availableFields.value.findIndex(candidate => {
              const candidateId =
                candidate.ID || candidate.id || candidate.field_id || candidate.FieldId;
              return (
                candidateId != null &&
                normalizedSourceId != null &&
                String(candidateId) === String(normalizedSourceId)
              );
            });
            if (index !== -1) {
              availableFields.value.splice(index, 1);
              updateFieldsState();
            }
          }
        } catch (error) {
          console.error('Error in onAdd handler:', error);
          if (evt && evt.item) {
            evt.item.remove();
          }
        } finally {
          setSectionsSortableDisabled(false);
        }
      },
      onEnd: () => {
        setSectionsSortableDisabled(false);
      },
      onUpdate: (evt) => {
        try {
          if (!evt || !evt.item) return;

          const sectionElement = evt.to.closest('.form-section');
          if (!sectionElement) {
            evt.item.remove();
            return;
          }

          const sectionId = sectionElement.querySelector('.section-title')?.dataset.sectionId;
          const section = formSections.value.find(s => s.id === sectionId);
          if (!section) {
            evt.item.remove();
            return;
          }

          const targetElement = evt.to.children[evt.newIndex];
          const allElements = Array.from(evt.to.children);
          const targetIndex = allElements.indexOf(targetElement);

          if (!section.fields) {
            section.fields = (Array.isArray((Array.isArray([]) ? [].map(inflateFieldFromJson) : [])) ? (Array.isArray([]) ? [].map(inflateFieldFromJson) : []).map(__withOptionsCache) : (Array.isArray([]) ? [].map(inflateFieldFromJson) : []));
          }

          const movedField = section.fields.splice(evt.oldIndex, 1)[0];
          section.fields.splice(targetIndex, 0, movedField);
          updateFormState();
        } catch (error) {
          console.error('Error in onUpdate handler:', error);
          if (evt && evt.item) {
            evt.item.remove();
          }
        } finally {
          setSectionsSortableDisabled(false);
        }
      }
    });
  });
};

// Inicializa os containers de campos
initFieldsContainers();
} else {
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

    const cloneArray = array => {
      if (!Array.isArray(array)) {
        return [];
      }

      try {
        return JSON.parse(JSON.stringify(array));
      } catch (cloneError) {
        console.warn('Failed to deeply clone fields array, falling back to shallow copy.', cloneError);
        return array.map(item => (item && typeof item === 'object' ? { ...item } : item));
      }
    };

    const rawFields = props.content.fieldsJson;

    if (rawFields) {
      if (typeof rawFields === 'string') {
        try {
          const parsed = JSON.parse(rawFields);
          if (Array.isArray(parsed)) {
            data = cloneArray(parsed);
          } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.fields)) {
            data = cloneArray(parsed.fields);
          } else {
            console.warn('fieldsJson string did not contain an array of fields.');
          }
        } catch (e) {
          console.error('Failed to parse fields JSON:', e);
        }
      } else if (Array.isArray(rawFields)) {
        data = cloneArray(rawFields);
      } else if (typeof rawFields === 'object') {
        if (Array.isArray(rawFields.fields)) {
          data = cloneArray(rawFields.fields);
        } else {
          console.warn(
            'Unsupported fieldsJson object format. Expected an array or a { fields: [] } object.',
            rawFields
          );
        }
      }
    }

    // If no data from JSON or parsing failed, use default fields
    if (!Array.isArray(data) || !data.length) {
      data = cloneArray(props.content.defaultFields || []);
    }

    availableFields.value = Array.isArray(data) ? data : [];
    rememberFieldDefinitions(availableFields.value);
    setFieldsData(availableFields.value);
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
name: { "en-US": 'Created Form' },
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
name: { "en-US": 'Created Form' },
workspace_id: "00000000-0000-0000-0000-000000000000",
company_id: null,
is_current: true
},
sections: []
};
}

// Initialize the global FormFieldsJsonSave variable
if (typeof window !== 'undefined') {
    window.FormFieldsJsonSave = cloneDeep(data);
}

// Convert sections array to the format expected by the component
    formSections.value = cloneDeep(data.sections || []);
    const formSectionFields = [];
    formSections.value.forEach(section => {
      if (section && Array.isArray(section.fields)) {
        section.fields.forEach(field => {
          formSectionFields.push(field);
        });
      }
    });
    rememberFieldDefinitions(formSectionFields);
    setFormData(cloneDeep(data));
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
rememberFieldDefinition(field);
} else {
const index = availableFields.value.findIndex(candidate => {
  const candidateId =
    candidate.ID || candidate.id || candidate.field_id || candidate.FieldId;
  const fieldId = field.ID || field.id || field.field_id || field.FieldId;
  return candidateId != null && fieldId != null && String(candidateId) === String(fieldId);
});
if (index !== -1) {
availableFields.value[index] = field;
rememberFieldDefinition(field);
}
}
updateFieldsState();
};

const removeAvailableField = (field) => {
const index = availableFields.value.findIndex(candidate => {
  const candidateId =
    candidate.ID || candidate.id || candidate.field_id || candidate.FieldId;
  const fieldId = field.ID || field.id || field.field_id || field.FieldId;
  return candidateId != null && fieldId != null && String(candidateId) === String(fieldId);
});
if (index !== -1) {
availableFields.value.splice(index, 1);
updateFieldsState();
}
};

const updateFieldsState = () => {
rememberFieldDefinitions(availableFields.value);
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
    title: { "en-US": "New Section" },
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
const normalizedRemovedId =
  removedField.field_id ||
  removedField.FieldId ||
  removedField.ID ||
  removedField.id ||
  null;

const fieldToAdd = {
  ...JSON.parse(JSON.stringify(removedField)),
  ID: normalizedRemovedId,
  field_id: normalizedRemovedId,
  FieldId: removedField.FieldId || normalizedRemovedId,
  Name: removedField.Name || removedField.name,
  name: removedField.name || removedField.Name,
  fieldType: removedField.fieldType || removedField.FieldType || 'text',
  FieldType: removedField.FieldType || removedField.fieldType || 'text',
  columns: parseInt(removedField.columns ?? removedField.Columns ?? 1, 10) || 1,
  Columns: removedField.Columns || parseInt(removedField.columns ?? 1, 10) || 1,
  is_mandatory: Boolean(removedField.is_mandatory ?? removedField.IsMandatory),
  is_readonly: Boolean(removedField.is_readonly ?? removedField.IsReadOnly),
  is_hide_legend: Boolean(removedField.is_hide_legend ?? removedField.IsHideLegend)
};

if (fieldToAdd.dataSource && !fieldToAdd.DataSource) {
  fieldToAdd.DataSource = fieldToAdd.dataSource;
}
if (fieldToAdd.DataSource && !fieldToAdd.dataSource) {
  fieldToAdd.dataSource = fieldToAdd.DataSource;
}

if (
  fieldToAdd.fieldType === 'SIMPLE_LIST' &&
  Array.isArray(fieldToAdd.list_options) &&
  !fieldToAdd.options
) {
  fieldToAdd.options = fieldToAdd.list_options.map(option => ({ ...option }));
}

if (
  fieldToAdd.fieldType === 'SIMPLE_LIST' &&
  !fieldToAdd.list_options &&
  Array.isArray(fieldToAdd.options)
) {
  const optionsClone = fieldToAdd.options.map(option => ({ ...option }));
  fieldToAdd.list_options = optionsClone;
  fieldToAdd.listOptions = optionsClone;
}

// Verificar se o campo já existe na lista de campos disponíveis
const existingFieldIndex = availableFields.value.findIndex(candidate => {
  const candidateId =
    candidate.ID || candidate.id || candidate.field_id || candidate.FieldId;
  return (
    candidateId != null &&
    fieldToAdd.ID != null &&
    String(candidateId) === String(fieldToAdd.ID)
  );
});

if (existingFieldIndex === -1) {
  availableFields.value.push(fieldToAdd);
  rememberFieldDefinition(fieldToAdd);
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

const normalizeStringArray = (value) => {
  if (Array.isArray(value)) return value.map(item => String(item));
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
};

const updateFormState = () => {
  const baseFormData = cloneDeep(formData.value) || {};
  const formMetadata = baseFormData.form || {
    id: null,
    name: { "en-US": 'New Form' },
    workspace_id: '00000000-0000-0000-0000-000000000000',
    company_id: null,
    is_current: true
  };

  const normalizedSections = formSections.value.map((section, index) => ({
    ...section,
    position: index + 1,
    fields: (section.fields || []).map(field => ({
      id: field.id === field.field_id ? null : field.id || null,
      field_id: field.field_id || field.ID,
      position: field.position || 1,
      columns: parseInt(field.columns) || 1,
      is_mandatory: normalizeBoolean(field.is_mandatory),
      is_readonly: normalizeBoolean(field.is_readonly),
      is_hide_legend: normalizeBoolean(field.is_hide_legend),
      show_only: normalizeBoolean(field.show_only),
      show_only_groups: normalizeStringArray(field.show_only_groups),
      IsHiddenInEndUserNewTicket: normalizeBoolean(field.IsHiddenInEndUserNewTicket),
      IsHiddenInEndUserViewTicket: normalizeBoolean(field.IsHiddenInEndUserViewTicket),
      tip_translations: field.tip_translations || { 'en-US': field.tip || '' },
      deleted: false,
      name: field.name,
      fieldType: field.fieldType,
      default_value:
        field.default_value !== undefined
          ? field.default_value
          : field.defaultValue !== undefined
            ? field.defaultValue
            : field.value ?? null
    }))
  }));

  const formDataValue = {
    ...baseFormData,
    form: formMetadata,
    sections: normalizedSections
  };

  const nextValue = cloneDeep(formDataValue);

  if (typeof window !== 'undefined') {
    window.FormFieldsJsonSave = nextValue;
  }

  setFormData(nextValue);
  emit('trigger-event', {
    name: 'formUpdated',
    event: { value: cloneDeep(nextValue) }
  });
};

watch(formSections, () => {
  updateFormState();
}, { deep: true });

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
name: { "en-US": 'Created Form' }
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
      is_hide_legend: Boolean(field.is_hide_legend),
      show_only: Boolean(field.show_only),
      show_only_groups: normalizeStringArray(field.show_only_groups),
      IsHiddenInEndUserNewTicket: Boolean(field.IsHiddenInEndUserNewTicket),
      IsHiddenInEndUserViewTicket: Boolean(field.IsHiddenInEndUserViewTicket)
    };
  
};

const updateFieldProperties = (updatedField) => {

  if (!updatedField) return;

console.log("UPDATE", updatedField)
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
    is_hide_legend: Boolean(updatedField.is_hide_legend),
    show_only: Boolean(updatedField.show_only),
    show_only_groups: normalizeStringArray(updatedField.show_only_groups),
    IsHiddenInEndUserNewTicket: Boolean(updatedField.IsHiddenInEndUserNewTicket),
    IsHiddenInEndUserViewTicket: Boolean(updatedField.IsHiddenInEndUserViewTicket)
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

      // Mantém o painel de propriedades sincronizado com os valores alterados
      selectedFieldForProperties.value = {
        ...section.fields[fieldIndex]
      };

      // Update the form state
      updateFormState();
    }
  }
};

const handleFieldValueChange = ({ sectionId, fieldId, value, field, fieldType }) => {
  if (!sectionId) return;

  const normalizeId = (item) => item?.id || item?.ID || item?.field_id || null;

  const section = formSections.value.find(sec => sec.id === sectionId);
  if (!section || !Array.isArray(section.fields)) {
    return;
  }

  const targetId = fieldId || normalizeId(field);
  const targetField = section.fields.find(f => normalizeId(f) === targetId);

  if (!targetField) {
    return;
  }

  targetField.default_value = value;
  targetField.defaultValue = value;
  targetField.value = value;

  // Ensure boolean defaults remain null when cleared
  if (fieldType === 'YES_NO' && (value === '' || value === undefined)) {
    targetField.default_value = null;
    targetField.defaultValue = null;
    targetField.value = null;
  }

  updateFormState();
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

const translateText = (text) => translateTerm(text);

// Exemplo de como usar a tradução em métodos
const showTranslatedMessage = () => {
  const message = translateText('Form saved successfully!');
  // Aqui você pode usar wwLib.wwUtils.showNotification se estiver no WeWeb
};

// Lifecycle hooks
onMounted(() => {
loadData();

// Use a more reliable approach with multiple attempts and better error handling
const attemptInitialization = (attempts = 0, maxAttempts = 5) => {
if (attempts >= maxAttempts) {
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
  isFieldDisabled,
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
headerTitle,
headerPriority,
headerCategory,
headerSubcategory,
  headerThirdLevelCategory,
  headerAssignee,
  headerStatus,
  priorityOptions,
  computeSelectWidthStyle,
  translateText,
showTranslatedMessage,
handleFieldValueChange
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


.cabecalhoFormBuilder {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  background: #f5f6fa;
  border-radius: 10px 10px 0 0;
  padding: 16px 24px;
  border-bottom: 1px solid #dadcde;
}

.header-row {
  width: 100%;
  display: flex;
}

.header-row-title {
  align-items: center;
}

.header-row-controls {
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.header-title {
  flex: 1 1 auto;
  min-width: 200px;
}

.inputCabecalho {
  font-size: 1.25rem;
  font-family: Roboto-Light, "Open Sans", Arial, sans-serif;
  border-radius: 6px;
  height: 36px;
  border: 1px solid transparent;
  padding: 4px 8px;
  background: transparent;
  width: 100%;
  color: #4f4f4f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inputCabecalho:hover {
  background-color: #e4e7ef;
}

.inputCabecalho:focus {
  background-color: transparent;
  border: 1px solid #4f4f4f;
  outline: none;
}

.header-tags {
  display: flex;
  flex: 1 1 auto;
  gap: 12px;
  row-gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}

.header-tags-rigth {
  display: flex;
  flex: 1 1 auto;
  gap: 12px;
  row-gap: 6px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: right;
}

.select-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  --select-placeholder-length: 10;
}

.tag-select-wrapper {
  min-width: calc(var(--select-placeholder-length) * 0.3em + 2.75rem);
}

.tag-selectPriority {
  border: 1px solid #d0d4dc;
  border-radius: 999px;
  padding: 2px 12px;
  background-color: #eef1f7;
  color: #3a3f4b;
  font-size: 13px;
  appearance: none;
  min-height: 26px;
  width: auto;
  min-width: 100px;
}

.tag-selectCat1 {
border: 1px solid #d0d4dc;
border-radius: 999px;
padding: 2px 12px;
background-color: #eef1f7;
color: #3a3f4b;
font-size: 13px;
appearance: none;
min-height: 26px;
width: auto;
min-width: 75px;
}

.tag-selectCat2 {
border: 1px solid #d0d4dc;
border-radius: 999px;
padding: 2px 12px;
background-color: #eef1f7;
color: #3a3f4b;
font-size: 13px;
appearance: none;
min-height: 26px;
width: auto;
min-width: 95px;
}

.tag-selectCat3 {
border: 1px solid #d0d4dc;
border-radius: 999px;
padding: 2px 12px;
background-color: #eef1f7;
color: #3a3f4b;
font-size: 13px;
appearance: none;
min-height: 26px;
width: auto;
min-width: 140px;
}

.tag-select:focus {
  outline: none;
  border-color: #5c74a4;
  box-shadow: 0 0 0 2px rgba(92, 116, 164, 0.2);
}

.select-placeholder {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #5f6368;
  font-size: 13px;
  pointer-events: none;
  white-space: nowrap;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex: 0 0 auto;
}

.assignee-wrapper {
  display: flex;
  align-items: center;
  gap: 0px;
  padding: 0px 12px;
  border-radius: 999px;
  border: 1px solid #d0d4dc;
  background-color: #0000;
}

.user-icon {
  width: 26px;
  height: 26px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  background: #f0f1f5;
  border-radius: 50%;
  color: #4f4f4f;
  font-size: 16px;
}

.assignee-select-wrapper {
  min-width: calc(var(--select-placeholder-length) * 0.3em + 2.5rem);
}

.user-select {
  appearance: none;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #3a3f4b;
  padding: 4px 4px 4px 0;
  min-width: 0;
  width: auto;
}

.user-select:focus {
  outline: none;
}

.status-wrapper {
  display: flex;
  align-items: center;
}

.status-select-wrapper {
  min-width: calc(var(--select-placeholder-length) * 0.3em + 1.5rem);
}

.status-select {
  border: 1px solid #4d6dc3;
  border-radius: 8px;
  padding: 2px 12px;
  background-color: #4d6dc3;
  color: #ffffff;
  font-size: 13px;
  appearance: none;
  min-height: 26px;
  width: auto;
  min-width: 50px;
}

.status-select:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(77, 109, 195, 0.25);
}

.status-placeholder {
  color: #ffffff;
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
