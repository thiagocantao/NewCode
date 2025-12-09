<template>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
  <div class="dropdown-wrapper" ref="wrapperRef">
    <UserSelector
      :datasource="content.userDatasource"
      :group-by="content.groupBy"
      :name-font-family="content.nameFontFamily"
      :name-font-size="content.nameFontSize"
      :name-font-weight="content.nameFontWeight"
      :initial-font-family="content.initialFontFamily"
      :initial-font-size="content.initialFontSize"
      :initial-font-weight="content.initialFontWeight"
      :input-font-family="content.inputFontFamily"
      :input-font-size="content.inputFontSize"
      :input-font-weight="content.inputFontWeight"
      :unassigned-label="content.unassignedLabel"
      :search-placeholder="content.searchPlaceholder"
      :initial-group-id="content.initialGroupId"
      :initial-selected-id="content.initialSelectedId"
      :selected-user-id="selectedUserId"
      :max-width="content.maxWidth"
      :group-list-height="content.groupListHeight"
      :user-list-height="content.userListHeight"
      :group-click-behavior="content.groupClickBehavior"
      :dropdown-list-max-height="content.dropdownListMaxHeight"
      :table-name="content.tableName"
      :column-name="content.columnName"
      :supabase-url="content.supabaseUrl"
      :api-key="content.apiKey"
      :auth-token="content.authToken"
      :filter-query="content.filterQuery"
      @user-selected="onUserSelected"
      @trigger-event="onTriggerEvent"
    />

    <!-- Input fantasma (participa do submit/validação do Form Container) -->
    <!-- required DINÂMICO: só fica required enquanto inválido -->
    <input
      ref="hiddenInput"
      type="text"
      :name="wwElementState.name || 'responsibleField'"
      :value="formValueString"
      :required="!!content.required && !isValid"
      :aria-required="!!content.required"
      :aria-invalid="errorPopupVisible ? 'true' : 'false'"
      tabindex="-1"
      class="fake-input"
      @invalid.prevent="onInvalidShowPopup"
      @input="onFakeInput"
    />

    <!-- Popup de erro custom -->
    <div
      v-if="errorPopupVisible"
      class="error-popup"
      role="alert"
      :style="popupStyle"
    >
      <span class="material-symbols-outlined error-popup__icon">priority_high</span>
      <span class="error-popup__text">{{ effectiveRequiredMessage }}</span>
      <span class="error-popup__arrow"></span>
    </div>
  </div>
</template>

<script>
import UserSelector from './components/UserSelector.vue';
import { computed, nextTick } from 'vue';

