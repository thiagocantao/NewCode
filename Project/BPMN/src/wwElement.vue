<template>
    <div class="bpmn-tool" :style="wrapperStyle" :class="{ '-readonly': readOnly }">
        <div class="bpmn-tool__toolbar" v-if="showToolbar">
            <div class="bpmn-tool__group">
                <button
                    class="bpmn-tool__button"
                    type="button"
                    :disabled="!allowImports || isLoading"
                    @click="triggerFilePicker"
                >
                    <span class="material-symbols-outlined">upload_file</span>
                    <span>Importar XML</span>
                </button>
                <button class="bpmn-tool__button" type="button" :disabled="isLoading" @click="resetDiagram">
                    <span class="material-symbols-outlined">refresh</span>
                    <span>Resetar</span>
                </button>
            </div>

            <div class="bpmn-tool__group">
                <button class="bpmn-tool__icon" type="button" :disabled="isLoading || !canUndo" @click="undo">
                    <span class="material-symbols-outlined">undo</span>
                </button>
                <button class="bpmn-tool__icon" type="button" :disabled="isLoading || !canRedo" @click="redo">
                    <span class="material-symbols-outlined">redo</span>
                </button>
            </div>

            <div class="bpmn-tool__group">
                <button class="bpmn-tool__icon" type="button" :disabled="isLoading" @click="zoomOut">
                    <span class="material-symbols-outlined">zoom_out</span>
                </button>
                <span class="bpmn-tool__zoom">{{ Math.round(zoomLevel * 100) }}%</span>
                <button class="bpmn-tool__icon" type="button" :disabled="isLoading" @click="zoomIn">
                    <span class="material-symbols-outlined">zoom_in</span>
                </button>
                <button class="bpmn-tool__button" type="button" :disabled="isLoading" @click="fitViewport">
                    <span class="material-symbols-outlined">crop_free</span>
                    <span>Centralizar</span>
                </button>
            </div>

            <div class="bpmn-tool__group" v-if="allowExports">
                <button class="bpmn-tool__button" type="button" :disabled="isLoading" @click="downloadXml">
                    <span class="material-symbols-outlined">download</span>
                    <span>XML</span>
                </button>
                <button class="bpmn-tool__button" type="button" :disabled="isLoading" @click="downloadSvg">
                    <span class="material-symbols-outlined">image</span>
                    <span>SVG</span>
                </button>
                <button class="bpmn-tool__button" type="button" :disabled="isLoading" @click="downloadPng">
                    <span class="material-symbols-outlined">photo_camera</span>
                    <span>PNG</span>
                </button>
            </div>
        </div>

        <div ref="canvasRef" class="bpmn-tool__canvas" :class="{ '-loading': isLoading }"></div>

        <input
            v-if="allowImports"
            ref="fileInputRef"
            class="bpmn-tool__file-input"
            type="file"
            accept=".bpmn,.xml,text/xml"
            @change="onFileSelected"
        />

        <div v-if="isLoading" class="bpmn-tool__overlay">
            <span class="material-symbols-outlined spin">progress_activity</span>
            <span>Carregando modelador BPMN...</span>
        </div>

        <div v-if="errorMessage" class="bpmn-tool__status -error">
            {{ errorMessage }}
        </div>
        <div v-else-if="statusMessage" class="bpmn-tool__status">
            {{ statusMessage }}
        </div>
    </div>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { DEFAULT_BPMN_XML } from '../ww-config';

const BPMN_SCRIPT_URL = 'https://unpkg.com/bpmn-js@11.5.0/dist/bpmn-modeler.production.min.js';
const BPMN_STYLE_URLS = [
    'https://unpkg.com/bpmn-js@11.5.0/dist/assets/diagram-js.css',
    'https://unpkg.com/bpmn-js@11.5.0/dist/assets/bpmn-font/css/bpmn.css',
    'https://unpkg.com/bpmn-js@11.5.0/dist/assets/bpmn-font/css/bpmn-codes.css',
    'https://unpkg.com/bpmn-js@11.5.0/dist/assets/bpmn-font/css/bpmn-embedded.css',
];

let bpmnLoaderPromise = null;

