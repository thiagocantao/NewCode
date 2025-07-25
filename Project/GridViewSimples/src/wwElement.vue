<template>
  <div class="ww-datagrid" :class="{ editing: isEditing }" :style="cssVars">
    <ag-grid-vue :key="gridKey" :rowData="rowData" :columnDefs="columnDefs" :defaultColDef="defaultColDef"
      :domLayout="content.layout === 'auto' ? 'autoHeight' : 'normal'" :style="style" :rowSelection="rowSelection"
      :selection-column-def="{ pinned: true }" :theme="theme" :getRowId="getRowId" :pagination="content.pagination"
      :paginationPageSize="content.paginationPageSize || 10" :paginationPageSizeSelector="false"
      :suppressMovableColumns="!content.movableColumns" :columnHoverHighlight="content.columnHoverHighlight"
      :getMainMenuItems="getMainMenuItems" :isColumnMovable="isColumnMovable"
      :locale-text="localeText" @grid-ready="onGridReady" @row-selected="onRowSelected"
      @selection-changed="onSelectionChanged" @cell-value-changed="onCellValueChanged" @filter-changed="onFilterChanged"
      @sort-changed="onSortChanged" @row-clicked="onRowClicked">
    </ag-grid-vue>
  </div>
</template>

<script>
  import { shallowRef, watchEffect, computed, ref, watch } from "vue";
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
import ListFilterRenderer from "./components/ListFilterRenderer.js";
import './components/list-filter.css';

console.log("AG Grid version:", AG_GRID_LOCALE_FR);

// TODO: maybe register less modules
// TODO: maybe register modules per grid instead of globally
ModuleRegistry.registerModules([AllCommunityModule]);

