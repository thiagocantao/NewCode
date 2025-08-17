<template>
  <div class="attachments">
    <div class="add-section">
      <button type="button" class="upload-button" @click="triggerFileInput">
        <span class="upload-icon">+</span>
      </button>
      <input
        ref="fileInput"
        type="file"
        multiple
        class="hidden-input"
        @change="onFilesSelected"
      />
    </div>

    <div v-for="(file, index) in files" :key="index" class="file-item">
      <template v-if="file.isImage">
        <img
          :src="file.url"
          alt=""
          class="file-preview"
          @click="openModal(index)"
        />
      </template>
      <template v-else>
        <i
          :class="['file-icon', getFileIcon(file.file.name)]"
          @click="openModal(index)"
        ></i>
      </template>
      <div class="file-name">{{ file.file.name }}</div>
      <div class="file-actions">
        <button type="button" class="action-button" @click="downloadFile(file)">
          <i class="material-symbols-outlined">download</i>
        </button>
        <button
          type="button"
          class="action-button"
          @click="removeFile(index)"
        >
          <i class="material-symbols-outlined">delete</i>
        </button>
      </div>
    </div>
  </div>

  <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content" :class="{ 'pdf-viewer': currentFile && currentFile.isPdf }">
      <div class="modal-top-actions">
        <button
          v-if="currentFile && !currentFile.isPdf"
          class="modal-action-button"
          @click="downloadFile(currentFile)"
        >
          <i class="material-symbols-outlined">download</i>
        </button>
        <button class="modal-action-button" @click="closeModal">
          <i class="material-symbols-outlined">close</i>
        </button>
      </div>

      <button
        class="nav-button prev"
        @click="prevFile"
        :disabled="currentIndex === 0"
      >
        <i class="material-symbols-outlined zoom-button">arrow_back_ios</i>
      </button>

      <div class="modal-body">
        <template v-if="currentFile && currentFile.isImage">
          <img
            :src="currentFile.url"
            alt=""
            class="modal-image"
            :style="{ transform: `scale(${zoom})` }"
          />
          <div class="modal-file-name">{{ currentFile.file.name }}</div>
          <div class="zoom-controls">
            <button class="zoom-button" @click="zoomOut">
              <i class="material-symbols-outlined zoom-button">zoom_out</i>
            </button>
            <button class="zoom-button" @click="zoomIn">
              <i class="material-symbols-outlined zoom-button">zoom_in</i>
            </button>
          </div>
        </template>

        <template v-else-if="currentFile && currentFile.isPdf">
          <iframe :src="currentFile.url" class="modal-pdf"></iframe>
          <div class="modal-file-name">{{ currentFile.file.name }}</div>
        </template>

        <template v-else>
          <div class="file-not-viewable">
            <i
              v-if="currentFile"
              :class="['modal-file-icon', getFileIcon(currentFile.file.name)]"
            ></i>
            <p class="no-preview">This file cannot be viewed</p>
          </div>
        </template>
      </div>

      <button
        class="nav-button next"
        @click="nextFile"
        :disabled="currentIndex === files.length - 1"
      >
        <i class="material-symbols-outlined zoom-button">arrow_forward_ios</i>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from "vue";

