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
    },
};