export default {
  components: {
    AgGridVue,
    ActionCellRenderer,
    ImageCellRenderer,
    WewebCellRenderer,
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

    const onGridReady = (params) => {
      gridApi.value = params.api;
      columnApi.value = params.columnApi;
      trySelectInitialRows();
      params.api.addEventListener('columnPinned', restorePinnedColumns);
      params.api.addEventListener('columnMoved', restorePinnedColumns);
      params.api.addEventListener('columnVisible', restorePinnedColumns);
      params.api.addEventListener('columnEverythingChanged', restorePinnedColumns);
    };

    function restorePinnedColumns() {
      if (!columnApi.value) return;
      const state = columnApi.value.getColumnState();
      const newState = state.map(col => {
        const original = props.content.columns.find(c => c.id === col.colId || c.field === col.colId);
        if (original && original.pinned === 'left') {
          return { ...col, pinned: 'left' };
        }
        return col;
      });
      columnApi.value.applyColumnState({ state: newState, applyOrder: true });
    }

    // Seleciona as linhas iniciais com base em initialSelectedRowIds
    function selectInitialRows() {
      if (!gridApi.value) return;
      let ids = [];
      if (Array.isArray(props.content.initialSelectedRowIds)) {
        ids = props.content.initialSelectedRowIds.map(String);
      } else if (props.content.initialSelectedRowIds == null) {
        ids = [];
      }
      const getRowIdFn = typeof getRowId === 'function' ? getRowId : (params) => params.data?.id;
      const allNodes = [];
      gridApi.value.forEachNode(node => allNodes.push(node));
      if (!ids.length) {
        // Desmarca todas as linhas
        allNodes.forEach(node => node.setSelected(false));
        return;
      }
      allNodes.forEach(node => {
        const rowId = String(getRowIdFn({ data: node.data }));
        if (ids.includes(rowId)) {
          node.setSelected(true);
        } else {
          node.setSelected(false);
        }
      });
    }

    // Garante seleção inicial após gridReady e após rowData mudar
    const trySelectInitialRows = () => setTimeout(() => selectInitialRows(), 0);
    watch(
      () => props.content.rowData,
      trySelectInitialRows,
      { deep: true }
    );

    // Atualiza seleção sempre que initialSelectedRowIds mudar
    watch(
      () => props.content.initialSelectedRowIds,
      trySelectInitialRows,
      { deep: true }
    );

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
    };

    /* wwEditor:start */
    const { createElement } = wwLib.useCreateElement();
    /* wwEditor:end */

    const gridKey = ref(0);
    watch(
      () => props.content.rowData,
      () => {
        gridKey.value += 1;
      },
      { deep: true }
    );

    return {
      resolveMappingFormula,
      onGridReady,
      onRowSelected,
      onSelectionChanged,
      gridApi,
      onFilterChanged,
      onSortChanged,
      localeText: computed(() => {
        switch (props.content.lang) {
          case "fr":
            return AG_GRID_LOCALE_FR;
          case "de":
            return AG_GRID_LOCALE_DE;
          case "es":
            return AG_GRID_LOCALE_ES;
          case "pt":
            return AG_GRID_LOCALE_PT;
          case "custom":
            return {
              ...AG_GRID_LOCALE_EN,
              ...(props.content.localeText || {}),
            };
          default:
            AG_GRID_LOCALE_EN;
        }
      }),
      /* wwEditor:start */
      createElement,
      /* wwEditor:end */
      gridKey,
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
    columnDefs() {
      return this.content.columns.map((col) => {
        console.log('colDef', col);
        // Forçar cellDataType para 'dateString' se for 'date' ou 'dateString'
        if (col.cellDataType === 'date') col.cellDataType = 'dateString';
        const minWidth =
          !col.minWidth || col.minWidth === "auto"
            ? null
            : wwLib.wwUtils.getLengthUnit(col.minWidth)?.[0];
        const maxWidth =
          !col.maxWidth || col.maxWidth === "auto"
            ? null
            : wwLib.wwUtils.getLengthUnit(col.maxWidth)?.[0];
        const width =
          !col.width || col.width === "auto" || col.widthAlgo === "flex"
            ? null
            : wwLib.wwUtils.getLengthUnit(col.width)?.[0];
        const flex = col.widthAlgo === "flex" ? col.flex ?? 1 : null;
        const commonProperties = {
          minWidth,
          maxWidth,
          pinned: col.pinned === "none" ? false : col.pinned,
          width,
          flex,
          hide: !!col.hide,
          ...(col.pinned === 'left' ? { lockPinned: true, lockPosition: true } : {}),
        };
        const cellClass = col.textAlign ? `ag-text-${col.textAlign}` : undefined;
        const headerClass = col.headerAlign ? `ag-header-align-${col.headerAlign}` : undefined;
        switch (col.cellDataType) {
          case "action": {
            return {
              ...commonProperties,
              headerName: col.headerName,
              cellRenderer: "ActionCellRenderer",
              cellRendererParams: {
                name: col.actionName,
                label: col.actionLabel,
                trigger: this.onActionTrigger,
                withFont: !!this.content.actionFont,
              },
              sortable: false,
              filter: false,
              cellClass,
              headerClass,
            };
          }
          case "custom":
            return {
              ...commonProperties,
              headerName: col.headerName,
              field: col.field,
              cellRenderer: "WewebCellRenderer",
              cellRendererParams: {
                containerId: col.containerId,
              },
              sortable: col.sortable,
              filter: col.filter,
              cellClass,
              headerClass,
            };
          case "image": {
            return {
              ...commonProperties,
              headerName: col.headerName,
              field: col.field,
              cellRenderer: "ImageCellRenderer",
              cellRendererParams: {
                width: col.imageWidth,
                height: col.imageHeight,
              },
              cellClass,
              headerClass,
            };
          }
          case "boolean": {
            return {
              ...commonProperties,
              headerName: col.headerName,
              field: col.field,
              sortable: col.sortable,
              filter: ListFilterRenderer, // sempre filtro tipo list
              cellRenderer: (params) => {
                const checked = !!params.value;
                const color = col.booleanCheckboxColor || '#699d8c';
                // Checkbox customizado
                return `
                  <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;">
                    <span style="
                      display:inline-flex;
                      align-items:center;
                      justify-content:center;
                      width:16px;height:16px;
                      border-radius:4px;
                      border:1.5px solid #bfc6d1;
                      background:${checked ? color : '#fff'};
                      box-sizing:border-box;
                      transition:background 0.2s,border 0.2s;
                      padding:2px;
                    ">
                      ${checked ? `<svg width='12' height='12' viewBox='0 0 12 12'><polyline points='1,7 5,11 11,1' style='fill:none;stroke:white;stroke-width:2;'/></svg>` : ''}
                    </span>
                  </span>
                `;
              },
              cellClass,
              headerClass,
            };
          }
          case "list":
          default: {
            const result = {
              ...commonProperties,
              headerName: col.headerName,
              field: col.field,
              sortable: col.sortable,
              filter: col.filter,
              editable: col.editable,
              cellClass,
              headerClass,
            };
            if (col.useCustomLabel) {
              result.valueFormatter = (params) => {
                return this.resolveMappingFormula(
                  col.displayLabelFormula,
                  params.value
                );
              };
            }
            // Garante filtro de data para campos do tipo Date
            if (col.cellDataType === 'dateString') {
              result.filter = 'agDateColumnFilter';
              result.cellDataType = 'dateString';
              if (col.editable) {
                result.cellEditor = 'agDateStringCellEditor';
              }
            }
            // Garante filtro customizado de lista para campos do tipo List
            if (col.cellDataType === 'list') {
              console.log('Configurando filtro customizado para coluna:', col.headerName);
              result.filter = ListFilterRenderer;
            }
            // Adicionar cursor customizado se definido
            if (col.cursor) {
              const userCellStyle = result.cellStyle;
              result.cellStyle = params => ({
                ...(typeof userCellStyle === 'function' ? userCellStyle(params) : userCellStyle || {}),
                cursor: col.cursor
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
          isRowSelectable: (rowNode) => {
            if (rowNode?.data && rowNode.data.isEnabled === false) return false;
            const cond = this.content.disableRowSelectionCondition;
            if (!cond) return true;
            let expr = cond.replace(/@([a-zA-Z0-9_çÇãÃáÁéÉíÍóÓúÚêÊôÔâÂàÀèÈìÌòÒùÙüÜñÑ]+)/g, (match, p1) => {
              const val = rowNode.data && rowNode.data[p1];
              if (val === undefined || val === null) return 'null';
              if (typeof val === 'string') return `"${val.replace(/"/g, '\\"')}"`;
              if (typeof val === 'boolean' || typeof val === 'number') return val;
              return 'null';
            });
            // Troca operadores lógicos
            expr = expr.replace(/\bAND\b/gi, '&&').replace(/\bOR\b/gi, '||');
            // Troca apenas = isolado por ===
            expr = expr.replace(/([^=!<>])=([^=])/g, '$1===$2');
            // Não faz mais conversão de datas, pois o JSON já está em ISO
            try {
              // Para debug:
              // console.log('Expr:', expr, rowNode.data);
              return !eval(expr);
            } catch (e) {
              console.error('Erro ao avaliar expressão:', expr, e, rowNode.data);
              return true;
            }
          }
        };
      } else if (this.content.rowSelection === "single") {
        return {
          mode: "singleRow",
          checkboxes: !this.content.disableCheckboxes,
          isRowSelectable: rowNode =>
            !(rowNode?.data && rowNode.data.isEnabled === false),
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
    getRowId(params) {
      return this.resolveMappingFormula(this.content.idFormula, params.data);
    },
    onActionTrigger(event) {
      this.$emit("trigger-event", {
        name: "action",
        event,
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
      const colId = event.column && event.column.getColId && event.column.getColId();
      const colDef = event.column && event.column.colDef;
      const isSelectionCol =
        (colId && (
          colId === 'ag-Grid-SelectionColumn' ||
          colId === 'ag-Grid-Selection' ||
          colId === '__selection__' ||
          colId === 'selection' ||
          colId.toLowerCase().includes('selection')
        )) ||
        (colDef && colDef.checkboxSelection);
      if (isSelectionCol) return;
      if (event?.data && event.data.isEnabled === false) return;
      this.$emit("trigger-event", {
        name: "rowClicked",
        event: {
          row: event.data,
          id: event.node.id,
          index: event.node.sourceRowIndex,
          displayIndex: event.rowIndex,
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
    // Determina se a coluna pode ser movida
    isColumnMovable(params) {
      if (params.column.getColId() === 'ag-Grid-SelectionColumn') return false;
      if (params.column.getPinned() === 'left' || params.column.getPinned() === 'right') return false;
      const colDef = params.column.getColDef();
      const field = colDef.field;
      const columnConfig = this.content.columns.find(col => col.field === field);
      if (columnConfig && columnConfig.draggable === false) return false;
      return this.content.movableColumns;
    },
    // Remove opções de pin/unpin do menu
    getMainMenuItems(params) {
      const defaultItems = params.defaultItems;
      return defaultItems.filter(item => !item.toLowerCase().includes('pin'));
    },
    /* wwEditor:end */
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
    rowData: {
      handler() {
        if (this.gridApi) {
          this.gridApi.setFilterModel(null);
        }
      },
      deep: true,
    },
    'content.selectAllRows'(newValue) {
      if (!this.gridApi) return;
      if (newValue === 'S') {
        this.gridApi.selectAll();
      } else if (newValue === 'N') {
        this.gridApi.deselectAll();
        setTimeout(() => {
          this.gridApi.deselectAll(); // Garante que todas sejam desmarcadas
          setSelectedRows([]);
        }, 0);
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

    :deep(.ag-header-cell .ag-header-cell-menu-button),
    :deep(.ag-header-cell .ag-header-cell-menu-button-wrapper),
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

    :deep(.ag-header-cell .ag-header-icon) {
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity 0.2s;
    }

    :deep(.ag-header-cell.ag-header-cell-filtered .ag-header-icon) {
      color: rgb(105, 157, 140) !important;
      filter: drop-shadow(0 0 2px rgb(105, 157, 140));
    }

    :deep(.ag-text-left) {
      text-align: left !important;
    }

    :deep(.ag-text-center) {
      text-align: center !important;
    }

    :deep(.ag-text-right) {
      text-align: right !important;
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
    }

    :deep(.ag-header-align-center .ag-header-cell-label .ag-header-cell-text) {
      flex: none !important;
      text-align: center !important;
      margin: 0 auto !important;
    }

    :deep(.ag-header-align-center .ag-header-icon) {
      position: static !important;
      margin-left: 2px !important;
    }

    :deep(.ag-header-align-right .ag-header-cell-label) {
      justify-content: flex-end !important;
    }

    :deep(.ag-cell.ag-text-left),
    :deep(.ag-cell.ag-text-center) {
      justify-content: center !important;
      display: flex !important;
      padding-right: 24px !important;
    }

    :deep(.ag-cell.ag-text-right) {
      justify-content: flex-end !important;
      display: flex !important;
      padding-right: 24px !important;
    }
  }

  /* CSS para o filtro customizado ListFilterRenderer */
  .list-filter {
    padding: 10px;
    min-width: 200px;
    max-height: 300px;
    overflow-y: auto;
  }

  .list-filter .filter-header {
    margin-bottom: 10px;
  }

  .list-filter .search-input {
    width: 100%;
    padding: 5px;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-size: 12px;
  }

  .list-filter .filter-list {
    max-height: 200px;
    overflow-y: auto;
    margin-bottom: 10px;
  }

  .list-filter .filter-item {
    display: flex;
    align-items: center;
    padding: 3px 0;
    font-size: 12px;
    cursor: pointer;
  }

  .list-filter .filter-item:hover {
    background-color: #f5f5f5;
  }

  .list-filter .filter-item input[type="checkbox"] {
    margin-right: 8px;
  }

  .list-filter .filter-actions {
    display: flex;
    gap: 5px;
    justify-content: space-between;
  }

  .list-filter .apply-btn,
  .list-filter .clear-btn {
    padding: 5px 10px;
    border: 1px solid #ccc;
    border-radius: 3px;
    background: #fff;
    cursor: pointer;
    font-size: 11px;
  }

  .list-filter .apply-btn:hover {
    background: #e6f3ff;
  }

  .list-filter .clear-btn:hover {
    background: #ffe6e6;
  }

  /* Bloqueia interação com colunas fixas */
  :deep(.ag-header-cell.ag-pinned-left),
  :deep(.ag-header-cell.ag-pinned-right) {
    pointer-events: none !important;
    user-select: none !important;
    cursor: default !important;
  }
</style>