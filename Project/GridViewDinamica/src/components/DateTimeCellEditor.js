export default class DateTimeCellEditor {
  init(params) {
    this.params = params;
    
    // Create input element
    this.eInput = document.createElement('input');
    this.eInput.type = 'datetime-local';
    this.eInput.style.width = '100%';
    this.eInput.style.height = '100%';
    this.eInput.style.fontSize = '13px';
    this.eInput.style.border = '1px solid #888';
    this.eInput.style.outline = 'none';
    this.eInput.style.padding = '4px';

    // Convert and set initial value
    if (params.value) {
      const convertedValue = this.convertToDateTimeLocal(params.value);
      this.eInput.value = convertedValue;
    }

    // Event handling
    this.eInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        params.api.stopEditing();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        params.api.stopEditing(true);
      }
    });
  }

  convertToDateTimeLocal(value) {
    if (!value) return '';
    
    try {
      let dateStr = value;
      
      // Handle format: "2024-01-15 10:30:00+00"
      if (typeof dateStr === 'string' && dateStr.includes(' ')) {
        dateStr = dateStr.replace(' ', 'T');
        // Remove timezone if present
        dateStr = dateStr.replace(/[\+\-]\d{2}:?\d{0,2}$/, '');
      }
      
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      }
    } catch (e) {
      // Silent error handling
    }
    
    return '';
  }

  getGui() {
    return this.eInput;
  }

  afterGuiAttached() {
    this.eInput.focus();
    this.eInput.select();
  }

  getValue() {
    const value = this.eInput.value;
    
    if (!value) {
      return null;
    }
    
    try {
      // Return ISO string
      const dateObject = new Date(value);
      if (!isNaN(dateObject.getTime())) {
        const isoString = dateObject.toISOString();
        return isoString;
      }
    } catch (e) {
      // Silent error handling
    }
    
    return value;
  }

  isCancelBeforeStart() {
    return false;
  }

  isCancelAfterEnd() {
    return false;
  }

  isValueChanged() {
    const currentValue = this.eInput.value;
    const originalValue = this.params.value;
    const hasChanged = !!currentValue;
    return hasChanged;
  }

  destroy() {
    // Last resort: if ag-grid didn't detect the change, force it manually
    const currentValue = this.eInput?.value;
    const originalValue = this.params?.value;
    
    if (currentValue && (originalValue === null || originalValue === undefined)) {
      try {
        const dateObject = new Date(currentValue);
        if (!isNaN(dateObject.getTime())) {
          const isoString = dateObject.toISOString();
          
          if (this.params?.api && this.params?.node && this.params?.column) {
            const colId = this.params.column.getColId();
            this.params.node.setDataValue(colId, isoString);
            
            this.params.api.refreshCells({
              rowNodes: [this.params.node],
              columns: [colId],
              force: true
            });
          }
        }
      } catch (e) {
        // Silent error handling
      }
    }
  }

  isPopup() {
    return false;
  }
}
