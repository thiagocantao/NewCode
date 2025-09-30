<template>
  <div class="ww-datagrid" :class="{ editing: isEditing }" :style="cssVars">
    <ag-grid-vue :key="componentKey" ref="agGridRef" :rowData="rowData" :columnDefs="finalColumnDefs"
      :defaultColDef="defaultColDef" :domLayout="content.layout === 'auto' ? 'autoHeight' : 'normal'" :style="style"
      :rowSelection="rowSelection" :suppressMovableColumns="!content.movableColumns" :alwaysShowHorizontalScroll="false"
      :suppressColumnMoveAnimation="true" :suppressDragLeaveHidesColumns="true" :maintainColumnOrder="true"
      :getMainMenuItems="getMainMenuItems" :isColumnMovable="isColumnMovable" :theme="theme" :getRowId="getRowId"
      :pagination="content.pagination" :paginationPageSize="content.paginationPageSize || 10"
      :paginationPageSizeSelector="false" :columnHoverHighlight="content.columnHoverHighlight" :locale-text="localeText"
      :components="editorComponents" :singleClickEdit="true" @grid-ready="onGridReady" @row-selected="onRowSelected"
      @selection-changed="onSelectionChanged" @cell-value-changed="onCellValueChanged" @filter-changed="onFilterChanged"
      @sort-changed="onSortChanged" @column-moved="onColumnMoved" @row-clicked="onRowClicked"
      @first-data-rendered="onFirstDataRendered" @cell-clicked="onCellClicked">
    </ag-grid-vue>
  </div> 
</template>