function ensureStyles() {
    if (typeof document === 'undefined') return;

    BPMN_STYLE_URLS.forEach((href, index) => {
        const id = `bpmn-style-${index}`;
        if (document.getElementById(id)) return;

        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    });
}

function loadBpmnModeler() {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('BPMN modeler not available in SSR.'));
    }
    if (window.BpmnJS) {
        ensureStyles();
        return Promise.resolve(window.BpmnJS);
    }
    if (bpmnLoaderPromise) {
        return bpmnLoaderPromise;
    }

    ensureStyles();

    bpmnLoaderPromise = new Promise((resolve, reject) => {
        const existingScript = document.getElementById('bpmn-js-script');
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(window.BpmnJS));
            existingScript.addEventListener('error', reject);
            return;
        }

        const script = document.createElement('script');
        script.id = 'bpmn-js-script';
        script.src = BPMN_SCRIPT_URL;
        script.async = true;
        script.onload = () => resolve(window.BpmnJS);
        script.onerror = () => reject(new Error('Não foi possível carregar a biblioteca bpmn-js.'));
        document.head.appendChild(script);
    });

    return bpmnLoaderPromise;
}

function disableModeling(eventBus, commandStack, palette, contextPad) {
    const preventCommand = event => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        return false;
    };

    if (palette?.toggle) {
        palette.toggle(false);
    }

    if (contextPad?.registerProvider) {
        contextPad.registerProvider('readOnly', {
            getContextPadEntries: () => ({}),
        });
    }

    eventBus.on('commandStack.execute', preventCommand);
    eventBus.on('commandStack.changed', preventCommand);
    commandStack.canExecute = () => false;
}
disableModeling.$inject = ['eventBus', 'commandStack', 'palette', 'contextPad'];

const readOnlyModule = {
    __init__: ['disableModeling'],
    disableModeling,
};

