<template>
  <div class="attachments" :style="thumbnailStyles">
    <button type="button" class="upload-button" @click="triggerFileInput">
      <span class="upload-icon">+</span>
    </button>
    <input ref="fileInput" type="file" multiple class="hidden-input" @change="onFilesSelected" />

    <div v-for="(file, index) in files" :key="file.storagePath || index" class="file-item">
      <img v-if="file.isImage && file.url" :src="file.url" class="file-preview" alt="" @click="openModal(index)" />
      <i v-else :class="['file-icon', getFileIcon(file.file.name)]" @click="openModal(index)"></i>
      <div class="file-name">{{ file.file.name }}</div>
      <div class="file-actions">
        <button type="button" class="action-button" @click="downloadFile(file)"><i class="material-symbols-outlined">download</i></button>
        <button type="button" class="action-button" @click="performDelete(index)"><i class="material-symbols-outlined">delete</i></button>
      </div>
    </div>
  </div>

  <div v-if="isModalOpen" class="modal-overlay" @click.self="isModalOpen = false">
    <div class="modal-content">
      <img v-if="currentFile?.isImage" :src="currentFile.url" class="modal-image" alt="" />
      <iframe v-else-if="currentFile?.isPdf" :src="currentFile.url" class="modal-pdf"></iframe>
      <div v-else class="file-name">{{ currentFile?.file?.name }}</div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch } from "vue";