<script>
  import { shallowRef, computed, ref, onMounted, onUnmounted, watch, h, nextTick } from "vue";
  import { AgGridVue } from "ag-grid-vue3";
  import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  } from "ag-grid-community";
  import {
  AG_GRID_LOCALE_EN,
  AG_GRID_LOCALE_FR,
  AG_GRID_LOCALE_DE,
  AG_GRID_LOCALE_ES,
  AG_GRID_LOCALE_PT,
  } from "@ag-grid-community/locale";
  import ActionCellRenderer from "./components/ActionCellRenderer.vue";
  import ImageCellRenderer from "./components/ImageCellRenderer.vue";
  import WewebCellRenderer from "./components/WewebCellRenderer.vue";
  import FormatterCellRenderer from "./components/FormatterCellRenderer.vue";
  import UserCellRenderer from "./components/UserCellRenderer.vue";
  import ListFilterRenderer from "./components/ListFilterRenderer.js";
  import ResponsibleUserFilterRenderer from "./components/ResponsibleUserFilterRenderer.js";
  import DeadlineFilterRenderer from "./components/DeadlineFilterRenderer.js";
  import DateTimeCellEditor from "./components/DateTimeCellEditor.vue";
  import FixedListCellEditor from "./components/FixedListCellEditor.js";
  import ResponsibleUserCellEditor from "./components/ResponsibleUserCellEditor.js";
  import {
  applyGlobalGridFontFamily,
  readTypographyVariable,
  DEFAULT_FONT_FAMILY,
  TYPOGRAPHY_VARIABLE_ID,
  } from "./utils/fontFamily.js";

  const GRID_BASE_FONT_SIZE = 12;
  const GRID_BASE_FONT_SIZE_PX = `${GRID_BASE_FONT_SIZE}px`;
  const PINNED_HEADER_DATASET_FLAG = 'wwPinnedHeaderBlockApplied';
  const stopPinnedHeaderMouseDown = event => {
    event.stopPropagation();
  };
  const preventPinnedHeaderDragStart = event => {
    event.preventDefault();
  };
  // Editor customizado inline para listas
  class ListCellEditor {
    init(params) {
      this.params = params;
      const colDef = params.colDef || {};
      this.rendererParams =
        typeof colDef.cellRendererParams === 'function'
          ? colDef.cellRendererParams(params)
          : colDef.cellRendererParams || {};
      this.eGui = document.createElement('div');
      this.eGui.className = 'list-editor';
      this.eGui.innerHTML = `
        <span class="editor-close">&times;</span>
        <div class="field-search">
          <input type="text" class="search-input" placeholder="Search..." />
          <span class="search-icon"><i class="material-symbols-outlined-search">search</i></span>
        </div>
        <div class="filter-list"></div>
      `;
      this.searchInput = this.eGui.querySelector('.search-input');
      this.listEl = this.eGui.querySelector('.filter-list');
      this.closeBtn = this.eGui.querySelector('.editor-close');

      const tag = (params.colDef.TagControl || params.colDef.tagControl || params.colDef.tagcontrol || '').toString().toUpperCase();
      const identifier = (params.colDef.FieldDB || '').toString().toUpperCase();
      const categoryTags = ['CATEGORYID','SUBCATEGORYID','CATEGORYLEVEL3ID'];
      this.isCategoryField = categoryTags.includes(tag) || categoryTags.includes(identifier);

      // Build option array (supports promises)
      const normalize = opt =>
        typeof opt === 'object' ? opt : { value: opt, label: String(opt) };

      const resolveOptions = arr => {
        this.options = (arr || []).map(normalize);
        this.filteredOptions = [...this.options];
        this.renderOptions();
      };

      let optionsPromise;
      if (params.options && typeof params.options.then === 'function') {
        optionsPromise = params.options;
      } else if (Array.isArray(params.options)) {
        optionsPromise = Promise.resolve(params.options);
      } else if (Array.isArray(params.colDef.options)) {
        optionsPromise = Promise.resolve(params.colDef.options);
      } else if (Array.isArray(params.colDef.listOptions)) {
        optionsPromise = Promise.resolve(params.colDef.listOptions);
      } else if (
        typeof params.colDef.listOptions === 'string' &&
        params.colDef.listOptions.trim() !== ''
      ) {
        optionsPromise = Promise.resolve(
          params.colDef.listOptions.split(',').map(o => o.trim())
        );
      } else if (
        params.colDef.dataSource &&
        typeof params.colDef.dataSource.list_options === 'string' &&
        params.colDef.dataSource.list_options.trim() !== ''
      ) {
        optionsPromise = Promise.resolve(
          params.colDef.dataSource.list_options.split(',').map(o => o.trim())
        );
      } else {
        optionsPromise = Promise.resolve([]);
      }

      optionsPromise.then(resolveOptions);

      this.value = params.value;

      this.searchInput.addEventListener('input', e => {
        this.filterOptions(e.target.value);
      });

      if (this.closeBtn) {
        this.closeBtn.addEventListener('click', () => {
          if (this.params.api && this.params.api.stopEditing) {
            this.params.api.stopEditing(true);
          } else if (this.params.stopEditing) {
            this.params.stopEditing(true);
          }
        });
      }
    }
    filterOptions(text) {
      const t = text.toLowerCase();
      this.filteredOptions = this.options.filter(opt => {
        const label = this.stripHtml(String(this.formatOption(opt)));
        return label.toLowerCase().includes(t);
      });
      this.renderOptions();
    }
    stripHtml(html) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    }
    getRoundedSpanColor(value, colorArray, fieldName) {
      if (!colorArray || !Array.isArray(colorArray) || !value) return value;
      const matchingStyle = colorArray.find(item => item.Valor === value);
      if (!matchingStyle) return value;
      const borderRadius = fieldName === 'StatusID' ? '4px' : '12px';
      const fontweight = 'font-weight:bold;';
      return `<span style="height:25px; color: ${matchingStyle.CorFonte}; background:${matchingStyle.CorFundo}; border: 1px solid ${matchingStyle.CorFundo}; border-radius: ${borderRadius}; ${fontweight} display: inline-flex; align-items: center; padding: 0 12px;">${value}</span>`;
    }
    dateFormatter(dateValue, lang) {
      try {
        if (!dateValue) return '';
        const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
        const datePart = new Intl.DateTimeFormat(lang || 'en', dateOptions).format(
          new Date(dateValue)
        );
        const timePart = new Intl.DateTimeFormat(lang || 'en', timeOptions).format(
          new Date(dateValue)
        );
        return `${datePart}`;
      } catch (error) {
        return dateValue;
      }
    }
    formatOption(opt) {
      const value = opt.label != null ? opt.label : opt.value;
      if (this.isCategoryField) {
        return `<span style="height:25px; color:#303030; background:#c9edf9; border:1px solid #c9edf9; border-radius:12px; font-weight:normal; display:inline-flex; align-items:center; padding:0 12px;">${value}</span>`;
      }
      const colDef = this.params.colDef || {};
      const params = this.rendererParams || {};
      try {
        if (params.useCustomFormatter && typeof params.formatter === 'string') {
          const fn = new Function(
            'value',
            'row',
            'colDef',
            'getRoundedSpanColor',
            'dateFormatter',
            params.formatter
          );
          return fn(
            value,
            {},
            colDef,
            this.getRoundedSpanColor.bind(this),
            this.dateFormatter.bind(this)
          );
        } else if (params.useStyleArray && Array.isArray(params.styleArray)) {
          const styled = this.getRoundedSpanColor(
            value,
            params.styleArray,
            colDef.FieldDB
          );
          if (styled) return styled;
        }
      } catch (e) {
        console.error('Format option error', e);
      }
      return value;
    }
    getColumnFieldKey() {
      if (!this.params) return null;
      const col = this.params.column;
      if (col && typeof col.getColId === 'function') {
        const id = col.getColId();
        if (id) return id;
      }
      return this.params.colDef?.field || this.params.colDef?.colId || null;
    }
    extractOptionLabel(value) {
      if (!this.options || !this.options.length) return undefined;
      const match = this.options.find(opt => String(opt.value) === String(value));
      if (!match) return undefined;
      const label =
        match.label ??
        match.name ??
        match.text ??
        match.descricao ??
        match.description ??
        match.Valor ??
        match.value;
      return label != null ? label : undefined;
    }
    updateDisplayLabel(value, { refresh = true } = {}) {
      const fieldKey = this.getColumnFieldKey();
      const rowData = this.params?.node?.data;
      if (!fieldKey || !rowData) return;
      const labelField = `${fieldKey}__displayLabel`;
      const label = this.extractOptionLabel(value);
      if (label != null) {
        rowData[labelField] = String(label);
      } else if (value != null && value !== '') {
        rowData[labelField] = String(value);
      } else {
        delete rowData[labelField];
      }
      if (refresh && this.params.api && this.params.node) {
        this.params.api.refreshCells({
          rowNodes: [this.params.node],
          columns: [fieldKey],
          force: true,
        });
      }
    }
    renderOptions() {
      this.listEl.innerHTML = this.filteredOptions
        .map(opt => {
          const formatted = this.formatOption(opt);
          const selected = opt.value == this.value ? ' selected' : '';
          return `<div class="filter-item${selected}" data-value="${opt.value}"><span class="filter-label">${formatted}</span></div>`;
        })
        .join('');
      this.listEl.querySelectorAll('.filter-item').forEach(el => {
        el.addEventListener('click', () => {
          const selectedValue = el.getAttribute('data-value');
          this.value = selectedValue;
          this.updateDisplayLabel(selectedValue, { refresh: false });
          if (this.params.api && this.params.api.stopEditing) {
            this.params.api.stopEditing();
          } else if (this.params.stopEditing) {
            this.params.stopEditing();
          }
        });
      });
    }
    getGui() { return this.eGui; }
    afterGuiAttached() { if (this.searchInput) this.searchInput.focus(); }
    getValue() {
      this.updateDisplayLabel(this.value);
      return this.value;
    }
    destroy() {}
    isPopup() { return true; }
  }
  import './components/list-filter.css';
  
  // TODO: maybe register less modules
  // TODO: maybe register modules per grid instead of globally
  ModuleRegistry.registerModules([AllCommunityModule]);

  const HIDE_SAVE_BUTTON_VARIABLE_ID = "09c5aacd-b697-4e04-9571-d5db1f671877";
  const EXTERNAL_STATE_VAR_ID = "74a13796-f64f-47d6-8e5f-4fb4700fd94b";

  export default {
  components: {
  AgGridVue,
  ActionCellRenderer,
  ImageCellRenderer,
  WewebCellRenderer,
  FormatterCellRenderer, // Add this line
  UserCellRenderer,
  ListCellEditor, // registrar editor customizado
  FixedListCellEditor,
  ResponsibleUserCellEditor,
  DateTimeCellEditor,
  },
  props: {
  content: {
  type: Object,
  required: true,
  },
  uid: {
  type: String,
  required: true,
  },
  /* wwEditor:start */
  wwEditorState: { type: Object, required: true },
  /* wwEditor:end */
  },
  emits: ["trigger-event", "update:content:effect"],
  setup(props, ctx) {
  const { resolveMappingFormula } = wwLib.wwFormula.useFormula();  
  const gridApi = shallowRef(null);
  const columnApi = shallowRef(null);
  const displayedRowData = shallowRef([]);
  const rowMetadata = shallowRef(new Map());
  const pendingRowListRefreshes = new Map();
  let pendingRowListRefreshPromise = null;
  let hasHydratedInitialRows = false;

  const getRowFingerprint = row => {
    try {
      return JSON.stringify(row ?? {});
    } catch (error) {
      return '';
    }
  };

  const resolveRowId = (row, fallbackIndex = null) => {
    if (!row || typeof row !== 'object') {
      return fallbackIndex != null ? `__idx_${fallbackIndex}` : null;
    }

    let resolvedId = null;
    try {
      if (props.content?.idFormula) {
        resolvedId = resolveMappingFormula(props.content.idFormula, row);
      }
    } catch (error) {
      console.warn('[GridViewDinamica] Failed to resolve row id using formula', error);
    }

    if (resolvedId == null || resolvedId === '') {
      const fallbackKeys = ['Id', 'ID', 'id'];
      for (const key of fallbackKeys) {
        if (row[key] != null && row[key] !== '') {
          resolvedId = row[key];
          break;
        }
      }
    }

    if (resolvedId == null || resolvedId === '') {
      if (fallbackIndex != null) {
        resolvedId = `__idx_${fallbackIndex}`;
      } else {
        resolvedId = getRowFingerprint(row);
      }
    }

    return typeof resolvedId === 'string' ? resolvedId : String(resolvedId);
  };

  const syncDisplayedRowData = () => {
    const collectionData = wwLib.wwUtils.getDataFromCollection(props.content?.rowData);
    const sourceRows = Array.isArray(collectionData) ? collectionData : [];

    const previousMetadata = rowMetadata.value || new Map();
    const nextMetadata = new Map();
    const nextRows = [];

    sourceRows.forEach((rawRow, index) => {
      if (!rawRow || typeof rawRow !== 'object') return;

      const rowId = resolveRowId(rawRow, index);
      if (rowId == null) return;

      const fingerprint = getRowFingerprint(rawRow);
      const previousEntry = previousMetadata.get(rowId);

      if (previousEntry && previousEntry.hash === fingerprint) {
        primeLazyStatusDisplayLabels(previousEntry.data);
        nextMetadata.set(rowId, previousEntry);
        nextRows.push(previousEntry.data);
      } else {
        const clonedRow = { ...rawRow };
        primeLazyStatusDisplayLabels(clonedRow);
        const entry = { data: clonedRow, hash: fingerprint };
        nextMetadata.set(rowId, entry);
        nextRows.push(clonedRow);
        if (hasHydratedInitialRows) {
          scheduleRowListOptionsRefresh(rowId, clonedRow);
        }
      }
    });

    displayedRowData.value = nextRows;
    rowMetadata.value = nextMetadata;
    hasHydratedInitialRows = true;
  };

  const refreshRowFromSource = (rowData, rowNode = null) => {
    if (!rowData) return;

    const collectionData = wwLib.wwUtils.getDataFromCollection(props.content?.rowData);
    const sourceRows = Array.isArray(collectionData) ? collectionData : [];
    if (!sourceRows.length) return;

    const inferredIndex = rowNode?.rowIndex != null ? rowNode.rowIndex : null;
    const rowId = resolveRowId(rowData, inferredIndex);
    if (!rowId) return;

    let matchedRow = null;
    let matchedIndex = inferredIndex != null ? inferredIndex : -1;

    if (matchedIndex != null && matchedIndex >= 0 && matchedIndex < sourceRows.length) {
      const candidate = sourceRows[matchedIndex];
      if (candidate && resolveRowId(candidate, matchedIndex) === rowId) {
        matchedRow = candidate;
      }
    }

    if (!matchedRow) {
      for (let idx = 0; idx < sourceRows.length; idx += 1) {
        const candidate = sourceRows[idx];
        if (!candidate) continue;
        if (resolveRowId(candidate, idx) === rowId) {
          matchedRow = candidate;
          matchedIndex = idx;
          break;
        }
      }
    }

    if (!matchedRow) return;

    const fingerprint = getRowFingerprint(matchedRow);
    const previousEntry = (rowMetadata.value && rowMetadata.value.get(rowId)) || null;
    if (previousEntry && previousEntry.hash === fingerprint) {
      return;
    }
    const clonedRow = { ...matchedRow };
    primeLazyStatusDisplayLabels(clonedRow);

    const nextMetadata = new Map(rowMetadata.value || []);
    const entry = { data: clonedRow, hash: fingerprint };
    nextMetadata.set(rowId, entry);
    rowMetadata.value = nextMetadata;

    const currentRows = Array.isArray(displayedRowData.value) ? [...displayedRowData.value] : [];
    if (matchedIndex != null && matchedIndex >= 0 && matchedIndex < currentRows.length) {
      currentRows[matchedIndex] = clonedRow;
      displayedRowData.value = currentRows;
    }

    if (hasHydratedInitialRows) {
      scheduleRowListOptionsRefresh(rowId, clonedRow);
    }

    if (gridApi.value && typeof gridApi.value.refreshCells === 'function') {
      const refreshConfig = { force: true };
      if (rowNode) {
        refreshConfig.rowNodes = [rowNode];
      }
      gridApi.value.refreshCells(refreshConfig);
    }
  };

  const getRowMetadataHash = rowId => {
    if (!rowId) return null;
    const metadata = rowMetadata.value;
    if (!metadata || typeof metadata.get !== 'function') {
      return null;
    }
    const entry = metadata.get(rowId);
    return entry ? entry.hash : null;
  };

  const waitForRowHydration = async (rowId, previousHash, options = {}) => {
    if (!rowId) return null;

    const { timeout = 6000, interval = 150 } = options;
    const start = Date.now();

    while (isComponentActive) {
      const collectionData = wwLib.wwUtils.getDataFromCollection(props.content?.rowData);
      const sourceRows = Array.isArray(collectionData) ? collectionData : [];

      for (let idx = 0; idx < sourceRows.length; idx += 1) {
        const candidate = sourceRows[idx];
        if (!candidate) continue;
        if (resolveRowId(candidate, idx) !== rowId) continue;

        const fingerprint = getRowFingerprint(candidate);
        if (!previousHash || fingerprint !== previousHash) {
          return { row: candidate, index: idx, fingerprint };
        }
        break;
      }

      if (timeout != null && timeout >= 0 && Date.now() - start >= timeout) {
        break;
      }

      await sleep(interval);
    }

    return null;
  };

  const isListLikeColumn = col => {
    if (!col) return false;
    const tag = (col.TagControl || col.tagControl || col.tagcontrol || '').toUpperCase();
    const identifier = (col.FieldDB || '').toUpperCase();
    const listIndicators = new Set([
      'STATUSID',
      'RESPONSIBLEUSERID',
      'CATEGORYID',
      'SUBCATEGORYID',
      'CATEGORYLEVEL3ID',
    ]);

    if (col.cellDataType === 'list') return true;
    if (listIndicators.has(tag) || listIndicators.has(identifier)) return true;
    if (Array.isArray(col.listOptions) || Array.isArray(col.list_options) || Array.isArray(col.options)) {
      return true;
    }
    if (typeof col.listOptions === 'string' || typeof col.list_options === 'string') return true;
    if (col.dataSource) return true;
    if (col.useStyleArray) return true;
    return false;
  };

  const shouldLazyLoadStatus = col => {
    if (!col) return false;
    const tag = (col.TagControl || col.tagControl || col.tagcontrol || '').toUpperCase();
    const identifier = (col.FieldDB || '').toUpperCase();
    return tag === 'STATUSID' || identifier === 'STATUSID';
  };

  const deriveStatusDisplayLabel = (row, col) => {
    if (!row || typeof row !== 'object' || !col) return undefined;

    const fieldKey = col.field || col.FieldDB || col.id;
    if (!fieldKey) return undefined;

    const labelField = `${fieldKey}__displayLabel`;
    const existingLabel = row[labelField];
    if (existingLabel != null && existingLabel !== '') {
      return existingLabel;
    }

    const explicitKeys = [
      col.DisplayField,
      col.displayField,
      col.display_field,
      col.DisplayLabel,
      col.displayLabel,
      col.display_label,
    ];

    const baseVariants = [
      `${fieldKey}Label`,
      `${fieldKey}label`,
      `${fieldKey}Name`,
      `${fieldKey}name`,
      `${fieldKey}Description`,
      `${fieldKey}description`,
      `${fieldKey}_Label`,
      `${fieldKey}_label`,
      `${fieldKey}_Name`,
      `${fieldKey}_name`,
      `${fieldKey}_Description`,
      `${fieldKey}_description`,
    ];

    const statusFallbacks = [
      'StatusName',
      'statusName',
      'Status',
      'status',
      'StatusDescription',
      'statusDescription',
      'StatusLabel',
      'statusLabel',
    ];

    const candidateKeys = [...explicitKeys, ...baseVariants, ...statusFallbacks];
    for (const key of candidateKeys) {
      if (!key) continue;
      const value = row[key];
      if (value != null && value !== '') {
        return value;
      }
    }

    const nestedCandidates = [
      row[fieldKey],
      row.Status,
      row.status,
    ];

    for (const candidate of nestedCandidates) {
      if (!candidate || typeof candidate !== 'object') continue;
      const nestedValue =
        candidate.label ??
        candidate.Label ??
        candidate.name ??
        candidate.Name ??
        candidate.description ??
        candidate.Description ??
        candidate.value ??
        candidate.Value ??
        null;
      if (nestedValue != null && nestedValue !== '') {
        return nestedValue;
      }
    }

    return undefined;
  };

  const primeLazyStatusDisplayLabels = row => {
    if (!row || typeof row !== 'object') return;
    if (!props.content || !Array.isArray(props.content.columns)) return;

    props.content.columns.forEach(col => {
      if (!shouldLazyLoadStatus(col)) return;
      const fieldKey = col.field || col.FieldDB || col.id;
      if (!fieldKey) return;

      const labelField = `${fieldKey}__displayLabel`;
      if (row[labelField] != null && row[labelField] !== '') return;

      const label = deriveStatusDisplayLabel(row, col);
      if (label != null && label !== '') {
        row[labelField] = String(label);
      }
    });
  };

  const readStatusValueFromRow = (row, col) => {
    if (!row || typeof row !== 'object' || !col) return undefined;
    const fieldCandidates = [col.field, col.FieldDB, col.id];
    for (const key of fieldCandidates) {
      if (!key) continue;
      const value = row[key];
      if (value != null && value !== '') {
        return value;
      }
    }
    return undefined;
  };

  const buildLazyStatusFallbackOptions = col => {
    if (!col) return [];

    const fieldKey = col.field || col.FieldDB || col.id;
    if (!fieldKey) return [];

    const rows = Array.isArray(displayedRowData.value) ? displayedRowData.value : [];
    const seen = new Map();

    rows.forEach(row => {
      if (!row || typeof row !== 'object') return;
      const rawValue = readStatusValueFromRow(row, col);
      if (rawValue == null || rawValue === '') return;

      const labelField = `${fieldKey}__displayLabel`;
      let label = row[labelField];
      if (label == null || label === '') {
        label = deriveStatusDisplayLabel(row, col);
      }

      const mapKey = String(rawValue);
      if (seen.has(mapKey)) return;

      const finalLabel = label != null && label !== '' ? label : rawValue;
      seen.set(mapKey, {
        value: rawValue,
        label: String(finalLabel),
      });
    });

    return Array.from(seen.values());
  };

  const refreshRowListOptions = async (rowData, rowNode = null, editedColumn = null) => {
    if (!rowData || !props.content || !Array.isArray(props.content.columns)) return;

    await nextTick();

    const ticketId = rowData?.TicketID;
    const promises = [];
    const columnsToRefresh = [];

    const editedFieldKey = (() => {
      if (!editedColumn) return null;
      if (typeof editedColumn.getColId === 'function') {
        const id = editedColumn.getColId();
        if (id) return id;
      }
      return editedColumn.colId || editedColumn.field || null;
    })();

    const orderedColumns = props.content.columns
      .filter(col => isListLikeColumn(col))
      .sort((a, b) => {
        if (!editedFieldKey) return 0;
        const aKey = a.id || a.field;
        const bKey = b.id || b.field;
        if (aKey === editedFieldKey) return -1;
        if (bKey === editedFieldKey) return 1;
        return 0;
      });

    orderedColumns.forEach(col => {
      const fieldKey = col.id || col.field;
      if (!fieldKey) return;

      const shouldUseTicket = usesTicketId(col);
      const cacheKey = getOptionsCacheKey(col, shouldUseTicket ? ticketId : undefined);

      if (!columnOptions.value[fieldKey]) {
        columnOptions.value[fieldKey] = {};
      }

      delete columnOptions.value[fieldKey][cacheKey];

      if (shouldLazyLoadStatus(col)) {
        return;
      }

      const tag = (col.TagControl || col.tagControl || col.tagcontrol || '').toUpperCase();
      const identifier = (col.FieldDB || '').toUpperCase();
      if (tag === 'RESPONSIBLEUSERID' || identifier === 'RESPONSIBLEUSERID') {
        responsibleUserCache = null;
      }

      const promise = getColumnOptions(col, shouldUseTicket ? ticketId : undefined)
        .then(opts => {
          if (!columnOptions.value[fieldKey]) {
            columnOptions.value[fieldKey] = {};
          }
          columnOptions.value[fieldKey][cacheKey] = opts;
        })
        .catch(error => {
          console.warn('[GridViewDinamica] Failed to refresh list options for column', fieldKey, error);
        });
      promises.push(promise);
      columnsToRefresh.push(fieldKey);
    });

    if (promises.length) {
      try {
        await Promise.all(promises);
      } catch (error) {
        console.warn('[GridViewDinamica] Failed to resolve list option refresh promises', error);
      }
    }

    if (gridApi.value && typeof gridApi.value.refreshCells === 'function') {
      const refreshConfig = { force: true };
      if (rowNode) {
        refreshConfig.rowNodes = [rowNode];
      }
      if (columnsToRefresh.length) {
        refreshConfig.columns = Array.from(new Set(columnsToRefresh));
      }
      gridApi.value.refreshCells(refreshConfig);
    }
  };

  function scheduleRowListOptionsRefresh(rowId, rowData) {
    if (!rowId || !rowData) return;

    pendingRowListRefreshes.set(rowId, rowData);

    if (pendingRowListRefreshPromise) return;

    pendingRowListRefreshPromise = Promise.resolve()
      .then(async () => {
        pendingRowListRefreshPromise = null;

        if (!pendingRowListRefreshes.size) return;

        const entries = Array.from(pendingRowListRefreshes.entries());
        pendingRowListRefreshes.clear();

        for (const [id, data] of entries) {
          try {
            const node = gridApi.value?.getRowNode ? gridApi.value.getRowNode(id) : null;
            await refreshRowListOptions(data, node, null);
          } catch (error) {
            console.warn(
              '[GridViewDinamica] Failed to refresh list options after dataset update',
              error
            );
          }
        }
      })
      .catch(error => {
        pendingRowListRefreshPromise = null;
        console.warn('[GridViewDinamica] Failed to schedule list option refresh', error);
      });
  }

  // Unified Column API accessor for AG Grid v31+ (no columnApi) and older versions
  const getColApi = () => {
    if (columnApi.value && (
        typeof columnApi.value.applyColumnState === 'function' ||
        typeof columnApi.value.getColumnState === 'function' ||
        typeof columnApi.value.resetColumnState === 'function' ||
        typeof columnApi.value.moveColumns === 'function' ||
        typeof columnApi.value.getAllGridColumns === 'function'
      )) {
      return columnApi.value;
    }
    return gridApi.value || null;
  };

  const agGridRef = ref(null);

// Executa após o AG Grid consolidar sort/columnState
function microtask(fn) {
if (typeof queueMicrotask === 'function') queueMicrotask(fn);
else Promise.resolve().then(fn);
}

  // Run after grid has applied header/column state updates
  function deferAfterGridUpdate(fn) {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(fn, 0));
    } else {
      setTimeout(fn, 0);
    }
  }


  const updateHideSaveButtonVisibility = (value) => {
    try {
      const wwVariable = window?.wwLib?.wwVariable;
      if (!wwVariable) return;

      if (typeof wwVariable.setValue === "function") {
        wwVariable.setValue(HIDE_SAVE_BUTTON_VARIABLE_ID, value);
        return;
      }

      if (typeof wwVariable.updateValue === "function") {
        wwVariable.updateValue(HIDE_SAVE_BUTTON_VARIABLE_ID, value);
        return;
      }

      if (typeof wwVariable.setComponentValue === "function") {
        wwVariable.setComponentValue(HIDE_SAVE_BUTTON_VARIABLE_ID, value);
      }
    } catch (error) {
      console.warn(
        "[GridViewDinamica] Failed to update escondeBotaoSalvarGrid variable",
        error
      );
    }
  };
  const writeExternalStateToWW = (reason) => {
    try {
      const api = gridApi.value;
      const colApi = (typeof getColApi === 'function') ? getColApi() : null;
      if (!api) return;

      // Headers from current displayed order
      const allCols = (api.getAllGridColumns?.() || []).filter(c => c);
      const headers = allCols
        .filter(col => col && col.getColId && col.getColId() !== 'ag-Grid-SelectionColumn')
        .map((col, idx) => {
          const def = (col.getColDef && col.getColDef()) || {};
          const toPx = v => (v == null ? null : (typeof v === 'number' ? `${v}px` : String(v)));
          return {
            id: def.id || def.colId || (col.getColId ? col.getColId() : null),
            gridfieldID: def.gridfieldID ?? def.gridfieldId ?? null,
            headerName: def.headerName ?? null,
            field: def.field ?? null,
            cellDataType: def.cellDataType ?? null,
            filter: (typeof def.filter === 'string') ? def.filter : (def.filter ?? null),
            sortable: !!def.sortable,
            textAlign: def.textAlign ?? 'left',
            headerAlign: def.headerAlign ?? 'left',
            minWidth: toPx(def.minWidth),
            editable: (typeof def.editable === 'boolean') ? def.editable : (def.editable ?? null),
            pinned: (col.getPinned ? col.getPinned() : (def.pinned ?? null)) || null,
            FieldDB: def.FieldDB ?? null,
            positionInGrid: idx + 1,
            useCustomFormatter: !!def.useCustomFormatter,
            formatter: def.formatter ?? null,
            dateFormatter: def.dateFormatter ?? null,
            name: def.headerName ?? null,
            type: def.type ?? 'item',
            tagControl: def.TagControl ?? def.tagControl ?? null,
            dataSource: def.dataSource ?? null,
            flex: def.flex ?? null
          };
        });

      // Filters as array
      const model = api.getFilterModel?.() || {};
      const filters = Object.entries(model).map(([colId, fm]) => ({ colId, ...(fm || {}) }));

      // Sort (first criterion)
      let sortModel = (api.getSortModel?.() || []).filter(s => s && s.colId);
      if (!sortModel.length && colApi && typeof colApi.getColumnState === 'function') {
        const colState = colApi.getColumnState() || [];
        sortModel = colState
          .filter(c => c && c.sort && c.colId)
          .sort((a, b) => {
            const ai = (a.sortIndex != null) ? a.sortIndex : Number.MAX_SAFE_INTEGER;
            const bi = (b.sortIndex != null) ? b.sortIndex : Number.MAX_SAFE_INTEGER;
            return ai - bi;
          })
          .map(c => ({ colId: String(c.colId), sort: c.sort }));
      }
      const sortArray = sortModel.map((s, idx) => ({ id: String(s.colId), isASC: (s.sort === 'asc') }));

      const payload = [{ Headers: headers, Filters: filters, Sort: sortArray }];

      // Write out
      try {
        const wv = window?.wwLib?.wwVariable;
        if (wv?.setValue) wv.setValue(EXTERNAL_STATE_VAR_ID, payload);
        else if (wv?.updateValue) wv.updateValue(EXTERNAL_STATE_VAR_ID, payload);
        else if (wv?.setComponentValue) wv.setComponentValue(EXTERNAL_STATE_VAR_ID, payload);
      } catch (e) {
        console.warn('[ExternalState] write error', e);
      }

      if (console && console.debug) console.debug('[ExternalState]', reason || '', payload);
    } catch (err) {
      console.warn('[ExternalState] unexpected error', err);
    }
  }
  const readExternalStateFromWW = () => {
    try {
      const wwVariable = window?.wwLib?.wwVariable;
      const raw = wwVariable?.getValue ? wwVariable.getValue(EXTERNAL_STATE_VAR_ID) : null;
      const arr = Array.isArray(raw) ? raw : [];
      const obj = arr[0];
      if (obj && (Array.isArray(obj.Headers) || Array.isArray(obj.Filters) || Array.isArray(obj.Sort))) {
        console.debug('[ExternalState][read]', obj);
        return obj;
      }
    } catch (e) {
      console.warn('[ExternalState][read] error:', e);
    }
    return null;
  };

  const applyExternalStateFromWW = (reason) => {
    try {
      const state = readExternalStateFromWW();
      if (!state) return;
      const api = gridApi.value;
      const capi = (typeof getColApi === 'function') ? getColApi() : null;
      if (!api || !capi) return;

      console.debug('[ExternalState][apply]', reason || '', state);

      // 1) Column order from Headers (do not touch pinned/visibility to avoid conflicts)
      if (Array.isArray(state.Headers) && state.Headers.length) {
        const orderIds = state.Headers
          .map(h => String(h?.id || h?.field || h?.colId || ''))
          .filter(Boolean);
        const newState = orderIds.map((colId, idx) => ({ colId, order: idx }));
        runWithSuppressedReveal(() => {
          try {
            capi.applyColumnState({ state: newState, applyOrder: true });
          } catch (e) {
            console.warn('[ExternalState][apply] column order failed', e);
          }
        }, { recaptureDelay: 50 });
      }

      // 2) Filters
      if (Array.isArray(state.Filters)) {
        const filterModel = {};
        for (const f of state.Filters) {
          if (f && f.colId) {
            const { colId, ...model } = f;
            filterModel[colId] = model;
          }
        }
        runWithSuppressedReveal(() => {
          try { api.setFilterModel(filterModel); } catch (e) { console.warn('[ExternalState][apply] setFilterModel failed', e); }
        }, { recaptureDelay: 50 });
      }

      // 3) Sort
      if (Array.isArray(state.Sort) && state.Sort.length) {
        const sortModel = state.Sort
          .filter(s => s && s.id)
          .map((s, idx) => ({
            colId: String(s.id),
            sort: s.isASC ? 'asc' : 'desc',
            sortIndex: idx
          }));
        runWithSuppressedReveal(() => {
          try {
            capi.applyColumnState({
              state: sortModel.map(s => ({ colId: s.colId, sort: s.sort, sortIndex: s.sortIndex })),
              defaultState: { sort: null },
              applyOrder: false
            });
          } catch (e) { console.warn('[ExternalState][apply] applyColumnState sort failed', e); }
          try { api.setSortModel(sortModel.map(({ colId, sort }) => ({ colId, sort }))); } catch (e) { console.warn('[ExternalState][apply] setSortModel failed', e); }
        }, { recaptureDelay: 50 });
        setSort(sortModel.map(({ colId, sort }) => ({ colId, sort })));
      }

      // 4) finalize
      updateColumnsPosition();
      updateColumnsSort();
      const pristine = isGridStatePristine();
      updateHideSaveButtonVisibility(pristine);
    } catch (err) {
      console.warn('[ExternalState][apply] unexpected error', err);
    }
  };
