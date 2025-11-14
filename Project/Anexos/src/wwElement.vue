<template>
  <div class="attachments" :style="thumbnailStyles">
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
          @click="requestDelete(index)"
        >
          <i class="material-symbols-outlined">delete</i>
        </button>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <div v-if="popup.visible" class="popup" :class="popup.type">
    <div class="popup-header">
      <span class="popup-title">
        {{
          popup.title ||
            (popup.type === 'error'
              ? t('Error saving data')
              : t('Data saved successfully'))
        }}
      </span>
      <button class="popup-close" @click="closePopup" :aria-label="t('Close')">
        <i class="material-symbols-outlined">close</i>
      </button>
    </div>
    <div v-if="popup.type === 'error'" class="popup-details">
      <button class="details-toggle" @click="toggleDetails">
        {{ t('Details') }}
        <i class="material-symbols-outlined">
          {{ detailsOpen ? 'expand_less' : 'expand_more' }}
        </i>
      </button>
      <pre v-if="detailsOpen" class="details-text">{{ popup.details }}</pre>
    </div>
  </div>

  <!-- Preview Modal -->
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
          <pre class="modal-txt">{{ currentFile.textContent || t('Loading…') }}</pre>
          <div class="modal-file-name">{{ currentFile.file.name }}</div>
        </template>

        <template v-else>
          <div class="file-not-viewable">
            <i
              v-if="currentFile"
              :class="['modal-file-icon', getFileIcon(currentFile.file.name)]"
            ></i>
            <p class="no-preview">{{ t('This file cannot be viewed') }}</p>
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

  <!-- Delete Confirmation (styled to match your screenshot) -->
  <div v-if="confirm.visible" class="confirm-overlay" @click.self="cancelDelete">
    <div class="confirm-card">
      <div class="confirm-card__header">
        <div class="confirm-card__title">
          <i class="material-symbols-outlined confirm-card__icon">close</i>
          <span>{{ t('Delete') }}</span>
        </div>
        <button
          class="confirm-card__close"
          @click="cancelDelete"
          :aria-label="t('Close')"
        >
          <i class="material-symbols-outlined">close</i>
        </button>
      </div>

      <div class="confirm-card__body">
        <p>{{ t('Do you want to delete this data?') }}</p>
      </div>

      <div class="confirm-card__footer">
        <button class="btn btn-text" :disabled="confirm.loading" @click="cancelDelete">
          {{ t('Cancel') }}
        </button>
        <button class="btn btn-primary" :disabled="confirm.loading" @click="confirmDelete">
          <span v-if="confirm.loading" class="spinner"></span>
          {{ t('Ok') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";

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
    const popup = ref({ visible: false, type: "", details: "", title: "" });
    const detailsOpen = ref(false);

    const TRANSLATION_FORMULA_ID = "0ab178d3-4b04-45f1-a5f2-d5db828242a6";
    let resolveTranslation = null;
    if (typeof wwLib !== "undefined" && wwLib?.wwFormula?.useFormula) {
      try {
        const formulaApi = wwLib.wwFormula.useFormula();
        if (formulaApi && typeof formulaApi.resolveMappingFormula === "function") {
          resolveTranslation = formulaApi.resolveMappingFormula.bind(formulaApi);
        }
      } catch (error) {
        console.warn("[Anexos] Unable to initialize translation:", error);
      }
    }

    function translate(text) {
      if (text == null) return "";
      const value = typeof text === "string" ? text : String(text);
      if (resolveTranslation) {
        try {
          const translated = resolveTranslation(TRANSLATION_FORMULA_ID, value);
          if (translated !== undefined && translated !== null && translated !== "") {
            return translated;
          }
        } catch (error) {
          console.warn("[Anexos] Translation error:", error);
        }
      }
      return value;
    }

    const DEFAULT_THUMB_HEIGHT = 130;
    const DEFAULT_THUMB_WIDTH = 140;
    const DEFAULT_PREVIEW_HEIGHT = 85;
    const DEFAULT_ICON_SIZE = 85;
    const DEFAULT_UPLOAD_ICON_SIZE = 55;

    function toPositiveNumber(value) {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
      }
      if (typeof value === "string") {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
          return numeric;
        }
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    }

    const thumbnailHeight = computed(() => {
      const raw = toPositiveNumber(props.content?.thumbnailHeight);
      return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_THUMB_HEIGHT;
    });
    const thumbnailWidth = computed(
      () => (thumbnailHeight.value * DEFAULT_THUMB_WIDTH) / DEFAULT_THUMB_HEIGHT
    );
    const thumbnailPreviewHeight = computed(
      () => (thumbnailHeight.value * DEFAULT_PREVIEW_HEIGHT) / DEFAULT_THUMB_HEIGHT
    );
    const fileIconSize = computed(
      () => (thumbnailHeight.value * DEFAULT_ICON_SIZE) / DEFAULT_THUMB_HEIGHT
    );
    const uploadIconSize = computed(
      () => (thumbnailHeight.value * DEFAULT_UPLOAD_ICON_SIZE) / DEFAULT_THUMB_HEIGHT
    );

    const thumbnailStyles = computed(() => ({
      "--thumbnail-height": `${thumbnailHeight.value}px`,
      "--thumbnail-width": `${thumbnailWidth.value}px`,
      "--thumbnail-preview-height": `${thumbnailPreviewHeight.value}px`,
      "--file-icon-size": `${fileIconSize.value}px`,
      "--upload-icon-size": `${uploadIconSize.value}px`,
    }));

    const isHttpUrl = (value) => typeof value === "string" && /^https?:\/\//i.test(value);

    function sanitizeBucket(value, fallback = null) {
      const bucket = typeof value === "string" ? value.trim() : "";
      return bucket || (typeof fallback === "string" && fallback ? fallback : null);
    }

    function sanitizeStoragePath(value, bucket) {
      let path = typeof value === "string" ? value.trim() : "";
      if (!path) return null;
      path = path.replace(/^\/+/u, "");
      if (bucket) {
        const prefix = `${bucket}/`;
        if (path.startsWith(prefix)) path = path.slice(prefix.length);
      }
      return path || null;
    }

    function extractFromSupabaseUrl(url) {
      if (!isHttpUrl(url)) return { bucket: null, storagePath: null };
      try {
        const parsed = new URL(url);
        const segments = parsed.pathname.split("/").filter(Boolean);
        const objectIdx = segments.indexOf("object");
        if (objectIdx !== -1) {
          const mode = segments[objectIdx + 1];
          if (mode === "sign" || mode === "public") {
            const bucket = segments[objectIdx + 2] || null;
            const pathSegments = segments.slice(objectIdx + 3);
            if (bucket && pathSegments.length) {
              return { bucket, storagePath: pathSegments.join("/") };
            }
          }
        }
      } catch (e) {}
      return { bucket: null, storagePath: null };
    }

    function resolveStorageLocation(source = {}, { fallbackBucket = null } = {}) {
      const bucketCandidate =
        sanitizeBucket(source.bucket) ||
        sanitizeBucket(source.bucketname) ||
        sanitizeBucket(source.bucket_name) ||
        sanitizeBucket(source.bucketName) ||
        sanitizeBucket(source.storageBucket) ||
        null;

      const urlCandidate =
        source.url ||
        source.fileUrl ||
        source.fileurl ||
        source.publicUrl ||
        source.publicurl ||
        source.signedUrl ||
        source.signedurl ||
        null;

      const rawPathCandidate =
        source.storagePath ??
        source.storagepath ??
        source.objectpath ??
        source.objectPath ??
        source.path ??
        source.filepath ??
        source.filePath ??
        source.object_key ??
        (!isHttpUrl(urlCandidate) ? urlCandidate : null);

      const extracted = extractFromSupabaseUrl(urlCandidate);

      let bucket = bucketCandidate || extracted.bucket || null;
      let storagePath = sanitizeStoragePath(rawPathCandidate, bucket);

      if (!storagePath && extracted.storagePath) {
        storagePath = sanitizeStoragePath(extracted.storagePath, bucket);
      }

      if (storagePath && storagePath.includes("/")) {
        const [maybeBucketRaw, ...rest] = storagePath.split("/");
        const restPath = rest.join("/");
        const maybeBucket = sanitizeBucket(maybeBucketRaw || "");
        const hasRest = rest.length > 0 && restPath;

        if (hasRest) {
          const shouldUsePathBucket =
            (!!bucket && maybeBucket && bucket === maybeBucket) ||
            (!!bucketCandidate && maybeBucket && bucketCandidate === maybeBucket) ||
            (!!extracted.bucket && maybeBucket && extracted.bucket === maybeBucket) ||
            (!bucket && !fallbackBucket);

          if (shouldUsePathBucket) {
            bucket = maybeBucket || bucket;
            storagePath = restPath;
          } else if (!bucket && fallbackBucket && maybeBucket === fallbackBucket) {
            bucket = maybeBucket;
            storagePath = restPath;
          }
        }
      }

      bucket = sanitizeBucket(bucket, fallbackBucket);
      storagePath = sanitizeStoragePath(storagePath, bucket);

      return {
        bucket: bucket || null,
        storagePath: storagePath || null,
        directUrl: isHttpUrl(urlCandidate) ? urlCandidate : null,
      };
    }

    const autoSaveToPostticketattachment = computed(() => {
      const flag = props.content?.autoSaveToPostticketattachment;
      return flag === false ? false : true;
    });

    // --- Confirm dialog state ---
    const confirm = ref({ visible: false, index: null, loading: false });
    function requestDelete(index) {
      confirm.value = { visible: true, index, loading: false };
    }
    function cancelDelete() {
      confirm.value.visible = false;
      confirm.value.index = null;
      confirm.value.loading = false;
    }
    async function confirmDelete() {
      if (confirm.value.index == null) return;
      confirm.value.loading = true;
      try {
        await performDelete(confirm.value.index);
        cancelDelete();
      } catch (e) {
        cancelDelete();
        showError(e?.message || String(e));
      }
    }

    // ---- WeWeb Vars ----
    const getVar = (id) => window?.wwLib?.wwVariable?.getValue?.(id);
    const languageVarId = "aa44dc4c-476b-45e9-a094-16687e063342";
    const workspaceVarId = "744511f1-3309-41da-a9fd-0721e7dd2f99";
    const loggedUserVarId = "fc54ab80-1a04-4cfe-a504-793bdcfce5dd";
    const ticketVarId = "7bebd888-f31e-49e7-bef2-4052c8cb6cf5";

    // ---- Component Variable ----
    const attachmentsInfo = ref([]);
    let setAttachmentsInfo;
    const pendingAttachmentsBodies = ref([]);
    let setPendingAttachmentsBodies;
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

      const { value: pendingValue, setValue: setPendingValue } =
        wwLib.wwVariable.useComponentVariable({
          uid: props.uid,
          name: "pendingAttachmentsBodies",
          type: "array",
          defaultValue: [],
        });
      pendingAttachmentsBodies.value = pendingValue.value || [];
      setPendingAttachmentsBodies = setPendingValue;
    }

    function syncPendingAttachmentsBodies(next) {
      const normalized = Array.isArray(next) ? next : [];
      pendingAttachmentsBodies.value = normalized;
      if (setPendingAttachmentsBodies) setPendingAttachmentsBodies(normalized);
    }

    function pushPendingAttachmentBody(body) {
      const current = Array.isArray(pendingAttachmentsBodies.value)
        ? [...pendingAttachmentsBodies.value]
        : [];
      current.push(body);
      syncPendingAttachmentsBodies(current);
    }

    function removePendingAttachmentBodyByPath(path) {
      if (!path) return;
      const normalized = typeof path === "string" ? path.trim() : path;
      const current = Array.isArray(pendingAttachmentsBodies.value)
        ? pendingAttachmentsBodies.value
        : [];
      const filtered = current.filter((item) => {
        const candidate = typeof item?.p_objectpath === "string" ? item.p_objectpath.trim() : item?.p_objectpath;
        return candidate !== normalized;
      });
      if (filtered.length !== current.length) {
        syncPendingAttachmentsBodies(filtered);
      }
    }

    function clearPendingAttachmentBodies() {
      syncPendingAttachmentsBodies([]);
    }

    // ---- Supabase ----
    let sb = window?.wwLib?.wwPlugins?.supabase;
    let supabase = sb?.instance || null; // pode ser null na 1ª render
    let auth = window?.wwLib?.wwPlugins?.supabaseAuth?.publicInstance || null;

    // Helpers
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // Aguarda auth ficar pronto (se existir)
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

    // Aguarda supabase.storage ficar disponível para evitar "Cannot read properties of null (reading 'storage')"
    async function waitForStorage(maxMs = 4000) {
      const start = Date.now();
      while (Date.now() - start < maxMs) {
        if (supabase && supabase.storage) return true;
        await sleep(100);
      }
      // se não estiver disponível, seguimos sem quebrar (usaremos fallbacks)
      return false;
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

    async function getFreshSignedUrl(file, { forceDownloadName, transformImage } = {}) {
      if (!file) return null;
      const location = resolveStorageLocation(file, { fallbackBucket: "ticket" });
      const bucket = location.bucket;
      const storagePath = location.storagePath;
      if (!supabase?.storage || !bucket || !storagePath) return location.directUrl || null;
      await ensureAuthReady();
      const options = {};
      if (transformImage && file.isImage) options.transform = transformImage;
      if (forceDownloadName) options.download = forceDownloadName;
      const { data, error } = await supabase
        .storage
        .from(bucket)
        .createSignedUrl(storagePath, 60 * 60, options);
      if (error) {
        console.warn("[Anexos] createSignedUrl falhou:", error);
        return location.directUrl || null;
      }
      if (file) {
        file.bucket = bucket;
        file.storagePath = storagePath;
        file.signedUrl = data?.signedUrl || file.signedUrl || null;
      }
      return data?.signedUrl || location.directUrl || null;
    }

    async function loadTxtIfNeeded(file) {
      if (!file || file.textContent) return;
      if (file.file instanceof File && file.isTxt) {
        try { file.textContent = await file.file.text(); return; } catch (e) { console.warn(e); }
      }
      if (!file.url) {
        file.url = file.signedUrl = await getFreshSignedUrl(file);
        if (!file.url) return;
      }
      try {
        const res = await fetch(file.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        file.textContent = await res.text();
      } catch (e) {
        console.warn(e);
        file.textContent = translate("(Unable to load this text)");
      }
    }

    watch(
      files,
      () => {
        const info = files.value.map((f) => {
          const location = resolveStorageLocation(f);
          return {
            name: f.file.name,
            size: f.file.size,
            type: f.file.type,
            url: f.url,
            storagePath: location.storagePath,
            bucket: location.bucket,
            signedUrl: f.signedUrl || null,
            attachmentId: f.attachmentId || null,
          };
        });
        attachmentsInfo.value = info;
        if (setAttachmentsInfo) setAttachmentsInfo(info);
      },
      { deep: true, immediate: true }
    );

    // --- Data source load & clear ---
    let dsLoadVersion = 0;

    async function loadFromDataSource(data) {
      const myVersion = ++dsLoadVersion;
      if (!Array.isArray(data)) { files.value = []; return; }
      await ensureAuthReady();
      // IMPORTANTE: não assumir que supabase.storage já existe na 1ª carga
      const storageReady = await waitForStorage(1500); // tenta rapidamente; se não, segue sem assinar URLs

      const items = await Promise.all(
        data.map(async (item) => {
          const kind = detectFileKind(item.filename, item.mimetype);
          const location = resolveStorageLocation(item, { fallbackBucket: "ticket" });
          const bucket = location.bucket || "ticket";
          const storagePath = location.storagePath;
          const directUrl = location.directUrl;
          const info = {
            file: { name: item.filename, size: item.filesizebytes, type: item.mimetype },
            url: null,
            isImage: kind.isImage,
            isPdf: kind.isPdf,
            isTxt: kind.isTxt,
            isUploaded: true,
            bucket,
            storagePath,
            signedUrl: null,
            attachmentId: item.id,
            createdBy: item.createdby,
            createdDate: item.createddate,
            textContent: null,
          };
          try {
            if (storageReady && supabase?.storage && bucket && storagePath) {
              const options = info.isImage ? { transform: { width: 1200, resize: "contain" } } : undefined;
              const { data: signed, error } = await supabase
                .storage.from(bucket)
                .createSignedUrl(storagePath, 60 * 60, options);
              if (!error) info.url = info.signedUrl = signed?.signedUrl || null;
              else if (directUrl) info.url = directUrl;
            } else if (directUrl) {
              info.url = directUrl;
            }
          } catch (e) { console.warn(e); }
          return info;
        })
      );
      if (myVersion !== dsLoadVersion) return;
      files.value = items;
    }

    function clearFiles() {
      for (const f of files.value) {
        if (f?.url && typeof f.url === "string" && f.url.startsWith("blob:")) {
          try { URL.revokeObjectURL(f.url); } catch {}
        }
      }
      files.value = [];
      attachmentsInfo.value = [];
      if (setAttachmentsInfo) setAttachmentsInfo([]);
      clearPendingAttachmentBodies();
      currentIndex.value = 0;
      isModalOpen.value = false;
    }

    function handleDataSource(ds) {
      if (!ds) { dsLoadVersion++; clearFiles(); return; }
      let data = ds;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { dsLoadVersion++; clearFiles(); return; }
      }
      if (!Array.isArray(data)) { dsLoadVersion++; clearFiles(); return; }
      loadFromDataSource(data);
    }

    watch(() => props.content?.dataSource, (ds) => handleDataSource(ds), { immediate: true });

    // --- Clear on context change even when dataSource stays null ---
    const contextKey = ref("");
    const buildContextKey = () => {
      const ws = getVar(workspaceVarId) || "no-ws";
      const tk = getVar(ticketVarId) || "no-ticket";
      return `${ws}|${tk}`;
    };
    let contextPollId = null;

    onMounted(() => {
      contextKey.value = buildContextKey();
      contextPollId = window.setInterval(() => {
        const k = buildContextKey();
        if (k !== contextKey.value) {
          contextKey.value = k;
          const ds = props.content?.dataSource;
          const isEmpty = !ds || (Array.isArray(ds) && ds.length === 0) || (typeof ds === "string" && ds.trim() === "");
          if (isEmpty) { dsLoadVersion++; clearFiles(); }
        }
      }, 500);
    });

    onBeforeUnmount(() => {
      if (contextPollId) { clearInterval(contextPollId); contextPollId = null; }
      clearFiles();
    });

    function remount() {
      sb = window?.wwLib?.wwPlugins?.supabase;
      supabase = sb?.instance || null;
      auth = window?.wwLib?.wwPlugins?.supabaseAuth?.publicInstance || null;

      dsLoadVersion++;
      clearPendingAttachmentBodies();
      handleDataSource(props.content?.dataSource);
    }

    function triggerFileInput() {
      if (fileInput.value) fileInput.value.click();
    }

    async function onFilesSelected(event) {
      const picked = Array.from(event.target.files || []);
      if (!picked.length) return;

      const errorMessages = [];

      const selected = picked.map((file) => {
        const kind = detectFileKind(file.name, file.type);
        return {
          file,
          url: (file.type?.startsWith("image/") || kind.isImage || file.type === "application/pdf")
            ? URL.createObjectURL(file) : null,
          isImage: kind.isImage, isPdf: kind.isPdf, isTxt: kind.isTxt,
          isUploaded: false, bucket: "ticket", storagePath: null,
          signedUrl: null, attachmentId: null, textContent: null,
        };
      });
      files.value.push(...selected);

      const language = getVar(languageVarId);
      const WorkspaceID = getVar(workspaceVarId);
      const LoggedUserID = getVar(loggedUserVarId);
      const TicketID = getVar(ticketVarId);
      const bucket = "ticket";

      const { data: userData, error: authErr } = await auth?.auth?.getUser ? await auth.auth.getUser() : { data: { user: null }, error: null };
      if (auth && (authErr || !userData?.user)) {
        errorMessages.push(authErr ? `Erro ao obter usuário do Supabase Auth: ${authErr.message || authErr}` : "Usuário não autenticado no Supabase.");
        showError(errorMessages.join("\n")); event.target.value = ""; return;
      }

      // Garante que storage está pronto antes do upload
      const okStorage = await waitForStorage(4000);
      if (!okStorage || !supabase?.storage) {
        showError("Supabase Storage não está pronto. Tente novamente em alguns segundos.");
        return;
      }

      for (const item of selected) {
        const { file } = item;
        const extension = (file.name.split(".").pop() || "").toLowerCase();
        const unique = (window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36)) + (extension ? `.${extension}` : "");
        const pathObject = `${WorkspaceID || "no-workspace"}/${TicketID || "no-ticket"}/${unique}`;

        try {
          try {
            const { data: allowed, error: rpcCheckErr } = await sb?.callPostgresFunction ? await supabase.rpc("rls_user_in_path_workspace", { obj_name: pathObject }) : { data: true, error: null };
            if (rpcCheckErr) { console.warn(rpcCheckErr); } else if (allowed === false) { console.error("RLS: sem acesso."); continue; }
          } catch (e) { console.warn(e); }

          const contentType = guessContentType(file.name, file.type || "application/octet-stream");

          const { error: upErr } = await supabase.storage.from(bucket).upload(pathObject, file, {
            cacheControl: "3600", upsert: false, contentType,
          });
          if (upErr) { errorMessages.push(`Erro no upload para Supabase Storage: ${upErr.message || upErr}`); continue; }

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

          let attachmentId = null;
          if (autoSaveToPostticketattachment.value) {
            const { data: rpcData, error: rpcError } = sb?.callPostgresFunction
              ? await sb.callPostgresFunction({ functionName: "postticketattachment", params: rpcBody })
              : { data: null, error: null };

            if (rpcError) {
              errorMessages.push(`Erro ao chamar postticketattachment: ${rpcError.message || rpcError}`);
            } else {
              attachmentId = Array.isArray(rpcData)
                ? rpcData[0]?.p_attachment_id || rpcData[0]?.attachment_id
                : rpcData?.p_attachment_id || rpcData?.attachment_id || null;
            }
          } else {
            pushPendingAttachmentBody({ ...rpcBody });
          }

          const signedUrl = await getFreshSignedUrl({ bucket, storagePath: pathObject, isImage: item.isImage }, { transformImage: { width: 1200, resize: "contain" } });

          item.isUploaded = true;
          item.bucket = bucket;
          item.storagePath = pathObject;
          item.signedUrl = signedUrl || null;
          item.url = signedUrl || item.url;
          item.attachmentId = attachmentId;

          emit("trigger-event", {
            name: "onUpload",
            event: {
              value: {
                ...rpcBody,
                p_attachment_id: attachmentId,
                language,
                file,
                signedUrl,
                autoSaved: autoSaveToPostticketattachment.value,
              },
            },
          });
        } catch (err) {
          errorMessages.push(`Falha geral no upload: ${err.message || err}`);
        }
      }

      event.target.value = "";

      if (errorMessages.length) showError(errorMessages.join("\n"));
      else showSuccess(); // "Data saved successfully"
    }

    // real delete (after confirmation)
    async function performDelete(index) {
      const removed = files.value.splice(index, 1)[0];
      if (removed && removed.url && removed.url.startsWith("blob:")) {
        URL.revokeObjectURL(removed.url);
      }

      const errorMessages = [];

      const removalLocation = resolveStorageLocation(removed, { fallbackBucket: "ticket" });
      const removalBucket = removalLocation.bucket;
      const removalPath = removalLocation.storagePath;

      const shouldRemoveFromStorage = !!(removalBucket && removalPath && supabase?.storage);
      const shouldCallRpcDelete = !!(removed?.attachmentId && sb?.callPostgresFunction);

      if (shouldRemoveFromStorage || shouldCallRpcDelete) {
        const WorkspaceID = getVar(workspaceVarId);
        const LoggedUserID = getVar(loggedUserVarId);
        const TicketID = getVar(ticketVarId);
        try {
          if (shouldRemoveFromStorage) {
            const { error: storageErr } = await supabase.storage
              .from(removalBucket)
              .remove([removalPath]);
            if (storageErr) errorMessages.push(`Erro ao remover arquivo do storage: ${storageErr.message || storageErr}`);
          }

          if (shouldCallRpcDelete) {
            const rpcBody = {
              p_action: "delete",
              p_workspace_id: WorkspaceID ?? null,
              p_ticket_id: TicketID ?? null,
              p_loggeruserid: LoggedUserID ?? null,
              p_filename: removed.file?.name ?? null,
              p_fileextension: removed.file?.name?.split(".").pop() ?? null,
              p_filesize: removed.file?.size ?? null,
              p_mimetype: "",
              p_bucket: removalBucket ?? null,
              p_objectpath: removalPath ?? null,
              p_attachment_id: removed.attachmentId ?? null,
            };

            const { error: rpcError } = await sb.callPostgresFunction({
              functionName: "postticketattachment", params: rpcBody,
            });
            if (rpcError) errorMessages.push(`Erro ao chamar postticketattachment: ${rpcError.message || rpcError}`);
          }
        } catch (err) {
          errorMessages.push(`Falha ao excluir anexo: ${err.message || err}`);
        }
      }

      if (!autoSaveToPostticketattachment.value) {
        removePendingAttachmentBodyByPath(removalPath);
      }

      if (errorMessages.length) showError(errorMessages.join("\n"));
      else showSuccess("Data deleted successfully");
    }

    async function downloadFile(file) {
      try {
        let signed = await getFreshSignedUrl(file, { forceDownloadName: file.file?.name || "download" });
        if (!signed && file.file instanceof File) {
          const blobUrl = URL.createObjectURL(file.file);
          const a = document.createElement("a");
          a.href = blobUrl; a.download = file.file?.name || "download";
          document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(blobUrl);
          return;
        }
        if (!signed) { showError("Não foi possível gerar a URL para download."); return; }
        const res = await fetch(signed);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl; a.download = file.file?.name || "download";
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(blobUrl);
      } catch (e) {
        console.warn("[Anexos] Download falhou:", e);
        showError(`Falha no download: ${e.message || e}`);
      }
    }

    function getFileIcon(name) {
      const ext = (name.split(".").pop() || "").toLowerCase();
      switch (ext) {
        case "pdf": return "fa-solid fa-file-pdf";
        case "doc":
        case "docx": return "fa-solid fa-file-word";
        case "xls":
        case "xlsx": return "fa-solid fa-file-excel";
        case "ppt":
        case "pptx": return "fa-solid fa-file-powerpoint";
        case "txt":
        case "log": return "fa-solid fa-file-lines";
        default: return "fa-solid fa-file";
      }
    }

    async function openModal(index) {
      currentIndex.value = index;
      const f = files.value[index];
      // tenta resolver URL se ainda não houver (pode acontecer se storage não estava pronto na 1ª carga)
      if (f && !f.url && (f.bucket && f.storagePath)) {
        f.url = f.signedUrl = await getFreshSignedUrl(f, { transformImage: { width: 1200, resize: "contain" } });
      }
      if (f?.isTxt) await loadTxtIfNeeded(f);
      isModalOpen.value = true;
    }

    function closeModal() { isModalOpen.value = false; }
    function nextFile() { if (currentIndex.value < files.value.length - 1) currentIndex.value++; }
    function prevFile() { if (currentIndex.value > 0) currentIndex.value--; }
    function zoomIn() { zoom.value += 0.1; }
    function zoomOut() { zoom.value = Math.max(0.1, zoom.value - 0.1); }

    function showSuccess(message = "Data saved successfully") {
      const translatedMessage = translate(message || "Data saved successfully");
      popup.value = { visible: true, type: "success", details: "", title: translatedMessage };
      detailsOpen.value = false;
      setTimeout(() => { popup.value.visible = false; }, 1000);
    }
    function showError(details) {
      const translatedDetails = translate(details || "");
      popup.value = {
        visible: true,
        type: "error",
        details: translatedDetails,
        title: translate("Error saving data"),
      };
      detailsOpen.value = false;
    }
    function closePopup() { popup.value.visible = false; }
    function toggleDetails() { detailsOpen.value = !detailsOpen.value; }

    return {
      files,
      fileInput,
      triggerFileInput,
      onFilesSelected,
      // delete flow
      requestDelete, cancelDelete, confirmDelete, performDelete,
      confirm,

      downloadFile,
      isModalOpen, currentIndex, currentFile, openModal, closeModal, nextFile, prevFile,
      zoom, zoomIn, zoomOut,
      getFileIcon,
      attachmentsInfo,
      popup, detailsOpen, closePopup, toggleDetails,
      pendingAttachmentsBodies,
      remount,
      thumbnailStyles,
      translate,
      t: translate,
    };
  },
};
</script>