export default {
  name: "AnexosGenerico",
  props: {
    content: { type: Object, required: true },
    wwElementState: { type: Object, required: true },
    wwEditorState: { type: Object, required: true },
    uid: { type: String, required: true },
  },
  emits: ["trigger-event"],
  setup(props, { emit }) {
    const files = ref([]);
    const fileInput = ref(null);
    const isModalOpen = ref(false);
    const currentIndex = ref(0);

    const sb = window?.wwLib?.wwPlugins?.supabase;
    const supabase = sb?.instance || null;

    const effectiveBucket = computed(() => (props.content?.bucketName || "ticket").trim() || "ticket");
    const effectiveObjectId = computed(() => (props.content?.objectId != null ? String(props.content.objectId).trim() : ""));

    const thumbnailHeight = computed(() => Number(props.content?.thumbnailHeight) || 130);
    const thumbnailStyles = computed(() => ({
      "--thumbnail-height": `${thumbnailHeight.value}px`,
      "--thumbnail-width": `${(thumbnailHeight.value * 140) / 130}px`,
      "--thumbnail-preview-height": `${(thumbnailHeight.value * 85) / 130}px`,
    }));

    const currentFile = computed(() => files.value[currentIndex.value]);

    function detectFileKind(name = "", type = "") {
      const ext = (name.split(".").pop() || "").toLowerCase();
      return {
        isImage: type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext),
        isPdf: type === "application/pdf" || ext === "pdf",
      };
    }

    watch(
      () => props.content?.dataSource,
      (value) => {
        const data = Array.isArray(value) ? value : [];
        files.value = data.map((item) => {
          const kind = detectFileKind(item.filename, item.mimetype);
          return {
            file: { name: item.filename || "file", size: item.filesizebytes || 0, type: item.mimetype || "" },
            url: item.url || item.publicUrl || item.signedUrl || null,
            storagePath: item.storagePath || item.objectpath || item.path || null,
            bucket: item.bucket || effectiveBucket.value,
            attachmentId: item.id || null,
            ...kind,
          };
        });
      },
      { immediate: true }
    );

    async function runFunction(functionName, body) {
      if (!functionName || !sb?.callPostgresFunction) throw new Error("Supabase function name not provided.");
      const { data, error } = await sb.callPostgresFunction({ functionName, params: body || {} });
      if (error) throw error;
      return data;
    }

    async function runInsertAction(args = {}) {
      const result = await runFunction(args.functionName, args.body);
      emit("trigger-event", { name: "onInsert", event: { value: { functionName: args.functionName, body: args.body || {}, result } } });
      return result;
    }

    async function runDeleteAction(args = {}) {
      const result = await runFunction(args.functionName, args.body);
      emit("trigger-event", { name: "onDelete", event: { value: { functionName: args.functionName, body: args.body || {}, result } } });
      return result;
    }

    async function runEditAction(args = {}) {
      const result = await runFunction(args.functionName, args.body);
      emit("trigger-event", { name: "onEdit", event: { value: { functionName: args.functionName, body: args.body || {}, result } } });
      return result;
    }

    function triggerFileInput() {
      fileInput.value?.click();
    }

    async function onFilesSelected(event) {
      const picked = Array.from(event.target.files || []);
      const workspaceId = window?.wwLib?.wwVariable?.getValue?.("744511f1-3309-41da-a9fd-0721e7dd2f99") || "no-workspace";

      for (const file of picked) {
        const kind = detectFileKind(file.name, file.type);
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        const unique = (window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36)) + (ext ? `.${ext}` : "");
        const path = `${workspaceId}/${effectiveObjectId.value || "no-object"}/${unique}`;

        if (supabase?.storage) {
          await supabase.storage.from(effectiveBucket.value).upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
        }

        const item = {
          file,
          storagePath: path,
          bucket: effectiveBucket.value,
          url: kind.isImage || kind.isPdf ? URL.createObjectURL(file) : null,
          attachmentId: null,
          ...kind,
        };

        files.value.push(item);
        emit("trigger-event", {
          name: "onInsert",
          event: { value: { action: "insert", objectId: effectiveObjectId.value || null, bucket: effectiveBucket.value, objectpath: path, file } },
        });
      }

      event.target.value = "";
    }

    async function performDelete(index) {
      const removed = files.value.splice(index, 1)[0];
      if (!removed) return;
      if (supabase?.storage && removed.bucket && removed.storagePath) {
        await supabase.storage.from(removed.bucket).remove([removed.storagePath]);
      }
      emit("trigger-event", {
        name: "onDelete",
        event: {
          value: { action: "delete", objectId: effectiveObjectId.value || null, bucket: removed.bucket, objectpath: removed.storagePath, attachmentId: removed.attachmentId },
        },
      });
    }

    function openModal(index) {
      currentIndex.value = index;
      isModalOpen.value = true;
    }

    async function downloadFile(file) {
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.file?.name || "download";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    function remount() {
      files.value = [];
    }

    function getFileIcon(name = "") {
      const ext = (name.split(".").pop() || "").toLowerCase();
      if (ext === "pdf") return "fa-solid fa-file-pdf";
      if (["doc", "docx"].includes(ext)) return "fa-solid fa-file-word";
      if (["xls", "xlsx"].includes(ext)) return "fa-solid fa-file-excel";
      return "fa-solid fa-file";
    }

    return { files, fileInput, isModalOpen, currentFile, triggerFileInput, onFilesSelected, performDelete, openModal, downloadFile, getFileIcon, remount, runInsertAction, runDeleteAction, runEditAction, thumbnailStyles };
  },
};
</script>

<style lang="scss" scoped>
@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined");
@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css");
.attachments { display: flex; flex-wrap: wrap; gap: 12px; }
.upload-button, .file-item { width: var(--thumbnail-width); height: var(--thumbnail-height); }
.upload-button { border: 2px dashed #ccc; background: #fff; border-radius: 6px; }
.upload-icon { font-size: 40px; }
.hidden-input { display: none; }
.file-item { position: relative; border: 1px solid #ddd; border-radius: 6px; padding: 8px; }
.file-preview { width: 100%; height: var(--thumbnail-preview-height); object-fit: contain; }
.file-icon { font-size: 60px; }
.file-name { font-size: 11px; overflow: hidden; text-overflow: ellipsis; }
.file-actions { position: absolute; top: 4px; right: 4px; display: flex; gap: 4px; }
.action-button { background: rgba(0,0,0,.6); border: none; color: white; border-radius: 4px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; }
.modal-content { background: white; padding: 12px; max-width: 90vw; max-height: 90vh; }
.modal-image, .modal-pdf { max-width: 80vw; max-height: 80vh; width: 900px; height: 600px; border: none; }
</style>