;


  let suppressRevealUntilCapture = false;
  let pendingInitialGridState = null;
  let userInteractedDuringCapture = false;

  const PROGRAMMATIC_EVENT_SOURCES = new Set([
    "api",
    "columnEverythingChanged",
    "gridInitializing",
    "rowDataChanged",
    "rowDataUpdated",
  ]);

  const isProgrammaticEvent = event => {
    if (!event || !event.source) return false;
    return PROGRAMMATIC_EVENT_SOURCES.has(event.source);
  };

  const shouldRevealSaveButton = (event) => {
    const programmatic = isProgrammaticEvent(event);

    if (suppressRevealUntilCapture && !event) {
      return false;
    }

    if (suppressRevealUntilCapture && programmatic) {
      return false;
    }

    if (!event) return true;

    return !programmatic;
  };

  const initialGridState = ref({
    filters: {},
    sort: [],
    columns: [],
  });


  const normalizeFilterModel = model => {
    if (!model || typeof model !== 'object') return {};
    const clone = JSON.parse(JSON.stringify(model));
    return Object.keys(clone)
      .sort()
      .reduce((acc, key) => {
        acc[key] = clone[key];
        return acc;
      }, {});
  };

  const normalizeSortModel = model => {
    if (!Array.isArray(model)) return [];

    // Preserve sort priority when AG Grid supplies explicit indexes (multi-column sorting).
    const containsSortIndex = model.some(entry => entry && entry.sortIndex != null);

    return model
      .map((item, idx) => {
        const colId = item?.colId != null ? String(item.colId) : null;
        if (colId == null) return null;

        const normalized = {
          colId,
          sort: item?.sort ?? null,
        };

        if (item?.sortIndex != null) {
          const parsedIndex = Number(item.sortIndex);
          if (Number.isFinite(parsedIndex)) {
            normalized.sortIndex = parsedIndex;
          }
        } else if (containsSortIndex) {
          normalized.sortIndex = idx;
        }

        return normalized;
      })
      .filter(item => item && item.colId != null);
  };

  const getCurrentColumnOrder = () => {
    if (!gridApi.value || typeof gridApi.value.getAllGridColumns !== 'function') return [];
    return gridApi.value
      .getAllGridColumns()
      .map(col => col?.getColId?.())
      .filter(colId => colId != null);
  };

  const getNormalizedGridState = () => {
    if (!gridApi.value) {
      return {
        filters: {},
        sort: [],
        columns: [],
      };
    }

    const filters = normalizeFilterModel(gridApi.value.getFilterModel?.() || {});
    let sort = normalizeSortModel(gridApi.value.getSortModel?.() || []);

    // Some row-models do not expose the current sort model via the grid API,
    // but the column state still reflects active sorts. Fall back to that state
    // when the direct API call reports no sorting information.
    if (sort.length === 0) {
      const colApi = getColApi();
      if (colApi && typeof colApi.getColumnState === "function") {
        const columnStateSorts = colApi
          .getColumnState()
          .filter(col => col && col.sort)
          .sort((a, b) => {
            const aIndex = a?.sortIndex != null ? a.sortIndex : Number.MAX_SAFE_INTEGER;
            const bIndex = b?.sortIndex != null ? b.sortIndex : Number.MAX_SAFE_INTEGER;
            return aIndex - bIndex;
          })
          .map(col => ({
            colId: col?.colId,
            sort: col?.sort,
            sortIndex: col?.sortIndex,
          }));

        sort = normalizeSortModel(columnStateSorts);
      }
    }

    const columns = getCurrentColumnOrder();

    return { filters, sort, columns };
  };

  let captureInitialStateTimeout = null;

  const captureInitialGridState = () => {
    if (!gridApi.value) return;
    const snapshot = getNormalizedGridState();
    initialGridState.value = snapshot;
    pendingInitialGridState = snapshot;
  };

  const scheduleCaptureInitialGridState = (delay = 0) => {
    if (captureInitialStateTimeout) {
      clearTimeout(captureInitialStateTimeout);
      captureInitialStateTimeout = null;
    }

    suppressRevealUntilCapture = true;
    pendingInitialGridState = getNormalizedGridState();
    userInteractedDuringCapture = false;

    const finalizeCapture = () => {
      captureInitialStateTimeout = null;

      try {
        const nextState = getNormalizedGridState();
        if (userInteractedDuringCapture && pendingInitialGridState) {
          initialGridState.value = pendingInitialGridState;
        } else {
          pendingInitialGridState = nextState;
          initialGridState.value = nextState;
        }
      } finally {
        suppressRevealUntilCapture = false;
        userInteractedDuringCapture = false;

        // Depois de recapturar o estado inicial, sincroniza imediatamente
        // a visibilidade do botão para refletir o novo snapshot.
        updateHideSaveButtonVisibility(isGridStatePristine());
      }
    };

    const timeoutDelay = typeof delay === "number" && delay > 0 ? delay : 0;
    captureInitialStateTimeout = setTimeout(finalizeCapture, timeoutDelay);
  };

// Executa após o ciclo do AG Grid consolidar o sort/columnState
function defer(fn, delay = 0) {
  if (typeof window?.requestAnimationFrame === 'function' && delay === 0) {
    requestAnimationFrame(() => fn());
  } else {
    setTimeout(fn, delay);
  }
}


  const runWithSuppressedReveal = (operation, { recaptureDelay = 50 } = {}) => {
    suppressRevealUntilCapture = true;
    const finalize = () => {
      if (typeof recaptureDelay === "number") {
        scheduleCaptureInitialGridState(recaptureDelay);
      } else {
        suppressRevealUntilCapture = false;
      }
    };

    try {
      const result = operation?.();
      if (result && typeof result.then === "function") {
        return result.finally(finalize);
      }
      finalize();
      return result;
    } catch (error) {
      finalize();
      throw error;
    }
  };


  const isGridStatePristine = () => {
    if (!gridApi.value) return true;
    const current = getNormalizedGridState();
    const initial = initialGridState.value || { filters: {}, sort: [], columns: [] };

    const filtersEqual = JSON.stringify(current.filters) === JSON.stringify(initial.filters);
    const sortEqual = JSON.stringify(current.sort) === JSON.stringify(initial.sort);
    const columnsEqual = JSON.stringify(current.columns) === JSON.stringify(initial.columns);

    return filtersEqual && sortEqual && columnsEqual;
  };

  const syncHideSaveButtonVisibility = (event) => {
  const isSortEvent = event?.type === "sortChanged";
  const isRowDataSourceChange =
    !isSortEvent &&
    (event?.source === "rowDataChanged" || event?.source === "rowDataUpdated");

  if (captureInitialStateTimeout && event && !isProgrammaticEvent(event)) {
    userInteractedDuringCapture = true;
  }

  if (isRowDataSourceChange) {
    updateHideSaveButtonVisibility(true);
    scheduleCaptureInitialGridState(50);
    return;
  }

  const pristine = isGridStatePristine();
  updateHideSaveButtonVisibility(pristine);
};


  const resetHideSaveButtonVisibility = () => {
    updateHideSaveButtonVisibility(true);
    scheduleCaptureInitialGridState(100);
  };

  const componentFontFamily = ref("");
  const fallbackFontFamily = computed(() => {
  const candidates = [
  props.content?.cellFontFamily,
  props.content?.headerFontFamily,
  props.content?.actionFontFamily,
  ];
  const validCandidate = candidates.find(font =>
  typeof font === "string" && font.trim().length > 0
  );
  return validCandidate || DEFAULT_FONT_FAMILY;
  });
  const resolvedFontFamily = computed(
  () => componentFontFamily.value || fallbackFontFamily.value
  );

  const updateComponentFontFamily = () => {
  componentFontFamily.value = readTypographyVariable();
  };

  let typographyUnsubscribe = null;

  watch(
  resolvedFontFamily,
  value => {
  applyGlobalGridFontFamily(value);
  },
  { immediate: true }
  );

  onMounted(() => {
  updateComponentFontFamily();

  if (
  typeof window !== "undefined" &&
  typeof window?.wwLib?.wwVariable?.subscribe === "function"
  ) {
  try {
  typographyUnsubscribe = window.wwLib.wwVariable.subscribe(
  TYPOGRAPHY_VARIABLE_ID,
  () => {
  updateComponentFontFamily();
  }
  );
  } catch (error) {
  console.warn(
  "[GridViewDinamica] Failed to subscribe to typography variable",
  error
  );
  typographyUnsubscribe = null;
  }
  }
  });

  onUnmounted(() => {
  if (typeof typographyUnsubscribe === "function") {
  try {
  typographyUnsubscribe();
  } catch (error) {
  console.warn(
  "[GridViewDinamica] Failed to unsubscribe typography listener",
  error
  );
  }
  }
  });


  const { value: selectedRows, setValue: setSelectedRows } =
  wwLib.wwVariable.useComponentVariable({
  uid: props.uid,
  name: "selectedRows",
  type: "array",
  defaultValue: [],
  readonly: true,
  });
  const { value: filterValue, setValue: setFilters } =
  wwLib.wwVariable.useComponentVariable({
  uid: props.uid,
  name: "filters",
  type: "object",
  defaultValue: {},
  readonly: true,
  });
  const { value: sortValue, setValue: setSort } =
  wwLib.wwVariable.useComponentVariable({
  uid: props.uid,
  name: "sort",
  type: "object",
  defaultValue: {},
  readonly: true,
  });
  const { value: columnsPositionValue, setValue: setColumnsPosition } = wwLib.wwVariable.useComponentVariable({
  uid: props.uid,
  name: "columnsPosition",
  type: "array",
  defaultValue: [],
  readonly: false,
  });
  const { setValue: setColumnsSort } = wwLib.wwVariable.useComponentVariable({
  uid: props.uid,
  name: "columnsSort",
  type: "array",
  defaultValue: [],
  readonly: false,
  });

  const columnOptions = ref({});
  const componentKey = ref(0);

  const GLOBAL_OPTIONS_KEY = '__all__';
  function usesTicketId(col) {
    const tag = (col.TagControl || col.tagControl || col.tagcontrol || '').toUpperCase();
    const identifier = (col.FieldDB || '').toUpperCase();
    return tag === 'STATUSID' || identifier === 'STATUSID';
  }
  function getOptionsCacheKey(col, ticketId) {
    return usesTicketId(col) && ticketId != null ? String(ticketId) : GLOBAL_OPTIONS_KEY;
  }

// Flag para aplicar sort externo (WW variable) no próximo mount
const forceExternalSortNextMount = ref(false);

const asArray = (v) => {
if (Array.isArray(v)) return v;
if (v && typeof v === 'object') return Object.values(v);
return [];
};
const asObject = (v) => (v && typeof v === 'object' ? v : {});

// Normaliza o Sort vindo da variável WW para o formato do AG Grid
function getExternalSortFromWW() {
  try {
    const raw = window.wwLib?.wwVariable?.getValue('74a13796-f64f-47d6-8e5f-4fb4700fd94b');
    const sortArr = Array.isArray(raw) ? raw?.[0]?.Sort : raw?.Sort ?? raw?.[0]?.Sort;
    if (!Array.isArray(sortArr)) return [];
    // sortArr esperado: [{ id: 'ColId', isASC: true/false }, ...]
    return sortArr
      .filter(s => s && s.id)
      .map((s, idx) => ({
        colId: String(s.id),
        sort: s.isASC ? 'asc' : 'desc',
        sortIndex: idx
      }));
  } catch {
    return [];
  }
}

/**
 * Aplica a ordenação externa (WW variable) na grid e sincroniza variável local `sort`.
 * - Atualiza columnState (applyColumnState)
 * - Atualiza sortModel (setSortModel) para refletir no header e eventos
 * - Atualiza variável local `sort` (setSort) no formato do getState().sort.sortModel
 * - Persiste no localStorage via saveGridState()
 */
function applyExternalSortAndSync() {
  const colApi = getColApi();
  if (!gridApi.value || !colApi) return;
  const external = getExternalSortFromWW();
  if (!external.length) return;

  // 1) Aplicar columnState de sort (reseta sort nas demais colunas)
  const sortModel = external.map(e => ({ colId: e.colId, sort: e.sort }));

  runWithSuppressedReveal(() => {
    colApi?.applyColumnState?.({
      state: external.map(e => ({ colId: e.colId, sort: e.sort, sortIndex: e.sortIndex })),
      defaultState: { sort: null },
      applyOrder: false
    });

    // 2) Aplicar sortModel (garante sincronismo visual/eventos)
    gridApi.value.setSortModel(sortModel);
  });

  // 3) Atualizar variável local `sort`
  setSort(sortModel);

  // 4) Persistir
  saveGridState();
}