export default {
  components: { UserSelector },
  props: {
    content: { type: Object, required: true },
    wwElementState: { type: Object, required: true },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
    uid: { type: String, required: true },
  },
  inject: { useForm: { from: '_wwForm:useForm', default: null } },
  emits: ['update:content:effect', 'update:content', 'element-event', 'user-selected'],
  data() {
    return {
      selectedUserId: '',
      selectedGroupId: '',

      // popup
      errorPopupVisible: false,
      popupLeft: 0,
      popupTop: -8,
      popupTimer: null,

      // wwLib vars
      _selectedUserIdRef: null,
      _selectedGroupIdRef: null,
      _formValueRef: null,
      _setSelectedUserId: null,
      _setSelectedGroupId: null,
      _setFormValue: null,
      _unregister: null,
    };
  },
  computed: {
    effectiveRequiredMessage() {
      return this.content.requiredMessage || 'Preencha este campo.';
    },
    popupStyle() {
      return { left: this.popupLeft + 'px', top: this.popupTop + 'px' };
    },
    // === Normalização e validade ===
    isValid() {
      const u = this.normalizeId(this.selectedUserId);
      const g = this.normalizeId(this.selectedGroupId);
      return !!(u || g);
    },
    formValueString() {
      if (!this.isValid) return '';
      const u = this.normalizeId(this.selectedUserId);
      const g = this.normalizeId(this.selectedGroupId);
      return `${g || ''}|${u || ''}`;
    },
    popupDurationMs() {
      const n = Number(this.content?.requiredPopupDuration);
      return Number.isFinite(n) && n > 0 ? n : 2400;
    },
  },
  created() {
    // === Variáveis de componente (opcionais para workflow) ===
    if (typeof wwLib !== 'undefined' && wwLib.wwVariable?.useComponentVariable) {
      const userVar = wwLib.wwVariable.useComponentVariable({ uid: this.uid, name: 'selectedUserId', type: 'text', defaultValue: '' });
      this._selectedUserIdRef = userVar.value;
      this._setSelectedUserId = userVar.setValue;
      this.selectedUserId = userVar.value.value || '';

      const groupVar = wwLib.wwVariable.useComponentVariable({ uid: this.uid, name: 'selectedGroupId', type: 'text', defaultValue: '' });
      this._selectedGroupIdRef = groupVar.value;
      this._setSelectedGroupId = groupVar.setValue;
      this.selectedGroupId = groupVar.value.value || '';

      const formValueVar = wwLib.wwVariable.useComponentVariable({ uid: this.uid, name: 'formValueForSubmit', type: 'text', defaultValue: '' });
      this._formValueRef = formValueVar.value;
      this._setFormValue = formValueVar.setValue;
      this._setFormValue(this.formValueString);

      this.$watch(() => this._selectedUserIdRef.value, (v) => {
        this.selectedUserId = this.normalizeId(v);
        this._setFormValue?.(this.formValueString);
      });
      this.$watch(() => this._selectedGroupIdRef.value, (v) => {
        this.selectedGroupId = this.normalizeId(v);
        this._setFormValue?.(this.formValueString);
      });
    }

    // === Registro no Form Container ===
    if (this.useForm && typeof this.useForm === 'function') {
      // Usamos computed diretamente — sempre coerente com o estado atual
      const modelRef = computed(() => this.formValueString);

      const fieldName = computed(() => this.wwElementState.name || 'responsibleField');

      const validationFn = () => {
        if (!this.content?.required) return true;
        if (!this.isValid) { this.showErrorPopup(); return this.effectiveRequiredMessage; }
        this.hideErrorPopup(); return true;
      };

      this._unregister = this.useForm(
        modelRef,
        { fieldName, validation: validationFn, initialValue: '' },
        { elementState: this.wwElementState, emit: this.$emit, sidepanelFormPath: 'form' }
      );
    }

    // Sempre que o valor unificado mudar, sincronia com o input nativo
    this.$watch(() => this.formValueString, () => {
      this.syncHiddenInputValidity();
      if (this.isValid) this.hideErrorPopup();
      this._setFormValue?.(this.formValueString);
    });
  },
  mounted() {
    // Aplica valores iniciais
    if (!this.selectedUserId && this.content.initialSelectedId) {
      this._setSelectedUserId?.(this.content.initialSelectedId);
      this.selectedUserId = this.content.initialSelectedId;
    }
    if (!this.selectedGroupId && this.content.initialGroupId) {
      this._setSelectedGroupId?.(this.content.initialGroupId);
      this.selectedGroupId = this.content.initialGroupId;
    }
    this._setFormValue?.(this.formValueString);
    this.syncHiddenInputValidity();
  },
  beforeUnmount() {
    if (typeof this._unregister === 'function') this._unregister();
    this.clearPopupTimer();
  },
  methods: {
    // Normaliza ids (null/undefined/'null'/'undefined'/espaços => '')
    normalizeId(v) {
      if (v === null || v === undefined) return '';
      const s = String(v).trim();
      if (!s) return '';
      const low = s.toLowerCase();
      if (low === 'null' || low === 'undefined') return '';
      return s;
    },

    onUserSelected(payload) {
      let nextUserId = '';
      let nextGroupId = '';

      if (payload && typeof payload === 'object') {
        if (
          'userId' in payload ||
          'groupId' in payload ||
          'userid' in payload ||
          'groupid' in payload
        ) {
          nextUserId = this.normalizeId(payload.userId ?? payload.userid);
          nextGroupId = this.normalizeId(payload.groupId ?? payload.groupid);
        } else if (payload.type === 'user') {
          nextUserId = this.normalizeId(payload.id);
          nextGroupId = '';
        } else if (payload.type === 'group') {
          nextGroupId = this.normalizeId(payload.id);
          nextUserId = '';
        } else if ('id' in payload) {
          // fallback: tratar como user
          nextUserId = this.normalizeId(payload.id);
          nextGroupId = '';
        }
      } else {
        nextUserId = this.normalizeId(payload);
        nextGroupId = '';
      }

      this._setSelectedUserId?.(nextUserId);
      this._setSelectedGroupId?.(nextGroupId);
      this.selectedUserId  = nextUserId;
      this.selectedGroupId = nextGroupId;

      // Sincroniza
      this.syncHiddenInputValidity();
      if (this.isValid) this.hideErrorPopup();

      this.$emit('user-selected', { userId: this.selectedUserId, groupId: this.selectedGroupId });
    },

    onTriggerEvent(evt) { this.$emit('trigger-event', evt); },

    onFakeInput() {
      this.syncHiddenInputValidity();
      if (this.isValid) this.hideErrorPopup();
    },

    onInvalidShowPopup() {
      this.syncHiddenInputValidity();
      this.showErrorPopup();
    },

    // Mantém o input nativo coerente com a validade atual
    syncHiddenInputValidity() {
      const el = this.$refs.hiddenInput;
      if (!el) return;

      const newVal = this.formValueString || '';
      if (el.value !== newVal) {
        el.value = newVal;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // liga/desliga o required no DOM (além do binding reativo)
      if (this.content?.required && !this.isValid) {
        el.setAttribute('required', 'required');
        el.setCustomValidity(this.effectiveRequiredMessage);
      } else {
        el.removeAttribute('required');
        el.setCustomValidity('');
      }
    },

    // Popup
    async showErrorPopup() {
      await nextTick();
      this.popupLeft = 0;
      this.popupTop = -8;
      this.errorPopupVisible = true;
      this.clearPopupTimer();
      this.popupTimer = setTimeout(this.hideErrorPopup, this.popupDurationMs);
    },
    hideErrorPopup() { this.errorPopupVisible = false; this.clearPopupTimer(); },
    clearPopupTimer() { if (this.popupTimer) { clearTimeout(this.popupTimer); this.popupTimer = null; } },
  },
};
</script>

<style>
.dropdown-wrapper { position: relative; }
.fake-input {
  background: transparent; border: 0; bottom: -1px; font-size: 0; height: 1px;
  left: 0; outline: none; padding: 0; position: absolute; right: 0; width: 100%;
}
/* Popup estilo balão */
.error-popup {
  position: absolute; transform: translateY(-100%); z-index: 1000;
  display: inline-flex; align-items: center; gap: 8px;
  background: #ffff; border: 1px solid #aaaaaa; border-radius: 4px;
  padding: 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,.12);
  font-size: 13px; line-height: 1.2; color: #4b4b4b; pointer-events: none;
}
.error-popup__icon { font-size: 17px !important; color: #ffffff; background: #fc8404; padding: 3px 3px; line-height: 1; border-radius: 2px;}
.error-popup__text { white-space: nowrap; }
.error-popup__arrow {
  position: absolute; bottom: -7px; left: 14px; width: 0; height: 0;
  border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 7px solid #aaaaaa;
}
.error-popup__arrow::after {
  content: ""; position: absolute; left: -6px; bottom: 1px; width: 0; height: 0;
  border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #ffffff;
}
</style>