function downloadBlob(data, filename, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

export default {
    name: 'BpmnTool',
    props: {
        content: { type: Object, required: true },
        wwElementState: { type: Object, required: true },
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
        uid: { type: String, required: true },
    },
    emits: ['trigger-event'],
    setup(props, { emit }) {
        const canvasRef = ref(null);
        const fileInputRef = ref(null);
        const modeler = ref(null);
        const isLoading = ref(true);
        const errorMessage = ref('');
        const statusMessage = ref('');
        const zoomLevel = ref(1);
        const canUndo = ref(false);
        const canRedo = ref(false);
        const lastXml = ref(props.content.diagramXml || DEFAULT_BPMN_XML);
        const pendingSave = ref(null);
        const readyEmitted = ref(false);

        const allowImports = computed(() => props.content.allowFileImports !== false);
        const allowExports = computed(() => props.content.allowExports !== false);
        const showToolbar = computed(() => props.wwElementState?.props?.isFixed !== true);
        const readOnly = computed(() => !!props.content.readOnly);
        const wrapperStyle = computed(() => ({
            height: props.content.height || '640px',
        }));

        const { setValue: setDiagramXml } =
            wwLib?.wwVariable?.useComponentVariable?.({
                uid: props.uid,
                name: 'diagramXml',
                type: 'text',
                defaultValue: lastXml.value,
            }) || {};

        const resetStatus = () => {
            statusMessage.value = '';
            errorMessage.value = '';
        };

        const emitError = message => {
            errorMessage.value = message;
            emit('trigger-event', {
                name: 'onError',
                event: { message },
            });
        };

        const emitReady = xml => {
            emit('trigger-event', {
                name: 'onReady',
                event: { xml },
            });
        };

        const emitDiagramChanged = xml => {
            emit('trigger-event', {
                name: 'onDiagramChanged',
                event: { xml },
            });
        };

        const emitExported = (xml, svg = '') => {
            emit('trigger-event', {
                name: 'onExport',
                event: { xml, svg },
            });
        };

        const updateHistoryState = () => {
            if (!modeler.value) return;
            const commandStack = modeler.value.get('commandStack');
            canUndo.value = commandStack.canUndo();
            canRedo.value = commandStack.canRedo();
        };

        const importDiagram = async xml => {
            if (!modeler.value) return;
            try {
                resetStatus();
                await modeler.value.importXML(xml);
                lastXml.value = xml;
                updateHistoryState();
                if (props.content.autoFitOnLoad !== false) {
                    await fitViewport();
                }
                zoomLevel.value = modeler.value.get('canvas').zoom();
                statusMessage.value = 'Diagrama carregado';
                if (!readyEmitted.value) {
                    emitReady(xml);
                    readyEmitted.value = true;
                }
            } catch (error) {
                emitError(error?.message || 'Erro ao carregar diagrama BPMN.');
            }
        };

        const refreshZoom = () => {
            if (!modeler.value) return;
            zoomLevel.value = modeler.value.get('canvas').zoom();
        };

        const handleCommandStackChange = () => {
            if (pendingSave.value) {
                clearTimeout(pendingSave.value);
            }
            pendingSave.value = setTimeout(async () => {
                if (!modeler.value) return;
                try {
                    const { xml } = await modeler.value.saveXML({ format: true });
                    lastXml.value = xml;
                    setDiagramXml?.(xml);
                    emitDiagramChanged(xml);
                } catch (error) {
                    emitError(error?.message || 'Não foi possível salvar o XML.');
                } finally {
                    updateHistoryState();
                    refreshZoom();
                }
            }, 250);
        };

        const buildModeler = async () => {
            isLoading.value = true;
            resetStatus();

            if (modeler.value) {
                modeler.value.destroy();
                modeler.value = null;
            }

            try {
                const BpmnModeler = await loadBpmnModeler();
                modeler.value = new BpmnModeler({
                    container: canvasRef.value,
                    keyboard: props.content.enableKeyboardShortcuts === false ? null : { bindTo: window },
                    additionalModules: readOnly.value ? [readOnlyModule] : undefined,
                });

                modeler.value.on('commandStack.changed', handleCommandStackChange);
                modeler.value.on('import.done', updateHistoryState);

                await importDiagram(lastXml.value || DEFAULT_BPMN_XML);
            } catch (error) {
                emitError(error?.message || 'Não foi possível iniciar o modelador BPMN.');
            } finally {
                isLoading.value = false;
            }
        };

        const rebuildModeler = async () => {
            await buildModeler();
        };

        const triggerFilePicker = () => {
            if (!allowImports.value || !fileInputRef.value) return;
            fileInputRef.value.value = '';
            fileInputRef.value.click();
        };

        const onFileSelected = event => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async e => {
                const xml = e.target.result;
                lastXml.value = xml || DEFAULT_BPMN_XML;
                await importDiagram(lastXml.value);
            };
            reader.onerror = () => emitError('Não foi possível ler o arquivo XML.');
            reader.readAsText(file);
        };

        const undo = () => {
            if (!modeler.value) return;
            modeler.value.get('commandStack').undo();
            updateHistoryState();
            refreshZoom();
        };

        const redo = () => {
            if (!modeler.value) return;
            modeler.value.get('commandStack').redo();
            updateHistoryState();
            refreshZoom();
        };

        const zoomIn = () => {
            if (!modeler.value) return;
            const canvas = modeler.value.get('canvas');
            canvas.zoom(canvas.zoom() + 0.1);
            refreshZoom();
        };

        const zoomOut = () => {
            if (!modeler.value) return;
            const canvas = modeler.value.get('canvas');
            canvas.zoom(Math.max(0.2, canvas.zoom() - 0.1));
            refreshZoom();
        };

        const fitViewport = async () => {
            if (!modeler.value) return;
            const canvas = modeler.value.get('canvas');
            canvas.zoom('fit-viewport', 'auto');
            refreshZoom();
        };

        const resetDiagram = async () => {
            lastXml.value = props.content.diagramXml || DEFAULT_BPMN_XML;
            await importDiagram(lastXml.value);
        };

        const downloadXml = async () => {
            if (!allowExports.value || !modeler.value) return;
            try {
                const { xml } = await modeler.value.saveXML({ format: true });
                downloadBlob(xml, 'diagram.bpmn', 'application/xml');
                emitExported(xml);
            } catch (error) {
                emitError(error?.message || 'Falha ao exportar XML.');
            }
        };

        const downloadSvg = async () => {
            if (!allowExports.value || !modeler.value) return;
            try {
                const { svg } = await modeler.value.saveSVG();
                downloadBlob(svg, 'diagram.svg', 'image/svg+xml');
                emitExported(lastXml.value, svg);
            } catch (error) {
                emitError(error?.message || 'Falha ao exportar SVG.');
            }
        };

        const downloadPng = async () => {
            if (!allowExports.value || !modeler.value) return;
            try {
                const { svg } = await modeler.value.saveSVG();
                const image = new Image();
                const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(svgBlob);

                image.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = image.width;
                    canvas.height = image.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(image, 0, 0);
                    canvas.toBlob(blob => {
                        if (blob) {
                            downloadBlob(blob, 'diagram.png', 'image/png');
                            emitExported(lastXml.value, svg);
                        }
                        URL.revokeObjectURL(url);
                    });
                };

                image.onerror = () => {
                    URL.revokeObjectURL(url);
                    emitError('Falha ao converter SVG para PNG.');
                };

                image.src = url;
            } catch (error) {
                emitError(error?.message || 'Falha ao exportar PNG.');
            }
        };

        onMounted(buildModeler);

        onBeforeUnmount(() => {
            if (pendingSave.value) {
                clearTimeout(pendingSave.value);
            }
            if (modeler.value) {
                modeler.value.destroy();
                modeler.value = null;
            }
        });

        watch(
            () => props.content.diagramXml,
            newValue => {
                if (!newValue || newValue === lastXml.value) return;
                lastXml.value = newValue;
                importDiagram(newValue);
            },
        );

        watch(
            () => [props.content.readOnly, props.content.enableKeyboardShortcuts],
            () => rebuildModeler(),
        );

        return {
            canvasRef,
            fileInputRef,
            isLoading,
            errorMessage,
            statusMessage,
            zoomLevel,
            canUndo,
            canRedo,
            allowImports,
            allowExports,
            showToolbar,
            wrapperStyle,
            readOnly,
            triggerFilePicker,
            onFileSelected,
            undo,
            redo,
            zoomIn,
            zoomOut,
            fitViewport,
            resetDiagram,
            downloadXml,
            downloadSvg,
            downloadPng,
        };
    },
};
</script>

