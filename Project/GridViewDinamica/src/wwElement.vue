<template>
  <div class="ww-datagrid" :class="{ editing: isEditing }" :style="cssVars">
    <ag-grid-vue ref="agGridRef" :rowData="rowData" :columnDefs="finalColumnDefs" :defaultColDef="defaultColDef"
      :domLayout="content.layout === 'auto' ? 'autoHeight' : 'normal'" :style="style" :rowSelection="rowSelection"
      :suppressMovableColumns="!content.movableColumns" :alwaysShowHorizontalScroll="false"
      :suppressColumnMoveAnimation="true" :suppressDragLeaveHidesColumns="true" :maintainColumnOrder="true"
      :isColumnMovable="isColumnMovable" :theme="theme" :getRowId="getRowId" :pagination="content.pagination"
      :paginationPageSize="content.paginationPageSize || 10" :paginationPageSizeSelector="false"
      :columnHoverHighlight="content.columnHoverHighlight" :locale-text="localeText" :components="gridComponents"
      :singleClickEdit="true" :popupParent="popupParent" @grid-ready="onGridReady" @row-selected="onRowSelected"
      @selection-changed="onSelectionChanged" @cell-value-changed="onCellValueChanged" @filter-changed="onFilterChanged"
      @sort-changed="onSortChanged" @row-clicked="onRowClicked" @first-data-rendered="onFirstDataRendered"
      @cell-clicked="onCellClicked" @cell-editing-started="onCellEditingStarted">
    </ag-grid-vue>
  </div>
</template>