export default {
  name: "Anexos",
  props: {
    content: { type: Object, required: true },
    wwElementState: { type: Object, required: true },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
    uid: { type: String, required: true },
  },
  emits: ["trigger-event"],
  setup(props, { emit }) {
    const files = ref([]);
    const fileInput = ref(null);
    const isModalOpen = ref(false);
    const currentIndex = ref(0);
    const currentFile = computed(() => files.value[currentIndex.value]);
    const zoom = ref(1);

    // ---- WeWeb Vars (ajuste os IDs conforme seu projeto) ----
    const getVar = (id) => window?.wwLib?.wwVariable?.getValue?.(id);
    const languageVarId = "aa44dc4c-476b-45e9-a094-16687e063342";
    const workspaceVarId = "744511f1-3309-41da-a9fd-0721e7dd2f99";
    const loggedUserVarId = "fc54ab80-1a04-4cfe-a504-793bdcfce5dd";
    const ticketVarId = "7bebd888-f31e-49e7-bef2-4052c8cb6cf5";

    // ---- Component Variable para expor metadados dos anexos ----
    const attachmentsInfo = ref([]);
    let setAttachmentsInfo;
    if (
      typeof wwLib !== "undefined" &&
      wwLib.wwVariable &&
      wwLib.wwVariable.useComponentVariable
    ) {
      const { value, setValue } = wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: "attachmentsInfo",
        type: "array",
        defaultValue: [],
      });
      attachmentsInfo.value = value.value;
      setAttachmentsInfo = setValue;
    }

    // ---- Supabase via plugins do WeWeb ----
    const sb = window?.wwLib?.wwPlugins?.supabase; // helpers (uploadFile, callPostgresFunction, etc)
    const supabase = sb?.instance; // cliente @supabase/supabase-js
    const auth = window?.wwLib?.wwPlugins?.supabaseAuth?.publicInstance; // auth

    // Mantém a variável de anexos sincronizada
    watch(
      files,
      () => {
        const info = files.value.map((f) => ({
          name: f.file.name,
          size: f.file.size,
          type: f.file.type,
          url: f.url,
          storagePath: f.storagePath || null,
          bucket: f.bucket || null,
          signedUrl: f.signedUrl || null,
          attachmentId: f.attachmentId || null,
        }));
        attachmentsInfo.value = info;
        if (setAttachmentsInfo) setAttachmentsInfo(info);
      },
      { deep: true, immediate: true }
    );

    function triggerFileInput() {
      if (fileInput.value) fileInput.value.click();
    }

    async function onFilesSelected(event) {
      const picked = Array.from(event.target.files || []);
      if (!picked.length) return;

      // Pré-visualização local instantânea
      const selected = picked.map((file) => ({
        file,
        url:
          file.type.startsWith("image/") || file.type === "application/pdf"
            ? URL.createObjectURL(file)
            : null,
        isImage: file.type.startsWith("image/"),
        isPdf: file.type === "application/pdf",
        isUploaded: false,
        bucket: "ticket", // ajuste se usar outro bucket
        storagePath: null,
        signedUrl: null,
        attachmentId: null,
      }));
      files.value.push(...selected);

      // Variáveis de contexto
      const language = getVar(languageVarId);
      const WorkspaceID = getVar(workspaceVarId);
      const LoggedUserID = getVar(loggedUserVarId);
      const TicketID = getVar(ticketVarId);
      const bucket = "ticket";

      // Checagens de plugin
      if (!sb || !supabase || !auth) {
        console.error(
          "[Anexos] Plugins do Supabase não encontrados. Verifique a configuração (supabase e supabaseAuth)."
        );
        event.target.value = "";
        return;
      }

      // Verifica usuário autenticado
      const { data: userData, error: authErr } = await auth.auth.getUser();
      if (authErr) {
        console.error("[Anexos] Erro ao obter usuário do Supabase Auth:", authErr);
        event.target.value = "";
        return;
      }
      if (!userData?.user) {
        console.error("[Anexos] Usuário não autenticado no Supabase.");
        event.target.value = "";
        return;
      }

      // Faz upload 1 a 1
      for (const item of selected) {
        const { file } = item;
        const extension = (file.name.split(".").pop() || "").toLowerCase();
        const unique = (window.crypto?.randomUUID
          ? window.crypto.randomUUID()
          : Date.now().toString(36)) + (extension ? `.${extension}` : "");

        const pathObject = `${WorkspaceID || "no-workspace"}/${TicketID || "no-ticket"}/${unique}`;

        try {
          // (Opcional) valida membership RLS por RPC
          try {
            const { data: allowed, error: rpcCheckErr } = await supabase.rpc(
              "rls_user_in_path_workspace",
              { obj_name: pathObject }
            );
            if (rpcCheckErr) {
              console.warn("[Anexos] RPC rls_user_in_path_workspace falhou:", rpcCheckErr);
            } else if (allowed === false) {
              console.error("[Anexos] RLS: usuário sem acesso ao workspace.");
              continue;
            }
          } catch (e) {
            console.warn("[Anexos] Não foi possível validar membership via RPC:", e);
          }

          // Upload direto via cliente do Supabase (sem limites extras do helper do WeWeb)
           const { error: upErr } = await supabase
           .storage
           .from(bucket)
           .upload(pathObject, file, {
           cacheControl: "3600",
           upsert: false,
           contentType: file.type || "application/octet-stream",
           });
           if (upErr) {
           console.error("[Anexos] Erro no upload para Supabase Storage:", upErr);
           continue;
           }

          // Chama sua função para registrar metadados do anexo
          const rpcBody = {
            p_action: "insert",
            p_workspace_id: WorkspaceID ?? null,
            p_ticket_id: TicketID ?? null,
            p_loggeruserid: LoggedUserID ?? null,
            p_filename: file.name,
            p_fileextension: extension || null,
            p_filesize: file.size,
            p_mimetype: file.type || null,
            p_bucket: bucket,
            p_objectpath: pathObject,
            p_attachment_id: null,
          };

          // Usando helper do plugin para RPC
          const { data: rpcData, error: rpcError } = await sb.callPostgresFunction({
            functionName: "postticketattachment",
            params: rpcBody,
          });

          let attachmentId = null;
          if (rpcError) {
            console.error("[Anexos] Erro ao chamar postticketattachment:", rpcError);
          } else {
            attachmentId = Array.isArray(rpcData)
              ? rpcData[0]?.p_attachment_id || rpcData[0]?.attachment_id
              : rpcData?.p_attachment_id || rpcData?.attachment_id || null;
          }

          // URL assinada para visualização (se bucket privado)
          let signedUrl = null;
          try {
            const { data: signed, error: signErr } = await sb.createSignedUrl({
              mode: "single",
              bucket,
              path: pathObject,
              expiresIn: 60 * 60, // 1h
              options: { download: false, transform: null },
            });
            if (signErr) {
              console.warn("[Anexos] Falha ao criar Signed URL:", signErr);
            } else {
              signedUrl = signed?.signedUrl || null;
            }
          } catch (e) {
            console.warn("[Anexos] Erro ao criar Signed URL:", e);
          }

          // Atualiza o item na lista com infos persistidas
          item.isUploaded = true;
          item.bucket = bucket;
          item.storagePath = pathObject;
          item.signedUrl = signedUrl;
          item.attachmentId = attachmentId;

          // Dispara evento para o fluxo do WeWeb
          const payload = {
            ...rpcBody,
            p_attachment_id: attachmentId,
            language,
            file, // arquivo original
            signedUrl,
          };

          emit("trigger-event", {
            name: "onUpload",
            event: { value: payload },
          });
        } catch (err) {
          console.error("[Anexos] Falha geral no upload:", err);
        }
      }

      // limpa input
      event.target.value = "";
    }

    function removeFile(index) {
      const removed = files.value.splice(index, 1)[0];
      if (removed && removed.url) URL.revokeObjectURL(removed.url);
    }

    async function downloadFile(file) {
      // Se já temos Signed URL ou URL local, usa; caso contrário tenta gerar
      let url = file.signedUrl || file.url;
      if (!url && file.bucket && file.storagePath && window?.wwLib?.wwPlugins?.supabase) {
        try {
          const { data: signed, error } = await wwLib.wwPlugins.supabase.createSignedUrl({
            mode: "single",
            bucket: file.bucket,
            path: file.storagePath,
            expiresIn: 60 * 60,
            options: { download: true, transform: null },
          });
          if (!error) url = signed?.signedUrl;
        } catch (e) {
          console.warn("[Anexos] Erro ao gerar Signed URL para download:", e);
        }
      }

      if (!url) {
        // fallback: blob local
        url = URL.createObjectURL(file.file);
      }

      const link = document.createElement("a");
      link.href = url;
      link.download = file.file?.name || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // se gerou blob temporário
      if (!file.url && !file.signedUrl && url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    }

    function getFileIcon(name) {
      const ext = (name.split(".").pop() || "").toLowerCase();
      switch (ext) {
        case "pdf":
          return "fa-solid fa-file-pdf";
        case "doc":
        case "docx":
          return "fa-solid fa-file-word";
        case "xls":
        case "xlsx":
          return "fa-solid fa-file-excel";
        case "ppt":
        case "pptx":
          return "fa-solid fa-file-powerpoint";
        default:
          return "fa-solid fa-file";
      }
    }

    function openModal(index) {
      currentIndex.value = index;
      isModalOpen.value = true;
    }

    function closeModal() {
      isModalOpen.value = false;
    }

    function nextFile() {
      if (currentIndex.value < files.value.length - 1) currentIndex.value++;
    }

    function prevFile() {
      if (currentIndex.value > 0) currentIndex.value--;
    }

    function zoomIn() {
      zoom.value += 0.1;
    }

    function zoomOut() {
      zoom.value = Math.max(0.1, zoom.value - 0.1);
    }

    return {
      files,
      fileInput,
      triggerFileInput,
      onFilesSelected,
      removeFile,
      downloadFile,
      isModalOpen,
      currentIndex,
      currentFile,
      openModal,
      closeModal,
      nextFile,
      prevFile,
      zoom,
      zoomIn,
      zoomOut,
      getFileIcon,
      attachmentsInfo,
    };
  },
};
</script>

