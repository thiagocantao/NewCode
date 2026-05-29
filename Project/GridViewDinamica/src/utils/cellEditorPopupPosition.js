const DEFAULT_POPUP_HEIGHT = 340;
const MIN_USABLE_SPACE = 220;
const POPUP_MARGIN = 12;

function getElementRect(element) {
  if (!element || typeof element.getBoundingClientRect !== 'function') return null;
  const rect = element.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.bottom === 0)) {
    return null;
  }
  return rect;
}

function findGridViewport(cellElement) {
  if (!cellElement || typeof cellElement.closest !== 'function') return null;
  return (
    cellElement.closest('.ag-body-viewport') ||
    cellElement.closest('.ag-center-cols-viewport') ||
    cellElement.closest('.ag-root-wrapper-body') ||
    cellElement.closest('.ag-root-wrapper') ||
    cellElement.closest('.ww-datagrid')
  );
}

function getViewportRect(cellElement) {
  const gridViewport = findGridViewport(cellElement);
  const gridRect = getElementRect(gridViewport);
  const windowTop = 0;
  const windowBottom = window.innerHeight || document.documentElement?.clientHeight || 0;

  if (!gridRect) {
    return { top: windowTop, bottom: windowBottom };
  }

  return {
    top: Math.max(gridRect.top, windowTop),
    bottom: Math.min(gridRect.bottom, windowBottom),
  };
}

function getCellElement(params) {
  return params?.eGridCell || params?.event?.target?.closest?.('.ag-cell') || null;
}

function estimatePopupHeight(editorGui) {
  const popupElement = getPopupElement(editorGui) || editorGui;
  const rect = getElementRect(popupElement);
  const measuredHeight = Math.max(
    rect?.height || 0,
    popupElement?.scrollHeight || 0,
    popupElement?.offsetHeight || 0,
    editorGui?.scrollHeight || 0,
    editorGui?.offsetHeight || 0
  );

  return measuredHeight > 0 ? measuredHeight : DEFAULT_POPUP_HEIGHT;
}

function getPopupElement(editorGui) {
  if (!editorGui || typeof editorGui.closest !== 'function') return null;
  return (
    editorGui.closest('.ag-popup-editor') ||
    editorGui.closest('.ag-popup-child') ||
    editorGui.parentElement
  );
}

export function shouldOpenCellEditorPopupAbove(params, editorGui) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  const cellElement = getCellElement(params);
  const cellRect = getElementRect(cellElement);
  if (!cellRect) return false;

  const viewportRect = getViewportRect(cellElement);
  const popupHeight = estimatePopupHeight(editorGui);
  const spaceBelow = viewportRect.bottom - cellRect.bottom;
  const spaceAbove = cellRect.top - viewportRect.top;
  const requiredSpaceBelow = Math.min(popupHeight + POPUP_MARGIN, MIN_USABLE_SPACE);

  return spaceBelow < requiredSpaceBelow && spaceAbove > spaceBelow;
}

export function getCellEditorPopupPosition(params, editorGui) {
  return shouldOpenCellEditorPopupAbove(params, editorGui) ? 'over' : 'under';
}

export function updateCellEditorPopupPosition(params, editorGui) {
  if (!shouldOpenCellEditorPopupAbove(params, editorGui)) return;

  const cellElement = getCellElement(params);
  const cellRect = getElementRect(cellElement);
  const popupElement = getPopupElement(editorGui);
  const popupRect = getElementRect(popupElement || editorGui);
  if (!cellRect || !popupElement || !popupRect) return;

  const viewportRect = getViewportRect(cellElement);
  const desiredTop = Math.max(
    viewportRect.top + POPUP_MARGIN,
    cellRect.top - popupRect.height - POPUP_MARGIN
  );
  const currentTop = parseFloat(popupElement.style.top || '0') || 0;
  const adjustedTop = currentTop + desiredTop - popupRect.top;

  popupElement.style.top = `${Math.round(adjustedTop)}px`;
  popupElement.style.bottom = 'auto';
}

export function scheduleCellEditorPopupPositionUpdate(params, editorGui) {
  updateCellEditorPopupPosition(params, editorGui);

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => updateCellEditorPopupPosition(params, editorGui));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => updateCellEditorPopupPosition(params, editorGui));
    });
    return;
  }

  setTimeout(() => updateCellEditorPopupPosition(params, editorGui), 0);
}