<style lang="scss" scoped>
@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined");
@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css");

/* ---------- Attachments grid ---------- */
.attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  --thumbnail-width: 140px;
  --thumbnail-height: 130px;
  --thumbnail-preview-height: 85px;
  --file-icon-size: 85px;
  --upload-icon-size: 55px;
}
.upload-button {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: var(--thumbnail-width); height: var(--thumbnail-height);
  padding: clamp(6px, calc(var(--thumbnail-height) * 0.085), 14px);
  border: 2px dashed #ccc; border-radius: 6px; background: #ffffff; color: #555; cursor: pointer;
  gap: clamp(4px, calc(var(--thumbnail-height) * 0.06), 10px);
}
.upload-icon { font-size: var(--upload-icon-size); line-height: 1; font-weight: 300; }
.hidden-input { display: none; }

.file-item {
  position: relative; width: var(--thumbnail-width); height: var(--thumbnail-height); border: 1px solid #ddd; border-radius: 4px;
  padding: clamp(6px, calc(var(--thumbnail-height) * 0.077), 12px); text-align: center; display: flex; flex-direction: column;
  align-items: center; justify-content: flex-start; gap: clamp(4px, calc(var(--thumbnail-height) * 0.06), 10px); font-size: 12px; background: #fff;
}
.file-icon { font-size: var(--file-icon-size); cursor: pointer; }
.fa-file-pdf { color: #e53935; } .fa-file-word { color: #3b73b9; } .fa-file-excel { color: #2e7d32; }
.fa-file-powerpoint { color: #d84315; } .fa-file-lines { color: #546e7a; }
.file-preview { width: 100%; height: var(--thumbnail-preview-height); object-fit: contain; background: #f5f6fa; border-radius: 6px; cursor: pointer; }
.file-name {
  width: 100%; text-align: center; overflow: hidden;
  font-size: clamp(9px, calc(var(--thumbnail-height) * 0.092), 12px); line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  white-space: normal; word-break: break-word; margin-top: auto;
}
.file-actions { position: absolute; top: 4px; right: 4px; display: flex; gap: 4px; opacity: 0; transition: opacity .2s; }
.file-item:hover .file-actions { opacity: 1; }
.action-button {
  width: 24px; height: 24px; border: none; background: rgba(0,0,0,.6); color: #fff; border-radius: 4px;
  cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;
}

.material-symbols-outlined { font-size: 16px; line-height: 1; vertical-align: middle; }
i.material-symbols-outlined {
  font-family: "Material Symbols Outlined"; font-weight: normal; font-style: normal; font-size: 18px; line-height: 1;
  letter-spacing: normal; text-transform: none; display: inline-block; white-space: nowrap; direction: ltr;
  -webkit-font-feature-settings: "liga"; -webkit-font-smoothing: antialiased; color: #e0e0e0;
}

/* ---------- Preview Modal ---------- */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: transparent; padding: 0; border-radius: 0; max-width: 80%; max-height: 80%; display: flex; align-items: center; position: relative; }
.modal-content.pdf-viewer { max-width: none; max-height: none; width: 95vw; height: 95vh; }
.modal-body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; max-height: 100%; width: 100%; height: 100%; }
.modal-image { width: 600px; height: 400px; object-fit: contain; position: relative; z-index: 1; }
.modal-pdf { width: 100%; height: 100%; flex: 1; border: none; position: relative; z-index: 1; }

.modal-txt {
  max-width: 80vw; max-height: 65vh; overflow: auto; background: #0b0b0b; color: #eaeaea;
  padding: 12px 14px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-word;
}
.modal-file-name { margin-top: 8px; color: #fff; position: relative; z-index: 2; }
.zoom-controls { margin-top: 8px; display: flex; gap: 8px; background: rgba(0,0,0,.6); border-radius: 4px; padding: 5px; }
.zoom-button { border: none; color: #fff; cursor: pointer; font-size: 22px !important; }
.modal-top-actions { position: absolute; top: 10px; right: 10px; display: flex; gap: 8px; z-index: 2; }
.modal-action-button { width: 40px; height: 40px; background: #3c3c3c; color: #fff; border: none; border-radius: 4px; display:flex; align-items:center; justify-content:center; cursor:pointer; }
.modal-action-button i.material-symbols-outlined { font-size: 22px; color: #fff; }

.nav-button { background: rgba(0,0,0,.6); color:#fff; border:none; width:40px; height:40px; cursor:pointer; font-size:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; position:absolute; top:50%; transform:translateY(-50%); z-index:2; }
.nav-button.prev { left: 35px; } .nav-button.next { right: 35px; }
.nav-button:disabled { opacity:.3; cursor:not-allowed; }
.nav-button i.material-symbols-outlined { color:#fff; }
.file-not-viewable { width:600px; height:400px; background:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:4px; }
.modal-file-icon { font-size: 120px; margin-bottom: 16px; }
.no-preview { font-size: 14px; color: #333; }

/* ---------- Toast ---------- */
.popup { position: fixed; top: 20px; right: 20px; background:#fff; border-left:4px solid; border-radius:4px; box-shadow:0 2px 6px rgba(0,0,0,.2); padding:16px; min-width:250px; z-index:1100; }
.popup.success { border-left-color:#4caf50; } .popup.error { border-left-color:#f44336; }
.popup-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.popup-title { font-weight:600; }
.popup-close { background:none; border:none; cursor:pointer; padding:0; color:#555; }
.popup-details .details-toggle { background:none; border:none; color:#007bff; display:flex; align-items:center; gap:4px; cursor:pointer; padding:0; }
.details-text { margin-top:8px; white-space:pre-wrap; }

/* ---------- Delete Confirmation (match screenshot) ---------- */
:root { /* fallback if needed */ }
.confirm-overlay { position: fixed; inset: 0; background: rgba(15,15,15,.6); display:flex; align-items:center; justify-content:center; z-index: 1200; }
.confirm-card {
  width: 430px; max-width: 90vw; background: #fff; border-radius: 10px; box-shadow: 0 12px 30px rgba(0,0,0,.25); overflow: hidden;
}
.confirm-card__header {
  display:flex; align-items:center; justify-content:space-between; padding: 12px 14px; border-bottom: 1px solid #eee;
}
.confirm-card__title { display:flex; align-items:center; gap: 8px; font-weight:600; color:#111; }
.confirm-card__icon { font-size: 18px; color: #e53935; } /* red X on the left of "Delete" */
.confirm-card__close { background:none; border:none; cursor:pointer; color:#666; }
.confirm-card__body { padding: 16px 16px 4px 16px; color:#333; }
.confirm-card__body p { margin: 0 0 8px 0; }
.confirm-card__footer {
  display:flex; justify-content:flex-end; gap: 10px; padding: 12px 16px 16px 16px;
}

.btn {
  min-width: 96px; height: 36px; padding: 0 18px; border-radius: 18px; /* pill look like screenshot */
  border: none; cursor: pointer; font-weight: 600; display:inline-flex; align-items:center; justify-content:center;
}
.btn-text {
  background: transparent; color: #4f9d8f; /* green text like screenshot */
}
.btn-text:hover { background: #f2f7f6; }
.btn-primary {
  background: #4f9d8f; color:#fff;  /* green filled like screenshot */
}
.btn-primary:hover { background: #418b7f; }

.spinner {
  width: 16px; height: 16px; border: 2px solid #fff; border-bottom-color: transparent; border-radius: 50%;
  display:inline-block; box-sizing:border-box; animation: spin .8s linear infinite; margin-right: 6px;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
