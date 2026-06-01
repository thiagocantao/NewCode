<template>
  <div ref="rootRef" class="ww-datagrid" :class="{ editing: isEditing, 'grid-hidden': !gridVisible }" :style="cssVars">
    <ag-grid-vue :key="gridKey" :rowData="rowData" :columnDefs="columnDefs" :defaultColDef="defaultColDef"
      :domLayout="content.layout === 'auto' ? 'autoHeight' : 'normal'" :style="style" :rowSelection="rowSelection"
      :selection-column-def="{ pinned: true }" :theme="theme" :getRowId="getRowId" :pagination="content.pagination"
      :getRowStyle="getRowStyle"
      :paginationPageSize="content.paginationPageSize || 10" :paginationPageSizeSelector="false"
      :suppressColumnMoveAnimation="true"
      :suppressMovableColumns="!content.movableColumns" :columnHoverHighlight="content.columnHoverHighlight"
      :singleClickEdit="content.oneClickEdit" :locale-text="localeText" @grid-ready="onGridReady"
      @first-data-rendered="onFirstDataRendered"
      @row-selected="onRowSelected" @selection-changed="onSelectionChanged"
      @cell-value-changed="onCellValueChanged" @filter-changed="onFilterChanged" @sort-changed="onSortChanged"
      @cell-clicked="onCellClicked" @row-clicked="onRowClicked" @cell-key-down="onCellKeyDown"
      @cell-editing-stopped="onCellEditingStopped">
    </ag-grid-vue>
  </div>
</template>