<style lang="scss" scoped>
@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined");
@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css");

.attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.upload-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 150px;
  height: 140px;
  padding: 12px;
  border: 2px dashed #ccc;
  border-radius: 6px;
  background: #ffffff;
  color: #555;
  cursor: pointer;
  gap: 8px;
}

.upload-icon {
  font-size: 55px;
  line-height: 1;
  font-weight: 300;
}

.upload-text {
  font-size: 12px;
}

.hidden-input {
  display: none;
}

.file-item {
  position: relative;
  width: 150px;
  height: 140px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  background: #fff;
}

.file-icon {
  font-size: 90px;
  cursor: pointer;
}

.fa-file-pdf {
  color: #e53935;
}

.fa-file-word {
  color: #3b73b9;
}

.fa-file-excel {
  color: #2e7d32;
}

.fa-file-powerpoint {
  color: #d84315;
}

.file-preview {
  width: 100%;
  height: 90px;
  object-fit: contain;
  background-color: rgb(245, 246, 250);
  border-radius: 6px;
  margin-bottom: 4px;
  cursor: pointer;
}

.file-name {
  width: 100%;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.file-item:hover .file-actions {
  opacity: 1;
}

.action-button {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.material-symbols-outlined {
  font-size: 16px;
  line-height: 1;
  vertical-align: middle;
}

i.material-symbols-outlined {
  font-family: "Material Symbols Outlined";
  font-weight: normal;
  font-style: normal;
  font-size: 18px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: "liga";
  -webkit-font-smoothing: antialiased;
  vertical-align: middle;
  color: #e0e0e0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: transparent;
  padding: 0;
  border-radius: 0;
  max-width: 80%;
  max-height: 80%;
  display: flex;
  align-items: center;
  position: relative;
}

.modal-content.pdf-viewer {
  max-width: none;
  max-height: none;
  width: 95vw;
  height: 95vh;
}

.modal-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-height: 100%;
  margin: 0;
  width: 100%;
  height: 100%;
}

.modal-image {
  width: 600px;
  height: 400px;
  object-fit: contain;
  position: relative;
  z-index: 1;
}

.modal-pdf {
  width: 100%;
  height: 100%;
  flex: 1;
  border: none;
  position: relative;
  z-index: 1;
}

.modal-file-name {
  margin-top: 8px;
  color: #fff;
  position: relative;
  z-index: 2;
}

.zoom-controls {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  padding: 5px;
  align-items: center;
  text-align: center;
  z-index: 100;
  position: relative;
}

.zoom-button {
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 22px !important;
}

.modal-top-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 8px;
  z-index: 2;
}

.modal-action-button {
  width: 40px;
  height: 40px;
  background: #3c3c3c;
  color: #fff;
  border: none;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.modal-action-button i.material-symbols-outlined {
  font-size: 22px;
  color: #fff;
}

.nav-button {
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: none;
  width: 40px;
  height: 40px;
  cursor: pointer;
  font-size: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
}

.nav-button.prev {
  left: 35px;
}

.nav-button.next {
  right: 35px;
}

.nav-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.nav-button i.material-symbols-outlined {
  color: #fff;
}

.file-not-viewable {
  width: 600px;
  height: 400px;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.modal-file-icon {
  font-size: 120px;
  margin-bottom: 16px;
}

.no-preview {
  font-size: 14px;
  color: #333;
}
</style>
