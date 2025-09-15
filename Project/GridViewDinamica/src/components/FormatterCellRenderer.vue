<template>
  <div
    class="formatter-cell"
    v-if="params.useCustomFormatter"
    v-html="formattedValue"
    :style="[cellStyle, pointerStyle]"
  ></div>
  <div class="formatter-cell" v-else :style="[cellStyle, pointerStyle]">
    {{ formattedValue }}
  </div>
</template>
 
<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
  // Função global original
function getRoundedSpanColor(value, colorArray, fieldName, isBold) {

  if (!colorArray || !Array.isArray(colorArray) || !value) return value;
  const matchingStyle = colorArray.find(item => item.Valor === value);
  if (!matchingStyle) return value;
  // O border-radius será definido dinamicamente no formatter
  const borderRadius = fieldName === 'StatusID' ? '4px' : '12px';
  const fontweight = isBold == false ? "" : "font-weight:bold;";
  return `<span style="height:25px; color: ${matchingStyle.CorFonte}; background:${matchingStyle.CorFundo}; border: 1px solid ${matchingStyle.CorFundo}; border-radius: ${borderRadius}; ${fontweight} display: inline-flex; align-items: center; padding: 0 12px;">${value}</span>`;
}

function dateFormatter(dateValue, lang) {
  try {
    if (!dateValue) return '';

    let dateStr = dateValue;

    // Verifica se há hora na string (padrão ISO ou outro)
    const hasTime = /[T\s]\d{2}:\d{2}/.test(dateValue);

    // Se não tem hora, assume meia-noite UTC para evitar erro de fuso
    if (!hasTime) {
      dateStr += 'T00:00:00Z';
    }

    const date = new Date(dateStr);
    const dateOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC'
    };

    return new Intl.DateTimeFormat(lang || 'en', dateOptions).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateValue;
  }
}

function dateTimeFormater(dateValue, lang)
{
  if(dateValue == null || dateValue == "")
  return "";
const isAmerican = window.wwLib?.wwVariable?.getValue('21a41590-e7d8-46a5-af76-bb3542da1df3').toUpperCase() == "AMERICAN";

const dateOptions = {
  timeZone: window.wwLib?.wwVariable?.getValue('7509df4b-d0bc-40c3-a542-bfe0e22f5ec6'),      
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    };
const timeOptions = {
      timeZone: window.wwLib?.wwVariable?.getValue('7509df4b-d0bc-40c3-a542-bfe0e22f5ec6'),
      hour: '2-digit',
      minute: '2-digit',
      hour12: isAmerican
    };
    var newDate = new Date(dateValue);
lang = isAmerican ? "en-us" : "en-gb";

    const datePart = new Intl.DateTimeFormat(lang || 'en', dateOptions).format(new Date(newDate));
    const timePart = new Intl.DateTimeFormat(lang || 'en', timeOptions).format(new Date(newDate.setMinutes(newDate.getMinutes() + window.wwLib?.wwVariable?.getValue('5d9d5372-4189-4152-bb1d-da6800cd0b65'))));

 
    return `${datePart} ${timePart}`;
  
}