<script>
  import { onMounted, onUnmounted, shallowRef, watchEffect, computed, ref, watch } from "vue";
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
import ListCellEditor from "./components/ListCellEditor.js";
import YearMonthCellEditor from "./components/YearMonthCellEditor.js";
import './components/list-filter.css';
import { translatePhrase } from "./translation";


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
    const { value: gridRecords, setValue: setGridRecords } =
      wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: "gridRecords",
        type: "array",
        defaultValue: [],
        readonly: true,
      });

    const sanitizeGridRow = (row) => {
      const next = { ...(row || {}) };
      delete next.__isInputRow;
      delete next.__gridInputRowIndex;
      delete next.__gridInputRowKey;
      return next;
    };

    const normalizeGridRecords = (data) => {
      const rows = wwLib.wwUtils.getDataFromCollection(data);
      return Array.isArray(rows) ? rows.map(sanitizeGridRow) : [];
    };

    watch(
      () => props.content.rowData,
      (newData) => {
        setGridRecords(normalizeGridRecords(newData));
      },
      { deep: true, immediate: true }
    );

    const getAppLanguage = () => {
      let value = null;
      try {
        if (window.wwLib?.wwVariable?.getValue) {
          value = window.wwLib.wwVariable.getValue("aa44dc4c-476b-45e9-a094-16687e063342");
        }
      } catch (e) {}

      switch (value) {
        case "pt-BR":
        case "pt":
        case "Portuguese":
          return "pt";
        case "fr-FR":
        case "fr":
        case "French":
          return "fr";
        case "es-ES":
        case "es":
        case "Spanish":
          return "es";
        case "de-DE":
        case "de":
        case "German":
          return "de";
        case "en-US":
        case "en":
        case "English":
          return "en";
        default:
          return null;
      }
    };

    const onGridReady = (params) => {
      gridApi.value = params.api;
      if (
        gridApi.value &&
        typeof gridApi.value.doLayout !== "function" &&
        typeof gridApi.value.onGridSizeChanged === "function"
      ) {
        gridApi.value.doLayout = () => gridApi.value.onGridSizeChanged();
      }
      trySelectInitialRows();
    };

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
      const isSelected = event.node.isSelected();

      if (!isSelected && gridApi.value) {
        setSelectedRows(gridApi.value.getSelectedRows() || []);
      }

      ctx.emit("trigger-event", {
        name: isSelected ? "rowSelected" : "rowDeselected",
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
    const { createElement } = wwLib.wwElement.useCreate();
    /* wwEditor:end */

    const gridKey = ref(0);
    const rootRef = ref(null);
    const gridVisible = ref(false);
    let resizeObserver = null;

    const showGrid = () => {
      // Wait two frames to let flex columns settle before revealing the grid
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          gridVisible.value = true;
        })
      );
    };

    watch(
      () => props.content.rowData,
      (newData) => {
        gridVisible.value = false;
        gridKey.value += 1;

        const hasNoRows = !Array.isArray(newData) || newData.length === 0;
        if (hasNoRows) {
          showGrid();
        }
      },
      { deep: true }
    );

    const onFirstDataRendered = () => {
      showGrid();
    };

    const refreshLayout = () => {
      if (!gridApi.value) return;
      requestAnimationFrame(() => {
        if (typeof gridApi.value.onGridSizeChanged === "function") {
          gridApi.value.onGridSizeChanged();
        } else if (typeof gridApi.value.refreshHeader === "function") {
          gridApi.value.refreshHeader();
        }
      });
    };

    onMounted(() => {
      resizeObserver = new ResizeObserver(() => refreshLayout());
      if (rootRef.value) resizeObserver.observe(rootRef.value);

      const appLanguage = getAppLanguage();
      if (appLanguage && appLanguage !== props.content.lang) {
        ctx.emit("update:content:effect", { lang: appLanguage });
      }
    });

    onUnmounted(() => {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
    });

    return {
      resolveMappingFormula,
      onGridReady,
      onRowSelected,
      onSelectionChanged,
      gridApi,
      setSelectedRows,
      gridRecords,
      setGridRecords,
      sanitizeGridRow,
      onFilterChanged,
      onSortChanged,
      onFirstDataRendered,
      gridVisible,
      showGrid,
      rootRef,
      localeText: computed(() => {
        const language = getAppLanguage() || props.content.lang;
        switch (language) {
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
            return AG_GRID_LOCALE_EN;
        }
      }),
      /* wwEditor:start */
      createElement,
      /* wwEditor:end */
      gridKey,
    };
  },
  data() {
    return {
      pendingEnterEdit: null,
      markedRowId: null,
      inputRowKey: 0,
    };
  },
  computed: {
    rowData() {
      const data = Array.isArray(this.gridRecords) ? this.gridRecords : [];
      return [
        this.createBlankRow(true),
        ...data.map((row, index) => ({
          ...row,
          __isInputRow: false,
          __gridInputRowIndex: index,
        })),
      ];
    },
    defaultColDef() {
      return {
        editable: true,
        resizable: this.content.resizableColumns,
      };
    },
    columnDefs() {
      const actionColumn = {
        colId: "__grid_input_actions__",
        headerName: "",
        pinned: "left",
        width: 48,
        minWidth: 48,
        maxWidth: 48,
        lockPosition: true,
        sortable: false,
        filter: false,
        resizable: false,
        editable: false,
        suppressMovable: true,
        cellStyle: {
          textAlign: "center",
          padding: "0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
        cellRenderer: (params) => {
          const isInputRow = !!params.data?.__isInputRow;
          const iconClass = isInputRow ? "fa-solid fa-plus" : "fa-solid fa-trash";
          const title = isInputRow ? "Incluir linha" : "Excluir linha";
          return `<button class="grid-input-action-btn" type="button" title="${title}" aria-label="${title}"><i class="${iconClass}" aria-hidden="true"></i></button>`;
        },
        onCellClicked: (params) => {
          if (params.data?.__isInputRow) this.addRowFromInput(params.data);
          else this.deleteRow(params.data);
        },
      };
      
      const mappedColumns = this.content.columns.map((col) => {
        
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
        const isFlex = col.flex === true || col.widthAlgo === "flex";
        const width =
          !col.width || col.width === "auto" || isFlex
            ? null
            : wwLib.wwUtils.getLengthUnit(col.width)?.[0];
        const flex = isFlex
          ? typeof col.flex === "number"
            ? col.flex
            : 1
          : null;
        const commonProperties = {
          minWidth,
          maxWidth,
          pinned: col.pinned === "none" ? false : col.pinned,
          width,
          flex,
          hide: !!col.hide,
        };
        
        
        const cellAlign = col.textAlign ?? this.content.textAlign;
        const headerAlign = col.headerAlign ?? this.content.headerAlign;
        const cellClass = cellAlign ? `ag-text-${cellAlign}` : undefined;
        const headerClass = headerAlign ? `ag-header-align-${headerAlign}` : undefined;
        const baseCellStyle = cellAlign ? { textAlign: cellAlign } : undefined;

        const applyCursor = (result) => {
          const cursor = this.content.cellCursor ?? col.cursor;
          if (cursor) {
            const userCellStyle = result.cellStyle;
            result.cellStyle = (params) => ({
              ...(typeof userCellStyle === 'function'
                ? userCellStyle(params)
                : userCellStyle || {}),
              cursor,
            });
          }
          return result;
        };

        const isEditable = col.editable !== false;

        switch (col.cellDataType) {
          case "action": {
            const result = {
              ...commonProperties,
              headerName: translatePhrase(col.headerName),
              cellRenderer: "ActionCellRenderer",
              cellRendererParams: {
                name: col.actionName,
                label: translatePhrase(col.actionLabel),
                trigger: this.onActionTrigger,
                withFont: !!this.content.actionFont,
              },
              sortable: false,

              filter: false,
              cellClass,
              headerClass,
              ...(baseCellStyle ? { cellStyle: baseCellStyle } : {}),
            };
            return applyCursor(result);

          }
          case "custom": {
            const result = {
              ...commonProperties,
              headerName: translatePhrase(col.headerName),
              field: col.field,
              cellRenderer: "WewebCellRenderer",
              cellRendererParams: {
                containerId: col.containerId,
              },


              sortable: col.sortable,
              filter: col.filter,
              cellClass,
              headerClass,
              ...(baseCellStyle ? { cellStyle: baseCellStyle } : {}),
            };
            return applyCursor(result);
          }

          case "image": {
            const result = {
              ...commonProperties,
              headerName: translatePhrase(col.headerName),
              field: col.field,
              cellRenderer: "ImageCellRenderer",
              cellRendererParams: {
                width: col.imageWidth,
                height: col.imageHeight,
              },

              cellClass,
              headerClass,
              ...(baseCellStyle ? { cellStyle: baseCellStyle } : {}),
            };
            return applyCursor(result);

          }
          case "boolean": {
            const result = {
              ...commonProperties,
              headerName: translatePhrase(col.headerName),
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
              ...(baseCellStyle ? { cellStyle: baseCellStyle } : {}),
            };
            return applyCursor(result);
          }
          case "list":
          default: {
            const result = {
              ...commonProperties,
              headerName: translatePhrase(col.headerName),
              field: col.field,
              sortable: col.sortable,
              filter: col.filter,
              editable: isEditable,
              listDataSource: col.listDataSource,
              listIdColumn: col.listIdColumn,
              listLabelColumn: col.listLabelColumn,
              cellClass,
              headerClass,
              ...(baseCellStyle ? { cellStyle: baseCellStyle } : {}),
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
              if (isEditable) {
                result.cellEditor = 'agDateStringCellEditor';
              }
            }
            // Garante filtro de data para campos do tipo Year/Month
            if (['year', 'month', 'yearMonth'].includes(col.cellDataType)) {
              result.filter = col.cellDataType === 'year' ? 'agNumberColumnFilter' : 'agTextColumnFilter';
              result.cellDataType = false;
              result.yearMonthMode = col.cellDataType;
              if (isEditable) {
                result.cellEditor = YearMonthCellEditor;
                result.cellEditorParams = { yearMonthMode: col.cellDataType };
              }
              if (col.cellDataType === 'yearMonth') {
                result.valueFormatter = params => this.formatYearMonthValue(params.value, col.yearMonthFormat);
              }
            }
            // Garante filtro customizado de lista para campos do tipo List
            if (col.cellDataType === 'list') {
              result.filter = ListFilterRenderer;
              if (isEditable) {
                result.cellEditor = ListCellEditor;
              }
              const listRows = this.resolveListRows(col.listDataSource);
              if (Array.isArray(listRows) && listRows.length) {
                const labelsById = new Map(
                  listRows.map(item => {
                    const id = this.resolveFieldValue(item, col.listIdColumn, ['id', 'value']);
                    const label = this.resolveFieldValue(item, col.listLabelColumn, ['label', 'name', 'title'], id);
                    return [String(id), label];
                  })
                );
                result.valueFormatter = params => labelsById.get(String(params.value)) ?? params.value ?? '';
              }
            }

            return applyCursor(result);
          }
        }
      });

      if (
        this.content.showDisabledSelectionLockIcon !== false &&
        this.content.rowSelection === "multiple" &&
        !this.content.disableCheckboxes
      ) {
        mappedColumns.push({
          colId: "__lock_selection__",
          headerName: "",
          width: 52,
          minWidth: 52,
          maxWidth: 52,
          sortable: false,
          filter: false,
          resizable: false,
          suppressNavigable: true,
          lockPosition: true,
          suppressHeaderContextMenu: true,
          suppressHeaderMenuButton: true,
          suppressCellFocus: true,
          suppressColumnsToolPanel: true,
          cellStyle: {
            right: "5px",
            textAlign: "center",
            paddingLeft: "0",
            paddingRight: "0",
            overflow: "hidden",
          },
          cellRenderer: (params) => {
            const selectable = this.isRowSelectableByCondition(params?.data);
            const lockTitle = translatePhrase("The record cannot be deleted");
            return selectable
              ? ""
              : `<span><i class="fa fa-lock" style="font-size:15px;line-height:1;" aria-hidden="true" title="${lockTitle}"></i></span>`;
          },
        });
      }

      return [actionColumn, ...mappedColumns];
      
    },
    rowSelection() {
      if (this.content.rowSelection === "multiple") {
        return {
          mode: "multiRow",
          checkboxes: !this.content.disableCheckboxes,
          headerCheckbox: !this.content.disableCheckboxes,
          selectAll: this.content.selectAll || "all",
          enableClickSelection: this.content.enableClickSelection,
          isRowSelectable: (rowNode) => this.isRowSelectableByCondition(rowNode?.data),
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
        headerFontSize: "12px",
        headerFontFamily: "Inter, sans-serif",
        headerFontWeight: this.content.headerFontWeight,
        borderColor: this.content.borderColor,
        cellTextColor: this.content.cellColor,
        cellFontFamily: "Inter, sans-serif",
        dataFontSize: "12px",
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
      if (params.data?.__isInputRow) {
        return `__grid_input_row_${params.data.__gridInputRowKey ?? 0}`;
      }
      const resolvedId = this.resolveMappingFormula(this.content.idFormula, params.data);
      if (resolvedId !== undefined && resolvedId !== null && resolvedId !== "") {
        return resolvedId;
      }
      return `__grid_record_${params.data?.__gridInputRowIndex ?? params.node?.rowIndex ?? 0}`;
    },
    onActionTrigger(event) {
      this.$emit("trigger-event", {
        name: "action",
        event,
      });
    },
    onCellValueChanged(event) {
      if (!event.data?.__isInputRow) {
        this.syncGridData();
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
    syncGridData() {
      const rows = (this.rowData || [])
        .filter((row) => !row?.__isInputRow)
        .map((row) => this.sanitizeGridRow(row));
      this.setGridRecords(rows);
    },
    createBlankRow(isInputRow = false) {
      return (this.content.columns || []).filter((col) => col.field).reduce((acc, col) => {
        acc[col.field] = "";
        return acc;
      }, { __isInputRow: isInputRow, __gridInputRowKey: isInputRow ? this.inputRowKey : undefined });
    },
    addRowFromInput(inputRow) {
      const newRow = this.sanitizeGridRow(inputRow);
      const currentRows = Array.isArray(this.gridRecords) ? [...this.gridRecords] : [];
      this.setGridRecords([...currentRows, newRow]);
      this.inputRowKey += 1;
      this.focusInputRowFirstEditableCell();
    },
    deleteRow(row) {
      const dataIndex = Number(row?.__gridInputRowIndex);
      const currentRows = Array.isArray(this.gridRecords) ? [...this.gridRecords] : [];
      if (!Number.isInteger(dataIndex) || dataIndex < 0 || dataIndex >= currentRows.length) return;
      currentRows.splice(dataIndex, 1);
      this.setGridRecords(currentRows);
    },
    onCellClicked(event) {
      if (!event.data?.__isInputRow || event.column?.getColId?.() === "__grid_input_actions__") return;
      this.startInputRowEditing(event.column);
    },
    getFirstEditableInputColumn() {
      if (!this.gridApi) return null;
      const inputRowNode = this.gridApi.getDisplayedRowAtIndex(0);
      const columns = this.gridApi.getAllDisplayedColumns?.() || [];
      return columns.find((column) => {
        if (column.getColId?.() === "__grid_input_actions__") return false;
        if (typeof column.isCellEditable === "function") {
          return column.isCellEditable(inputRowNode);
        }
        return column.getColDef?.()?.editable !== false;
      }) || null;
    },
    startInputRowEditing(column) {
      if (!this.gridApi || !column) return;
      requestAnimationFrame(() => {
        this.gridApi.ensureIndexVisible?.(0);
        this.gridApi.setFocusedCell?.(0, column);
        this.gridApi.startEditingCell?.({ rowIndex: 0, colKey: column });
      });
    },
    focusInputRowFirstEditableCell() {
      requestAnimationFrame(() => {
        const column = this.getFirstEditableInputColumn();
        this.startInputRowEditing(column);
      });
    },
    onCellKeyDown(event) {
      if (!this.content.enterNextRow || !event?.event) return;
      const keyEvent = event.event;
      if (keyEvent.key !== "Enter" || keyEvent.shiftKey) {
        this.pendingEnterEdit = null;
        return;
      }
      const editingCells = event.api?.getEditingCells?.() || [];
      const isEditingCurrentCell = editingCells.some(
        (cell) =>
          cell.rowIndex === event.rowIndex &&
          cell.column?.getColId?.() === event.column?.getColId?.()
      );
      if (!isEditingCurrentCell) return;
      keyEvent.preventDefault?.();
      keyEvent.stopPropagation?.();
      this.pendingEnterEdit = {
        columnId: event.column.getColId(),
        rowIndex: event.rowIndex,
        pinned: event.column?.getPinned?.() || null,
      };
      event.api?.stopEditing?.();
    },
    onCellEditingStopped(event) {
      if (!this.content.enterNextRow || !this.pendingEnterEdit) return;
      const { columnId, rowIndex, pinned } = this.pendingEnterEdit;
      this.pendingEnterEdit = null;
      if (event.column.getColId() !== columnId || event.rowIndex !== rowIndex) {
        return;
      }
      const nextRowIndex = rowIndex + 1;
      if (!event.api || nextRowIndex >= event.api.getDisplayedRowCount()) {
        return;
      }
      const nextRowNode = event.api.getDisplayedRowAtIndex(nextRowIndex);
      if (!nextRowNode) return;
      const targetColumn = event.api.getColumn(columnId);
      if (!targetColumn || !targetColumn.isCellEditable(nextRowNode)) return;
      const startEditParams = {
        rowIndex: nextRowIndex,
        colKey: targetColumn,
      };
      if (pinned) {
        startEditParams.columnPinned = pinned;
      }
      requestAnimationFrame(() => {
        event.api.ensureIndexVisible(nextRowIndex);
        event.api.setFocusedCell(nextRowIndex, targetColumn);
        event.api.startEditingCell(startEditParams);
      });
    },
    isRowSelectableByCondition(rowData) {
      const cond = this.content.disableRowSelectionCondition;
      if (!cond) return true;
      let expr = cond.replace(/@([a-zA-Z0-9_çÇãÃáÁéÉíÍóÓúÚêÊôÔâÂàÀèÈìÌòÒùÙüÜñÑ]+)/g, (match, p1) => {
        const val = rowData && rowData[p1];
        if (val === undefined || val === null) return 'null';
        if (typeof val === 'string') return `"${val.replace(/"/g, '\\"')}"`;
        if (typeof val === 'boolean' || typeof val === 'number') return val;
        return 'null';
      });
      expr = expr.replace(/\bAND\b/gi, '&&').replace(/\bOR\b/gi, '||');
      expr = expr.replace(/([^=!<>])=([^=])/g, '$1===$2');
      try {
        return !eval(expr);
      } catch (e) {
        return true;
      }
    },
    onRowClicked(event) {
      const colId = event.column && event.column.getColId && event.column.getColId();
      const colDef = event.column && event.column.colDef;
      const field = colDef && colDef.field;
      const clickedTarget = event.event && event.event.target;
      const clickedOnSelection =
        clickedTarget &&
        clickedTarget.closest &&
        clickedTarget.closest(
          '.ag-selection-checkbox, .ag-checkbox-input-wrapper, .ag-cell-checkbox'
        );
      const isSelectionCol =
        (colId && (
          colId === 'ag-Grid-SelectionColumn' ||
          colId === 'ag-Grid-Selection' ||
          colId === '__selection__' ||
          colId === 'selection' ||
          colId.toLowerCase().includes('selection')
        )) ||
        (colDef && colDef.checkboxSelection) ||
        clickedOnSelection;
      if (isSelectionCol) return;
      this.$emit("trigger-event", {
        name: "rowClicked",
        event: {
          row: event.data,
          id: event.node.id,
          index: event.node.sourceRowIndex,
          displayIndex: event.rowIndex,
          field,
        },
      });
    },
    remountGrid() {
      this.gridApi = null;
      this.gridVisible = false;
      this.gridKey += 1;
      this.showGrid();
    },
    deselectAllRows() {
      if (this.gridApi) {
        this.gridApi.deselectAll();
      }
    },
    markRow(rowId) {
      if (rowId === undefined || rowId === null || rowId === "") {
        this.markedRowId = null;
      } else {
        this.markedRowId = String(rowId);
      }

      if (this.gridApi?.redrawRows) {
        this.gridApi.redrawRows();
      }
    },
    getRowStyle(params) {
      if (!this.content.selectedActionRowColor || this.markedRowId === null) {
        return null;
      }

      const rowId = this.getRowId({ data: params?.data });
      if (String(rowId) !== this.markedRowId) {
        return null;
      }

      return {
        backgroundColor: this.content.selectedActionRowColor,
      };
    },
    formatYearMonthValue(value, format = 'YYYY-MM') {
      if (value == null || value === '') return '';
      const match = String(value).match(/^(\d{4})-(\d{1,2})/);
      if (!match) return value;

      const year = match[1];
      const month = String(match[2]).padStart(2, '0');
      const monthIndex = Number(month) - 1;
      const locale = this.content.lang && this.content.lang !== 'custom' ? this.content.lang : undefined;
      const shortMonth = new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(Number(year), monthIndex, 1));
      const longMonth = new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(Number(year), monthIndex, 1));

      switch (format || 'YYYY-MM') {
        case 'MM/YYYY':
          return `${month}/${year}`;
        case 'YYYY/MM':
          return `${year}/${month}`;
        case 'MM-YYYY':
          return `${month}-${year}`;
        case 'MMM YYYY':
          return `${shortMonth} ${year}`;
        case 'MMMM YYYY':
          return `${longMonth} ${year}`;
        case 'YYYY-MM':
        default:
          return `${year}-${month}`;
      }
    },
    resolveListRows(dataSource) {
      let source = dataSource;

      if (typeof source === 'string') {
        source = this.parseListDataSourceString(source);
      }

      const rows = wwLib.wwUtils.getDataFromCollection(source);
      if (Array.isArray(rows)) return rows;
      if (!rows || typeof rows !== 'object') return [];

      return Object.values(rows).find(value => Array.isArray(value)) || [];
    },
    parseListDataSourceString(source) {
      const value = source.trim().replace(/\\n/g, '\n');

      if (!value) return [];

      try {
        return JSON.parse(value);
      } catch (error) {
        const normalizedValue = value
          .replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3')
          .replace(/,\s*([}\]])/g, '$1');

        try {
          return JSON.parse(normalizedValue);
        } catch (normalizedError) {
          return [];
        }
      }
    },
    resolveFieldValue(item, configuredPath, fallbackPaths = [], fallbackValue = undefined) {
      const configuredValue = this.getValueByPath(item, configuredPath);
      if (configuredValue !== undefined && configuredValue !== null && configuredValue !== '') return configuredValue;

      for (const fallbackPath of fallbackPaths) {
        const fallbackPathValue = this.getValueByPath(item, fallbackPath);
        if (fallbackPathValue !== undefined && fallbackPathValue !== null && fallbackPathValue !== '') {
          return fallbackPathValue;
        }
      }

      return fallbackValue;
    },
    normalizePropertyPath(path) {
      if (path === undefined || path === null || path === '') return null;
      if (Array.isArray(path)) return path.join('.');
      if (typeof path === 'object') {
        return this.normalizePropertyPath(path.path ?? path.value ?? path.key ?? path.name ?? path.id ?? path.property);
      }

      return String(path)
        .replace(/^context\.mapping\??\.?/, '')
        .replace(/^context\.item\??\.?/, '')
        .replace(/^item\./, '')
        .replace(/^\[['"]?/, '')
        .replace(/['"]?\]$/, '')
        .replace(/\[['"]([^'"]+)['"]\]/g, '.$1');
    },
    getValueByPath(item, path) {
      const normalizedPath = this.normalizePropertyPath(path);
      if (!normalizedPath) return undefined;

      if (wwLib.resolveObjectPropertyPath) {
        const resolvedValue = wwLib.resolveObjectPropertyPath(item, normalizedPath);
        if (resolvedValue !== undefined) return resolvedValue;
      }

      return normalizedPath
        .split('.')
        .reduce((value, key) => (value && value[key] !== undefined ? value[key] : undefined), item);
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
        field: Object.keys(data[0])[0],
      };
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
          this.setSelectedRows([]);
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

    &.grid-hidden {
      visibility: hidden;
}
    :deep(.grid-input-action-btn) {
      width: 24px;
      height: 24px;
      border: 1px solid #d0d7de;
      background: #fff;
      border-radius: 4px;
      color: var(--ww-data-grid_action-color, #24292f);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      padding: 0;
    }

    :deep(.grid-input-action-btn i) {
      font-size: 13px;
      line-height: 1;
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


    :deep(.ag-root-wrapper),
    :deep(.ag-header),
    :deep(.ag-header-cell-text),
    :deep(.ag-cell),
    :deep(.ag-paging-panel),
    :deep(.ag-menu),
    :deep(.ag-input-field-input) {
      font-family: "Inter", sans-serif !important;
      font-size: 12px !important;
    }


    :deep(.ag-selection-checkbox .ag-checkbox-input-wrapper.ag-disabled),
    :deep(.ag-selection-checkbox .ag-checkbox-input-wrapper.ag-disabled *),
    :deep(.ag-selection-checkbox input[type="checkbox"]:disabled) {
      cursor: not-allowed !important;
    }

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

    /* Evita o efeito de redimensionamento animado ao carregar o grid */
    :deep(.ag-header-cell),
    :deep(.ag-cell) {
      transition: none !important;
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

    :deep(.ag-cell.ag-text-left) {
      justify-content: flex-start !important;
      display: flex !important;
      padding-right: 24px !important;
    }

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



  :deep(.ag-paging-row-summary-panel) {
    display: none !important;
  }

  /* CSS para o filtro customizado ListFilterRenderer */
  .list-filter {
    padding: 10px;
    min-width: 200px;
    max-height: 300px;
    overflow-y: auto;
    font-family: "Inter", sans-serif;
    font-size: 12px;
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
    font-family: "Inter", sans-serif;
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
    font-family: "Inter", sans-serif;
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
    font-size: 12px;
    font-family: "Inter", sans-serif;
  }

  .list-filter .apply-btn:hover {
    background: #e6f3ff;
  }

  .list-filter .clear-btn:hover {
    background: #ffe6e6;
  }
  :deep(.grid-list-cell-editor) {
    min-width: 180px;
    max-height: 260px;
    padding: 8px;
    border: 1px solid #d6dce5;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
  }

  :deep(.grid-list-cell-editor__search) {
    width: 100%;
    box-sizing: border-box;
    margin-bottom: 8px;
    padding: 6px 8px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font: inherit;
  }

  :deep(.grid-list-cell-editor__options) {
    max-height: 200px;
    overflow-y: auto;
  }

  :deep(.grid-list-cell-editor__option) {
    display: block;
    width: 100%;
    padding: 6px 8px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  :deep(.grid-list-cell-editor__option:hover),
  :deep(.grid-list-cell-editor__option.selected) {
    background: #eef2ff;
  }


  :deep(.grid-year-picker) {
    width: 220px;
    padding: 10px;
    border: 1px solid #d6dce5;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
  }

  :deep(.grid-year-picker__header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-weight: 600;
  }

  :deep(.grid-year-picker__nav),
  :deep(.grid-year-picker__year) {
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
  }

  :deep(.grid-year-picker__nav) {
    width: 28px;
    height: 28px;
    font-size: 20px;
    line-height: 1;
  }

  :deep(.grid-year-picker__years) {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  :deep(.grid-year-picker__year) {
    padding: 8px 4px;
  }

  :deep(.grid-year-picker__nav:hover),
  :deep(.grid-year-picker__year:hover),
  :deep(.grid-year-picker__year.selected) {
    background: #eef2ff;
  }

</style>
