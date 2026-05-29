const DEFAULT_POPUP_HEIGHT = 340;
const MIN_USABLE_SPACE = 220;
const POPUP_MARGIN = 8;

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

function estimatePopupHeight(editorGui) {
  const rect = getElementRect(editorGui);
  const measuredHeight = Math.max(
    rect?.height || 0,
    editorGui?.scrollHeight || 0,
    editorGui?.offsetHeight || 0
  );

  return measuredHeight > 0 ? measuredHeight : DEFAULT_POPUP_HEIGHT;
}

export function shouldOpenCellEditorPopupAbove(params, editorGui) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  const cellElement = params?.eGridCell || params?.event?.target?.closest?.('.ag-cell');
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
