<template>
  <div class="formatter-cell" v-if="params.useCustomFormatter" v-html="formattedValue" :style="cellStyle"></div>
  <div class="formatter-cell" v-else :style="cellStyle">{{ formattedValue }}</div>
</template>
 
<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
  // Função global original
function getRoundedSpanColor(value, colorArray, fieldName) {

  if (!colorArray || !Array.isArray(colorArray) || !value) return value;
  const matchingStyle = colorArray.find(item => item.Valor === value);
  if (!matchingStyle) return value;
  // O border-radius será definido dinamicamente no formatter
  const borderRadius = fieldName === 'StatusID' ? '4px' : '12px';
  const fontweight = "font-weight:bold;";
  return `<span style="height:25px; color: ${matchingStyle.CorFonte}; background:${matchingStyle.CorFundo}; border: 1px solid ${matchingStyle.CorFundo}; border-radius: ${borderRadius}; ${fontweight} display: inline-flex; align-items: center; padding: 0 12px;">${value}</span>`;
}

function dateFormatter(dateValue, lang) {
  try {
    if (!dateValue) return '';
    const dateOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    };
    const timeOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    const datePart = new Intl.DateTimeFormat(lang || 'en', dateOptions).format(new Date(dateValue));
    const timePart = new Intl.DateTimeFormat(lang || 'en', timeOptions).format(new Date(dateValue));
    return `${datePart} ${timePart}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateValue;
  }
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
          const maxGreen = 30; // dias
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
          if (safeDiffDays > 5) {
            const capped = Math.min(maxGreen, Math.max(5, safeDiffDays));
            percent = ((capped - 5) / (maxGreen - 5)) * 100;
            percent = Math.max(0, Math.min(100, percent));
            cor = '#d0e3ff';
            border = '#1976d2';
            textColor = '#1976d2';
            debugLabel += ' (azul)';
          } else if (safeDiffDays > 0) {
            percent = (safeDiffDays / 5) * 100;
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
            function getRoundedSpanColorWithRadius(value, colorArray) {
              if (!colorArray || !Array.isArray(colorArray) || !value) return value;
              const matchingStyle = colorArray.find(item => item.Valor === value);
              if (!matchingStyle) return value;
              return `<span style="height:25px; color: ${matchingStyle.CorFonte}; background:${matchingStyle.CorFundo}; border: 1px solid ${matchingStyle.CorFundo}; border-radius: ${borderRadius}; display: inline-flex; align-items: center; padding: 0 12px;">${value}</span>`;
            }
            const styledValue = getRoundedSpanColorWithRadius(this.params.value, styleArray);
            if (styledValue) return styledValue;
          }
          return this.params.value;
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
          this.params.value, 
          this.params.data, 
          this.params.colDef,
          getRoundedSpanColor, // Pass the function as the fourth parameter
          dateFormatter // Pass the dateFormatter function as the fifth parameter
        );
      } catch (error) {
        console.error('Error in custom formatter:', error);
        return `Error: ${error.message}`;
      }
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
