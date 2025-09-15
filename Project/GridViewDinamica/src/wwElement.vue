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
  import { shallowRef, computed, ref, onMounted, onUnmounted, watch, h } from "vue";
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
  import DateTimeCellEditor from "./components/DateTimeCellEditor.vue";
  import FixedListCellEditor from "./components/FixedListCellEditor.js";
  import ResponsibleUserCellEditor from "./components/ResponsibleUserCellEditor.js";
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
          this.value = el.getAttribute('data-value');
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
    getValue() { return this.value; }
    destroy() {}
    isPopup() { return true; }
  }
  import './components/list-filter.css';
  
  // TODO: maybe register less modules
  // TODO: maybe register modules per grid instead of globally
  ModuleRegistry.registerModules([AllCommunityModule]);
  
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
  const agGridRef = ref(null);
 

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
  if (!gridApi.value || !columnApi.value) return;
  const external = getExternalSortFromWW();
  if (!external.length) return;

  // 1) Aplicar columnState de sort (reseta sort nas demais colunas)
  columnApi.value.applyColumnState({
    state: external.map(e => ({ colId: e.colId, sort: e.sort, sortIndex: e.sortIndex })),
    defaultState: { sort: null },
    applyOrder: false
  });

  // 2) Aplicar sortModel (garante sincronismo visual/eventos)
  const sortModel = external.map(e => ({ colId: e.colId, sort: e.sort }));
  gridApi.value.setSortModel(sortModel);

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
    if (!gridApi.value || !columnApi.value) return;
    try {
      const state = {
        filterModel: gridApi.value.getFilterModel(),
        columnState: columnApi.value.getColumnState(),
      };
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save grid state', e);
    }
  }

  function restoreGridState() {
    if (!gridApi.value || !columnApi.value) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const state = JSON.parse(raw);
      if (state.columnState && Array.isArray(state.columnState) && state.columnState.length) {
        columnApi.value.applyColumnState({ state: state.columnState, applyOrder: true });
      }
      if (state.filterModel && typeof state.filterModel === 'object') {
        gridApi.value.setFilterModel(state.filterModel);
      }
    } catch (e) {
      console.warn('Failed to restore grid state', e);
    }
  }

  function clearSavedGridState() {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    if (columnApi.value) columnApi.value.resetColumnState();
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

  async function getColumnOptions(col, ticketId) {
    const tag = (col.TagControl || col.tagControl || col.tagcontrol || '').toUpperCase();
    const identifier = (col.FieldDB || '').toUpperCase();
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
    const promises = [];
    for (const col of props.content.columns) {
      const tag = (col.TagControl || col.tagControl || col.tagcontrol || '').toUpperCase();
      const identifier = (col.FieldDB || '').toUpperCase();
      const isResponsible = tag === 'RESPONSIBLEUSERID' || identifier === 'RESPONSIBLEUSERID';
      if (!isResponsible) continue;
      const colId = col.id || col.field;
      result[colId] = {};
      for (const row of rows) {
        const ticketId = row?.TicketID;
        const cacheKey = getOptionsCacheKey(col, ticketId);
        if (result[colId][cacheKey]) continue;
        const p = getColumnOptions(col, usesTicketId(col) ? ticketId : undefined).then(opts => {
          result[colId][cacheKey] = opts;
        });
        promises.push(p);
      }
    }
    await Promise.all(promises);
    columnOptions.value = result;
  };

  // Reaplica a ordem das colunas baseada na propriedade PositionInGrid
  const applyColumnOrderFromPosition = () => {
    if (!columnApi.value || !props.content || !Array.isArray(props.content.columns)) return;
    const ordered = [...props.content.columns].sort((a, b) => {
      const aPos = a.PositionInGrid ?? a.positionInGrid ?? a.PositionField ?? 0;
      const bPos = b.PositionInGrid ?? b.positionInGrid ?? b.PositionField ?? 0;
      return aPos - bPos;
    });
    const state = ordered
      .map((col, idx) => ({ colId: col.id || col.field, order: idx }))
      .filter(s => s.colId);
    if (state.length) {
      columnApi.value.applyColumnState({ state, applyOrder: true });
      // Atualiza variáveis e persiste nova ordem
      updateColumnsPosition();
    }
  };

  // Listener de unload para salvar estado (opcional, robustez extra)
  let beforeUnloadHandler = null;

  const handleDocumentClick = (e) => {
    const selectors = ['.list-editor', '.list-filter', '.ag-popup', '[role="dialog"]'];
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
    // Se estamos num ciclo de remount que deve respeitar a WW variable, reaplique
setTimeout(() => {
  if (forceExternalSortNextMount.value) {
    applyExternalSortAndSync();
  }
}, 0);
  }, { deep: true });

  watch(() => props.content?.rowData, () => {
    loadAllColumnOptions();
    applyColumnOrderFromPosition();
    // Se estamos num ciclo de remount que deve respeitar a WW variable, reaplique
setTimeout(() => {
  if (forceExternalSortNextMount.value) {
    applyExternalSortAndSync();
  }
}, 0);
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
  });
  
    const onGridReady = (params) => {
      gridApi.value = params.api;
      columnApi.value = params.columnApi;

      // Restaura imediatamente e também em pequenos delays
      restoreGridState();
      setTimeout(restoreGridState, 0);
      setTimeout(restoreGridState, 150);



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

    // Impedir mover colunas para posição de pinned
    params.api.addEventListener('columnMoved', (event) => {
      if (!params.columnApi || typeof params.columnApi.getAllGridColumns !== 'function') return;
      // Obter todas as colunas na ordem atual
      const allColumns = params.columnApi.getAllGridColumns();
      // Encontrar o índice da primeira coluna pinned
      const firstPinnedIdx = allColumns.findIndex(col => col.getPinned() === 'left');
      if (firstPinnedIdx > 0) {
        // Se houver colunas não-pinned antes da primeira pinned, reverter
        const hasNonPinnedBefore = allColumns.slice(0, firstPinnedIdx).some(col => col.getPinned() !== 'left');
        if (hasNonPinnedBefore) {
          // Restaurar ordem: mover todas as pinned para o início
          const pinnedCols = allColumns.filter(col => col.getPinned() === 'left');
          const nonPinnedCols = allColumns.filter(col => col.getPinned() !== 'left');
          const newOrder = [...pinnedCols, ...nonPinnedCols].map(col => col.getColId());
          params.columnApi.moveColumns(newOrder, 0);
        }
      }
    });

    // Protege colunas pinned
    params.api.addEventListener('columnPinned', restorePinnedColumns);
    params.api.addEventListener('columnMoved', restorePinnedColumns);
    params.api.addEventListener('columnVisible', restorePinnedColumns);
    params.api.addEventListener('columnEverythingChanged', restorePinnedColumns);
    // Bloqueio via JS para headers pinned (reaplicado em todos os eventos relevantes)
    function applyPinnedHeaderBlock() {
      const gridElement = agGridRef.value?.$el;
      if (gridElement) {
        gridElement.querySelectorAll('.ag-header-cell.ag-pinned-left, .ag-header-cell.ag-pinned-right')
          .forEach(cell => {
            cell.addEventListener('mousedown', e => e.stopPropagation(), true);
            cell.addEventListener('dragstart', e => e.preventDefault(), true);
          });
      }
    }
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
  };
  
  function restorePinnedColumns() {
    if (!columnApi.value) return;
    const state = columnApi.value.getColumnState();
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
    columnApi.value.applyColumnState({ state: newState, applyOrder: true });
  }
  
  // Função para forçar a coluna de seleção a ser a primeira
  const forceSelectionColumnFirst = () => {
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
        gridApi.value.applyColumnState({
          state: columnState,
          applyOrder: true
        });
      }
    } catch (error) {
      console.warn('Erro ao reposicionar coluna de seleção:', error);
    }
    
    // Fallback: reposicionamento direto no DOM
    setTimeout(() => {
      forceSelectionColumnFirstDOM();
    }, 100);
  };
  
  // Função para reposicionar a coluna de seleção diretamente no DOM
  const forceSelectionColumnFirstDOM = () => {
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
  };
  
  watch(
    [() => props.content.initialFilters, () => gridApi.value],
    ([filters]) => {
      if (!gridApi.value) return;
      gridApi.value.setFilterModel(filters || null);
    },
    { deep: true, immediate: true }
  );

  watch(
    [() => props.content.initialSort, () => gridApi.value],
    ([sort]) => {
      if (!gridApi.value) return;
      gridApi.value.applyColumnState({
        state: sort || [],
        defaultState: { sort: null },
      });
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
  ctx.emit("trigger-event", {
  name: "filterChanged",
  event: filterModel,
  });
  }
  saveGridState();
  };
  
  const onSortChanged = (event) => {
  if (!gridApi.value) return;
  const state = gridApi.value.getState();
  if (
  JSON.stringify(state.sort?.sortModel || []) !==
  JSON.stringify(sortValue.value || [])
  ) {
  setSort(state.sort?.sortModel || []);
  ctx.emit("trigger-event", {
  name: "sortChanged",
  event: state.sort?.sortModel || [],
  });
  }
  updateColumnsSort();
  saveGridState();
  };

  const onColumnMoved = (event) => {
  if (!gridApi.value || !event?.finished) return;
  const prev = JSON.stringify(columnsPositionValue.value || []);
  updateColumnsPosition();
  const current = JSON.stringify(columnsPositionValue.value || []);
  if (prev !== current) {
  ctx.emit("trigger-event", {
  name: "columnMoved",
  event: columnsPositionValue.value,
  });
  }
  };

  /* wwEditor:start */
  const { createElement } = wwLib.wwElement.useCreate();
  /* wwEditor:end */
  
  function updateColumnsPosition() {
  if (!gridApi.value) return;
  const allColumns = gridApi.value.getAllGridColumns();
  const positions = allColumns.map((col, idx) => ({
  FieldID: col.getColDef().id,
  PositionField: idx + 1,
  IsDeleted: false
  })).filter(col => col.FieldID);
  setColumnsPosition(positions);
  saveGridState();
  }
  
  function updateColumnsSort() {
  if (!columnApi.value) return;
  const sortArray = columnApi.value.getColumnState()
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
            }
          };
          const fieldKey = colCopy.id || colCopy.field;
          const useTicket = this.usesTicketId(colCopy);
          const getDsOptionsSync = params => {
            const ticketId = params.data?.TicketID;
            const key = this.getOptionsCacheKey(colCopy, ticketId);
            const colOpts = this.columnOptions[fieldKey] || {};
            const cached = colOpts[key];
            if (cached) return cached;
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
            const key = this.getOptionsCacheKey(colCopy, ticketId);
            const colOpts = this.columnOptions[fieldKey] || {};
            const cached = colOpts[key];
            if (cached) return Promise.resolve(cached);
            return this.getColumnOptions(colCopy, useTicket ? ticketId : undefined).then(opts => {
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
              const getDsOptionsSync = params => {
                const ticketId = params.data?.TicketID;
                const key = this.getOptionsCacheKey(colCopy, ticketId);
                const colOpts = this.columnOptions[fieldKey] || {};
                const cached = colOpts[key];
                if (cached) return cached;
                this.getColumnOptions(colCopy, useTicket ? ticketId : undefined).then(opts => {
                  if (!this.columnOptions[fieldKey]) this.columnOptions[fieldKey] = {};
                  this.columnOptions[fieldKey][key] = opts;
                  params.api?.refreshCells?.({ force: true });
                });
                return [];
              };
              const getDsOptionsAsync = params => {
                const ticketId = params.data?.TicketID;
                const key = this.getOptionsCacheKey(colCopy, ticketId);
                const colOpts = this.columnOptions[fieldKey] || {};
                const cached = colOpts[key];
                if (cached) return Promise.resolve(cached);
                return this.getColumnOptions(colCopy, useTicket ? ticketId : undefined).then(opts => {

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

              result.filter = 'agDateColumnFilter';
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
                const diff = getDeadlineDiff(val);
                const colorClass = getDeadlineColorClass(val);
                const tooltip = getDeadlineOriginalFormatted(val);
                return `<span class="deadline-visual ${colorClass}" title="${tooltip}">${diff}</span>`;
              };
            }
            const fieldKey = colCopy.id || colCopy.field;
            const useTicket = this.usesTicketId(colCopy);
            const getDsOptionsSync = params => {
              const ticketId = params.data?.TicketID;
              const key = this.getOptionsCacheKey(colCopy, ticketId);
              const colOpts = this.columnOptions[fieldKey] || {};
              const cached = colOpts[key];
              if (cached) return cached;
              this.getColumnOptions(colCopy, useTicket ? ticketId : undefined).then(opts => {
                if (!this.columnOptions[fieldKey]) this.columnOptions[fieldKey] = {};
                this.columnOptions[fieldKey][key] = opts;
                params.api?.refreshCells?.({ force: true });
              });
              return [];
            };
            const getDsOptionsAsync = params => {
              const ticketId = params.data?.TicketID;
              const key = this.getOptionsCacheKey(colCopy, ticketId);
              const colOpts = this.columnOptions[fieldKey] || {};
              const cached = colOpts[key];
              if (cached) return Promise.resolve(cached);
              return this.getColumnOptions(colCopy, useTicket ? ticketId : undefined).then(opts => {

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
  return {
  "--ww-data-grid_action-backgroundColor":
  this.content.actionBackgroundColor,
  "--ww-data-grid_action-color": this.content.actionColor,
  "--ww-data-grid_action-padding": this.content.actionPadding,
  "--ww-data-grid_action-border": this.content.actionBorder,
  "--ww-data-grid_action-borderRadius": this.content.actionBorderRadius,
  ...(this.content.actionFont
  ? { "--ww-data-grid_action-font": this.content.actionFont }
  : {
  "--ww-data-grid_action-fontSize": this.content.actionFontSize,
  "--ww-data-grid_action-fontFamily": this.content.actionFontFamily,
  "--ww-data-grid_action-fontWeight": this.content.actionFontWeight,
  "--ww-data-grid_action-fontStyle": this.content.actionFontStyle,
  "--ww-data-grid_action-lineHeight": this.content.actionLineHeight,
  }),
  };
  },
  theme() {
  return themeQuartz.withParams({
  headerBackgroundColor: "#F5F6FA",
  headerTextColor: this.content.headerTextColor,
  headerFontSize: this.content.headerFontSize,
  headerFontWeight: this.content.headerFontWeight,
  borderColor: this.content.borderColor,
  cellTextColor: this.content.cellColor,
  cellFontFamily: this.content.cellFontFamily,
  dataFontSize: this.content.cellFontSize,
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
      border-bottom: 1px solid #888 !important;
    }

    :deep(.ag-cell) {
      border: none !important;
      border-bottom: 1px solid #888 !important;
    }

    :deep(.ag-row) {
      border: none !important;
    }

    :deep(.ag-row.ag-row-even),
    :deep(.ag-row.ag-row-odd) {
      border-top: none !important;
      border-bottom: none !important;
    }

    :deep(.ag-row:last-child .ag-cell) {
      border-bottom: none !important;
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
      font-size: 12px !important;
      font-family: 'Roboto', Arial, sans-serif !important;
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
    font-family: 'Roboto', Arial, sans-serif !important;
    font-size: 12px !important;
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
    font-size: 12px !important;
    font-family: 'Roboto', Arial, sans-serif !important;
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
</style>
