export const DEFAULT_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
    xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
    xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
    xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
    id="Definitions_1"
    targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="Primeira tarefa">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="Fim">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="Shape_StartEvent" bpmnElement="StartEvent_1">
        <dc:Bounds x="150" y="100" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Shape_Task" bpmnElement="Task_1">
        <dc:Bounds x="230" y="78" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Shape_EndEvent" bpmnElement="EndEvent_1">
        <dc:Bounds x="380" y="100" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Edge_Flow_1" bpmnElement="Flow_1">
        <di:waypoint x="186" y="118"/>
        <di:waypoint x="230" y="118"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Edge_Flow_2" bpmnElement="Flow_2">
        <di:waypoint x="330" y="118"/>
        <di:waypoint x="380" y="118"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

export default {
    options: {
        lazyHydrate: true,
        linkable: false,
        displayAllowedValues: ['block', 'flex', 'inline-block'],
    },
    editor: {
        label: {
            en: 'BPMN Tool',
            pt: 'Ferramenta BPMN',
        },
        icon: 'account_tree',
        bubble: {
            icon: 'account_tree',
        },
        customSettingsPropertiesOrder: [
            'diagramXml',
            'autoFitOnLoad',
            'readOnly',
            'enableKeyboardShortcuts',
            'allowFileImports',
            'allowExports',
            'height',
            'backgroundColor',
            'borderColor',
            'textColor',
            'canvasBackgroundColor',
            'toolbarBackgroundColor',
            'toolbarBorderColor',
            'groupBackgroundColor',
            'groupBorderColor',
            'buttonBackgroundColor',
            'buttonBorderColor',
            'buttonTextColor',
            'buttonHoverBackgroundColor',
            'buttonHoverBorderColor',
            'buttonDisabledBackgroundColor',
            'statusBackgroundColor',
            'statusBorderColor',
            'statusTextColor',
            'statusErrorBackgroundColor',
            'statusErrorBorderColor',
            'statusErrorTextColor',
            'overlayBackgroundColor',
            'overlayTextColor',
            'elementFillColor',
            'elementStrokeColor',
            'connectionColor',
            'connectionHoverColor',
            'connectionLabelColor',
        ],
    },
    triggerEvents: [
        {
            name: 'onReady',
            label: { en: 'When ready', pt: 'Quando estiver pronto' },
            event: {
                xml: '',
            },
        },
        {
            name: 'onDiagramChanged',
            label: { en: 'On diagram change', pt: 'Ao alterar diagrama' },
            event: {
                xml: '',
            },
        },
        { 
            name: 'onElementClick',
            label: { en: 'On element click', pt: 'Ao clicar em elemento' },
            event: {
                id: '',
                type: '',
                name: '',
                documentation: '',
            },
        },
        {
            name: 'onCustomMenuClick',
            label: { en: 'On custom menu click', pt: 'Ao clicar no menu personalizado' },
            event: {
                id: '',
                type: '',
                name: '',
                documentation: '',
            },
        },
        {
            name: 'onElementClick',
            label: { en: 'On element click', pt: 'Ao clicar em elemento' },
            event: {
                id: '',
                type: '',
                name: '',
                documentation: '',
            },
        },
        {
            name: 'onExport',
            label: { en: 'On export', pt: 'Ao exportar' },
            event: {
                xml: '',
                svg: '',
            },
        },
        {
            name: 'onError',
            label: { en: 'On error', pt: 'Ao ocorrer erro' },
            event: {
                message: '',
            },
        },
    ],
    properties: {
        diagramXml: {
            label: { en: 'Initial BPMN XML', pt: 'XML BPMN inicial' },
            type: 'Text',
            defaultValue: DEFAULT_BPMN_XML,
            bindable: true,
            section: 'settings',
            options: {
                mode: 'xml',
                rows: 12,
            },
            /* wwEditor:start */
            bindingValidation: {
                type: ['string'],
                tooltip: 'XML completo de um diagrama BPMN 2.0.',
            },
            propertyHelp: {
                tooltip: 'Cole aqui o XML exportado do modelador BPMN ou deixe o exemplo padrão.',
            },
            /* wwEditor:end */
        },
        autoFitOnLoad: {
            label: { en: 'Fit viewport on load', pt: 'Centralizar ao carregar' },
            type: 'OnOff',
            defaultValue: true,
            bindable: true,
            section: 'settings',
        },
        readOnly: {
            label: { en: 'Read-only viewer', pt: 'Modo somente leitura' },
            type: 'OnOff',
            defaultValue: false,
            bindable: true,
            section: 'settings',
        },
        enableKeyboardShortcuts: {
            label: { en: 'Keyboard shortcuts', pt: 'Atalhos de teclado' },
            type: 'OnOff',
            defaultValue: true,
            bindable: true,
            section: 'settings',
        },
        allowFileImports: {
            label: { en: 'Allow XML imports', pt: 'Permitir importação XML' },
            type: 'OnOff',
            defaultValue: true,
            bindable: true,
            section: 'settings',
        },
        allowExports: {
            label: { en: 'Allow exports (XML/SVG/PNG)', pt: 'Permitir exportações (XML/SVG/PNG)' },
            type: 'OnOff',
            defaultValue: true,
            bindable: true,
            section: 'settings',
        },
        height: {
            label: { en: 'Canvas height', pt: 'Altura do canvas' },
            type: 'Length',
            defaultValue: '640px',
            bindable: true,
            section: 'style',
        },
        backgroundColor: {
            label: { en: 'Background color', pt: 'Cor de fundo' },
            type: 'Color',
            defaultValue: '#0f172a',
            bindable: true,
            section: 'style',
        },
        borderColor: {
            label: { en: 'Border color', pt: 'Cor da borda' },
            type: 'Color',
            defaultValue: '#1e293b',
            bindable: true,
            section: 'style',
        },
        textColor: {
            label: { en: 'Text color', pt: 'Cor do texto' },
            type: 'Color',
            defaultValue: '#e2e8f0',
            bindable: true,
            section: 'style',
        },
        canvasBackgroundColor: {
            label: { en: 'Canvas background', pt: 'Fundo do canvas' },
            type: 'Color',
            defaultValue: '#0f172a',
            bindable: true,
            section: 'style',
        },
        toolbarBackgroundColor: {
            label: { en: 'Toolbar background', pt: 'Fundo da barra' },
            type: 'Color',
            defaultValue: '#111827',
            bindable: true,
            section: 'style',
        },
        toolbarBorderColor: {
            label: { en: 'Toolbar border', pt: 'Borda da barra' },
            type: 'Color',
            defaultValue: '#1e293b',
            bindable: true,
            section: 'style',
        },
        groupBackgroundColor: {
            label: { en: 'Group background', pt: 'Fundo do grupo' },
            type: 'Color',
            defaultValue: '#0b1220',
            bindable: true,
            section: 'style',
        },
        groupBorderColor: {
            label: { en: 'Group border', pt: 'Borda do grupo' },
            type: 'Color',
            defaultValue: '#1f2937',
            bindable: true,
            section: 'style',
        },
        buttonBackgroundColor: {
            label: { en: 'Button background', pt: 'Fundo do botão' },
            type: 'Color',
            defaultValue: '#1f2937',
            bindable: true,
            section: 'style',
        },
        buttonBorderColor: {
            label: { en: 'Button border', pt: 'Borda do botão' },
            type: 'Color',
            defaultValue: '#334155',
            bindable: true,
            section: 'style',
        },
        buttonTextColor: {
            label: { en: 'Button text', pt: 'Texto do botão' },
            type: 'Color',
            defaultValue: '#e2e8f0',
            bindable: true,
            section: 'style',
        },
        buttonHoverBackgroundColor: {
            label: { en: 'Button hover background', pt: 'Fundo do botão (hover)' },
            type: 'Color',
            defaultValue: '#2563eb',
            bindable: true,
            section: 'style',
        },
        buttonHoverBorderColor: {
            label: { en: 'Button hover border', pt: 'Borda do botão (hover)' },
            type: 'Color',
            defaultValue: '#2563eb',
            bindable: true,
            section: 'style',
        },
        buttonDisabledBackgroundColor: {
            label: { en: 'Button disabled background', pt: 'Fundo do botão desabilitado' },
            type: 'Color',
            defaultValue: '#111827',
            bindable: true,
            section: 'style',
        },
        statusBackgroundColor: {
            label: { en: 'Status background', pt: 'Fundo do status' },
            type: 'Color',
            defaultValue: '#0b1220',
            bindable: true,
            section: 'style',
        },
        statusBorderColor: {
            label: { en: 'Status border', pt: 'Borda do status' },
            type: 'Color',
            defaultValue: '#1f2937',
            bindable: true,
            section: 'style',
        },
        statusTextColor: {
            label: { en: 'Status text', pt: 'Texto do status' },
            type: 'Color',
            defaultValue: '#a5b4fc',
            bindable: true,
            section: 'style',
        },
        statusErrorBackgroundColor: {
            label: { en: 'Error background', pt: 'Fundo de erro' },
            type: 'Color',
            defaultValue: '#2d0c0c',
            bindable: true,
            section: 'style',
        },
        statusErrorBorderColor: {
            label: { en: 'Error border', pt: 'Borda de erro' },
            type: 'Color',
            defaultValue: '#7f1d1d',
            bindable: true,
            section: 'style',
        },
        statusErrorTextColor: {
            label: { en: 'Error text', pt: 'Texto de erro' },
            type: 'Color',
            defaultValue: '#fca5a5',
            bindable: true,
            section: 'style',
        },
        overlayBackgroundColor: {
            label: { en: 'Overlay background', pt: 'Fundo da sobreposição' },
            type: 'Color',
            defaultValue: 'rgba(15, 23, 42, 0.75)',
            bindable: true,
            section: 'style',
        },
        overlayTextColor: {
            label: { en: 'Overlay text', pt: 'Texto da sobreposição' },
            type: 'Color',
            defaultValue: '#e2e8f0',
            bindable: true,
            section: 'style',
        },
        elementFillColor: {
            label: { en: 'Element fill', pt: 'Preenchimento dos elementos' },
            type: 'Color',
            defaultValue: '#ffffff',
            bindable: true,
            section: 'style',
        },
        elementStrokeColor: {
            label: { en: 'Element stroke', pt: 'Borda dos elementos' },
            type: 'Color',
            defaultValue: '#000000',
            bindable: true,
            section: 'style',
        },
        connectionColor: {
            label: { en: 'Connection color', pt: 'Cor das linhas' },
            type: 'Color',
            defaultValue: '#000000',
            bindable: true,
            section: 'style',
        },
        connectionHoverColor: {
            label: { en: 'Connection hover/selected', pt: 'Linha (hover/selecionada)' },
            type: 'Color',
            defaultValue: '#2563eb',
            bindable: true,
            section: 'style',
        },
        connectionLabelColor: {
            label: { en: 'Connection label', pt: 'Texto das conexões' },
            type: 'Color',
            defaultValue: '#0f172a',
            bindable: true,
            section: 'style',
        },
    },
};