export default {
  name: "FormatterCellRenderer",
  props: {
    params: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    // Timer reativo para atualizar a cada segundo
    const now = ref(new Date());
    let timer = null;
    onMounted(() => {
      timer = setInterval(() => {
        now.value = new Date();
      }, 1000); // Atualiza a cada segundo
    });
    onUnmounted(() => {
      if (timer) clearInterval(timer);
    });
    return { now };
  },
  computed: {
    formattedValue() {
      try {
        const rawValue = this.params.value;
        let displayValue = rawValue;

        const fieldKey = this.params.colDef?.colId || this.params.colDef?.field;
        if (fieldKey && this.params.data) {
          const storedLabel = this.params.data[`${fieldKey}__displayLabel`];
          if (storedLabel !== undefined && storedLabel !== null) {
            displayValue = storedLabel;
          }
        }

if (
  this.params.colDef?.TagControl === 'DATETIME' ||
  this.params.colDef?.tagControl === 'DATETIME' ||
  this.params.colDef?.cellDataType === 'dateTime'
)
  return dateTimeFormater(rawValue, "");

        if (Array.isArray(this.params.options)) {
          const match = this.params.options.find(
            opt => String(opt.value) === String(rawValue)
          );
          if (match) displayValue = match.label;
        }
        const tag = (this.params.colDef?.TagControl || this.params.colDef?.tagControl || this.params.colDef?.tagcontrol || '').toString().toUpperCase();
        const identifier = (this.params.colDef?.FieldDB || '').toString().toUpperCase();
        const categoryTags = ['CATEGORYID','SUBCATEGORYID','CATEGORYLEVEL3ID'];
        if (categoryTags.includes(tag) || categoryTags.includes(identifier)) {
          return `<span style="height:25px; color:#303030; background:#c9edf9; border:1px solid #c9edf9; border-radius:12px; font-weight:normal; display:inline-flex; align-items:center; padding:0 12px;">${displayValue}</span>`;
        }
        // DEADLINE: barra proporcional
        if (this.params.colDef?.TagControl === 'DEADLINE' || this.params.colDef?.tagControl === 'DEADLINE') {
          const value = this.params.value;
          if (!value) return '';
          // Parse data DEADLINE
          let dateStr = value;
          if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
            dateStr = value;
          } else if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\+\d{2}/.test(value)) {
            dateStr = value.replace(' ', 'T').replace(/([\+\-]\d{2})$/, '$1:00');
          }
          const deadline = new Date(dateStr);
          if (isNaN(deadline.getTime())) return value;
          // Use o now reativo
          const now = this.now instanceof Date ? this.now : (this.now?.value || new Date());
          const diffMs = deadline - now;
          const diffDays = diffMs / (24 * 60 * 60 * 1000);
          // Faixas
          // limites para a barra de cores
          const yellowThreshold = 5; // dias para trocar de azul para amarelo
          const blueRange = 30; // intervalo em dias para preencher o azul
          const blueLimit = yellowThreshold + blueRange; // 35 dias
          let percent = 0;
          let cor = '#e6ffed';
          let border = '#1b5e20';
          let textColor = '#1b5e20';
          let label = '';
          // Label amigável
          const abs = Math.abs(diffMs);
          const isPast = diffMs < 0;
          if (abs < 60 * 1000) {
            const s = Math.floor(abs / 1000);
            label = `${isPast ? '-' : ''}${s}s`;
          } else if (abs < 60 * 60 * 1000) {
            const m = Math.floor(abs / (60 * 1000));
            label = `${isPast ? '-' : ''}${m}m`;
          } else if (abs < 24 * 60 * 60 * 1000) {
            const h = Math.floor(abs / (60 * 60 * 1000));
            const m = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000));
            label = `${isPast ? '-' : ''}${h}h`;
            if (m > 0) label += ` ${m}m`;
          } else {
            const d = Math.floor(abs / (24 * 60 * 60 * 1000));
            const h = Math.floor((abs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            label = `${isPast ? '-' : ''}${d}d`;
            if (h > 0) label += ` ${h}h`;
          }
          // Lógica de cor e preenchimento
          const safeDiffDays = Number(diffDays);
          let debugLabel = label;
          if (safeDiffDays > yellowThreshold) {
            const capped = Math.min(blueLimit, Math.max(yellowThreshold, safeDiffDays));
            percent = ((capped - yellowThreshold) / blueRange) * 100;
            percent = Math.max(0, Math.min(100, percent));
            cor = '#d0e3ff';
            border = '#1976d2';
            textColor = '#1976d2';
            debugLabel += ' (azul)';
          } else if (safeDiffDays > 0) {
            percent = (safeDiffDays / yellowThreshold) * 100;
            percent = Math.max(0, Math.min(100, percent));
            cor = '#ffe066';
            border = '#b59f00';
            textColor = '#b59f00';
            debugLabel += ' (amarelo)';
          } else {
            percent = 100;
            cor = '#ffdddd';
            border = '#b71c1c';
            textColor = '#b71c1c';
            debugLabel += ' (vermelho)';
          }
          console.log('DEADLINE BAR:', { percent, cor, label: debugLabel, value, diffDays });
          // Barra HTML
          return `
            <div class="deadline-bar-bg" style="width:100%;height:22px;position:relative;background:#f5f5f5;border-radius:8px;overflow:hidden;display:block;">
              <div class="deadline-bar-fill" style="position:absolute;left:0;top:0;height:100%;width:${percent}%;background:${cor};border-radius:8px;transition:width 0.4s;z-index:1;"></div>
              <span class="deadline-label" style="position:absolute;left:0;top:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:13px;color:${textColor};font-weight:bold;z-index:2;">${label}</span>
              <div style="position:absolute;left:0;top:0;width:100%;height:100%;border:1.5px solid ${border};border-radius:8px;pointer-events:none;z-index:3;"></div>
            </div>
          `;
        }
        if (!this.params.formatter) {
          // Check if we should use style array from column config or from the global config
          const styleArray = this.params.useStyleArray ? 
            (this.params.styleArray || []) : // Use column-specific style array if available
            null; // No style array to use

          if (styleArray && Array.isArray(styleArray)) {
            // Defina o raio de acordo com o FieldDB
            let borderRadius = '12px';
            if (this.params.colDef?.FieldDB === 'StatusID') borderRadius = '5px';
            // Função inline para aplicar o raio
            function getRoundedSpanColorWithRadius(matchVal, textVal, colorArray) {
              if (!colorArray || !Array.isArray(colorArray) || !matchVal) return textVal;
              const matchingStyle = colorArray.find(item => item.Valor === matchVal);
              if (!matchingStyle) return textVal;
              return `<span style="height:25px; color: ${matchingStyle.CorFonte}; background:${matchingStyle.CorFundo}; border: 1px solid ${matchingStyle.CorFundo}; border-radius: ${borderRadius}; display: inline-flex; align-items: center; padding: 0 12px;">${textVal}</span>`;
            }
            const styledValue = getRoundedSpanColorWithRadius(rawValue, displayValue, styleArray);
            if (styledValue) return styledValue;
          }
          return displayValue;
        }

        // Create a function from the formatter code with getRoundedSpanColor available
        const formatterFn = new Function(
          'value', 
          'row', 
          'colDef', 
          'getRoundedSpanColor',
          'dateFormatter',
          this.params.formatter
        );

        // Execute the formatter with the cell value, row data, and helper functions
        return formatterFn(
          displayValue,
          this.params.data,
          this.params.colDef,
          getRoundedSpanColor,
          dateFormatter
        );
      } catch (error) {
        console.error('Error in custom formatter:', error);
        return `Error: ${error.message}`;
      }
    },
    isEditable() {
      const editable = this.params.colDef?.editable;
      if (typeof editable === 'function') {
        try {
          return !!editable(this.params);
        } catch (e) {
          return false;
        }
      }
      return !!editable;
    },
    pointerStyle() {
      return this.isEditable ? { cursor: 'pointer' } : {};
    },
    cellStyle() {
      // Get text alignment from column definition if available
      const textAlign = this.params.colDef?.cellStyle?.({})?.textAlign;
      return textAlign ? { textAlign } : {};
    }
  }
};
</script>

<style scoped>
  .formatter-cell {
    height: 100%;
    display: flex;
    align-items: center;
  }
</style>