const remountComponent = () => {
  gridApi.value = null;
  columnApi.value = null;
  // Força reaplicar a ordenação externa no próximo ciclo
  forceExternalSortNextMount.value = true;

  componentKey.value++;
  // Não chame updateColumnsPosition/Sort aqui; eles dependem do grid já montado
};

  // ===================== Persistência de estado =====================
  const storageKey = `GridViewDinamicaState_${props.uid}`;

  function saveGridState() {
    const colApi = getColApi();
    if (!gridApi.value || !colApi) return;
    try {
      const state = {
        filterModel: gridApi.value.getFilterModel(),
        columnState: colApi?.getColumnState?.(),
      };
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save grid state', e);
    }
  }

  function restoreGridState() {
    const colApi = getColApi();
    if (!gridApi.value || !colApi) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const state = JSON.parse(raw);
      const hasColumnState = Array.isArray(state.columnState) && state.columnState.length;
      const hasFilterModel = state.filterModel && typeof state.filterModel === 'object';

      if (!hasColumnState && !hasFilterModel) {
        return;
      }

      runWithSuppressedReveal(() => {
        if (hasColumnState) {
          colApi?.applyColumnState?.({ state: state.columnState, applyOrder: true });
        }
        if (hasFilterModel) {
          gridApi.value.setFilterModel(state.filterModel);
        }
      });
    } catch (e) {
      console.warn('Failed to restore grid state', e);
    }
  }

  function clearSavedGridState() {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    const colApi = getColApi();
    colApi?.resetColumnState?.();
    if (gridApi.value) gridApi.value.setFilterModel(null);
  }
  // ================================================================

  const parseStaticOptions = (opts) => {
    const normalize = (opt) => {
      if (typeof opt === 'object') {
        const findKey = key => Object.keys(opt).find(k => k.toLowerCase() === key);
        const labelKey = findKey('label') || findKey('name');
        const valueKey = findKey('value') || findKey('id');
        return {
          ...opt,
          value: valueKey ? opt[valueKey] : opt.value,
          label: labelKey ? opt[labelKey] : opt.label || opt.name,
        };
      }
      const str = String(opt);
      return { value: str, label: str };
    };
    if (Array.isArray(opts)) {
      return opts.map(normalize);
    }
    if (typeof opts === 'string' && opts.trim() !== '') {
      return opts.split(',').map(o => {
        const trimmed = o.trim();
        return { value: trimmed, label: trimmed };
      });
    }
    return [];
  };

  const loadApiOptions = async (col, ticketId) => {
    try {
      const lang = window.wwLib?.wwVariable?.getValue('aa44dc4c-476b-45e9-a094-16687e063342');
      const companyId = window.wwLib?.wwVariable?.getValue('5d099f04-cd42-41fd-94ad-22d4de368c3a');
      const apiUrl = window.wwLib?.wwVariable?.getValue('1195995b-34c3-42a5-b436-693f0f4f8825');
      const apiKey = window.wwLib?.wwVariable?.getValue('d180be98-8926-47a7-b7f1-6375fbb95fa3');
      const apiAuth = window.wwLib?.wwVariable?.getValue('dfcde09f-42f3-4b5c-b2e8-4314650655db');
 const isResponsible = (col.TagControl || col.tagControl || col.tagcontrol || '').toUpperCase() == "RESPONSIBLEUSERID";
      const ds = col.dataSource?.dataSource || col.dataSource;
      if (!apiUrl || !ds?.functionName) return [];

      const fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(companyId ? { p_idcompany: companyId } : {}),
          ...(lang ? { p_language: lang } : {}),
          ...(ticketId ? { p_ticketid: ticketId } : {})
        })
      };
      if (apiKey) fetchOptions.headers['apikey'] = apiKey;
      if (apiAuth) fetchOptions.headers['Authorization'] = apiAuth;

      const response = await fetch(apiUrl + ds.functionName, fetchOptions);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) return [];

      if (ds.transform) {
        return data
          .map(item => {
            let value = item[ds.transform?.value] ?? item.id;
            let label = item[ds.transform?.label] ?? item.name;
            if (value === undefined || label === undefined) return null;
            return { value, label };
          })
          .filter(v => v);
      }

      return data
        .map(item => {
          const value = item[ds.valueField || 'id'];
          const label = item[ds.labelField || 'name'];
          if (value === undefined || label === undefined) return null;
          return { value, label };
        })
        .filter(v => v);
    } catch (e) {
      console.error('Failed to load options', e);
      return [];
    }
  };

  const loadResponsibleUserOptions = async () => {
        try {
          const data = wwLib.wwCollection.getCollection("0e41f029-e1c3-4302-82ca-16aceccdadb1").data;
          return asArray(
            Array.isArray(data)
              ? data
              : data?.data || data?.result || data?.results
          );
        } catch (e) {
          // Fallback: props.content.userDatasource
          const ds = props.content?.userDatasource;
          if (Array.isArray(ds)) return ds;
          if (ds && typeof ds === 'object') return asArray(ds.data || ds.result || ds.results);
          
          return [];
        }
      };

  let responsibleUserCache = null;

  async function getColumnOptions(col, ticketId, { force = false } = {}) {
    const tag = (col.TagControl || col.tagControl || col.tagcontrol || '').toUpperCase();
    const identifier = (col.FieldDB || '').toUpperCase();
    const lazyStatus = shouldLazyLoadStatus(col);

    if (lazyStatus && !force) {
      return [];
    }

    if (tag === 'RESPONSIBLEUSERID' || identifier === 'RESPONSIBLEUSERID') {
      if (!responsibleUserCache) {
        responsibleUserCache = await loadResponsibleUserOptions();
      }
      return responsibleUserCache;
    }

    let opts = [];
    if (col.listOptions) {
      opts = parseStaticOptions(col.listOptions);
    } else if (col.list_options) {
      opts = parseStaticOptions(col.list_options);
    } else if (col.dataSource?.list_options) {
      opts = parseStaticOptions(col.dataSource.list_options);
    }

    const hasFn = col.dataSource?.functionName || col.dataSource?.dataSource?.functionName;
    if (!opts.length && hasFn) {
      const useTicket = usesTicketId(col);
      opts = await loadApiOptions(col, useTicket ? ticketId : undefined);
    }

    return opts;
  }

  const loadAllColumnOptions = async () => {
    if (!props.content || !Array.isArray(props.content.columns)) return;

    const rows = wwLib.wwUtils.getDataFromCollection(props.content.rowData) || [];
    const result = {};
    const tasks = [];

    for (const col of props.content.columns) {
      if (!isListLikeColumn(col)) continue;

      const colId = col.id || col.field;
      if (!colId) continue;

      const usesTicket = usesTicketId(col);
      const lazyStatus = shouldLazyLoadStatus(col);
      const forceOptions = lazyStatus ? { force: true } : undefined;

      if (!result[colId]) {
        result[colId] = {};
      }

      const seenKeys = new Set();

      if (usesTicket) {
        rows.forEach(row => {
          const ticketId = row?.TicketID;
          const cacheKey = getOptionsCacheKey(col, ticketId);
          if (seenKeys.has(cacheKey)) return;
          seenKeys.add(cacheKey);
          const promise = getColumnOptions(
            col,
            ticketId,
            forceOptions
          ).then(opts => {
            result[colId][cacheKey] = opts;
          }).catch(() => {
            result[colId][cacheKey] = [];
          });
          tasks.push(promise);
        });
      }

      if (!usesTicket || seenKeys.size === 0) {
        const cacheKey = getOptionsCacheKey(col, undefined);
        if (!seenKeys.has(cacheKey)) {
          seenKeys.add(cacheKey);
          const promise = getColumnOptions(
            col,
            undefined,
            forceOptions
          ).then(opts => {
            result[colId][cacheKey] = opts;
          }).catch(() => {
            result[colId][cacheKey] = [];
          });
          tasks.push(promise);
        }
      }
    }

    if (tasks.length) {
      await Promise.allSettled(tasks);
    }

    columnOptions.value = result;
  };

  // Reaplica a ordem das colunas baseada na propriedade PositionInGrid
  const applyColumnOrderFromPosition = () => {
    const colApi = getColApi();
    if (!colApi || !props.content || !Array.isArray(props.content.columns)) return;

    const includeSelectionColumn =
      props.content?.rowSelection === 'multiple' && !props.content?.disableCheckboxes;

    const ordered = [...props.content.columns].sort((a, b) => {
      const aPos = a.PositionInGrid ?? a.positionInGrid ?? a.PositionField ?? 0;
      const bPos = b.PositionInGrid ?? b.positionInGrid ?? b.PositionField ?? 0;
      return aPos - bPos;
    });

    let state = ordered
      .map((col, idx) => {
        const colId = col.id || col.field;
        if (!colId) return null;
        const pinned = col.pinned === 'left' || col.pinned === 'right' ? col.pinned : undefined;
        return {
          colId,
          order: includeSelectionColumn ? idx + 1 : idx,
          ...(pinned ? { pinned } : {}),
        };
      })
      .filter(Boolean);

    if (includeSelectionColumn) {
      state = [
        {
          colId: 'ag-Grid-SelectionColumn',
          order: 0,
          pinned: 'left',
          suppressSizeToFit: true,
          suppressAutoSize: true,
        },
        ...state,
      ];
    }

    if (state.length) {
      runWithSuppressedReveal(() => {
        const columnStateConfig = {
          state,
          applyOrder: true,
        };

        if (includeSelectionColumn) {
          columnStateConfig.defaultState = { pinned: null };
        }

        colApi?.applyColumnState?.(columnStateConfig);
      });
      // Atualiza variáveis e persiste nova ordem
      updateColumnsPosition();

      if (includeSelectionColumn) {
        defer(() => forceSelectionColumnFirst());

      }
    }
  };

  // Listener de unload para salvar estado (opcional, robustez extra)
  let beforeUnloadHandler = null;

  const handleDocumentClick = (e) => {
    const selectors = [
      '.list-editor',
      '.list-filter',
      '.ag-popup',
      '.datepicker-pop',
      '[role="dialog"]',
      '[data-grid-popup]'
    ];
    const anyPopup = selectors.some(sel => document.querySelector(sel));
    if (!anyPopup) return;
    const clickedInside = selectors.some(sel => e.target.closest(sel));
    if (!clickedInside && gridApi.value) {
      gridApi.value.stopEditing();
      if (typeof gridApi.value.hidePopupMenu === 'function') {
        gridApi.value.hidePopupMenu();
      }
    }
  };

  onMounted(() => {
    loadAllColumnOptions();

    beforeUnloadHandler = () => saveGridState();
    window.addEventListener('beforeunload', beforeUnloadHandler);
    document.addEventListener('click', handleDocumentClick, true);
  });

  watch(() => props.content?.columns, () => {
    loadAllColumnOptions();
    applyColumnOrderFromPosition();
    updateColumnsPosition({ fallbackToContent: true });
    // Se estamos num ciclo de remount que deve respeitar a WW variable, reaplique
    setTimeout(() => {
      if (forceExternalSortNextMount.value) {
        applyExternalSortAndSync();
      }
    }, 0);
    resetHideSaveButtonVisibility();
  }, { deep: true });

  watch(() => props.content?.rowData, () => {
    loadAllColumnOptions();
    applyColumnOrderFromPosition();
    updateColumnsPosition({ fallbackToContent: true });
    // Se estamos num ciclo de remount que deve respeitar a WW variable, reaplique
    setTimeout(() => {
      if (forceExternalSortNextMount.value) {
        applyExternalSortAndSync();
      }
    }, 0);
    resetHideSaveButtonVisibility();
  }, { deep: true });




  // Interval para atualizar células DEADLINE
  let deadlineTimer = null;
  if (!window.gridDeadlineNow) window.gridDeadlineNow = new Date();
  onUnmounted(() => {
    if (deadlineTimer) {
      clearInterval(deadlineTimer);
      deadlineTimer = null;
    }
    // Salva estado ao desmontar (garante persistência ao navegar)
    saveGridState();
    if (beforeUnloadHandler) {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      beforeUnloadHandler = null;
    }
    document.removeEventListener('click', handleDocumentClick, true);
    if (captureInitialStateTimeout) {
      clearTimeout(captureInitialStateTimeout);
      captureInitialStateTimeout = null;
    }
    pendingInitialGridState = null;
    suppressRevealUntilCapture = false;

  });
  
    const onGridReady = (params) => {
      gridApi.value = params.api;
      columnApi.value = params.columnApi;

      resetHideSaveButtonVisibility();

      // Restaura imediatamente e também em pequenos delays
      restoreGridState();
      setTimeout(restoreGridState, 0);
      setTimeout(restoreGridState, 150);
      setTimeout(() => scheduleCaptureInitialGridState(0), 220);



      // LOG: Tenta mostrar as colunas disponíveis e seus renderers
      if (typeof params.api.getAllColumns === 'function') {
        const allCols = params.api.getAllColumns().map(col => ({
          colId: col.getColId(),
          field: col.getColDef().field,
          headerName: col.getColDef().headerName,
          cellRenderer: col.getColDef().cellRenderer
        }));
        
      } else if (typeof params.api.getColumnDefs === 'function') {
        const colDefs = params.api.getColumnDefs();
        
      } else if (typeof params.api.getColumnState === 'function') {
        const colState = params.api.getColumnState();
        
      } 

      updateColumnsPosition();
      updateColumnsSort();

      // Persistir estado em todos eventos relevantes
      params.api.addEventListener('filterChanged', saveGridState);
      params.api.addEventListener('sortChanged', saveGridState);
      params.api.addEventListener('columnPinned', saveGridState);
      params.api.addEventListener('columnVisible', saveGridState);
      params.api.addEventListener('columnResized', saveGridState);
      params.api.addEventListener('columnEverythingChanged', saveGridState);

      const applyPinnedHeaderBlock = () => {
        const gridElement = agGridRef.value?.$el;
        if (!gridElement) return;

        gridElement
          .querySelectorAll('.ag-header-cell.ag-pinned-left, .ag-header-cell.ag-pinned-right')
          .forEach(cell => {
            if (!('dataset' in cell)) return;
            if (cell.dataset[PINNED_HEADER_DATASET_FLAG]) return;
            cell.dataset[PINNED_HEADER_DATASET_FLAG] = 'true';
            cell.addEventListener('mousedown', stopPinnedHeaderMouseDown, true);
            cell.addEventListener('dragstart', preventPinnedHeaderDragStart, true);
          });
      };

    // Impedir mover colunas para posição de pinned

    params.api.addEventListener('columnMoved', (event) => {
      const api = (params.columnApi && typeof params.columnApi.getAllGridColumns === 'function')
        ? params.columnApi
        : (params.api && typeof params.api.getAllGridColumns === 'function')
          ? params.api
          : null;
      if (!api) return;

      const allColumns = api.getAllGridColumns();
      const firstPinnedIdx = allColumns.findIndex(col => col.getPinned && col.getPinned() === 'left');
      if (firstPinnedIdx > 0) {
        const hasNonPinnedBefore = allColumns
          .slice(0, firstPinnedIdx)
          .some(col => (col.getPinned && col.getPinned() !== 'left'));
        if (hasNonPinnedBefore) {
          const pinnedCols = allColumns.filter(col => col.getPinned && col.getPinned() === 'left');
          const nonPinnedCols = allColumns.filter(col => !col.getPinned || col.getPinned() !== 'left');
          const newOrder = [...pinnedCols, ...nonPinnedCols].map(col => col.getColId && col.getColId());
          if (typeof (params.columnApi?.moveColumns) === 'function') {
            params.columnApi.moveColumns(newOrder, 0);
          } else if (typeof (params.api?.moveColumns) === 'function') {
            params.api.moveColumns(newOrder, 0);
          }
        }
      }
    });

    
    params.api.addEventListener('columnPinned', applyPinnedHeaderBlock);
    params.api.addEventListener('columnMoved', applyPinnedHeaderBlock);
    params.api.addEventListener('columnVisible', applyPinnedHeaderBlock);
    params.api.addEventListener('columnEverythingChanged', applyPinnedHeaderBlock);
    params.api.addEventListener('bodyScroll', applyPinnedHeaderBlock);
    params.api.addEventListener('displayedColumnsChanged', applyPinnedHeaderBlock);
    setTimeout(() => {
      applyPinnedHeaderBlock();
    }, 500);

    // Configurar a coluna de seleção para ser sempre a primeira
    if (props.content.rowSelection === 'multiple' && !props.content.disableCheckboxes) {
      // Múltiplas tentativas para garantir que funcione
      setTimeout(() => forceSelectionColumnFirst(), 50);
      setTimeout(() => forceSelectionColumnFirst(), 200);
      
      // Observer para detectar mudanças no DOM e reposicionar automaticamente
      setTimeout(() => {
        const gridElement = agGridRef.value?.$el;
        if (gridElement) {
          const observer = new MutationObserver(() => {
            // Debounce para evitar execuções excessivas
            clearTimeout(observer.debounceTimer);
            observer.debounceTimer = setTimeout(() => {
              forceSelectionColumnFirstDOM();
            }, 50);
          });
          
          observer.observe(gridElement, {
            childList: true,
            subtree: true,
            attributes: false
          });
          
          // Store observer for cleanup if needed
          gridApi.value._selectionColumnObserver = observer;
        }
      }, 600);
    }

    // Descobrir colunas DEADLINE
    let deadlineColumns = [];
    // Timer para atualizar células DEADLINE
    if (props.content && props.content.columns && Array.isArray(props.content.columns)) {
      deadlineColumns = props.content.columns
        .filter(col => {
          const tc = col.TagControl || col.tagControl || col.tagcontrol;
          return tc && tc.toUpperCase() === 'DEADLINE';
        })
        .map(col => col.id || col.field)
        .filter(Boolean);
    }
    // Timer para atualizar células DEADLINE
    if (deadlineColumns.length) {
      deadlineTimer = setInterval(() => {
        window.gridDeadlineNow = new Date();
        if (gridApi.value) {
          gridApi.value.refreshCells({ columns: deadlineColumns, force: true });
        }
      }, 1000);
    }
  
  

      /*__EXTERNAL_APPLY__*/
      try {
        const existingExternal = readExternalStateFromWW();
        if (existingExternal) {
          // aplica logo após restore e ANTES de capturar o estado inicial
          setTimeout(() => applyExternalStateFromWW('gridReady'), 80);
        } else {
          // se não houver estado salvo, publica o estado atual como baseline
          setTimeout(() => writeExternalStateToWW('gridReady'), 100);
        }
      } catch (e) {
        setTimeout(() => writeExternalStateToWW('gridReady'), 120);
      }

    };
  
  function restorePinnedColumns() {
    if (!getColApi()) return;
    const state = getColApi()?.getColumnState?.();
    // Restaurar pinned e ordem das colunas pinned
    const pinnedLeft = [];
    const pinnedRight = [];
    const others = [];
    state.forEach(col => {
      const original = props.content && props.content.columns ? props.content.columns.find(c => c.id === col.colId || c.field === col.colId) : null;
      if (original && original.pinned === 'left') {
        pinnedLeft.push({ ...col, pinned: 'left' });
      } else if (original && original.pinned === 'right') {
        pinnedRight.push({ ...col, pinned: 'right' });
      } else {
        others.push({ ...col, pinned: null });
      }
    });
    const newState = [...pinnedLeft, ...others, ...pinnedRight];
    getColApi()?.applyColumnState?.({ state: newState, applyOrder: true });
  }
  
  // Função para forçar a coluna de seleção a ser a primeira
  function forceSelectionColumnFirst() {
    if (!gridApi.value) return;

    try {
      // Tentar reposicionar usando API do AG-Grid
      const columnState = gridApi.value.getColumnState();
      const selectionColumnIndex = columnState.findIndex(col => 
        col.colId === 'ag-Grid-SelectionColumn'
      );
      
      if (selectionColumnIndex !== -1) {
        // Configurar a coluna de seleção como pinned left
        columnState[selectionColumnIndex].pinned = 'left';
        columnState[selectionColumnIndex].suppressSizeToFit = true;
        columnState[selectionColumnIndex].suppressAutoSize = true;
        
        // Reposicionar para o início
        const selectionColumn = columnState.splice(selectionColumnIndex, 1)[0];
        columnState.unshift(selectionColumn);
        
        // Restaurar pinning das outras colunas
        const originalColumns = props.content && props.content.columns ? props.content.columns : [];
        columnState.forEach(colState => {
          const originalCol = originalColumns.find(col => col.id === colState.colId);
          if (originalCol && originalCol.pinned === 'left' && colState.colId !== 'ag-Grid-SelectionColumn') {
            colState.pinned = 'left';
          }
        });
        
        // Aplicar o novo estado
        runWithSuppressedReveal(() => {
          gridApi.value.applyColumnState({
            state: columnState,
            applyOrder: true
          });
        });
      }
    } catch (error) {
      console.warn('Erro ao reposicionar coluna de seleção:', error);
    }

    // Fallback: reposicionamento direto no DOM
    setTimeout(() => {
      forceSelectionColumnFirstDOM();
    }, 100);
  }

  // Função para reposicionar a coluna de seleção diretamente no DOM
  function forceSelectionColumnFirstDOM() {
    if (!gridApi.value) return;

    try {
      const gridElement = agGridRef.value?.$el;
      if (!gridElement) return;
      
      // Reposicionar headers
      const headerRows = gridElement.querySelectorAll('.ag-header-row');
      headerRows.forEach(headerRow => {
        const selectionHeader = headerRow.querySelector('.ag-header-cell[col-id="ag-Grid-SelectionColumn"]');
        if (selectionHeader && selectionHeader.parentElement === headerRow) {
          // Move para o primeiro position
          headerRow.insertBefore(selectionHeader, headerRow.firstChild);
        }
      });
      
      // Reposicionar células nas linhas
      const rows = gridElement.querySelectorAll('.ag-row');
      rows.forEach(row => {
        const selectionCell = row.querySelector('.ag-cell[col-id="ag-Grid-SelectionColumn"]');
        if (selectionCell && selectionCell.parentElement === row) {
          // Move para o primeiro position
          row.insertBefore(selectionCell, row.firstChild);
        }
      });
    } catch (error) {
      console.warn('Erro ao reposicionar coluna de seleção no DOM:', error);
    }
  }
  
  watch(
    [() => props.content.initialFilters, () => gridApi.value],
    ([filters]) => {
      if (!gridApi.value) return;
      runWithSuppressedReveal(() => {
        gridApi.value.setFilterModel(filters || null);
      }, { recaptureDelay: 50 });

    },
    { deep: true, immediate: true }
  );

  watch(
    [() => props.content.initialSort, () => gridApi.value],
    ([sort]) => {
      if (!gridApi.value) return;
      runWithSuppressedReveal(() => {
        gridApi.value.applyColumnState({
          state: sort || [],
          defaultState: { sort: null },
        });
      }, { recaptureDelay: 50 });

    },
    { deep: true, immediate: true }
  );
  
  const onRowSelected = (event) => {
  const name = event.node.isSelected() ? "rowSelected" : "rowDeselected";
  ctx.emit("trigger-event", {
  name,
  event: { row: event.data },
  });
  };
  
  const onSelectionChanged = (event) => {
  if (!gridApi.value) return;
  const selected = gridApi.value.getSelectedRows() || [];
  setSelectedRows(selected);
  };
  
  const onFilterChanged = (event) => {
  if (!gridApi.value) return;
  const filterModel = gridApi.value.getFilterModel();
  if (
  JSON.stringify(filterModel || {}) !==
  JSON.stringify(filterValue.value || {})
  ) {
  setFilters(filterModel);
  syncHideSaveButtonVisibility(event);

  ctx.emit("trigger-event", {
  name: "filterChanged",
  event: filterModel,
  });
  }
  saveGridState();
  
      writeExternalStateToWW('filterChanged');
    };
  
  const onSortChanged = (event) => {
    if (!gridApi.value) return;

    if (suppressRevealUntilCapture) {
      updateHideSaveButtonVisibility(true);
      return;
    }

    deferAfterGridUpdate(() => {
      
      
      writeExternalStateToWW('sortChanged');
      const { sort: normalizedSort } = getNormalizedGridState();
      setSort(normalizedSort);
      updateColumnsSort();
      saveGridState();
      const pristine = isGridStatePristine();
      updateHideSaveButtonVisibility(pristine);
      ctx.emit("trigger-event", { name: "sortChanged", event: normalizedSort });
});
  };

  const onColumnMoved = (event) => {
  if (!gridApi.value || !event?.finished) return;
  const prev = JSON.stringify(columnsPositionValue.value || []);
  updateColumnsPosition();
  const current = JSON.stringify(columnsPositionValue.value || []);
  if (prev !== current) {
  syncHideSaveButtonVisibility(event);

  ctx.emit("trigger-event", {
  name: "columnMoved",
  event: columnsPositionValue.value,
  });
  }
  
      if (event?.finished) { writeExternalStateToWW('columnMoved'); }
    };

  /* wwEditor:start */
  const { createElement } = wwLib.wwElement.useCreate();
  /* wwEditor:end */
  
  function buildColumnsPositionFromContentColumns() {
    if (!props.content || !Array.isArray(props.content.columns)) {
      return [];
    }

    const orderedColumns = [...props.content.columns].sort((a, b) => {
      const getPosition = column =>
        column.PositionInGrid ??
        column.positionInGrid ??
        column.PositionField ??
        column.positionField ??
        0;

      return getPosition(a) - getPosition(b);
    });

    let order = 1;
    return orderedColumns
      .map(column => {
        const fieldId =
          column.FieldID ??
          column.FieldId ??
          column.Field ??
          column.id ??
          column.field ??
          column.FieldDB;

        if (!fieldId) {
          return null;
        }

        return {
          FieldID: String(fieldId),
          PositionField: order++,
          IsDeleted: false,
        };
      })
      .filter(Boolean);
  }

  function updateColumnsPosition(options = {}) {
    const { fallbackToContent = false } = options;

    if (gridApi.value && typeof gridApi.value.getAllGridColumns === "function") {
      const allColumns = gridApi.value.getAllGridColumns();
      const positions = allColumns
        .map((column, idx) => {
          const colDef = typeof column.getColDef === "function" ? column.getColDef() : column.colDef || {};
          const fieldId =
            colDef?.id ??
            colDef?.colId ??
            (typeof column.getColId === "function" ? column.getColId() : undefined) ??
            colDef?.field;

          if (!fieldId) {
            return null;
          }

          return {
            FieldID: String(fieldId),
            PositionField: idx + 1,
            IsDeleted: false,
          };
        })
        .filter(Boolean);

      setColumnsPosition(positions);
      saveGridState();

      if (positions.length || !fallbackToContent) {
        return;
      }
    }

    if (fallbackToContent) {
      setColumnsPosition(buildColumnsPositionFromContentColumns());
    }
  }
  
  function updateColumnsSort() {
  const api = (columnApi.value && typeof columnApi.value.getColumnState === 'function')
    ? columnApi.value
    : (gridApi.value && typeof gridApi.value.getColumnState === 'function')
      ? gridApi.value
      : null;
  if (!api) return;
  const sortArray = (api.getColumnState() || [])
    .filter(col => col.sort)
    .map(col => ({
      id: col.colId,
      isASC: col.sort === 'asc'
    }));
  setColumnsSort(sortArray);
}
  
      const onFirstDataRendered = () => {
      updateColumnsPosition();
      updateColumnsSort();
      
      // Reaplica o estado salvo após o primeiro render (garante consistência)
      setTimeout(() => {
        restoreGridState();
      }, 0);

      // Garantia extra: se ainda não aplicou, faça aqui também
setTimeout(() => {
  if (forceExternalSortNextMount.value) {
    applyExternalSortAndSync();
    forceExternalSortNextMount.value = false;
  }
}, 0);


      // Garantir que a coluna de seleção esteja na primeira posição
      if (props.content.rowSelection === 'multiple' && !props.content.disableCheckboxes) {
        // Múltiplas tentativas para garantir que funcione
        setTimeout(() => forceSelectionColumnFirst(), 10);
        setTimeout(() => forceSelectionColumnFirst(), 100);
        setTimeout(() => forceSelectionColumnFirst(), 300);
        // Força reposicionamento no DOM como backup
        setTimeout(() => forceSelectionColumnFirstDOM(), 400);
      }
    };
  
      onMounted(() => {
      setTimeout(() => {
        if (gridApi.value && typeof gridApi.value.getAllColumns === 'function') {
          const allCols = gridApi.value.getAllColumns().map(col => ({
            colId: col.getColId(),
            field: col.getColDef().field,
            headerName: col.getColDef().headerName,
            cellRenderer: col.getColDef().cellRenderer
          }));
          
        } 
      }, 2000); // Espera 2 segundos para garantir que a grid montou
    });
  
      return {
      resolveMappingFormula,
      resolveRowId,
      componentFontFamily,
      resolvedFontFamily,
      onGridReady,
      onRowSelected,
      onSelectionChanged,
      gridApi,
      onFilterChanged,
      onSortChanged,
      onColumnMoved,
      forceSelectionColumnFirst,
      forceSelectionColumnFirstDOM,
      columnOptions,
      refreshRowFromSource,
      refreshRowListOptions,
      shouldLazyLoadStatus,
      buildLazyStatusFallbackOptions,
      getRowMetadataHash,
      waitForRowHydration,
      getColumnOptions,
      getOptionsCacheKey,
      usesTicketId,
      componentKey,
      remountComponent,
      clearSavedGridState,
      localeText: computed(() => {
        let lang = 'en-US';
        try {
          if (window.wwLib && window.wwLib.wwVariable && typeof window.wwLib.wwVariable.getValue === 'function') {
            const v = window.wwLib.wwVariable.getValue('aa44dc4c-476b-45e9-a094-16687e063342');
            if (typeof v === 'string' && v.length > 0) lang = v;
          }
        } catch (e) {}
        switch (lang) {
          case 'pt-BR':
          case 'pt':
            return AG_GRID_LOCALE_PT;
          case 'fr':
          case 'fr-FR':
            return AG_GRID_LOCALE_FR;
          case 'de':
          case 'de-DE':
            return AG_GRID_LOCALE_DE;
          case 'es':
          case 'es-ES':
            return AG_GRID_LOCALE_ES;
          case 'en-US':
          default:
            return AG_GRID_LOCALE_EN;
        }
      }),
      /* wwEditor:start */
      createElement,
      /* wwEditor:end */
      onFirstDataRendered,
      editorComponents: {
        ListCellEditor,
        FixedListCellEditor,
        ResponsibleUserCellEditor,
        DateTimeCellEditor,
      },
    };
  },
    computed: {
    rowData() {
      const data = wwLib.wwUtils.getDataFromCollection(this.content.rowData);
      return Array.isArray(data) ? data ?? [] : [];
    },
    defaultColDef() {
      return {
        editable: false,
        resizable: this.content.resizableColumns,
      };
    },
    finalColumnDefs() {
      const columns = this.columnDefs;
      // Se temos seleção múltipla, garantir que colunas originalmente pinned permaneçam fixas
      if (this.content.rowSelection === 'multiple' && !this.content.disableCheckboxes) {
        return columns.map(col => {
          if (col._originalPinned) {
            return { ...col, pinned: col._originalPinned };
          }
          return col;
        });
      }
      return columns;
    },
    columnDefs() {
      if (!this.content || !this.content.columns || !Array.isArray(this.content.columns)) {
        return [];
      }

      const orderedColumns = [...this.content.columns].sort((a, b) => {
        const aPos = a.PositionInGrid ?? a.positionInGrid ?? a.PositionField ?? 0;
        const bPos = b.PositionInGrid ?? b.positionInGrid ?? b.PositionField ?? 0;
        return aPos - bPos;
      });



      return orderedColumns.map((col) => {
        const colCopy = { ...col };
        const colId = colCopy.id || colCopy.field;
        // Forçar configuração correta para a coluna Deadline        

        if (colCopy.field === 'Deadline') {
          colCopy.cellRenderer = FormatterCellRenderer;
          delete colCopy.cellRendererFramework;
          delete colCopy.formatter;
          delete colCopy.valueFormatter;
          delete colCopy.useCustomFormatter;
          delete colCopy.useStyleArray;
        }
        if (colCopy.cellDataType === 'dateTime') {
          delete colCopy.useCustomFormatter;
          delete colCopy.formatter;
          delete colCopy.valueFormatter;
          delete colCopy.cellRendererFramework;
        }
        if (colCopy.FieldDB === 'StatusID') {
          colCopy.filter = 'agListColumnFilter';
        }
        // Função utilitária para garantir valor numérico
        function toNumber(val) {
          if (val === null || val === undefined || val === '' || val === 'auto') return undefined;
          if (typeof val === 'number') return val;
          if (typeof val === 'string' && val.endsWith('px')) return Number(val.replace('px', ''));
          if (!isNaN(Number(val))) return Number(val);
          return undefined;
        }
        
        const minWidth = toNumber(colCopy.minWidth) || toNumber(colCopy.MinWidth) || 80;
        const isFlex = colCopy.widthAlgo === 'flex';
        const width = isFlex ? undefined : minWidth;
        const flex = isFlex ? (colCopy.flex ?? 1) : undefined;
        const maxWidth = toNumber(colCopy.maxWidth) || undefined;
        const commonProperties = {
          minWidth,
          ...(width ? { width } : {}),
          ...(isFlex ? { flex } : {}),
          ...(maxWidth ? { maxWidth } : {}),
          pinned: colCopy.pinned === "none" ? false : colCopy.pinned,
          hide: !!colCopy.hide,
          editable: !!colCopy.editable, // <-- garantir editable
          FieldDB: colCopy.FieldDB, // <-- garantir FieldDB no colDef
          TagControl: colCopy.TagControl,
          ...(colCopy.pinned === 'left' ? { lockPinned: true, lockPosition: true } : {}),
        };

        const tagControl = (colCopy.TagControl || colCopy.tagControl || colCopy.tagcontrol || '').toUpperCase();
        const identifier = (colCopy.FieldDB || '').toUpperCase();

        // Se o filtro for agListColumnFilter, usar o filtro customizado
        if (colCopy.filter === 'agListColumnFilter') {
          const isResponsible = tagControl === 'RESPONSIBLEUSERID' || identifier === 'RESPONSIBLEUSERID';
          const baseFilterParams = typeof colCopy.filterParams === 'object' && colCopy.filterParams
            ? colCopy.filterParams
            : {};
          const filterRendererConfig = {
            ...(baseFilterParams.rendererConfig || {}),
            useCustomFormatter: !!colCopy.useCustomFormatter,
            formatter: colCopy.formatter,
            useStyleArray: !!colCopy.useStyleArray,
            styleArray: colCopy.useStyleArray ? this.content.cellStyleArray : baseFilterParams.rendererConfig?.styleArray,
          };

          const result = {
            ...commonProperties,
            id: colId,
            colId,
            headerName: colCopy.headerName,
            field: colCopy.field,
            sortable: colCopy.sortable,
            filter: isResponsible ? ResponsibleUserFilterRenderer : ListFilterRenderer,
            cellRenderer: isResponsible ? 'UserCellRenderer' : 'FormatterCellRenderer',
            cellRendererParams: {
              useCustomFormatter: colCopy.useCustomFormatter,
              formatter: colCopy.formatter,
              // options will be added below when available
            },
            filterParams: {
              ...baseFilterParams,
              rendererConfig: filterRendererConfig,
              getFilterOptions: () => this.getFilterOptionsForColumn(colCopy),
            }
          };
          const fieldKey = colCopy.id || colCopy.field;
          const useTicket = this.usesTicketId(colCopy);
          const lazyStatus = this.shouldLazyLoadStatus(colCopy);
          const getDsOptionsSync = params => {
            const ticketId = params.data?.TicketID;
            const key = this.getOptionsCacheKey(colCopy, ticketId);
            if (lazyStatus) {
              return this.buildLazyStatusFallbackOptions(colCopy);
            }
            const colOpts = this.columnOptions[fieldKey] || {};
            const cached = colOpts[key];
            if (cached) return cached;
            if (lazyStatus) {
              return this.buildLazyStatusFallbackOptions(colCopy);
            }
            if (tagControl === 'RESPONSIBLEUSERID') {
              this.getColumnOptions(colCopy, useTicket ? ticketId : undefined).then(opts => {
                if (!this.columnOptions[fieldKey]) this.columnOptions[fieldKey] = {};
                this.columnOptions[fieldKey][key] = opts;
                params.api?.refreshCells?.({ columns: [fieldKey], force: true });
              });
            }
            return [];
          };
          const getDsOptionsAsync = params => {
            const ticketId = params.data?.TicketID;
            if (lazyStatus) {
              return this.getColumnOptions(
                colCopy,
                useTicket ? ticketId : undefined,
                { force: true }
              ).catch(error => {
                console.warn('[GridViewDinamica] Failed to lazy load StatusID options', error);
                return this.buildLazyStatusFallbackOptions(colCopy);
              });
            }
            const key = this.getOptionsCacheKey(colCopy, ticketId);
            const colOpts = this.columnOptions[fieldKey] || {};
            const cached = colOpts[key];
            if (cached) return Promise.resolve(cached);
            return this.getColumnOptions(
              colCopy,
              useTicket ? ticketId : undefined
            ).then(opts => {
              if (!this.columnOptions[fieldKey]) this.columnOptions[fieldKey] = {};
              this.columnOptions[fieldKey][key] = opts;
              params.api?.refreshCells?.({ columns: [fieldKey], force: true });
              return opts;
            });
          };

          if (
            colCopy.cellDataType === 'list' ||
            (tagControl && tagControl.toUpperCase() === 'LIST')
          ) {
            const optionsArr = Array.isArray(colCopy.options)
              ? parseStaticOptions(colCopy.options)
              : Array.isArray(colCopy.listOptions)
              ? parseStaticOptions(colCopy.listOptions)
              : (colCopy.useStyleArray && Array.isArray(this.content.cellStyleArray))
              ? this.content.cellStyleArray.map(opt => ({ value: opt.Valor, label: opt.Valor }))
              : null;
            if (colCopy.editable) {
              result.editable = true;
              if (optionsArr && optionsArr.length) {
                result.cellEditor = ListCellEditor;
                result.cellEditorParams = { options: optionsArr };
                const baseRendererParams = result.cellRendererParams;
                result.cellRendererParams = params => ({
                  ...(typeof baseRendererParams === 'function'
                    ? baseRendererParams(params)
                    : baseRendererParams),
                  options: optionsArr,
                });
              } else {
                result.cellEditor = tagControl === 'RESPONSIBLEUSERID' ? ResponsibleUserCellEditor : FixedListCellEditor;
                result.cellEditorParams = params => ({ options: getDsOptionsAsync(params) });
                const baseRendererParams = result.cellRendererParams;
                result.cellRendererParams = params => ({
                  ...(typeof baseRendererParams === 'function'
                    ? baseRendererParams(params)
                    : baseRendererParams),
                  options: getDsOptionsSync(params),
                });
              }
            } else {
              const baseRendererParams = result.cellRendererParams;
              result.cellRendererParams = params => ({
                ...(typeof baseRendererParams === 'function'
                  ? baseRendererParams(params)
                  : baseRendererParams),
                options: optionsArr || getDsOptionsSync(params),
              });
            }
          }
          if (colCopy.dataSource && colCopy.editable) {
            result.editable = true;
            result.cellEditor = tagControl === 'RESPONSIBLEUSERID' ? ResponsibleUserCellEditor : FixedListCellEditor;
            result.cellEditorParams = params => ({ options: getDsOptionsAsync(params) });
            const baseRendererParams = result.cellRendererParams;
            result.cellRendererParams = params => ({
              ...(typeof baseRendererParams === 'function'
                ? baseRendererParams(params)
                : baseRendererParams),
              options: getDsOptionsSync(params),
            });
          }
          return result;
        }

        switch (colCopy.cellDataType) {
          case "action": {
            return {
              ...commonProperties,
              id: colId,
              colId,
              headerName: colCopy.headerName,
              cellRenderer: "ActionCellRenderer",
              cellRendererParams: {
                name: colCopy.actionName,
                label: colCopy.actionLabel,
                trigger: this.onActionTrigger,
                withFont: !!this.content.actionFont,
              },
              sortable: false,
              filter: false,
            };
          }
          case "custom":
            return {
              ...commonProperties,
              id: colId,
              colId,
              headerName: colCopy.headerName,
              field: colCopy.field,
              cellRenderer: "WewebCellRenderer",
              cellRendererParams: {
                containerId: colCopy.containerId,
              },
              sortable: colCopy.sortable,
              filter: colCopy.filter,
            };
          case "image": {
            return {
              ...commonProperties,
              id: colId,
              colId,
              headerName: colCopy.headerName,
              field: colCopy.field,
              cellRenderer: "ImageCellRenderer",
              cellRendererParams: {
                width: colCopy.imageWidth,
                height: colCopy.imageHeight,
              },
            };
          }
          case "list":
            {
              const fieldKey = colCopy.id || colCopy.field;
              const useTicket = this.usesTicketId(colCopy);
              const lazyStatus = this.shouldLazyLoadStatus(colCopy);
              const getDsOptionsSync = params => {
                const ticketId = params.data?.TicketID;
                const key = this.getOptionsCacheKey(colCopy, ticketId);
                if (lazyStatus) {
                  return this.buildLazyStatusFallbackOptions(colCopy);
                }
                const colOpts = this.columnOptions[fieldKey] || {};
                const cached = colOpts[key];
                if (cached) return cached;
                if (lazyStatus) {
                  return this.buildLazyStatusFallbackOptions(colCopy);
                }
                this.getColumnOptions(colCopy, useTicket ? ticketId : undefined).then(opts => {
                  if (!this.columnOptions[fieldKey]) this.columnOptions[fieldKey] = {};
                  this.columnOptions[fieldKey][key] = opts;
                  params.api?.refreshCells?.({ force: true });
                });
                return [];
              };
              const getDsOptionsAsync = params => {
                const ticketId = params.data?.TicketID;
                if (lazyStatus) {
                  return this.getColumnOptions(
                    colCopy,
                    useTicket ? ticketId : undefined,
                    { force: true }
                  ).catch(error => {
                    console.warn('[GridViewDinamica] Failed to lazy load StatusID options', error);
                    return this.buildLazyStatusFallbackOptions(colCopy);
                  });
                }
                const key = this.getOptionsCacheKey(colCopy, ticketId);
                const colOpts = this.columnOptions[fieldKey] || {};
                const cached = colOpts[key];
                if (cached) return Promise.resolve(cached);
                return this.getColumnOptions(
                  colCopy,
                  useTicket ? ticketId : undefined
                ).then(opts => {

                  if (!this.columnOptions[fieldKey]) this.columnOptions[fieldKey] = {};
                  this.columnOptions[fieldKey][key] = opts;
                  return opts;
                });
              };

              const staticOptions = Array.isArray(colCopy.options)
                ? colCopy.options
                : Array.isArray(colCopy.listOptions)
                ? colCopy.listOptions
                : null;

              const isResponsible = tagControl === 'RESPONSIBLEUSERID' || identifier === 'RESPONSIBLEUSERID';
              const baseFilterParams = typeof colCopy.filterParams === 'object' && colCopy.filterParams
                ? colCopy.filterParams
                : {};
              const filterRendererConfig = {
                ...(baseFilterParams.rendererConfig || {}),
                useCustomFormatter: !!colCopy.useCustomFormatter,
                formatter: colCopy.formatter,
                useStyleArray: !!colCopy.useStyleArray,
                styleArray: colCopy.useStyleArray ? this.content.cellStyleArray : baseFilterParams.rendererConfig?.styleArray,
              };

              const result = {
                ...commonProperties,
                id: colId,
                colId,
                headerName: colCopy.headerName,
                field: colCopy.field,
                sortable: colCopy.sortable,
                filter: isResponsible ? ResponsibleUserFilterRenderer : ListFilterRenderer,
                cellRenderer: isResponsible ? 'UserCellRenderer' : 'FormatterCellRenderer',
                cellRendererParams: {
                  useCustomFormatter: colCopy.useCustomFormatter,
                  formatter: colCopy.formatter,
                },
                editable: false,
                cellEditor: staticOptions && staticOptions.length ? ListCellEditor : (tagControl === 'RESPONSIBLEUSERID' ? ResponsibleUserCellEditor : FixedListCellEditor),
                filterParams: {
                  ...baseFilterParams,
                  rendererConfig: filterRendererConfig,
                  getFilterOptions: () => this.getFilterOptionsForColumn(colCopy),
                },
              };
              if (staticOptions && staticOptions.length) {
                result.options = staticOptions;
                result.cellEditorParams = { options: staticOptions };
                result.cellRendererParams = {
                  ...result.cellRendererParams,
                  options: staticOptions,
                };
              } else {
                result.cellEditorParams = params => ({ options: getDsOptionsAsync(params) });
                const baseRendererParams = result.cellRendererParams;
                result.cellRendererParams = params => ({
                  ...(typeof baseRendererParams === 'function'
                    ? baseRendererParams(params)
                    : baseRendererParams),
                  options: getDsOptionsSync(params),
                });
              }
              if (colCopy.editable) {
                result.editable = true;
              }
              // Add cursor pointer style when column is editable
              let baseCellStyle = undefined;
              if (colCopy.textAlign) {
                baseCellStyle = params => ({ textAlign: colCopy.textAlign });
              }
              if (colCopy.cursor) {
                const prevCellStyle = baseCellStyle;
                baseCellStyle = params => ({
                  ...(typeof prevCellStyle === 'function' ? prevCellStyle(params) : {}),
                  cursor: colCopy.cursor
                });
              } else if (result.editable) {
                const prevCellStyle = baseCellStyle;
                baseCellStyle = params => ({
                  ...(typeof prevCellStyle === 'function' ? prevCellStyle(params) : {}),
                  cursor: 'pointer'
                });
              } else if (colCopy.FieldDB === 'TicketNumber') {
                const prevCellStyle = baseCellStyle;
                baseCellStyle = params => ({
                  ...(typeof prevCellStyle === 'function' ? prevCellStyle(params) : {}),
                  cursor: 'pointer'
                });
              }
              if (baseCellStyle) {
                result.cellStyle = baseCellStyle;
              }
              return result;
            }
          default: {
            const result = {
              ...commonProperties,
              id: colId,
              colId,
              headerName: colCopy.headerName,
              field: colCopy.field,
              sortable: colCopy.sortable,
              filter: colCopy.filter,
            };
            // Filtro de lista dinâmico
            if (colCopy.filter === 'agListColumnFilter') {
              result.filter = (tagControl === 'RESPONSIBLEUSERID' || identifier === 'RESPONSIBLEUSERID')
                ? ResponsibleUserFilterRenderer
                : ListFilterRenderer;
              const baseFilterParams = typeof colCopy.filterParams === 'object' && colCopy.filterParams
                ? colCopy.filterParams
                : {};
              const filterRendererConfig = {
                ...(baseFilterParams.rendererConfig || {}),
                useCustomFormatter: !!colCopy.useCustomFormatter,
                formatter: colCopy.formatter,
                useStyleArray: !!colCopy.useStyleArray,
                styleArray: colCopy.useStyleArray ? this.content.cellStyleArray : baseFilterParams.rendererConfig?.styleArray,
              };
              result.filterParams = {
                ...baseFilterParams,
                rendererConfig: filterRendererConfig,
                getFilterOptions: () => this.getFilterOptionsForColumn(colCopy),
              };
            }
            // Apply custom formatter if enabled
            if (colCopy.useCustomFormatter) {
              result.cellRenderer = 'FormatterCellRenderer';
              result.cellRendererParams = {
                useCustomFormatter: true,
                formatter: colCopy.formatter
              };
            }
            // Apply style array if provided
            else if (colCopy.useStyleArray) {
              result.cellRenderer = 'FormatterCellRenderer';
              result.cellRendererParams = {
                useCustomFormatter: false,
                useStyleArray: true,
                styleArray: this.content.cellStyleArray
              };
            }
            
            // Add text alignment style for cells
            let baseCellStyle = undefined;
            if (colCopy.textAlign) {
              baseCellStyle = params => ({ textAlign: colCopy.textAlign });
            }
            // Cursor pointer para colunas editáveis
            if (colCopy.cursor) {
              const prevCellStyle = baseCellStyle;
              baseCellStyle = params => ({
                ...(typeof prevCellStyle === 'function' ? prevCellStyle(params) : {}),
                cursor: colCopy.cursor
              });
            } else if (result.editable) {
              const prevCellStyle = baseCellStyle;
              baseCellStyle = params => ({
                ...(typeof prevCellStyle === 'function' ? prevCellStyle(params) : {}),
                cursor: 'pointer'
              });
            } else if (colCopy.FieldDB === 'TicketNumber') {
              const prevCellStyle = baseCellStyle;
              baseCellStyle = params => ({
                ...(typeof prevCellStyle === 'function' ? prevCellStyle(params) : {}),
                cursor: 'pointer'
              });
            }
            if (baseCellStyle) {
              result.cellStyle = baseCellStyle;
            }
            // Add header alignment style that affects all content in the header
            if (colCopy.headerAlign) {
              result.headerClass = `ag-header-align-${colCopy.headerAlign}`;
            }
            // Use DateTimeCellEditor for date fields and deadlines

            if (colCopy.cellDataType === 'dateString' || colCopy.cellDataType === 'dateTime' || tagControl === 'DEADLINE') {
              result.filter = DeadlineFilterRenderer;

              if (tagControl !== 'DEADLINE' && colCopy.cellDataType !== 'dateTime') {
                result.cellDataType = 'dateString';
              } else {
                if (colCopy.cellDataType === 'dateTime') {
                  result.TagControl = 'DATETIME';
                  result.cellRenderer = 'FormatterCellRenderer';
                }
                delete result.cellDataType;
              }

              if (colCopy.editable) {
                // Register Vue component by name so AG Grid can resolve it
                result.cellEditor = 'DateTimeCellEditor';
                delete result.valueParser;
              }
            }
            if (tagControl === 'RESPONSIBLEUSERID' || identifier === 'RESPONSIBLEUSERID') {
              result.cellRenderer = 'UserCellRenderer';
              const opts = Array.isArray(colCopy.options)
                ? colCopy.options
                : Array.isArray(colCopy.listOptions)
                ? colCopy.listOptions
                : dsOptions;
              if (opts.length) {
                result.cellRendererParams = {
                  ...(result.cellRendererParams || {}),
                  options: opts
                };
              }
            }
            if (tagControl === 'DEADLINE') {
              result.cellRenderer = params => {
                // Função utilitária para calcular diff e cor (idêntica ao FieldComponent.vue)
                function normalizeDeadline(val) {
                  if (!val) return '';
                  let dateStr = val;
                  // ISO sem segundos
                  if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
                    return val;
                  }
                  // ISO com espaço ao invés de T e sem timezone
                  if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?/.test(val) && !/[\+\-]\d{2}$/.test(val)) {
                    dateStr = val.replace(' ', 'T');
                    return dateStr;
                  }
                  // ISO com timezone no formato +HH
                  if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[\+\-]\d{2}$/.test(val)) {
                    return val.replace(' ', 'T').replace(/([\+\-]\d{2})$/, '$1:00');
                  }
                  return dateStr;
                }
                function getDeadlineDiff(val) {
                  if (!val) return '';
                  const dateStr = normalizeDeadline(val);
                  const deadline = new Date(dateStr);
                  if (isNaN(deadline.getTime())) return '';
                  const now = window.gridDeadlineNow instanceof Date ? window.gridDeadlineNow : new Date();
                  let diffMs = deadline - now;
                  if (isNaN(diffMs)) return '';
                  const abs = Math.abs(diffMs);
                  const isPast = diffMs < 0;
                  let str = '';
                  if (abs < 60 * 1000) {
                    const s = Math.floor(abs / 1000);
                    str = `${isPast ? '-' : ''}${s}s`;
                  } else if (abs < 60 * 60 * 1000) {
                    const m = Math.floor(abs / (60 * 1000));
                    str = `${isPast ? '-' : ''}${m}m`;
                  } else if (abs < 24 * 60 * 60 * 1000) {
                    const h = Math.floor(abs / (60 * 60 * 1000));
                    const m = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000));
                    str = `${isPast ? '-' : ''}${h}h`;
                    if (m > 0) str += ` ${m}m`;
                  } else {
                    const d = Math.floor(abs / (24 * 60 * 60 * 1000));
                    const h = Math.floor((abs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                    const m = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000));
                    str = `${isPast ? '-' : ''}${d}d`;
                    if (h > 0) str += ` ${h}h`;
                    if (m > 0) str += ` ${m}m`;
                  }
                  return str;
                }
                function getDeadlineColorClass(val) {
                  if (!val) return '';
                  const dateStr = normalizeDeadline(val);
                  const deadline = new Date(dateStr);
                  if (isNaN(deadline.getTime())) return '';
                  const now = window.gridDeadlineNow instanceof Date ? window.gridDeadlineNow : new Date();
                  let diffMs = deadline - now;
                  if (isNaN(diffMs)) return '';
                  const diffDays = diffMs / (24 * 60 * 60 * 1000);
                  if (diffDays > 5) return 'deadline-green';
                  if (diffDays > 0) return 'deadline-yellow';
                  return 'deadline-red';
                }
                function getDeadlineOriginalFormatted(val) {
                  if (!val) return '';
                  const dateStr = normalizeDeadline(val);
                  const deadline = new Date(dateStr);
                  if (isNaN(deadline.getTime())) return val;
                  // Pega o idioma da variável global
                  let lang = 'en-US';
                  try {
                    if (window.wwLib && window.wwLib.wwVariable && typeof window.wwLib.wwVariable.getValue === 'function') {
                      const v = window.wwLib.wwVariable.getValue('aa44dc4c-476b-45e9-a094-16687e063342');
                      if (typeof v === 'string' && v.length > 0) lang = v;
                    }
                  } catch (e) {}
                  return deadline.toLocaleString(lang);
                }
                const val = params.value;
                if (!val) {
                  return '<span class="deadline-visual deadline-empty"><span class="material-symbols-outlined deadline-empty-icon">calendar_month</span><span class="deadline-empty-text">Select</span></span>';
                }
                const diff = getDeadlineDiff(val);
                const colorClass = getDeadlineColorClass(val);
                const tooltip = getDeadlineOriginalFormatted(val);
                if (!diff) {
                  return `<span class="deadline-visual deadline-empty" title="${tooltip}"><span class="material-symbols-outlined deadline-empty-icon">calendar_month</span><span class="deadline-empty-text">Select</span></span>`;
                }
                return `<span class="deadline-visual ${colorClass}" title="${tooltip}">${diff}</span>`;
              };
            }
            const fieldKey = colCopy.id || colCopy.field;
            const useTicket = this.usesTicketId(colCopy);
            const lazyStatus = this.shouldLazyLoadStatus(colCopy);
            const getDsOptionsSync = params => {
              const ticketId = params.data?.TicketID;
              const key = this.getOptionsCacheKey(colCopy, ticketId);
              if (lazyStatus) {
                return this.buildLazyStatusFallbackOptions(colCopy);
              }
              const colOpts = this.columnOptions[fieldKey] || {};
              const cached = colOpts[key];
              if (cached) return cached;
              if (lazyStatus) {
                return this.buildLazyStatusFallbackOptions(colCopy);
              }
              this.getColumnOptions(colCopy, useTicket ? ticketId : undefined).then(opts => {
                if (!this.columnOptions[fieldKey]) this.columnOptions[fieldKey] = {};
                this.columnOptions[fieldKey][key] = opts;
                params.api?.refreshCells?.({ force: true });
              });
              return [];
            };
            const getDsOptionsAsync = params => {
              const ticketId = params.data?.TicketID;
              if (lazyStatus) {
                return this.getColumnOptions(
                  colCopy,
                  useTicket ? ticketId : undefined,
                  { force: true }
                ).catch(error => {
                  console.warn('[GridViewDinamica] Failed to lazy load StatusID options', error);
                  return this.buildLazyStatusFallbackOptions(colCopy);
                });
              }
              const key = this.getOptionsCacheKey(colCopy, ticketId);
              const colOpts = this.columnOptions[fieldKey] || {};
              const cached = colOpts[key];
              if (cached) return Promise.resolve(cached);
              return this.getColumnOptions(
                colCopy,
                useTicket ? ticketId : undefined
              ).then(opts => {

                if (!this.columnOptions[fieldKey]) this.columnOptions[fieldKey] = {};
                this.columnOptions[fieldKey][key] = opts;
                return opts;
              });
            };
            if (
              colCopy.cellDataType === 'list' ||
              (tagControl && tagControl.toUpperCase() === 'LIST')
            ) {
              const optionsArr = Array.isArray(colCopy.options)
                ? colCopy.options
                : Array.isArray(colCopy.listOptions)
                ? colCopy.listOptions
                : null;
              if (colCopy.editable) {
                result.editable = true;
                if (optionsArr && optionsArr.length) {
                  result.cellEditor = ListCellEditor;
                  result.cellEditorParams = { options: optionsArr };
                  result.cellRendererParams = {
                    ...result.cellRendererParams,
                    options: optionsArr,
                  };
                } else {
                  result.cellEditor = tagControl === 'RESPONSIBLEUSERID' ? ResponsibleUserCellEditor :  FixedListCellEditor;
                  result.cellEditorParams = params => ({ options: getDsOptionsAsync(params) });
                  const baseRendererParams = result.cellRendererParams;
                  result.cellRendererParams = params => ({
                    ...(typeof baseRendererParams === 'function'
                      ? baseRendererParams(params)
                      : baseRendererParams),
                    options: getDsOptionsSync(params),
                  });
                }
              } else {
                const baseRendererParams = result.cellRendererParams;
                result.cellRendererParams = params => ({
                  ...(typeof baseRendererParams === 'function'
                    ? baseRendererParams(params)
                    : baseRendererParams),
                  options: optionsArr || getDsOptionsSync(params),
                });
              }
              // O cellRenderer já aplica a formatação visual
            }
            if (colCopy.dataSource && colCopy.editable) {
              result.editable = true;
              result.cellEditor = tagControl === 'RESPONSIBLEUSERID' ? ResponsibleUserCellEditor : FixedListCellEditor;
              result.cellEditorParams = params => ({ options: getDsOptionsAsync(params) });
              const baseRendererParams = result.cellRendererParams;
              result.cellRendererParams = params => ({
                ...(typeof baseRendererParams === 'function'
                  ? baseRendererParams(params)
                  : baseRendererParams),
                options: getDsOptionsSync(params),
              });
            }
            return result;
          }
        }
      });
    },
      rowSelection() {
      if (this.content.rowSelection === "multiple") {
        return {
          mode: "multiRow",
          checkboxes: !this.content.disableCheckboxes,
          headerCheckbox: !this.content.disableCheckboxes,
          selectAll: this.content.selectAll || "all",
          enableClickSelection: this.content.enableClickSelection,
        };
      } else if (this.content.rowSelection === "single") {
        return {
          mode: "singleRow",
          checkboxes: !this.content.disableCheckboxes,
          enableClickSelection: this.content.enableClickSelection,
        };
      } else {
        return {
          mode: "singleRow",
          checkboxes: false,
          isRowSelectable: () => false,
          enableClickSelection: this.content.enableClickSelection,
        };
      }
    },
  style() {
  if (this.content.layout === "auto") return {};
  return {
  height: this.content.height || "400px",
  };
  },
  cssVars() {
  const baseFontSize = GRID_BASE_FONT_SIZE_PX;
  return {
  "--ww-data-grid_action-backgroundColor":
  this.content.actionBackgroundColor,
  "--ww-data-grid_action-color": this.content.actionColor,
  "--ww-data-grid_action-padding": this.content.actionPadding,
  "--ww-data-grid_action-border": this.content.actionBorder,
  "--ww-data-grid_action-borderRadius": this.content.actionBorderRadius,
  ...(this.content.borderColor
  ? { "--ww-data-grid_row-border-color": this.content.borderColor }
  : {}),
  ...(this.content.actionFont
  ? { "--ww-data-grid_action-font": this.content.actionFont }
  : {}),
  "--ww-data-grid_action-fontSize": baseFontSize,
  "--ww-data-grid_action-fontFamily": this.resolvedFontFamily,
  "--ww-data-grid_action-fontWeight": this.content.actionFontWeight,
  "--ww-data-grid_action-fontStyle": this.content.actionFontStyle,
  "--ww-data-grid_action-lineHeight": this.content.actionLineHeight,
  "--grid-view-dinamica-font-family": this.resolvedFontFamily,
  "--grid-view-dinamica-font-size": baseFontSize,
  fontFamily: this.resolvedFontFamily,
  fontSize: baseFontSize,
  };
  },
  theme() {
  return themeQuartz.withParams({
  headerBackgroundColor: "#F5F6FA",
  headerTextColor: this.content.headerTextColor,
  headerFontSize: GRID_BASE_FONT_SIZE,
  headerFontWeight: this.content.headerFontWeight,
  borderColor: this.content.borderColor,
  cellTextColor: this.content.cellColor,
  cellFontFamily: this.resolvedFontFamily,
  headerFontFamily: this.resolvedFontFamily,
  dataFontSize: GRID_BASE_FONT_SIZE,
  oddRowBackgroundColor: this.content.rowAlternateColor,
  backgroundColor: this.content.rowBackgroundColor,
  rowHoverColor: this.content.rowHoverColor,
  selectedRowBackgroundColor: this.content.selectedRowBackgroundColor,
  rowVerticalPaddingScale: this.content.rowVerticalPaddingScale || 1,
  menuBackgroundColor: this.content.menuBackgroundColor,
  menuTextColor: this.content.menuTextColor,
  columnHoverColor: this.content.columnHoverColor,
  foregroundColor: this.content.textColor,
  checkboxCheckedBackgroundColor: this.content.selectionCheckboxColor,
  rangeSelectionBorderColor: this.content.cellSelectionBorderColor,
  checkboxUncheckedBorderColor: this.content.checkboxUncheckedBorderColor,
  focusShadow: this.content.focusShadow?.length
  ? this.content.focusShadow
  : undefined,
  });
  },
  isEditing() {
  /* wwEditor:start */
  return (
  this.wwEditorState.editMode === wwLib.wwEditorHelper.EDIT_MODES.EDITION
  );
  /* wwEditor:end */
  // eslint-disable-next-line no-unreachable
  return false;
  },
  },
  methods: {
  getFilterOptionsForColumn(col) {
    if (!col) return [];

    const fieldKey = col.id || col.field;
    if (!fieldKey) return [];

    const store = this.columnOptions || {};
    const colStore = store[fieldKey] || {};
    const aggregated = [];
    const seen = new Set();

    const pushOption = option => {
      if (option === undefined) return;
      let mapKey;
      if (option === null) {
        mapKey = 'null-option';
      } else if (typeof option === 'object') {
        const valueKey =
          option.value ??
          option.Value ??
          option.id ??
          option.Id ??
          option.ID ??
          option.UserID ??
          option.UserId ??
          option.StatusID ??
          option.statusId ??
          option.key ??
          null;
        const typeKey = option.type || (Array.isArray(option.groupUsers) ? 'group' : 'object');
        if (valueKey != null) {
          mapKey = `${typeKey}::${String(valueKey)}`;
        } else {
          try {
            mapKey = `${typeKey}::${JSON.stringify(option)}`;
          } catch (error) {
            mapKey = `${typeKey}::${Date.now()}::${aggregated.length}`;
          }
        }
      } else {
        mapKey = `primitive::${String(option)}`;
      }

      if (!seen.has(mapKey)) {
        seen.add(mapKey);
        aggregated.push(option);
      }
    };

    Object.values(colStore).forEach(list => {
      if (!Array.isArray(list)) return;
      list.forEach(pushOption);
    });

    if (!aggregated.length && this.shouldLazyLoadStatus(col)) {
      return this.buildLazyStatusFallbackOptions(col);
    }

    return aggregated;
  },
  deselectAllRows() {
    if (this.gridApi) {
      this.gridApi.deselectAll();
    }
  },
  resetFilters() {
    if (this.gridApi) {
      this.gridApi.setFilterModel(null);
    }
  },
  setFilters(filters) {
    if (this.gridApi) {
      this.gridApi.setFilterModel(filters || null);
    }
  },
  getRowId(params) {
  return this.resolveMappingFormula(this.content.idFormula, params.data);
  },
  updateRow(rowInput) {
  if (rowInput == null) return;

  let payload = rowInput;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch (error) {
      console.warn("[GridViewDinamica] Failed to parse row JSON payload", error);
      return;
    }
  }

  if (Array.isArray(payload)) {
    if (!payload.length) {
      console.warn("[GridViewDinamica] Received empty array payload for updateRow action");
      return;
    }
    payload = payload[0];
  }

  if (!payload || typeof payload !== "object") {
    console.warn("[GridViewDinamica] Invalid payload for updateRow action", payload);
    return;
  }

  const normalizeId = (row, index = null) => {
    if (!row || typeof row !== "object") return null;
    if (typeof this.resolveRowId === "function") {
      const resolved = this.resolveRowId(row, index);
      if (resolved != null && resolved !== "") return String(resolved);
    }
    const fallbackKeys = ["Id", "ID", "id"];
    for (const key of fallbackKeys) {
      if (row[key] != null && row[key] !== "") {
        return String(row[key]);
      }
    }
    return null;
  };

  const sourceRowsRaw = wwLib.wwUtils.getDataFromCollection(this.content.rowData);
  const sourceRows = Array.isArray(sourceRowsRaw) ? sourceRowsRaw : [];

  if (!sourceRows.length) {
    console.warn("[GridViewDinamica] Cannot update row: grid has no data available");
    return;
  }

  const payloadId = normalizeId(payload);
  let matchedIndex = -1;

  if (payloadId != null) {
    matchedIndex = sourceRows.findIndex((row, idx) => normalizeId(row, idx) === payloadId);
  }

  if (matchedIndex === -1) {
    matchedIndex = sourceRows.findIndex(row => {
      if (!row || typeof row !== "object") return false;
      const fallbackKeys = ["Id", "ID", "id"];
      return fallbackKeys.some(key => (
        row[key] != null && payload[key] != null && String(row[key]) === String(payload[key])
      ));
    });
  }

  if (matchedIndex === -1) {
    console.warn("[GridViewDinamica] Failed to locate row to update", payload);
    return;
  }

  const matchedRow = sourceRows[matchedIndex];
  if (!matchedRow || typeof matchedRow !== "object") {
    console.warn("[GridViewDinamica] Matched row is not an object", matchedRow);
    return;
  }

  Object.keys(payload).forEach(key => {
    matchedRow[key] = payload[key];
  });

  let rowNode = null;
  const resolvedId = normalizeId(matchedRow, matchedIndex);
  if (resolvedId != null && this.gridApi && typeof this.gridApi.getRowNode === "function") {
    rowNode = this.gridApi.getRowNode(resolvedId);
  }

  if (!rowNode && this.gridApi && typeof this.gridApi.forEachNode === "function") {
    const fallbackKeys = ["Id", "ID", "id"];
    this.gridApi.forEachNode(node => {
      if (rowNode) return;
      if (resolvedId != null && String(node.id) === String(resolvedId)) {
        rowNode = node;
        return;
      }
      const nodeData = node.data || {};
      if (resolvedId != null && normalizeId(nodeData, node.rowIndex) === resolvedId) {
        rowNode = node;
        return;
      }
      if (resolvedId == null) {
        const found = fallbackKeys.some(key => (
          nodeData[key] != null && payload[key] != null && String(nodeData[key]) === String(payload[key])
        ));
        if (found) {
          rowNode = node;
        }
      }
    });
  }

  if (rowNode) {
    Object.keys(payload).forEach(key => {
      const value = payload[key];
      if (typeof rowNode.setDataValue === "function") {
        rowNode.setDataValue(key, value);
      } else if (rowNode.data) {
        rowNode.data[key] = value;
      }
    });
  }

  if (typeof this.refreshRowFromSource === "function") {
    try {
      this.refreshRowFromSource(matchedRow, rowNode || null);
    } catch (error) {
      console.warn("[GridViewDinamica] Failed to refresh row metadata after update", error);
    }
  }

  if (typeof this.refreshRowListOptions === "function") {
    try {
      this.refreshRowListOptions(matchedRow, rowNode || null, null);
    } catch (error) {
      console.warn("[GridViewDinamica] Failed to refresh list options after row update", error);
    }
  }

  if (this.gridApi && typeof this.gridApi.refreshCells === "function") {
    const refreshConfig = { force: true };
    if (rowNode) {
      refreshConfig.rowNodes = [rowNode];
    }
    this.gridApi.refreshCells(refreshConfig);
  }
  },
  onActionTrigger(event) {
  if (!event) return;
  
  this.$emit("trigger-event", {
  name: "action",
  event: {
  actionName: event.actionName || '',
  row: event.row || null,
  id: event.id != null ? event.id : null,
  index: event.index != null ? event.index : null,
  displayIndex: event.displayIndex != null ? event.displayIndex : null,
  },
  });
  },
  onCellValueChanged(event) {
  const colDef = event.column.getColDef ? event.column.getColDef() : {};
  const tag = (colDef.TagControl || colDef.tagControl || colDef.tagcontrol || '').toUpperCase();
  const identifier = (colDef.FieldDB || '').toUpperCase();
  if (tag === 'RESPONSIBLEUSERID' || identifier === 'RESPONSIBLEUSERID') {
    const fieldKey = colDef.colId || colDef.field;
    const colOpts = this.columnOptions[fieldKey] || {};
    const ticketId = event.data?.TicketID;
    const opts = colOpts[this.getOptionsCacheKey(colDef, ticketId)] || [];
    const match = opts.find(o => String(o.value) === String(event.newValue));
    if (match) {
      if (event.data) {
        event.data.ResponsibleUser = match.label || event.data.ResponsibleUser;
        if (match.photo || match.image || match.img) {
          event.data.PhotoUrl = match.photo || match.image || match.img;
        } else {
          // When the selected user has no photo, clear any existing one so the
          // avatar with the initial is displayed
          event.data.PhotoUrl = '';
        }
      }
      if (this.gridApi && event.node) {
        this.gridApi.refreshCells({
          rowNodes: [event.node],
          columns: [fieldKey],
          force: true
        });
      }
    }
  }
  if (tag === 'DEADLINE') {
    const fieldKey = colDef.colId || colDef.field;
    if (event.node && fieldKey) {
      // Accept the value returned by the editor without conversion
      const v = event.newValue;
      event.node.setDataValue(fieldKey, v);

      if (this.gridApi) {
        this.gridApi.refreshCells({
          rowNodes: [event.node],
          columns: [fieldKey],
          force: true
        });
      }
    }
  }
  this.$emit("trigger-event", {
    name: "cellValueChanged",
    event: {
      oldValue: event.oldValue,
      newValue: event.newValue,
      columnId: event.column.getColId(),
      row: event.data,
    },
  });
  },
  onRowClicked(event) {
  // Add null checks to prevent accessing properties of undefined objects
  if (!event || !event.data) return;

  // Identifica a coluna clicada
  const colId = event.column?.getColId?.();
  let fieldDB = null;
  if (colId) {
    const colConfig = this.content.columns.find(col => col.id === colId || col.field === colId);
    if (colConfig) {
      fieldDB = colConfig.FieldDB;
    }
  }

  this.$emit("trigger-event", {
    name: "rowClicked",
    event: {
      row: event.data,
      id: event.node?.id || null,
      index: event.node?.sourceRowIndex || null,
      displayIndex: event.rowIndex != null ? event.rowIndex : null,
      fieldDB // <-- novo campo
    },
  });
},
  onCellClicked(event) {
  const colId = event.column?.getColId?.();

  let fieldDB = null;
  let fieldID = null;
  if (colId) {
    const colConfig = this.content.columns.find(col =>
      col.id == colId || col.field == colId || col.colId == colId
    );
    if (colConfig) {
      fieldDB = colConfig.FieldDB;
      fieldID = colConfig.id;
    }
  }

  // Always ensure editable cells enter edit mode when clicked
  const editable =
    typeof event.colDef?.editable === "function"
      ? event.colDef.editable(event)
      : !!event.colDef?.editable;
  if (editable) {
    event.api?.startEditingCell({
      rowIndex: event.rowIndex,
      colKey: colId,
    });
  }

  this.$emit("trigger-event", {
    name: "cellClicked",
    event: {
      row: event.data,
      id: event.node?.id || null,
      index: event.node?.sourceRowIndex || null,
      displayIndex: event.rowIndex != null ? event.rowIndex : null,
      fieldDB,
      fieldID,
      colId
    },
  });
},
  /* wwEditor:start */
  generateColumns() {
  this.$emit("update:content", {
  columns: this.rowData?.[0]
  ? Object.keys(this.rowData[0]).map((key) => ({
  field: key,
  sortable: true,
  filter: true,
  }))
  : [],
  });
  },
  getOnActionTestEvent() {
  const data = this.rowData;
  if (!data || !data[0]) throw new Error("No data found");
  return {
  actionName: "actionName",
  row: data[0],
  id: 0,
  index: 0,
  displayIndex: 0,
  };
  },
  getOnCellValueChangedTestEvent() {
  const data = this.rowData;
  if (!data || !data[0]) throw new Error("No data found");
  return {
  oldValue: "oldValue",
  newValue: "newValue",
  columnId: "columnId",
  row: data[0],
  };
  },
  getSelectionTestEvent() {
  const data = this.rowData;
  if (!data || !data[0]) throw new Error("No data found");
  return {
  row: data[0],
  };
  },
  getRowClickedTestEvent() {
  const data = this.rowData;
  if (!data || !data[0]) throw new Error("No data found");
  return {
  row: data[0],
  id: 0,
  index: 0,
  displayIndex: 0,
  
  };
  },
  getCellClickedTestEvent() {
  const data = this.rowData;
  const col = this.content?.columns?.[0];
  return {
    row: data?.[0] || null,
    id: 0,
    index: 0,
    displayIndex: 0,
    fieldDB: col?.FieldDB || null,
    fieldID: col?.id || null,
    colId: col?.colId || col?.id || col?.field || null
  };
},
clearSelection() {
  // Limpar seleção usando a API do AG-Grid
  if (this.gridApi) {
    this.gridApi.deselectAll();
  }
  // Limpar a variável selectedRows
  this.setSelectedRows([]);
  // Forçar atualização visual
  this.$nextTick(() => {
    if (this.gridApi) {
      this.gridApi.deselectAll();
    }
  });
},
forceClearSelection() {
  // Força limpeza visual dos checkboxes via DOM
  const gridElement = this.$refs.agGridRef?.$el;
  if (gridElement) {
    // Desmarcar todos os checkboxes de seleção
    const checkboxes = gridElement.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
      checkbox.indeterminate = false;
    });
    
    // Limpar variável
    this.setSelectedRows([]);
    
    // Forçar AG-Grid a desmarcar
    if (this.gridApi) {
      this.gridApi.deselectAll();
    }
  }
},
  /* wwEditor:end */
      isColumnMovable(params) {
      // Sempre impedir o movimento da coluna de seleção
      if (params.column.getColId() === 'ag-Grid-SelectionColumn') {
        return false;
      }
      // Impedir mover colunas pinned
      if (params.column.getPinned() === 'left' || params.column.getPinned() === 'right') {
        return false;
      }
      // Impedir mover qualquer coluna para a área pinned
      const colDef = params.column.getColDef();
      if (colDef && (colDef.pinned === 'left' || colDef.pinned === 'right')) {
        return false;
      }
      // Checar configuração de draggable
      const field = colDef.field;
      const columnConfig = this.content.columns.find(col => col.field === field);
      if (columnConfig && columnConfig.draggable === false) {
        return false;
      }
      // Caso contrário, segue a configuração global
      return this.content.movableColumns;
    },
      getMainMenuItems(params) {
      const defaultItems = params.defaultItems;
      // Remove opções de pin/unpin para todas as colunas
      return defaultItems.filter(item => !item.toLowerCase().includes('pin'));
    }
  },
    /* wwEditor:start */
  watch: {
    columnDefs: {
      async handler() {
        if (this.wwEditorState?.boundProps?.columns) return;
        this.gridApi.resetColumnState();

        if (this.wwEditorState.isACopy) return;

        // We assume there will only be one custom column each time
        const columnIndex = (this.content.columns || []).findIndex(
          (col) => col.cellDataType === "custom" && !col.containerId
        );
        if (columnIndex === -1) return;
        const newColumns = [...this.content.columns];
        let column = { ...newColumns[columnIndex] };
        column.containerId = await this.createElement("ww-flexbox", {
          _state: { name: `Cell ${column.headerName || column.field}` },
        });
        newColumns[columnIndex] = column;
        this.$emit("update:content:effect", { columns: newColumns });
      },
      deep: true,
    },
    // Watch for changes in rowSelection to reconfigure selection column
    'content.rowSelection': {
      handler(newValue, oldValue) {
        if (newValue !== oldValue && this.gridApi) {
          this.$nextTick(() => {
            if (newValue === 'multiple' && !this.content.disableCheckboxes) {
              setTimeout(() => {
                this.forceSelectionColumnFirst();
              }, 100);
              setTimeout(() => {
                this.forceSelectionColumnFirstDOM();
              }, 300);
            }
          });
        }
      },
      immediate: false,
    },
    // Watch selectedRows to sync visual state when cleared
    selectedRows: {
      handler(newValue) {
        if (this.gridApi && Array.isArray(newValue) && newValue.length === 0) {
          // Clear via AG-Grid API
          setTimeout(() => {
            if (this.gridApi) {
              this.gridApi.deselectAll();
            }
          }, 100);

          // Force clear custom checkboxes via DOM
          setTimeout(() => {
            const gridElement = this.$refs.agGridRef?.$el;
            if (gridElement) {
              // Desmarcar todos os checkboxes customizados
              const checkboxes = gridElement.querySelectorAll('.ag-selection-checkbox input[type="checkbox"]');
              checkboxes.forEach(checkbox => {
                checkbox.checked = false;
              });

              // Desmarcar header checkbox se existir
              const headerCheckbox = gridElement.querySelector('.ag-header-checkbox input[type="checkbox"]');
              if (headerCheckbox) {
                headerCheckbox.checked = false;
                headerCheckbox.indeterminate = false;
              }
            }
          }, 150);
        }
      },
      deep: true
    },
    // Reaplica a ordenação atual quando o datasource muda
    'content.rowData': {
      handler() {
        if (this.gridApi) {
          // Reaplica o sortModel atual se existir
          try {
            const currentSort = this.gridApi.getSortModel?.() || [];
            if (currentSort.length) {
              this.gridApi.setSortModel(currentSort);
            } else if (this.content.initialSort) {
              this.gridApi.applyColumnState({
                state: this.content.initialSort,
                defaultState: { sort: null }
              });
            }
          } catch (e) {
            // Fallback para simplesmente atualizar o modelo de linhas
            this.gridApi.refreshClientSideRowModel?.('sort');
          }
        }
      },
      deep: true
    },
    'content.selectAllRows'(newValue) {
      if (newValue === null) return;
      if (this.gridApi) {
        if (newValue === 'S') {
          this.gridApi.selectAll();
        } else if (newValue === 'N') {
          this.gridApi.deselectAll();
        }
      }
    },
  },
  /* wwEditor:end */
  };
  
  
