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

    <div v-for="(file, index) in files" :key="file.attachmentId || file.storagePath || index" class="file-item">
      <template v-if="file.isImage && file.url">
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

  <div v-if="popup.visible" class="popup" :class="popup.type">
    <div class="popup-header">
      <span class="popup-title">
        {{ popup.type === 'error' ? 'Error saving data' : 'Data saved successfully' }}
      </span>
      <button class="popup-close" @click="closePopup">
        <i class="material-symbols-outlined">close</i>
      </button>
    </div>
    <div v-if="popup.type === 'error'" class="popup-details">
      <button class="details-toggle" @click="toggleDetails">
        Details
        <i class="material-symbols-outlined">
          {{ detailsOpen ? 'expand_less' : 'expand_more' }}
        </i>
      </button>
      <pre v-if="detailsOpen" class="details-text">{{ popup.details }}</pre>
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
        <template v-if="currentFile && currentFile.isImage && currentFile.url">
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

        <template v-else-if="currentFile && currentFile.isPdf && currentFile.url">
          <iframe :src="currentFile.url" class="modal-pdf"></iframe>
          <div class="modal-file-name">{{ currentFile.file.name }}</div>
        </template>

        <!-- TXT preview -->
        <template v-else-if="currentFile && currentFile.isTxt">
          <pre class="modal-txt">{{ currentFile.textContent || 'Carregando…' }}</pre>
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
    const popup = ref({ visible: false, type: "", details: "" });
    const detailsOpen = ref(false);

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
    const sb = window?.wwLib?.wwPlugins?.supabase; // helpers
    const supabase = sb?.instance; // cliente supabase-js
    const auth = window?.wwLib?.wwPlugins?.supabaseAuth?.publicInstance; // auth

    // Helpers
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    async function ensureAuthReady(maxMs = 4000) {
      try {
        if (!auth?.auth?.getUser) return true;
        const start = Date.now();
        while (Date.now() - start < maxMs) {
          const { data, error } = await auth.auth.getUser();
          if (data?.user && !error) return true;
          await sleep(200);
        }
      } catch (_) {}
      return true;
    }

    function extOf(name = "") {
      const seg = String(name).split(".").pop() || "";
      return seg.toLowerCase();
    }

    function detectFileKind(name, mimetype = "") {
      const ext = extOf(name);
      const mime = (mimetype || "").toLowerCase();
      const isImage = mime.startsWith("image/") || ["png","jpg","jpeg","gif","webp","bmp","svg"].includes(ext);
      const isPdf   = mime.startsWith("application/pdf") || ext === "pdf";
      const isTxt   = mime.startsWith("text/") || mime.includes("text/plain") || ext === "txt" || ext === "log";
      return { isImage, isPdf, isTxt };
    }

    function guessContentType(name, fallback = "application/octet-stream") {
      const ext = extOf(name);
      if (ext === "txt" || ext === "log") return "text/plain";
      if (ext === "json") return "application/json";
      if (ext === "csv") return "text/csv";
      if (["png","jpg","jpeg","gif","webp","bmp","svg"].includes(ext)) {
        const m = ext === "jpg" ? "jpeg" : ext;
        return `image/${m}`;
      }
      if (ext === "pdf") return "application/pdf";
      return fallback;
    }

    // Gera/renova signed URLs e carrega TXT quando preciso
    async function getFreshSignedUrl(file, { forceDownloadName, transformImage } = {}) {
      if (!file?.bucket || !file?.storagePath || !supabase) return null;
      await ensureAuthReady();

      const options = {};
      if (transformImage && file.isImage) options.transform = transformImage;
      if (forceDownloadName) options.download = forceDownloadName; // força Content-Disposition

      const { data, error } = await supabase
        .storage
        .from(file.bucket)
        .createSignedUrl(file.storagePath, 60 * 60, options); // 1h

      if (error) {
        console.warn("[Anexos] createSignedUrl falhou:", error);
        return null;
      }
      return data?.signedUrl || null;
    }

    async function loadTxtIfNeeded(file) {
      if (!file || file.textContent) return;

      // TXT local (ainda não enviado)
      if (file.file instanceof File && file.isTxt) {
        try {
          file.textContent = await file.file.text();
          return;
        } catch (e) {
          console.warn("[Anexos] Falha ao ler TXT local:", e);
        }
      }

      // Garante URL assinada
      if (!file.url) {
        file.url = file.signedUrl = await getFreshSignedUrl(file);
        if (!file.url) return;
      }

      try {
        const res = await fetch(file.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        file.textContent = await res.text();
      } catch (e) {
        console.warn("[Anexos] Falha ao carregar conteúdo TXT:", e);
        file.textContent = "(Não foi possível carregar este texto)";
      }
    }

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

    // controla concorrência entre mudanças de Data Source
    let dsLoadVersion = 0;

    async function loadFromDataSource(data) {
      const myVersion = ++dsLoadVersion;

      if (!Array.isArray(data)) {
        files.value = [];
        return;
      }

      await ensureAuthReady();

      const items = await Promise.all(
        data.map(async (item) => {
          const kind = detectFileKind(item.filename, item.mimetype);
          const info = {
            file: {
              name: item.filename,
              size: item.filesizebytes,
              type: item.mimetype,
            },
            url: null,
            isImage: kind.isImage,
            isPdf: kind.isPdf,
            isTxt: kind.isTxt,
            isUploaded: true,
            bucket: "ticket",
            storagePath: item.objectpath,
            signedUrl: null,
            attachmentId: item.id,
            createdBy: item.createdby,
            createdDate: item.createddate,
            textContent: null,
          };

          try {
            const options = info.isImage
              ? { transform: { width: 1200, resize: "contain" } }
              : undefined;

            const { data: signed, error } = await supabase
              .storage
              .from(info.bucket)
              .createSignedUrl(info.storagePath, 60 * 60, options);

            if (!error) info.url = info.signedUrl = signed?.signedUrl || null;
          } catch (e) {
            console.warn("[Anexos] Exceção ao criar signed URL:", e);
          }

          return info;
        })
      );

      // se outra execução iniciou no meio do caminho, aborta aplicar este resultado
      if (myVersion !== dsLoadVersion) return;

      files.value = items;
    }

    function clearFiles() {
      files.value = [];
      attachmentsInfo.value = [];
      if (setAttachmentsInfo) setAttachmentsInfo([]);
      currentIndex.value = 0;
      isModalOpen.value = false;
    }

    function handleDataSource(ds) {
      if (!ds) {
        dsLoadVersion++;
        clearFiles();
        return;
      }

      let data = ds;

      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (_) {
          dsLoadVersion++;
          clearFiles();
          return;
        }
      }

      if (!Array.isArray(data)) {
        dsLoadVersion++;
        clearFiles();
        return;
      }

      loadFromDataSource(data);
    }

    // Reage às mudanças do Data Source e também do objeto content em si
    watch(
      [() => props.content, () => props.content.dataSource],
      ([, ds]) => handleDataSource(ds),

      { immediate: true, deep: true }
    );

    function triggerFileInput() {
      if (fileInput.value) fileInput.value.click();
    }

    async function onFilesSelected(event) {
      const picked = Array.from(event.target.files || []);
      if (!picked.length) return;

      const errorMessages = [];

      // Pré-visualização local instantânea
      const selected = picked.map((file) => {
        const kind = detectFileKind(file.name, file.type);
        return {
          file,
          url:
            file.type?.startsWith("image/") || kind.isImage || file.type === "application/pdf"
              ? URL.createObjectURL(file)
              : null,
          isImage: kind.isImage,
          isPdf: kind.isPdf,
          isTxt: kind.isTxt,
          isUploaded: false,
          bucket: "ticket",
          storagePath: null,
          signedUrl: null,
          attachmentId: null,
          textContent: null,
        };
      });
      files.value.push(...selected);

      // Variáveis de contexto
      const language = getVar(languageVarId);
      const WorkspaceID = getVar(workspaceVarId);
      const LoggedUserID = getVar(loggedUserVarId);
      const TicketID = getVar(ticketVarId);
      const bucket = "ticket";

     

      // Verifica usuário autenticado
      const { data: userData, error: authErr } = await auth.auth.getUser();
      if (authErr) {
        errorMessages.push(`Erro ao obter usuário do Supabase Auth: ${authErr.message || authErr}`);
        showError(errorMessages.join("\n"));
        event.target.value = "";
        return;
      }
      if (!userData?.user) {
        errorMessages.push("Usuário não autenticado no Supabase.");
        showError(errorMessages.join("\n"));
        event.target.value = "";
        return;
      }

      // Faz upload 1 a 1
      for (const item of selected) {
        const { file } = item;
        const extension = (file.name.split(".").pop() || "").toLowerCase();
        const unique =
          (window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36)) +
          (extension ? `.${extension}` : "");

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

          // Content-Type consistente (garante text/plain para .txt etc.)
          const contentType = guessContentType(file.name, file.type || "application/octet-stream");

          // Upload direto via cliente do Supabase
          const { error: upErr } = await supabase
            .storage
            .from(bucket)
            .upload(pathObject, file, {
              cacheControl: "3600",
              upsert: false,
              contentType,
            });
          if (upErr) {
            errorMessages.push(`Erro no upload para Supabase Storage: ${upErr.message || upErr}`);
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
            p_mimetype: contentType || null,
            p_bucket: bucket,
            p_objectpath: pathObject,
            p_attachment_id: null,
          };

          const { data: rpcData, error: rpcError } = await sb.callPostgresFunction({
            functionName: "postticketattachment",
            params: rpcBody,
          });

          let attachmentId = null;
          if (rpcError) {
            errorMessages.push(
              `Erro ao chamar postticketattachment: ${rpcError.message || rpcError}`
            );
          } else {
            attachmentId = Array.isArray(rpcData)
              ? rpcData[0]?.p_attachment_id || rpcData[0]?.attachment_id
              : rpcData?.p_attachment_id || rpcData?.attachment_id || null;
          }

          // URL assinada para visualização
          let signedUrl = await getFreshSignedUrl(
            { bucket, storagePath: pathObject, isImage: item.isImage },
            { transformImage: { width: 1200, resize: "contain" } }
          );

          // Atualiza o item na lista com infos persistidas
          item.isUploaded = true;
          item.bucket = bucket;
          item.storagePath = pathObject;
          item.signedUrl = signedUrl || null;
          item.url = signedUrl || item.url; // garante preview imediato
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
          errorMessages.push(`Falha geral no upload: ${err.message || err}`);
        }
      }

      // limpa input
      event.target.value = "";

      if (errorMessages.length) {
        showError(errorMessages.join("\n"));
      } else {
        showSuccess();
      }
    }

    async function removeFile(index) {
      const removed = files.value.splice(index, 1)[0];
      if (removed && removed.url && removed.url.startsWith("blob:")) {
        URL.revokeObjectURL(removed.url);
      }

      const errorMessages = [];

      // remove da API/Storage apenas se já estiver enviado
      if (removed?.attachmentId && sb) {
        const WorkspaceID = getVar(workspaceVarId);
        const LoggedUserID = getVar(loggedUserVarId);
        const TicketID = getVar(ticketVarId);

        try {
          // exclui do storage quando possível
          if (supabase && removed.bucket && removed.storagePath) {
            const { error: storageErr } = await supabase
              .storage
              .from(removed.bucket)
              .remove([removed.storagePath]);
            if (storageErr) {
              errorMessages.push(
                `Erro ao remover arquivo do storage: ${storageErr.message || storageErr}`
              );
            }
          }

          const rpcBody = {
            p_action: "delete",
            p_workspace_id: WorkspaceID ?? null,
            p_ticket_id: TicketID ?? null,
            p_loggeruserid: LoggedUserID ?? null,
            p_filename: removed.file?.name ?? null,
            p_fileextension: removed.file?.name?.split(".").pop() ?? null,
            p_filesize: removed.file?.size ?? null,
            p_mimetype: "",
            p_bucket: removed.bucket ?? null,
            p_objectpath: removed.storagePath ?? null,
            p_attachment_id: removed.attachmentId ?? null,
          };

          const { error: rpcError } = await sb.callPostgresFunction({
            functionName: "postticketattachment",
            params: rpcBody,
          });

          if (rpcError) {
            errorMessages.push(
              `Erro ao chamar postticketattachment: ${rpcError.message || rpcError}`
            );
          }
        } catch (err) {
          errorMessages.push(`Falha ao excluir anexo: ${err.message || err}`);
        }
      }

      if (errorMessages.length) {
        showError(errorMessages.join("\n"));
      } else if (removed?.attachmentId) {
        showSuccess();
      }
    }

    async function downloadFile(file) {
      try {
        // Sempre gere uma signed URL "forçada para download" (Content-Disposition)
        let signed = await getFreshSignedUrl(file, {
          forceDownloadName: file.file?.name || "download"
        });

        // Fallback para arquivo local (ainda não enviado)
        if (!signed && file.file instanceof File) {
          const blobUrl = URL.createObjectURL(file.file);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = file.file?.name || "download";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(blobUrl);
          return;
        }

        if (!signed) {
          showError("Não foi possível gerar a URL para download.");
          return;
        }

        // Baixa como blob para impedir abertura no navegador
        const res = await fetch(signed);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = file.file?.name || "download";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
      } catch (e) {
        console.warn("[Anexos] Download falhou:", e);
        showError(`Falha no download: ${e.message || e}`);
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
        case "txt":
        case "log":
          return "fa-solid fa-file-lines";
        default:
          return "fa-solid fa-file";
      }
    }

    async function openModal(index) {
      currentIndex.value = index;
      const f = files.value[index];
      // Garante URL assinada quando precisar
      if (f && !f.url && (f.bucket && f.storagePath)) {
        f.url = f.signedUrl = await getFreshSignedUrl(f, {
          transformImage: { width: 1200, resize: "contain" }
        });
      }
      // Se for TXT, carrega o conteúdo
      if (f?.isTxt) {
        await loadTxtIfNeeded(f);
      }
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

    function showSuccess() {
      popup.value = { visible: true, type: "success", details: "" };
      detailsOpen.value = false;
      setTimeout(() => {
        popup.value.visible = false;
      }, 1000);
    }

    function showError(details) {
      popup.value = { visible: true, type: "error", details };
      detailsOpen.value = false;
    }

    function closePopup() {
      popup.value.visible = false;
    }

    function toggleDetails() {
      detailsOpen.value = !detailsOpen.value;
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
      popup,
      detailsOpen,
      closePopup,
      toggleDetails,
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
  width: 140px;
  height: 130px;
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
  width: 140px;
  height: 130px;
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
  font-size: 85px;
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

.fa-file-lines {
  color: #546e7a;
}

.file-preview {
  width: 100%;
  height: 85px;
  object-fit: contain;
  background-color: rgb(245, 246, 250);
  border-radius: 6px;
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

.modal-txt {
  max-width: 80vw;
  max-height: 65vh;
  overflow: auto;
  background: #0b0b0b;
  color: #eaeaea;
  padding: 12px 14px;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
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

.popup {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #fff;
  border-left: 4px solid;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  padding: 16px;
  min-width: 250px;
  z-index: 1100;
}

.popup.success {
  border-left-color: #4caf50;
}

.popup.error {
  border-left-color: #f44336;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.popup-title {
  font-weight: 600;
}

.popup-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: #555;
}

.popup-details .details-toggle {
  background: none;
  border: none;
  color: #007bff;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 0;
}

.details-text {
  margin-top: 8px;
  white-space: pre-wrap;
}
</style>
