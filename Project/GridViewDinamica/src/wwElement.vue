<template>
    <div class="ww-datagrid" :class="{ editing: isEditing }" :style="cssVars">
      <ag-grid-vue ref="agGridRef" :rowData="rowData" :columnDefs="finalColumnDefs" :defaultColDef="defaultColDef"
        :domLayout="content.layout === 'auto' ? 'autoHeight' : 'normal'" :style="style" :rowSelection="rowSelection"
        :suppressMovableColumns="!content.movableColumns" :alwaysShowHorizontalScroll="false"
        :suppressColumnMoveAnimation="true" :suppressDragLeaveHidesColumns="true" :maintainColumnOrder="true"
        :getMainMenuItems="getMainMenuItems" :isColumnMovable="isColumnMovable" :theme="theme" :getRowId="getRowId"
        :pagination="content.pagination" :paginationPageSize="content.paginationPageSize || 10"
        :paginationPageSizeSelector="false" :columnHoverHighlight="content.columnHoverHighlight" :locale-text="localeText"
        :singleClickEdit="true" @grid-ready="onGridReady" @row-selected="onRowSelected"
        @selection-changed="onSelectionChanged" @cell-value-changed="onCellValueChanged" @filter-changed="onFilterChanged"
        @sort-changed="onSortChanged" @row-clicked="onRowClicked" @first-data-rendered="onFirstDataRendered"
        @cell-clicked="onCellClicked"> 
      </ag-grid-vue> 
    </div>
</template>