<style lang="scss" scoped>
.bpmn-tool {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    overflow: hidden;
    color: #e2e8f0;
}

.bpmn-tool__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 10px;
    background: #111827;
    border-bottom: 1px solid #1e293b;
    z-index: 2;
}

.bpmn-tool__group {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #0b1220;
    padding: 6px;
    border: 1px solid #1f2937;
    border-radius: 6px;
}

.bpmn-tool__button,
.bpmn-tool__icon {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #1f2937;
    color: #e2e8f0;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.1s ease;
}

.bpmn-tool__icon {
    width: 36px;
    height: 36px;
    justify-content: center;
}

.bpmn-tool__button:hover,
.bpmn-tool__icon:hover {
    background: #2563eb;
    border-color: #2563eb;
}

.bpmn-tool__button:disabled,
.bpmn-tool__icon:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #111827;
}

.bpmn-tool__zoom {
    min-width: 50px;
    text-align: center;
    font-weight: 600;
}

.bpmn-tool__canvas {
    flex: 1;
    min-height: 320px;
    background: #0f172a;
    position: relative;
}

.bpmn-tool__canvas.-loading {
    filter: blur(2px);
}

.bpmn-tool__overlay {
    position: absolute;
    inset: 0;
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.75);
    color: #e2e8f0;
    font-weight: 600;
    z-index: 3;
}

.bpmn-tool__overlay .spin {
    animation: spin 1s linear infinite;
}

.bpmn-tool__file-input {
    display: none;
}

.bpmn-tool__status {
    padding: 8px 12px;
    font-size: 13px;
    background: #0b1220;
    border-top: 1px solid #1f2937;
    color: #a5b4fc;
}

.bpmn-tool__status.-error {
    color: #fca5a5;
    background: #2d0c0c;
    border-top-color: #7f1d1d;
}

.bpmn-tool.-readonly :deep(.djs-palette) {
    display: none !important;
}

.bpmn-tool.-readonly :deep(.djs-context-pad) {
    display: none !important;
}

.bpmn-tool.-readonly {
    pointer-events: auto;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
</style>