</script>

<style scoped lang="scss">
  .ww-datagrid {
    position: relative;
    font-family: var(--grid-view-dinamica-font-family, Roboto, Arial, sans-serif);
    font-size: var(--grid-view-dinamica-font-size, 12px);

    :deep(.ag-theme-quartz),
    :deep(.ag-theme-quartz *),
    :deep(.ag-theme-quartz .ag-cell),
    :deep(.ag-theme-quartz .ag-header-cell),
    :deep(.ag-theme-quartz .ag-floating-filter),
    :deep(.ag-theme-quartz .ag-menu),
    :deep(.ag-theme-quartz .ag-overlay),
    :deep(.ag-theme-quartz .ag-status-bar),
    :deep(.ag-theme-quartz .ag-paging-panel),
    :deep(.ag-theme-quartz .ag-tooltip),
    :deep(.ag-theme-quartz input),
    :deep(.ag-theme-quartz select),
    :deep(.ag-theme-quartz textarea),
    :deep(.ag-theme-quartz button) {
      font-family: var(
        --grid-view-dinamica-font-family,
        Roboto,
        Arial,
        sans-serif
      ) !important;
      font-size: var(--grid-view-dinamica-font-size, 12px) !important;
    }

    :deep(.ag-theme-quartz .material-symbols-outlined) {
      font-family: "Material Symbols Outlined", sans-serif !important;
    }

    /* wwEditor:start */
    &.editing {
      &::before {
        content: "";
        position: absolute;
        inset: 0;
        display: block;
        pointer-events: initial;
        z-index: 10;
      }
    }

    /* wwEditor:end */

    // Estilos específicos para a coluna de seleção do AG-Grid
    :deep(.ag-header-cell[col-id="ag-Grid-SelectionColumn"]) {
      background-color: inherit !important;
      border-right: var(--ag-border-color, #ddd) 1px solid !important;
      min-width: 50px !important;
      max-width: 50px !important;
      width: 50px !important;

      .ag-header-cell-resize {
        display: none !important;
      }

      .ag-header-cell-menu-button {
        display: none !important;
      }

      .ag-header-cell-sortable {
        cursor: default !important;
      }

      // Garantir que o header checkbox apareça e esteja centralizado
      .ag-header-checkbox,
      .ag-checkbox {
        margin: 0 auto !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        width: auto !important;
        height: auto !important;
      }

      // Garantir que o conteúdo do header esteja centralizado
      .ag-header-cell-label {
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        width: 100% !important;
      }
    }

    :deep(.ag-cell[col-id="ag-Grid-SelectionColumn"]) {
      background-color: transparent !important;
      border-right: var(--ag-border-color, #ddd) 1px solid !important;
      min-width: 50px !important;
      max-width: 50px !important;
      width: 50px !important;
      align-items: center !important;
      justify-content: center !important;
      /* Remover display: flex e align-items para não afetar colunas vizinhas */

      .ag-selection-checkbox {
        margin-top: 10px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        height: 100% !important;
      }
    }

    // Aplica a mesma cor de hover à célula de seleção
    :deep(.ag-row-hover .ag-cell[col-id="ag-Grid-SelectionColumn"]) {
      background-color: var(--ag-row-hover-color) !important;
    }

    // Garantir que a coluna de seleção seja sempre fixa à esquerda quando pinned
    :deep(.ag-pinned-left-cols-container) {

      .ag-header-cell[col-id="ag-Grid-SelectionColumn"],
      .ag-cell[col-id="ag-Grid-SelectionColumn"] {
        position: sticky !important;
        left: 0 !important;
        z-index: 5 !important;
      }
    }

    // Garantir que não exista hover effect ou outras interações na coluna de seleção
    :deep(.ag-header-cell[col-id="ag-Grid-SelectionColumn"]:hover) {
      background-color: inherit !important;
    }

    // Garantir que a coluna de seleção seja sempre a primeira visualmente
    :deep(.ag-header-cell[col-id="ag-Grid-SelectionColumn"]) {
      order: -999 !important;
      position: relative !important;
      z-index: 10 !important;
    }

    :deep(.ag-row .ag-cell[col-id="ag-Grid-SelectionColumn"]) {
      order: -999 !important;
      position: relative !important;
      z-index: 10 !important;
    }

    // Garantir que outras colunas pinned left tenham ordem menor
    :deep(.ag-header-cell.ag-pinned-left):not([col-id="ag-Grid-SelectionColumn"]) {
      order: -1 !important;
    }

    :deep(.ag-row .ag-cell.ag-pinned-left):not([col-id="ag-Grid-SelectionColumn"]) {
      order: -1 !important;
    }

    // Impede drag e seleção em headers pinned
    :deep(.ag-header-cell.ag-pinned-left),
    :deep(.ag-header-cell.ag-pinned-right) {
      pointer-events: none !important;
      user-select: none !important;
      cursor: default !important;
    }

    :deep(.ag-header-cell) {
      border: none !important;
      border-bottom: 1px solid #888888 !important;
    }

    :deep(.ag-cell) {
      border-top: none !important;
      border-right: none !important;
      border-left: none !important;
      border-bottom: 1px solid #888888 !important;

    }

    :deep(.ag-row) {
      border: none !important;
    }

    :deep(.ag-row.ag-row-even),
    :deep(.ag-row.ag-row-odd) {
      border-top: none !important;
      border-bottom: none !important;
    }

    :deep(.ag-row.ag-row-last .ag-cell),
    :deep(.ag-row:last-child .ag-cell) {
      border-bottom: 1px solid #888888 !important;

    }

    // Inputs de edição compactos e centralizados (ajuste agressivo)
    :deep(.ag-cell.ag-cell-editing) {
      padding: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      height: 100% !important;
      min-height: 0 !important;
      max-height: none !important;
      box-sizing: border-box !important;
    }

    :deep(.ag-cell.ag-cell-inline-editing .ag-cell-edit-wrapper),
    :deep(.ag-cell.ag-cell-inline-editing .ag-cell-editor),
    :deep(.ag-cell.ag-cell-inline-editing .ag-input-wrapper),
    :deep(.ag-cell.ag-cell-inline-editing .ag-input-field-input-wrapper) {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      height: 100% !important;
      min-height: 0 !important;
      max-height: none !important;
      padding: 0 !important;
      margin: 0 !important;
      box-sizing: border-box !important;
    }

    :deep(.ag-cell.ag-cell-inline-editing input),
    :deep(.ag-cell.ag-cell-inline-editing select),
    :deep(.ag-cell.ag-cell-inline-editing textarea) {
      height: 26px !important;
      min-height: 26px !important;
      max-height: 26px !important;
      font-size: var(--grid-view-dinamica-font-size, 12px) !important;
      font-family: var(--grid-view-dinamica-font-family, Roboto, Arial, sans-serif) !important;
      padding: 0 8px !important;
      border-radius: 8 !important;
      /* Remove arredondamento */
      box-shadow: none !important;
      /* Remove sombra */
      border: 1px solid #888 !important;
      /* Remove borda */
      box-sizing: border-box !important;
      line-height: 1.2 !important;
      margin: 0 !important;
      align-self: center !important;
      resize: none !important;
      background: #fff !important;
      vertical-align: middle !important;
      outline: none !important;
      /* Remove borda azul de foco */
      transition: none !important;
      /* Remove animação de foco */
    }

    // Remove borda arredondada e sombra da célula de edição AG-Grid
    :deep(.ag-cell-value.ag-cell.ag-cell-normal-height.ag-cell-focus.ag-cell-inline-editing) {
      border-radius: 0 !important;
      box-shadow: none !important;
      outline: none !important;
      transition: none !important;
    }
  }

  :deep(.ag-header-align-left .ag-header-cell-label) {
    justify-content: flex-start !important;
  }

  :deep(.ag-header-align-center .ag-header-cell-label) {
    justify-content: center !important;
    display: flex !important;
    align-items: center !important;
    gap: 4px;
    width: 100%;
    text-align: center !important;
    margin-left: 12px !important;
  }

  :deep(.ag-header-align-center .ag-header-cell-label .ag-header-cell-text) {
    flex: none !important;
    text-align: center !important;
    margin-left: 12px !important;
  }

  :deep(.ag-header-align-center .ag-header-icon) {
    position: static !important;
    margin-left: 12px !important;
  }

  :deep(.ag-header-align-right .ag-header-cell-label) {
    justify-content: flex-end !important;
  }

  :deep(.ag-header-cell .ag-header-cell-menu-button),
  :deep(.ag-header-cell .ag-header-cell-menu-button-wrapper),
  :deep(.ag-header-cell .ag-header-icon) {
    opacity: 0 !important;
    pointer-events: none !important;
    transition: opacity 0.2s;
  }

  :deep(.ag-header-cell:hover .ag-header-cell-menu-button),
  :deep(.ag-header-cell:hover .ag-header-cell-menu-button-wrapper),
  :deep(.ag-header-cell:hover .ag-header-icon) {
    opacity: 1 !important;
    pointer-events: auto !important;
  }

  :deep(.ag-header-cell .ag-header-icon) {
    opacity: 0 !important;
    pointer-events: none !important;
    transition: opacity 0.2s;
  }

  :deep(.ag-header-cell:hover .ag-header-icon),
  :deep(.ag-header-cell.ag-header-cell-filtered .ag-header-icon) {
    opacity: 1 !important;
    pointer-events: auto !important;
  }

  :deep(.ag-header-cell.ag-header-cell-filtered .ag-header-icon) {
    color: rgb(105, 157, 140) !important;
    filter: drop-shadow(0 0 2px rgb(105, 157, 140));
  }

  // Fonte da paginação igual à das linhas da grid
  :deep(.ag-paging-panel),
  :deep(.ag-paging-panel *),
  :deep(.ag-pager),
  :deep(.ag-pager *),
  :deep(.ag-pagination),
  :deep(.ag-pagination *) {
    font-family: var(--grid-view-dinamica-font-family, Roboto, Arial, sans-serif) !important;
    font-size: var(--grid-view-dinamica-font-size, 12px) !important;
  }

  // Remover bordas externas da grid
  :deep(.ag-root),
  :deep(.ag-root-wrapper),
  :deep(.ag-root-wrapper-body),
  :deep(.ag-body-viewport),
  :deep(.ag-center-cols-clipper),
  :deep(.ag-center-cols-container),
  :deep(.ag-header),
  :deep(.ag-header-viewport),
  :deep(.ag-header-row),
  :deep(.ag-paging-panel) {
    border: none !important;
    box-shadow: none !important;
  }

  // Estilos DEADLINE
  :deep(.deadline-visual) {
    border-radius: 999px !important;
    text-align: center;
    font-size: var(--grid-view-dinamica-font-size, 12px) !important;
    font-family: var(--grid-view-dinamica-font-family, Roboto, Arial, sans-serif) !important;
    font-weight: bold !important;
    padding: 0 12px !important;
    height: 26px !important;
    width: 100px !important;
    display: flex !important;
    align-items: center;
    justify-content: center;
    margin-top: 8px !important;
    border: none !important;
    box-shadow: none !important;
    box-sizing: border-box;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  :deep(.ag-cell[col-id*="Deadline"]) {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  :deep(.deadline-green) {
    background: #9bbff6 !important;
    color: #fff !important;
  }

  :deep(.deadline-yellow) {
    background: #ffd54f !important;
    color: #fff !important;
  }

  :deep(.deadline-red) {
    background: #ff6f6f !important;
    color: #fff !important;
  }

  :deep(.deadline-empty) {
    background: transparent !important;
    border: 1px solid #c4c4c4 !important;
    color: #6b7280 !important;
    font-weight: 500 !important;
    gap: 6px;
  }

  :deep(.deadline-empty .deadline-empty-icon) {
    font-size: 18px !important;
    line-height: 1;
  }

  :deep(.deadline-empty .deadline-empty-text) {
    line-height: 1;
  }
</style>