<script>
  import { shallowRef, watchEffect, computed, ref, onMounted, onUnmounted, h } from "vue";
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
  import ListFilterRenderer from "./components/ListFilterRenderer.js";
  // Editor customizado inline para listas
  class ListCellEditor {
    init(params) {
      this.params = params;
      this.eGui = document.createElement('div');
      this.eGui.style.width = '100%';
      this.eGui.style.height = '100%';
      const optionsArr = Array.isArray(params.colDef.options) ? params.colDef.options : (Array.isArray(params.colDef.listOptions) ? params.colDef.listOptions : []);
      this.options = optionsArr.map(opt => typeof opt === 'object' ? opt : { value: opt, label: String(opt) });
      this.value = params.value;
      const select = document.createElement('select');
      select.style.width = '100%';
      select.style.height = '100%';
      select.style.fontSize = '13px';
      select.style.borderRadius = '6px';
      select.style.padding = '4px';
      this.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.innerHTML = opt.label;
        if (opt.value == this.value) option.selected = true;
        select.appendChild(option);
      });
      select.addEventListener('change', e => {
        this.value = e.target.value;
      });
      this.eGui.appendChild(select);
      this.select = select;
    }
    getGui() { return this.eGui; }
    afterGuiAttached() { if (this.select) this.select.focus(); }
    getValue() { return this.value; }
    destroy() {}
    isPopup() { return false; }
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
  ListCellEditor, // registrar editor customizado
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
  const { setValue: setColumnsPosition } = wwLib.wwVariable.useComponentVariable({
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

  // Interval para atualizar células DEADLINE
  let deadlineTimer = null;
  if (!window.gridDeadlineNow) window.gridDeadlineNow = new Date();
  onUnmounted(() => {
    if (deadlineTimer) {
      clearInterval(deadlineTimer);
      deadlineTimer = null;
    }
  });
  
    const onGridReady = (params) => {
      gridApi.value = params.api;
      columnApi.value = params.columnApi;

      // LOG: Tenta mostrar as colunas disponíveis e seus renderers
      if (typeof params.api.getAllColumns === 'function') {
        const allCols = params.api.getAllColumns().map(col => ({
          colId: col.getColId(),
          field: col.getColDef().field,
          headerName: col.getColDef().headerName,
          cellRenderer: col.getColDef().cellRenderer
        }));
        console.log('DEBUG colunas AG-Grid (getAllColumns):', allCols);
      } else if (typeof params.api.getColumnDefs === 'function') {
        const colDefs = params.api.getColumnDefs();
        console.log('DEBUG colunas AG-Grid (getColumnDefs):', colDefs);
      } else if (typeof params.api.getColumnState === 'function') {
        const colState = params.api.getColumnState();
        console.log('DEBUG colunas AG-Grid (getColumnState):', colState);
      } else {
        console.log('DEBUG params.api não possui métodos de coluna conhecidos', params.api);
      }

      updateColumnsPosition();
      updateColumnsSort();
      params.api.addEventListener('columnMoved', updateColumnsPosition);

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
      setTimeout(() => forceSelectionColumnFirst(), 500);
      
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
          const tc = col.TagControl || col.tagControl;
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
  
  watchEffect(() => {
  if (!gridApi.value) return;
  if (props.content.initialFilters) {
  gridApi.value.setFilterModel(props.content.initialFilters);
  }
  if (props.content.initialSort) {
  gridApi.value.applyColumnState({
  state: props.content.initialSort || [],
  defaultState: { sort: null },
  });
  }
  });
  
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
  };
  
  /* wwEditor:start */
  const { createElement } = wwLib.useCreateElement();
  /* wwEditor:end */
  
  function updateColumnsPosition() {
  if (!gridApi.value) return;
  const allColumns = gridApi.value.getAllGridColumns();
  console.log(allColumns)
  const positions = allColumns.map((col, idx) => ({
  FieldID: col.getColDef().id,
  PositionField: idx + 1,
  IsDeleted: false
  })).filter(col => col.FieldID);
  setColumnsPosition(positions);
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
          console.log('DEBUG colunas AG-Grid:', allCols);
        } else {
          console.log('DEBUG gridApi.value ou getAllColumns não disponível', gridApi.value);
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
      forceSelectionColumnFirst,
      forceSelectionColumnFirstDOM,
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
      return this.content.columns.map((col) => {
        const colCopy = { ...col };
        // Forçar configuração correta para a coluna Deadline
        if (colCopy.field === 'Deadline') {
          colCopy.cellRenderer = FormatterCellRenderer;
          delete colCopy.cellRendererFramework;
          delete colCopy.formatter;
          delete colCopy.valueFormatter;
          delete colCopy.useCustomFormatter;
          delete colCopy.useStyleArray;
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
        };
        // Se o filtro for agListColumnFilter, usar o filtro customizado
        if (colCopy.filter === 'agListColumnFilter') {
          return {
            ...commonProperties,
            id: colCopy.id,
            colId: colCopy.id,
            headerName: colCopy.headerName,
            field: colCopy.field,
            sortable: colCopy.sortable,
            filter: ListFilterRenderer,
            cellRenderer: colCopy.useCustomFormatter ? 'FormatterCellRenderer' : undefined,
            cellRendererParams: {
              useCustomFormatter: colCopy.useCustomFormatter,
              formatter: colCopy.formatter
            }
          };
        }
        switch (colCopy.cellDataType) {
          case "action": {
            return {
              ...commonProperties,
              id: colCopy.id,
              colId: colCopy.id,
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
              id: colCopy.id,
              colId: colCopy.id,
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
              id: colCopy.id,
              colId: colCopy.id,
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
            return {
              ...commonProperties,
              id: colCopy.id,
              colId: colCopy.id,
              headerName: colCopy.headerName,
              field: colCopy.field,
              sortable: colCopy.sortable,
              filter: ListFilterRenderer,
              cellRenderer: colCopy.useCustomFormatter ? 'FormatterCellRenderer' : undefined,
              cellRendererParams: {
                useCustomFormatter: colCopy.useCustomFormatter,
                formatter: colCopy.formatter
              },
              editable: true,
              cellEditor: 'ListCellEditor',
              options: Array.isArray(colCopy.options) ? colCopy.options : (Array.isArray(colCopy.listOptions) ? colCopy.listOptions : [])
            };
          default: {
            const result = {
              ...commonProperties,
              id: colCopy.id,
              colId: colCopy.id,
              headerName: colCopy.headerName,
              field: colCopy.field,
              sortable: colCopy.sortable,
              filter: colCopy.filter === 'agListColumnFilter' ? 'agSetColumnFilter' : colCopy.filter,
            };
            // Filtro de lista dinâmico
            if (colCopy.filter === 'agListColumnFilter') {
              result.filter = ListFilterRenderer;
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
            // Handle date columns that are editable
            if (colCopy.cellDataType === 'dateString' && colCopy.editable) {
              result.cellDataType = 'dateString';
              result.cellEditor = 'agDateStringCellEditor';
            }
            // Add text alignment style for cells
            let baseCellStyle = undefined;
            if (colCopy.textAlign) {
              baseCellStyle = params => ({ textAlign: colCopy.textAlign });
            }
            // Cursor pointer para TicketNumber
            if (colCopy.FieldDB === 'TicketNumber') {
              const prevCellStyle = baseCellStyle;
              baseCellStyle = params => ({
                ...(typeof prevCellStyle === 'function' ? prevCellStyle(params) : {}),
                cursor: 'pointer'
              });
            } else if (colCopy.cursor) {
              // Adicionar cursor customizado se definido
              const prevCellStyle = baseCellStyle;
              baseCellStyle = params => ({
                ...(typeof prevCellStyle === 'function' ? prevCellStyle(params) : {}),
                cursor: colCopy.cursor
              });
            }
            if (baseCellStyle) {
              result.cellStyle = baseCellStyle;
            }
            // Add header alignment style that affects all content in the header
            if (colCopy.headerAlign) {
              result.headerClass = `ag-header-align-${colCopy.headerAlign}`;
            }
            // Formatação especial para DEADLINE
            const tagControl = colCopy.TagControl || colCopy.tagControl || '';
            if (tagControl.toUpperCase() === 'DEADLINE') {
              result.filter = 'agDateColumnFilter';
              result.cellDataType = 'dateString';
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
            if (
              colCopy.cellDataType === 'list' ||
              (tagControl && tagControl.toUpperCase() === 'LIST')
            ) {
              result.editable = true;
              result.cellEditor = 'ListCellEditor';
              const optionsArr = Array.isArray(colCopy.options) ? colCopy.options : (Array.isArray(colCopy.listOptions) ? colCopy.listOptions : []);
              result.options = optionsArr;
              // O cellRenderer já aplica a formatação visual
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
  headerBackgroundColor: this.content.headerBackgroundColor,
  headerTextColor: this.content.headerTextColor,
  headerFontSize: this.content.headerFontSize,
  headerFontFamily: this.content.headerFontFamily,
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
  console.log('colId:', colId, 'columns:', this.content.columns);

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
      background-color: inherit !important;
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

    :deep(.ag-cell.ag-cell-editing input),
    :deep(.ag-cell.ag-cell-editing select),
    :deep(.ag-cell.ag-cell-editing textarea) {
      height: 20px !important;
      min-height: 20px !important;
      max-height: 20px !important;
      font-size: 13px !important;
      padding: 0 8px !important;
      border-radius: 6px !important;
      box-sizing: border-box !important;
      line-height: 1.2 !important;
      margin: 0 !important;
      align-self: center !important;
      resize: none !important;
      background: #fff !important;
      vertical-align: middle !important;
      outline: none !important;
    }

    // Inputs de edição compactos e centralizados (ajuste ultra-específico para AG-Grid)
    :deep(.ag-cell.ag-cell-inline-editing) {
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