<script>
  // --- Logger simples: habilite logs no publish com ?debug=1 ---
  const DEBUG_ON = (() => {
    try { return new URLSearchParams(window.location.search).get('debug') === '1'; }
    catch { return false; }
  })();
  function debug(...args) { if (DEBUG_ON) { try { console.log('[GRID]', ...args); } catch {} } }

  import { shallowRef, watchEffect, computed, ref, onMounted, onUnmounted, watch, h } from "vue";
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
  import ResponsibleUserFilterRenderer from "./components/ResponsibleUserFilterRenderer.js";
  import DateTimeCellEditor from "./components/DateTimeCellEditor.js";
  import DateTimeFilter from "./components/DateTimeFilter.vue";
  import FixedListCellEditor from "./components/FixedListCellEditor.js";
  import ResponsibleUserCellEditor from "./components/ResponsibleUserCellEditor.js";
  import ResponsibleUserCellRenderer from "./components/ResponsibleUserCellRenderer.js";
  import "./components/list-filter.css"; // ✅ mover para o topo

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

      let optionsArr = [];
      if (Array.isArray(params.options)) {
        optionsArr = params.options;
      } else if (Array.isArray(params.colDef.options)) {
        optionsArr = params.colDef.options;
      } else if (Array.isArray(params.colDef.listOptions)) {
        optionsArr = params.colDef.listOptions;
      } else if (
        typeof params.colDef.listOptions === 'string' &&
        params.colDef.listOptions.trim() !== ''
      ) {
        optionsArr = params.colDef.listOptions.split(',').map(o => o.trim());
      } else if (
        params.colDef.dataSource &&
        typeof params.colDef.dataSource.list_options === 'string' &&
        params.colDef.dataSource.list_options.trim() !== ''
      ) {
        optionsArr = params.colDef.dataSource.list_options
          .split(',')
          .map(o => o.trim());
      }
      this.options = optionsArr.map(opt =>
        typeof opt === 'object' ? opt : { value: opt, label: String(opt) }
      );
      this.filteredOptions = [...this.options];
      this.value = params.value;

      const tag =
        (params.colDef.context?.TagControl ||
          params.colDef.TagControl ||
          params.colDef.tagControl ||
          params.colDef.tagcontrol ||
          '')
          .toString()
          .trim()
          .toUpperCase();
      const identifier =
        (params.colDef.context?.FieldDB || params.colDef.FieldDB || '')
          .toString()
          .trim()
          .toUpperCase();
      const categoryTags = ['CATEGORYID', 'SUBCATEGORYID', 'CATEGORYLEVEL3ID'];
      this.isCategoryField =
        categoryTags.includes(tag) || categoryTags.includes(identifier);

      this.searchInput.addEventListener('input', e => {
        this.filterOptions(e.target.value);
      });

      if (this.closeBtn) {
        this.closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.params.api && this.params.api.stopEditing) {
            this.params.api.stopEditing(true);
          } else if (this.params.stopEditing) {
            this.params.stopEditing(true);
          }
        });
      }

      // Close editor when clicking outside
      this.handleOutsideClick = (e) => {
        if (!this.eGui.contains(e.target)) {
          if (this.params.api && this.params.api.stopEditing) {
            this.params.api.stopEditing();
          } else if (this.params.stopEditing) {
            this.params.stopEditing();
          }
        }
      };
      document.addEventListener('mousedown', this.handleOutsideClick);

      this.renderOptions();
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
            colDef.context?.FieldDB || colDef.FieldDB
          );
          if (styled) return styled;
        }
      } catch (e) {
      }
      return value;
    }
    renderOptions() {
      this.listEl.innerHTML = this.filteredOptions
        .map(opt => {
          const formatted = this.formatOption(opt);
          const selected = opt.value == this.value ? ' selected' : '';
          if (this.isCategoryField) {
            const label = this.stripHtml(String(opt.label != null ? opt.label : opt.value));
            return `<div class="filter-item${selected} category-option" data-value="${opt.value}"><span class="filter-label">${label}</span></div>`;
          }
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
    destroy() {
      document.removeEventListener('mousedown', this.handleOutsideClick);
    }
    isPopup() { return true; }
  }

  // Registra apenas comunidade (sem SetFilter enterprise)
  ModuleRegistry.registerModules([AllCommunityModule]);

  export default {
    components: {
      AgGridVue,
      ActionCellRenderer,
      ImageCellRenderer,
      WewebCellRenderer,
      FormatterCellRenderer,
      ListCellEditor, // registrar editor customizado
      FixedListCellEditor,
      DateTimeCellEditor,
      ResponsibleUserCellEditor,
      ResponsibleUserCellRenderer,
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
      const popupParent = computed(() => agGridRef.value?.$el || document.body);

      // ---------- HELPERS ROBUSTOS ----------
      const asArray = (v) => {
        if (Array.isArray(v)) return v;
        if (v && typeof v === 'object') return Object.values(v);
        return [];
      };
      const asObject = (v) => (v && typeof v === 'object' ? v : {});

      // ---- VIDA ÚTIL & LIMPEZA DA GRID ----
      const destroyed = ref(false);

      const isGridAlive = () => {
        const api = gridApi.value;
        if (!api) return false;
        const f = api.isDestroyed;
        if (typeof f === 'function') return !f.call(api);
        return !destroyed.value; // fallback
      };

      const timeouts = new Set();
      let selectionColumnObserver = null;

      // setTimeout que só executa se a grid ainda estiver viva
      function safeTimeout(fn, ms) {
        const id = setTimeout(() => {
          timeouts.delete(id);
          if (!isGridAlive()) return;
          try { fn(); } catch (_) {}
        }, ms);
        timeouts.add(id);
        return id;
      }

      // Registro e remoção centralizados de listeners da AG Grid
      const boundHandlers = [];
      function addGridListener(api, type, handler) {
        api.addEventListener(type, handler);
        boundHandlers.push({ type, handler });
      }

      // Cleanup completo
      function cleanupGrid(paramsApi = gridApi.value, paramsColumnApi = columnApi.value) {
        destroyed.value = true;

        // interval DEADLINE
        if (deadlineTimer) {
          clearInterval(deadlineTimer);
          deadlineTimer = null;
        }

        // limpa timeouts pendentes
        for (const t of timeouts) clearTimeout(t);
        timeouts.clear();

        // desconecta observer
        try { selectionColumnObserver?.disconnect?.(); } catch (_) {}
        selectionColumnObserver = null;

        // remove listeners registrados
        try {
          const api = paramsApi;
          if (api && typeof api.removeEventListener === 'function') {
            for (const { type, handler } of boundHandlers) {
              api.removeEventListener(type, handler);
            }
          }
        } catch (_) {}
        boundHandlers.length = 0;

        // zera refs
        gridApi.value = null;
        columnApi.value = null;
      }

      // Ensure row ID generation does not rely on component instance context
      const getRowId = (params) =>
        resolveMappingFormula(props.content.idFormula, params.data);

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

      const columnOptions = ref({});
      let responsibleUserCache = null;
      const optionsCache = new Map();

      const parseStaticOptions = (opts) => {
        if (Array.isArray(opts)) {
          return opts.map(opt => (typeof opt === 'object' ? opt : { value: opt, label: String(opt) }));
        }
        if (typeof opts === 'string' && opts.trim() !== '') {
          return opts
            .split(',')
            .map(o => {
              const trimmed = o.trim();
              return { value: trimmed, label: trimmed };
            });
        }
        return [];
      };

      const loadApiOptions = async (col, ticketId) => {
        try {
          // ---- FALLBACKS para publish ----
          const lang = window.wwLib?.wwVariable?.getValue('aa44dc4c-476b-45e9-a094-16687e063342') || props.content?.lang || 'en-US';
          const companyId = window.wwLib?.wwVariable?.getValue('5d099f04-cd42-41fd-94ad-22d4de368c3a') || props.content?.companyId;
          const apiUrl = window.wwLib?.wwVariable?.getValue('1195995b-34c3-42a5-b436-693f0f4f8825') || props.content?.apiUrl;
          const apiKey = window.wwLib?.wwVariable?.getValue('d180be98-8926-47a7-b7f1-6375fbb95fa3') || props.content?.apiKey;
          const apiAuth = window.wwLib?.wwVariable?.getValue('dfcde09f-42f3-4b5c-b2e8-4314650655db') || props.content?.apiAuth;

          const ds = col.dataSource?.dataSource || col.dataSource;
          if (!apiUrl || !ds?.functionName) { debug('API SKIP (missing apiUrl/functionName)', { apiUrl, ds }); return []; }

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

          debug('API FETCH', apiUrl + ds.functionName, fetchOptions);
          const response = await fetch(apiUrl + ds.functionName, fetchOptions);
          if (!response.ok) throw new Error(`HTTP error ${response.status}`);
          const data = await response.json();
          debug('API OK', Array.isArray(data) ? `items: ${data.length}` : data);

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
          debug('API ERROR', e?.message || e);
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
          debug('ResponsibleUser datasource not found', e?.message || e);
          return [];
        }
      };

      const getColumnOptions = async (col, ticketId) => {
        const tag = (col.TagControl || col.tagControl || col.tagcontrol || '').toUpperCase();
        const identifier = (col.FieldDB || '').toUpperCase();
        if (tag === 'RESPONSIBLEUSERID' || identifier === 'RESPONSIBLEUSERID') {
          if (!responsibleUserCache) {
            responsibleUserCache = await loadResponsibleUserOptions();
          }
          return asArray(responsibleUserCache);
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
          opts = await loadApiOptions(col, ticketId);
        }

        return asArray(opts);
      };

      const loadAllColumnOptions = async () => {
        if (!props.content) return;

        const colsSrc = props.content.columns;
        const columnsArr = asArray(colsSrc);
        if (!columnsArr.length) return;

        const rawRows = wwLib.wwUtils.getDataFromCollection(props.content.rowData);
        const rows = asArray(rawRows);

        const result = {};
        await Promise.all(
          columnsArr.map(async (col) => {
            const colId = col.id || col.field;
            result[colId] = {};
            const tag = (col.TagControl || col.tagControl || col.tagcontrol || '').toUpperCase();
            if (tag === 'STATUSID') {
              await Promise.all(
                rows.map(async (row) => {
                  const ticketId = row?.TicketID;
                  const cacheKey = `${colId}_${ticketId}`;
                  if (!optionsCache.has(cacheKey)) {
                    const opts = await getColumnOptions(col, ticketId);
                    optionsCache.set(cacheKey, asArray(opts));
                  }
                  result[colId][ticketId] = asArray(optionsCache.get(cacheKey));
                })
              );
            } else {
              const cacheKey = `${colId}_ALL`;
              if (!optionsCache.has(cacheKey)) {
                const opts = await getColumnOptions(col, null);
                optionsCache.set(cacheKey, asArray(opts));
              }
              const colOpts = asArray(optionsCache.get(cacheKey));
              rows.forEach((row) => {
                const ticketId = row?.TicketID;
                result[colId][ticketId] = colOpts;
              });
            }
          })
        );
        columnOptions.value = result;
        debug('Column options loaded', result);
      };

      onMounted(() => {
        loadAllColumnOptions();
      });

      watch(() => props.content?.columns, () => {
        loadAllColumnOptions();
      }, { deep: true });

      watch(() => props.content?.rowData, () => {
        loadAllColumnOptions();
      }, { deep: true });

      // Interval para atualizar células DEADLINE
      let deadlineTimer = null;
      if (!window.gridDeadlineNow) window.gridDeadlineNow = new Date();

      onUnmounted(() => {
        cleanupGrid();
      });

      const onGridReady = (params) => {
        gridApi.value = params.api;
        columnApi.value = params.columnApi;

        // Limpeza antecipada quando a grid está prestes a ser destruída
        addGridListener(params.api, 'gridPreDestroyed', () => {
          cleanupGrid(params.api, params.columnApi);
        });

        // LOG opcional
        if (typeof params.api.getAllColumns === 'function') {
          const allCols = params.api.getAllColumns().map(col => ({
            colId: col.getColId(),
            field: col.getColDef().field,
            headerName: col.getColDef().headerName,
            cellRenderer: col.getColDef().cellRenderer
          }));
          debug('Columns', allCols);
        }

        updateColumnsPosition();
        updateColumnsSort();
        addGridListener(params.api, 'columnMoved', updateColumnsPosition);

        // Impedir mover colunas para posição de pinned
        addGridListener(params.api, 'columnMoved', (event) => {
          if (!params.columnApi || typeof params.columnApi.getAllGridColumns !== 'function') return;
          const allColumns = params.columnApi.getAllGridColumns();
          const firstPinnedIdx = allColumns.findIndex(col => col.getPinned() === 'left');
          if (firstPinnedIdx > 0) {
            const hasNonPinnedBefore = allColumns.slice(0, firstPinnedIdx).some(col => col.getPinned() !== 'left');
            if (hasNonPinnedBefore) {
              const pinnedCols = allColumns.filter(col => col.getPinned() === 'left');
              const nonPinnedCols = allColumns.filter(col => col.getPinned() !== 'left');
              const newOrder = [...pinnedCols, ...nonPinnedCols].map(col => col.getColId());
              params.columnApi.moveColumns(newOrder, 0);
            }
          }
        });

        // Protege colunas pinned
        ['columnPinned','columnMoved','columnVisible','columnEverythingChanged']
          .forEach(evt => addGridListener(params.api, evt, restorePinnedColumns));

        // Bloqueio via JS para headers pinned
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
        ['columnPinned','columnMoved','columnVisible','columnEverythingChanged','bodyScroll','displayedColumnsChanged']
          .forEach(evt => addGridListener(params.api, evt, applyPinnedHeaderBlock));

        safeTimeout(() => { applyPinnedHeaderBlock(); }, 500);

        // Configurar a coluna de seleção para ser sempre a primeira
        if (props.content.rowSelection === 'multiple' && !props.content.disableCheckboxes) {
          // Múltiplas tentativas
          safeTimeout(() => forceSelectionColumnFirst(), 50);
          safeTimeout(() => forceSelectionColumnFirst(), 200);
          safeTimeout(() => forceSelectionColumnFirst(), 500);

          // Observer para detectar mudanças no DOM e reposicionar automaticamente
          safeTimeout(() => {
            const gridElement = agGridRef.value?.$el;
            if (gridElement) {
              const observer = new MutationObserver(() => {
                clearTimeout(observer.debounceTimer);
                observer.debounceTimer = setTimeout(() => {
                  if (isGridAlive()) { forceSelectionColumnFirstDOM(); }
                }, 50);
              });

              observer.observe(gridElement, {
                childList: true,
                subtree: true,
                attributes: false
              });

              // guarda para cleanup
              selectionColumnObserver = observer;
            }
          }, 600);
        }

        // Descobrir colunas DEADLINE
        let deadlineColumns = [];
        if (props.content && props.content.columns && Array.isArray(props.content.columns)) {
          deadlineColumns = props.content.columns
            .filter(col => {
              const tc = col.TagControl || col.tagControl || col.tagcontrol;
              return tc && tc.toUpperCase() === 'DEADLINE';
            })
            .map(col => col.id || col.field)
            .filter(Boolean);
        }
        if (deadlineColumns.length) {
          deadlineTimer = setInterval(() => {
            window.gridDeadlineNow = new Date();
            if (isGridAlive()) {
              gridApi.value.refreshCells({ columns: deadlineColumns, force: true });
            }
          }, 1000);
        }
      };

      function restorePinnedColumns() {
        if (!columnApi.value) return;
        const state = asArray(columnApi.value.getColumnState?.());
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
        // Aplicar somente se a grid estiver viva
        if (isGridAlive()) columnApi.value.applyColumnState?.({ state: newState, applyOrder: true });
      }

      // Função para forçar a coluna de seleção a ser a primeira
      const forceSelectionColumnFirst = () => {
        if (!isGridAlive()) return;

        try {
          const columnState = asArray(gridApi.value.getColumnState?.());
          const selectionColumnIndex = columnState.findIndex(col =>
            col.colId === 'ag-Grid-SelectionColumn'
          );

          if (selectionColumnIndex !== -1) {
            columnState[selectionColumnIndex].pinned = 'left';
            columnState[selectionColumnIndex].suppressSizeToFit = true;
            columnState[selectionColumnIndex].suppressAutoSize = true;

            const selectionColumn = columnState.splice(selectionColumnIndex, 1)[0];
            columnState.unshift(selectionColumn);

            const originalColumns = props.content && props.content.columns ? props.content.columns : [];
            columnState.forEach(colState => {
              const originalCol = originalColumns.find(col => col.id === colState.colId);
              if (originalCol && originalCol.pinned === 'left' && colState.colId !== 'ag-Grid-SelectionColumn') {
                colState.pinned = 'left';
              }
            });

            gridApi.value.applyColumnState?.({ state: columnState, applyOrder: true });
          }
        } catch (error) {}

        // Fallback: DOM
        safeTimeout(() => {
          if (isGridAlive()) forceSelectionColumnFirstDOM();
        }, 100);
      };

      // Função para reposicionar a coluna de seleção diretamente no DOM
      const forceSelectionColumnFirstDOM = () => {
        if (!isGridAlive()) return;

        try {
          const gridElement = agGridRef.value?.$el;
          if (!gridElement) return;

          // Reposicionar headers
          const headerRows = gridElement.querySelectorAll('.ag-header-row');
          headerRows.forEach(headerRow => {
            const selectionHeader = headerRow.querySelector('.ag-header-cell[col-id="ag-Grid-SelectionColumn"]');
            if (selectionHeader && selectionHeader.parentElement === headerRow) {
              headerRow.insertBefore(selectionHeader, headerRow.firstChild);
            }
          });

          // Reposicionar células nas linhas
          const rows = gridElement.querySelectorAll('.ag-row');
          rows.forEach(row => {
            const selectionCell = row.querySelector('.ag-cell[col-id="ag-Grid-SelectionColumn"]');
            if (selectionCell && selectionCell.parentElement === row) {
              row.insertBefore(selectionCell, row.firstChild);
            }
          });
        } catch (error) {}
      };

      watchEffect(() => {
        if (!gridApi.value) return;
        if (props.content.initialFilters) {
          gridApi.value.setFilterModel(props.content.initialFilters);
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
        const state = gridApi.value.getState?.() || {};
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
      const { createElement } = wwLib.wwElement.useCreate();

      const gridComponents = {
        ActionCellRenderer,
        ImageCellRenderer,
        WewebCellRenderer,
        FormatterCellRenderer,
        ListCellEditor,
        FixedListCellEditor,
        DateTimeCellEditor,
        DateTimeFilter,
        ResponsibleUserCellEditor,
        ResponsibleUserCellRenderer,
      };
      /* wwEditor:end */

      function updateColumnsPosition() {
        if (!gridApi.value) return;
        const allColumns = Array.isArray(gridApi.value.getAllGridColumns?.())
          ? gridApi.value.getAllGridColumns?.()
          : [];
        const positions = allColumns.map((col, idx) => ({
          FieldID: col?.getColDef?.().id,
          PositionField: idx + 1,
          IsDeleted: false
        })).filter(col => col?.FieldID);
        setColumnsPosition(asArray(positions));
      }

      function updateColumnsSort() {
        if (!columnApi.value) return;
        const state = asArray(columnApi.value.getColumnState?.());
        const sortArray = state
          .filter(col => col?.sort)
          .map(col => ({
            id: col.colId,
            isASC: col.sort === 'asc'
          }));
        setColumnsSort(asArray(sortArray));
      }

      const onFirstDataRendered = () => {
        updateColumnsPosition();
        updateColumnsSort();

        // Garantir que a coluna de seleção esteja na primeira posição
        if (props.content.rowSelection === 'multiple' && !props.content.disableCheckboxes) {
          safeTimeout(() => forceSelectionColumnFirst(), 10);
          safeTimeout(() => forceSelectionColumnFirst(), 100);
          safeTimeout(() => forceSelectionColumnFirst(), 300);
          // Força reposicionamento no DOM como backup
          safeTimeout(() => forceSelectionColumnFirstDOM(), 400);
        }
      };

      onMounted(() => {
        safeTimeout(() => {
          if (gridApi.value && typeof gridApi.value.getAllColumns === 'function') {
            const allCols = gridApi.value.getAllColumns().map(col => ({
              colId: col.getColId(),
              field: col.getColDef().field,
              headerName: col.getColDef().headerName,
              cellRenderer: col.getColDef().cellRenderer
            }));
            debug('Mounted columns', allCols);
          }
        }, 2000); // Espera 2 segundos para garantir que a grid montou
      });

      // --- Lazy load de opções ao abrir o editor (corrige listas vazias no publish) ---
      const onCellEditingStarted = async (event) => {
        try {
          const colDef = event.column.getColDef?.() || {};
          const colId = colDef.colId || colDef.field;
          if (!colId) return;

          const ticketId = event.data?.TicketID ?? '__ALL__';
          const already =
            Array.isArray(columnOptions.value?.[colId]?.[ticketId]) &&
            columnOptions.value[colId][ticketId].length > 0;

          if (already) return;

          const opts = await getColumnOptions(colDef, event.data?.TicketID || null);
          columnOptions.value = {
            ...(columnOptions.value || {}),
            [colId]: {
              ...(columnOptions.value?.[colId] || {}),
              [ticketId]: opts
            }
          };
          debug('Lazy options for', colId, ticketId, opts?.length || 0);

          gridApi.value?.refreshCells({
            rowNodes: [event.node],
            columns: [colDef.field || colDef.colId],
            force: true
          });
        } catch (e) {
          debug('onCellEditingStarted error', e?.message || e);
        }
      };

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
        columnOptions,
        getRowId,
        localeText: computed(() => {
          let lang = 'en-US';
          try {
            if (window.wwLib && window.wwLib.wwVariable && typeof window.wwLib.wwVariable.getValue === 'function') {
              const v = window.wwLib.wwVariable.getValue('aa44dc4c-476b-45e9-a094-16687e063342');
              if (typeof v === 'string' && v.length > 0) lang = v;
            }
          } catch (e) {}
          let base;
          switch (lang) {
            case 'pt-BR':
            case 'pt':
              base = AG_GRID_LOCALE_PT;
              break;
            case 'fr':
            case 'fr-FR':
              base = AG_GRID_LOCALE_FR;
              break;
            case 'de':
            case 'de-DE':
              base = AG_GRID_LOCALE_DE;
              break;
            case 'es':
            case 'es-ES':
              base = AG_GRID_LOCALE_ES;
              break;
            case 'en-US':
            default:
              base = AG_GRID_LOCALE_EN;
          }
          const overrides = {
            'pt-BR': { equals: 'Igual', greaterThan: 'Depois', lessThan: 'Antes', inRange: 'Entre' },
            'pt': { equals: 'Igual', greaterThan: 'Depois', lessThan: 'Antes', inRange: 'Entre' },
            'fr': { equals: 'Égal', greaterThan: 'Après', lessThan: 'Avant', inRange: 'Entre' },
            'fr-FR': { equals: 'Égal', greaterThan: 'Après', lessThan: 'Avant', inRange: 'Entre' },
            'de': { equals: 'Gleich', greaterThan: 'Nach', lessThan: 'Vor', inRange: 'Zwischen' },
            'de-DE': { equals: 'Gleich', greaterThan: 'Nach', lessThan: 'Vor', inRange: 'Zwischen' },
            'es': { equals: 'Igual', greaterThan: 'Después', lessThan: 'Antes', inRange: 'Entre' },
            'es-ES': { equals: 'Igual', greaterThan: 'Después', lessThan: 'Antes', inRange: 'Entre' },
            default: { equals: 'Equals', greaterThan: 'After', lessThan: 'Before', inRange: 'Between' },
          };
          return { ...base, ...(overrides[lang] || overrides.default) };
        }),
        /* wwEditor:start */
        createElement,
        /* wwEditor:end */
        onFirstDataRendered,
        gridComponents,
        safeTimeout, // exposto para uso em watchers via this.safeTimeout
        popupParent,
        onCellEditingStarted,
      };
    },
    computed: {
      rowData() {
        const data = wwLib.wwUtils.getDataFromCollection(this.content.rowData);
        if (Array.isArray(data)) return data ?? [];
        if (data && typeof data === 'object') return Object.values(data);
        return [];
      },
      defaultColDef() {
        return {
          editable: false,
          resizable: this.content.resizableColumns,
        };
      },
      finalColumnDefs() {
        const columns = Array.isArray(this.columnDefs) ? this.columnDefs : [];
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
          const tagControl = (colCopy.TagControl || colCopy.tagControl || colCopy.tagcontrol || '').toUpperCase();
          const identifier = (colCopy.FieldDB || '').toUpperCase();
          const context = {
            ...(colCopy.context || {}),
            FieldDB: colCopy.FieldDB,
            TagControl: tagControl,
            id: colCopy.id,
          };
          const commonProperties = {
            minWidth,
            ...(width ? { width } : {}),
            ...(isFlex ? { flex } : {}),
            ...(maxWidth ? { maxWidth } : {}),
            pinned: colCopy.pinned === "none" ? false : colCopy.pinned,
            hide: !!colCopy.hide,
            editable: !!colCopy.editable,
            context,
            ...(colCopy.pinned === 'left' ? { lockPinned: true, lockPosition: true } : {}),
          };

          const colId = colCopy.id || colCopy.field;
          const fieldKey = colCopy.field || colCopy.id;
          const getDsOptions = params => {
            const ticketId = params?.data?.TicketID;
            const colOpts = this.columnOptions?.[colId] || {};
            return Array.isArray(colOpts?.[ticketId]) ? colOpts[ticketId] : [];
          };

          // Se o filtro for agListColumnFilter, usar o filtro customizado
          if (colCopy.filter === 'agListColumnFilter') {
            const isResponsible =
              tagControl === 'RESPONSIBLEUSERID' || identifier === 'RESPONSIBLEUSERID';
            const result = {
              ...commonProperties,
              colId,

              headerName: colCopy.headerName,
              field: fieldKey,
              sortable: colCopy.sortable,
              filter: isResponsible
                ? ResponsibleUserFilterRenderer
                : ListFilterRenderer,
              cellRenderer: isResponsible
                ? ResponsibleUserCellRenderer
                : FormatterCellRenderer,
              cellRendererParams: {
                useCustomFormatter: colCopy.useCustomFormatter,
                formatter: colCopy.formatter,
              }
            };
            const optionsArr = Array.isArray(colCopy.options)
              ? colCopy.options
              : Array.isArray(colCopy.listOptions)
                ? colCopy.listOptions
                : (typeof colCopy.listOptions === 'string'
                  ? colCopy.listOptions.split(',').map(s => s.trim()).filter(Boolean)
                  : null);
            if (isResponsible) {
              if (colCopy.editable) {
                result.editable = true;
                if (optionsArr && optionsArr.length) {
                  result.cellEditor = ResponsibleUserCellEditor;
                  result.cellEditorParams = { options: optionsArr };
                } else {
                  result.cellEditor = ResponsibleUserCellEditor;
                  result.cellEditorParams = params => ({ options: getDsOptions(params) });
                }
              }
              const baseRendererParams = result.cellRendererParams;
              result.cellRendererParams = params => ({
                ...(typeof baseRendererParams === 'function'
                  ? baseRendererParams(params)
                  : baseRendererParams),
                options: optionsArr || getDsOptions(params),
              });
              return result;
            }
            if (
              colCopy.cellDataType === 'list' ||
              (tagControl && tagControl.toUpperCase() === 'LIST')
            ) {
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
                  result.cellEditorParams = params => ({ options: getDsOptions(params) });
                  const baseRendererParams = result.cellRendererParams;
                  result.cellRendererParams = params => ({
                    ...(typeof baseRendererParams === 'function'
                      ? baseRendererParams(params)
                      : baseRendererParams),
                    options: getDsOptions(params),
                  });
                }
              } else {
                const baseRendererParams = result.cellRendererParams;
                result.cellRendererParams = params => ({
                  ...(typeof baseRendererParams === 'function'
                    ? baseRendererParams(params)
                    : baseRendererParams),
                  options: optionsArr || getDsOptions(params),
                });
              }
            }
            if (colCopy.dataSource && colCopy.editable) {
              result.editable = true;
              result.cellEditor = tagControl === 'RESPONSIBLEUSERID' ? ResponsibleUserCellEditor : FixedListCellEditor;
              result.cellEditorParams = params => ({ options: getDsOptions(params) });
              const baseRendererParams = result.cellRendererParams;
              result.cellRendererParams = params => ({
                ...(typeof baseRendererParams === 'function'
                  ? baseRendererParams(params)
                  : baseRendererParams),
                options: getDsOptions(params),
              });
            }
            return result;
          }

          switch (colCopy.cellDataType) {
            case "action": {
              return {
                ...commonProperties,
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
                colId,

                headerName: colCopy.headerName,
                field: fieldKey,
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
                colId,

                headerName: colCopy.headerName,
                field: fieldKey,
                cellRenderer: "ImageCellRenderer",
                cellRendererParams: {
                  width: colCopy.imageWidth,
                  height: colCopy.imageHeight,
                },
              };
            }
            case "list":
            {
              const getDsOptions = params => {
                const ticketId = params?.data?.TicketID;
                const colOpts = this.columnOptions?.[colId] || {};
                return Array.isArray(colOpts?.[ticketId]) ? colOpts[ticketId] : [];
              };

              const staticOptions = Array.isArray(colCopy.options)
                ? colCopy.options
                : Array.isArray(colCopy.listOptions)
                  ? colCopy.listOptions
                  : (typeof colCopy.listOptions === 'string'
                    ? colCopy.listOptions.split(',').map(s => s.trim()).filter(Boolean)
                    : null);

              const isResponsible =
                tagControl === 'RESPONSIBLEUSERID' || identifier === 'RESPONSIBLEUSERID';

              const result = {
                ...commonProperties,
                colId,

                headerName: colCopy.headerName,
                field: fieldKey,
                sortable: colCopy.sortable,
                filter: isResponsible
                  ? ResponsibleUserFilterRenderer
                  : ListFilterRenderer,
                cellRenderer: isResponsible
                  ? ResponsibleUserCellRenderer
                  : FormatterCellRenderer,
                cellRendererParams: {
                  useCustomFormatter: colCopy.useCustomFormatter,
                  formatter: colCopy.formatter,
                },
                editable: false,
                cellEditor:
                  staticOptions && staticOptions.length
                    ? ListCellEditor
                    : (isResponsible ? ResponsibleUserCellEditor : FixedListCellEditor),
              };
              if (staticOptions && staticOptions.length) {
                result.options = staticOptions;
                result.cellEditorParams = { options: staticOptions };
                result.cellRendererParams = {
                  ...result.cellRendererParams,
                  options: staticOptions,
                };
              } else {
                result.cellEditorParams = params => ({ options: getDsOptions(params) });
                const baseRendererParams = result.cellRendererParams;
                result.cellRendererParams = params => ({
                  ...(typeof baseRendererParams === 'function'
                    ? baseRendererParams(params)
                    : baseRendererParams),
                  options: getDsOptions(params),
                });
              }
              if (colCopy.editable) {
                result.editable = true;
              }
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
                colId,

                headerName: colCopy.headerName,
                field: fieldKey,
                sortable: colCopy.sortable,
                filter: colCopy.filter,
              };
              // Filtro de lista dinâmico
              if (colCopy.filter === 'agListColumnFilter') {
                result.filter =
                  tagControl === 'RESPONSIBLEUSERID' || identifier === 'RESPONSIBLEUSERID'
                    ? ResponsibleUserFilterRenderer
                    : ListFilterRenderer;
              }
              // Custom formatter
              if (colCopy.useCustomFormatter) {
                result.cellRenderer = tagControl === 'RESPONSIBLEUSERID' ? ResponsibleUserCellRenderer : FormatterCellRenderer;
                result.cellRendererParams = {
                  useCustomFormatter: true,
                  formatter: colCopy.formatter
                };
              }
              // Style array
              else if (colCopy.useStyleArray) {
                result.cellRenderer = tagControl === 'RESPONSIBLEUSERID' ? ResponsibleUserCellRenderer : FormatterCellRenderer;
                result.cellRendererParams = {
                  useCustomFormatter: false,
                  useStyleArray: true,
                  styleArray: this.content.cellStyleArray
                };
              }

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
              if (colCopy.headerAlign) {
                result.headerClass = `ag-header-align-${colCopy.headerAlign}`;
              }

              if (tagControl === 'RESPONSIBLEUSERID' || identifier === 'RESPONSIBLEUSERID') {
                result.cellRenderer = ResponsibleUserCellRenderer;
                if (colCopy.editable) {
                  result.cellEditor = ResponsibleUserCellEditor;
                  result.cellEditorParams = params => ({ options: getDsOptions(params) });
                }
                const baseRendererParams = result.cellRendererParams;
                result.cellRendererParams = params => ({
                  ...(typeof baseRendererParams === 'function' ? baseRendererParams(params) : baseRendererParams),
                  options: getDsOptions(params),
                });
              }

              if (tagControl === 'DATE' || colCopy.cellDataType === 'date' || colCopy.cellDataType === 'dateString') {
                const comparator = (filterDate, cellValue) => {
                  if (!cellValue) return -1;
                  let cellDate;
                  if (cellValue instanceof Date) {
                    cellDate = cellValue;
                  } else if (typeof cellValue === 'string') {
                    const match = cellValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
                    if (match) {
                      cellDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
                    } else {
                      const parsed = new Date(cellValue);
                      if (isNaN(parsed.getTime())) return -1;
                      cellDate = parsed;
                    }
                  } else {
                    cellDate = new Date(cellValue);
                  }

                  if (isNaN(cellDate.getTime())) return -1;
                  const cellOnlyDate = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());
                  return cellOnlyDate.getTime() - filterDate.getTime();
                };
                result.filter = 'agDateColumnFilter';
                result.filterParams = {
                  comparator,
                  filterOptions: ['equals', 'greaterThan', 'lessThan', 'inRange'],
                  suppressAndOrCondition: true,
                  dateComponent: DateTimeFilter,
                };
                if (colCopy.editable) {
                  result.cellEditor = DateTimeCellEditor;
                }
                const lang = window.wwLib?.wwVariable?.getValue('aa44dc4c-476b-45e9-a094-16687e063342') || navigator.language;
                result.valueFormatter = params => {
                  if (!params.value) return '';
                  try {
                    const d = new Date(params.value);
                    if (!isNaN(d.getTime())) {
                      return new Intl.DateTimeFormat(lang, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
                    }
                  } catch (e) {
                    return params.value;
                  }
                  return params.value || '';
                };
                delete result.valueParser;
              }

              if (tagControl === 'DEADLINE') {
                const comparator = (filterDate, cellValue) => {
                  if (!cellValue) return -1;
                  const cellDate = new Date(cellValue);
                  if (isNaN(cellDate.getTime())) return -1;
                  const cellOnlyDate = new Date(
                    cellDate.getFullYear(),
                    cellDate.getMonth(),
                    cellDate.getDate()
                  );
                  return cellOnlyDate.getTime() - filterDate.getTime();
                };
                result.filter = 'agDateColumnFilter';
                result.filterParams = {
                  comparator,
                  filterOptions: ['equals', 'greaterThan', 'lessThan', 'inRange'],
                  suppressAndOrCondition: true,
                  dateComponent: DateTimeFilter,
                  showTime: true,
                };
                delete result.cellDataType;

                if (colCopy.editable) {
                  result.cellEditor = DateTimeCellEditor;

                  result.valueFormatter = params => {
                    if (typeof params.value === 'string' && params.value) {
                      try {
                        const date = new Date(params.value);
                        if (!isNaN(date.getTime())) {
                          const pad = n => n.toString().padStart(2, '0');
                          return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
                        }
                      } catch (e) {
                        return params.value;
                      }
                    }
                    if (params.value instanceof Date && !isNaN(params.value.getTime())) {
                      const pad = n => n.toString().padStart(2, '0');
                      return `${params.value.getFullYear()}-${pad(params.value.getMonth() + 1)}-${pad(params.value.getDate())} ${pad(params.value.getHours())}:${pad(params.value.getMinutes())}:${pad(params.value.getSeconds())}`;
                    }
                    return params.value || '';
                  };
                  delete result.valueParser;
                }

                result.cellRenderer = params => {
                  function normalizeDeadline(val) {
                    if (!val) return '';
                    let dateStr = val;
                    if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
                      return val;
                    }
                    if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?/.test(val) && !/[\+\-]\d{2}$/.test(val)) {
                      dateStr = val.replace(' ', 'T');
                      return dateStr;
                    }
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
                const optionsArr = Array.isArray(colCopy.options)
                  ? colCopy.options
                  : Array.isArray(colCopy.listOptions)
                    ? colCopy.listOptions
                    : (typeof colCopy.listOptions === 'string'
                      ? colCopy.listOptions.split(',').map(s => s.trim()).filter(Boolean)
                      : null);
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
                    result.cellEditor = tagControl === 'RESPONSIBLEUSERID' ? ResponsibleUserCellEditor : FixedListCellEditor;
                    result.cellEditorParams = params => ({ options: getDsOptions(params) });
                    const baseRendererParams = result.cellRendererParams;
                    result.cellRendererParams = params => ({
                      ...(typeof baseRendererParams === 'function'
                        ? baseRendererParams(params)
                        : baseRendererParams),
                      options: getDsOptions(params),
                    });
                  }
                } else {
                  const baseRendererParams = result.cellRendererParams;
                  result.cellRendererParams = params => ({
                    ...(typeof baseRendererParams === 'function'
                      ? baseRendererParams(params)
                      : baseRendererParams),
                    options: optionsArr || getDsOptions(params),
                  });
                }
              }
              if (colCopy.dataSource && colCopy.editable) {
                result.editable = true;
                result.cellEditor = tagControl === 'RESPONSIBLEUSERID' ? ResponsibleUserCellEditor : FixedListCellEditor;
                result.cellEditorParams = params => ({ options: getDsOptions(params) });
                const baseRendererParams = result.cellRendererParams;
                result.cellRendererParams = params => ({
                  ...(typeof baseRendererParams === 'function'
                    ? baseRendererParams(params)
                    : baseRendererParams),
                  options: getDsOptions(params),
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
          backgroundColor: this.content.rowBackgroundColor,
          rowHoverColor: this.content.rowHoverColor,
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
        if (this.gridApi && !(this.gridApi.isDestroyed && this.gridApi.isDestroyed())) {
          this.gridApi.deselectAll();
        }
      },
      resetFilters() {
        if (this.gridApi && !(this.gridApi.isDestroyed && this.gridApi.isDestroyed())) {
          this.gridApi.setFilterModel(null);
        }
      },
      setFilters(filters) {
        if (this.gridApi && !(this.gridApi.isDestroyed && this.gridApi.isDestroyed())) {
          this.gridApi.setFilterModel(filters || null);
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
        const tag = (
          colDef.context?.TagControl ||
          colDef.TagControl ||
          colDef.tagControl ||
          colDef.tagcontrol ||
          ''
        ).toUpperCase();
        const identifier = (colDef.context?.FieldDB || colDef.FieldDB || '').toUpperCase();
        const colId = colDef.colId || colDef.field;
        const fieldKey = colDef.field || colDef.colId;

        if (tag === 'RESPONSIBLEUSERID' || identifier === 'RESPONSIBLEUSERID') {
          const colOpts = this.columnOptions?.[colId] || {};
          const ticketId = event.data?.TicketID;
          const opts = ticketId != null ? (Array.isArray(colOpts[ticketId]) ? colOpts[ticketId] : []) : [];
          const match = opts.find(o => String(o.value) === String(event.newValue));
          if (match) {
            if (event.data) {
              event.data.ResponsibleUser = match.label || event.data.ResponsibleUser;
              if (match.photo || match.image || match.img) {
                event.data.PhotoUrl = match.photo || match.image || match.img;
              } else {
                event.data.PhotoUrl = '';
              }
            }
            if (this.gridApi && !(this.gridApi.isDestroyed && this.gridApi.isDestroyed()) && event.node) {
              this.gridApi.refreshCells({
                rowNodes: [event.node],
                columns: [fieldKey],
                force: true
              });
            }
          }
        }
        if (tag === 'DEADLINE') {
          if (event.node && fieldKey) {
            const v = event.newValue;
            event.node.setDataValue(fieldKey, v);

            if (this.gridApi && !(this.gridApi.isDestroyed && this.gridApi.isDestroyed())) {
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
        if (!event || !event.data) return;

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
            fieldDB
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
        if (this.gridApi && !(this.gridApi.isDestroyed && this.gridApi.isDestroyed())) {
          this.gridApi.deselectAll();
        }
        this.setSelectedRows([]);
        this.$nextTick(() => {
          if (this.gridApi && !(this.gridApi.isDestroyed && this.gridApi.isDestroyed())) {
            this.gridApi.deselectAll();
          }
        });
      },
      forceClearSelection() {
        const gridElement = this.$refs.agGridRef?.$el;
        if (gridElement) {
          const checkboxes = gridElement.querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.indeterminate = false;
          });

          this.setSelectedRows([]);

          if (this.gridApi && !(this.gridApi.isDestroyed && this.gridApi.isDestroyed())) {
            this.gridApi.deselectAll();
          }
        }
      },
      /* wwEditor:end */
      isColumnMovable(params) {
        if (params.column.getColId() === 'ag-Grid-SelectionColumn') {
          return false;
        }
        if (params.column.getPinned() === 'left' || params.column.getPinned() === 'right') {
          return false;
        }
        const colDef = params.column.getColDef();
        if (colDef && (colDef.pinned === 'left' || colDef.pinned === 'right')) {
          return false;
        }
        const field = colDef.field;
        const colsArr = Array.isArray(this.content.columns)
          ? this.content.columns
          : Object.values(this.content.columns || {});
        const columnConfig = colsArr.find(col => col.field === field);
        if (columnConfig && columnConfig.draggable === false) {
          return false;
        }
        return this.content.movableColumns;
      }
    },
    /* wwEditor:start */
    watch: {
      columnDefs: {
        async handler() {
          if (this.wwEditorState?.boundProps?.columns) return;
          if (this.gridApi && !(this.gridApi.isDestroyed && this.gridApi.isDestroyed())) {
            this.gridApi.resetColumnState();
          }

          if (this.wwEditorState.isACopy) return;

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
          if (newValue !== oldValue && this.gridApi && !(this.gridApi.isDestroyed && this.gridApi.isDestroyed())) {
            this.$nextTick(() => {
              if (newValue === 'multiple' && !this.content.disableCheckboxes) {
                this.safeTimeout(() => { this.forceSelectionColumnFirst(); }, 100);
                this.safeTimeout(() => { this.forceSelectionColumnFirstDOM(); }, 300);
              }
            });
          }
        },
        immediate: false,
      },
      // Watch selectedRows to sync visual state when cleared
      selectedRows: {
        handler(newValue) {
          if (this.gridApi && !(this.gridApi.isDestroyed && this.gridApi.isDestroyed()) && Array.isArray(newValue) && newValue.length === 0) {
            this.safeTimeout(() => {
              if (this.gridApi && !(this.gridApi.isDestroyed && this.gridApi.isDestroyed())) {
                this.gridApi.deselectAll();
              }
            }, 100);

            this.safeTimeout(() => {
              const gridElement = this.$refs.agGridRef?.$el;
              if (gridElement) {
                const checkboxes = gridElement.querySelectorAll('.ag-selection-checkbox input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                  checkbox.checked = false;
                });

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
        if (this.gridApi && !(this.gridApi.isDestroyed && this.gridApi.isDestroyed())) {
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

      .ag-header-checkbox,
      .ag-checkbox {
        margin: 0 auto !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        width: auto !important;
        height: auto !important;
      }

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

      .ag-selection-checkbox {
        margin-top: 10px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        height: 100% !important;
      }
    }

    :deep(.ag-pinned-left-cols-container) {

      .ag-header-cell[col-id="ag-Grid-SelectionColumn"],
      .ag-cell[col-id="ag-Grid-SelectionColumn"] {
        position: sticky !important;
        left: 0 !important;
        z-index: 5 !important;
      }
    }

    :deep(.ag-header-cell[col-id="ag-Grid-SelectionColumn"]:hover) {
      background-color: inherit !important;
    }

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

    :deep(.ag-header-cell.ag-pinned-left):not([col-id="ag-Grid-SelectionColumn"]) {
      order: -1 !important;
    }

    :deep(.ag-row .ag-cell.ag-pinned-left):not([col-id="ag-Grid-SelectionColumn"]) {
      order: -1 !important;
    }

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

    // Inputs de edição
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
      box-shadow: none !important;
      border: 1px solid #888 !important;
      box-sizing: border-box !important;
      line-height: 1.2 !important;
      margin: 0 !important;
      align-self: center !important;
      resize: none !important;
      background: #fff !important;
      vertical-align: middle !important;
      outline: none !important;
      transition: none !important;
    }

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
      box-shadow: none !important;
      border: 1px solid #888 !important;
      box-sizing: border-box !important;
      line-height: 1.2 !important;
      margin: 0 !important;
      align-self: center !important;
      resize: none !important;
      background: #fff !important;
      vertical-align: middle !important;
      outline: none !important;
      transition: none !important;
    }

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

  :deep(.ag-filter-select) {
    min-width: 120px;
  }

  :deep(.ag-picker-options) {
    min-width: 120px;
  }

  :deep(.ag-paging-panel),
  :deep(.ag-paging-panel *),
  :deep(.ag-pager),
  :deep(.ag-pager *),
  :deep(.ag-pagination),
  :deep(.ag-pagination *) {
    font-family: 'Roboto', Arial, sans-serif !important;
    font-size: 12px !important;
  }

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
    justify-content: center !important;
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

  :deep(.ag-cell-edit-wrapper),
:deep(.ag-popup-editor) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 100% !important;
  box-sizing: border-box !important;
}

/* Inputs dentro do editor com altura coerente à linha */
:deep(.ag-popup-editor input),
:deep(.ag-popup-editor select),
:deep(.ag-popup-editor textarea) {
  height: 26px !important;
  min-height: 26px !important;
  max-height: 26px !important;
  line-height: 1.2 !important;
}
</style>
