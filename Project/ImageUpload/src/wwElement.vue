<template>
  <div
    class="image-upload"
    :class="{ 'is-uploading': isUploading }"
    :style="{ height: computedHeight }"
  >
    <input
      ref="fileInput"
      type="file"
      :accept="acceptList"
      class="image-upload__file-input"
      @change="onFileSelected"
    />

    <button
      class="image-upload__button"
      type="button"
      :disabled="isUploading"
      @click="triggerFileInput"
    >
      <span
        class="material-symbols-outlined image-upload__icon"
        :style="iconStyle"
      >
        {{ icon }}
      </span>
    </button>

  </div>
</template>

<script>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { translatePhrase } from "./translation";

export default {
  name: "ImageUpload",
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
    const fileInput = ref(null);
    const displayUrl = ref("");
    const officialUrl = ref("");
    const isUploading = ref(false);

    const SUPPORTED_FILES = [
      { mime: "application/pdf", exts: ["pdf"] },
      { mime: "application/msword", exts: ["doc"] },
      {
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        exts: ["docx"],
      },
      { mime: "application/vnd.ms-excel", exts: ["xls"] },
      {
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        exts: ["xlsx"],
      },
      { mime: "text/plain", exts: ["txt", "log"] },
      { mime: "image/png", exts: ["png"] },
      { mime: "image/jpeg", exts: ["jpg", "jpeg"] },
      { mime: "image/gif", exts: ["gif"] },
      { mime: "image/webp", exts: ["webp"] },
      { mime: "image/bmp", exts: ["bmp"] },
      { mime: "image/svg+xml", exts: ["svg"] },
    ];

    const allowedExtensions = new Set(
      SUPPORTED_FILES.flatMap(({ exts }) => exts).map((ext) => ext.toLowerCase())
    );
    const allowedMimeTypes = new Set(
      SUPPORTED_FILES.map(({ mime }) => mime.toLowerCase()).filter(Boolean)
    );
    const acceptList = computed(() =>
      SUPPORTED_FILES.flatMap(({ mime, exts }) => [mime, ...exts.map((ext) => `.${ext}`)])
        .filter(Boolean)
        .join(",")
    );

    const objectUrls = new Set();
    const storageInfo = ref(null);

    const heightMap = {
      small: "150px",
      medium: "200px",
      large: "300px",
    };

    function translate(text) {
      if (text == null) return "";
      const value = typeof text === "string" ? text : String(text);

      try {
        const phrase = translatePhrase(value);
        if (phrase !== undefined && phrase !== null && phrase !== "") {
          return phrase;
        }
      } catch (error) {
        console.warn("[ImageUpload] translatePhrase error:", error);
      }

      try {
        const translated = window.translateText?.(value);
        if (translated !== undefined && translated !== null && translated !== "") {
          return translated;
        }
      } catch (error) {
        console.warn("[ImageUpload] Translation error:", error);
      }

      return value;
    }

    const computedHeight = computed(() => {
      const raw = (props.content?.imageHeight || "medium").toString().toLowerCase();
      return heightMap[raw] || heightMap.medium;
    });

    const icon = computed(() => {
      const rawIcon = props.content?.iconName;
      if (typeof rawIcon !== "string") return "attach_file";
      const trimmed = rawIcon.trim();
      return trimmed || "attach_file";
    });

    const iconColor = computed(() => {
      const rawColor = props.content?.iconColor;
      if (typeof rawColor !== "string") return "#475569";
      return rawColor.trim() || "#475569";
    });

    const iconSize = computed(() => {
      const rawSize = Number(props.content?.iconSize);
      if (Number.isFinite(rawSize) && rawSize > 0) return `${rawSize}px`;
      return "32px";
    });

    const iconStyle = computed(() => ({
      color: iconColor.value,
      fontSize: iconSize.value,
    }));

    // expoõe a URL atual via variável do WeWeb (igual estava)
    const bannerImageUrl = ref("");
    let setBannerImageUrl;
    if (
      typeof wwLib !== "undefined" &&
      wwLib.wwVariable &&
      wwLib.wwVariable.useComponentVariable
    ) {
      const { value, setValue } = wwLib.wwVariable.useComponentVariable({
        uid: props.uid,
        name: "bannerImageUrl",
        type: "string",
        defaultValue: "",
      });
      bannerImageUrl.value = value.value || "";
      setBannerImageUrl = setValue;
    }
    function syncBannerUrl(nextUrl) {
      const normalized = typeof nextUrl === "string" ? nextUrl : "";
      bannerImageUrl.value = normalized;
      if (setBannerImageUrl) setBannerImageUrl(normalized);
    }

    // variáveis do projeto
    const getVar = (id) => window?.wwLib?.wwVariable?.getValue?.(id);
    const workspaceVarId = "744511f1-3309-41da-a9fd-0721e7dd2f99";
    const ticketVarId = "7bebd888-f31e-49e7-bef2-4052c8cb6cf5";

    // plugins supabase
    let sb = window?.wwLib?.wwPlugins?.supabase;
    let supabase = sb?.instance || null;
    let auth = window?.wwLib?.wwPlugins?.supabaseAuth?.publicInstance || null;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Para upload (RLS ainda exige user autenticado). Para leitura pública não é necessário.
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
    async function waitForStorage(maxMs = 4000) {
      const start = Date.now();
      while (Date.now() - start < maxMs) {
        if (supabase && supabase.storage) return true;
        await sleep(100);
      }
      return false;
    }

    function extOf(name = "") {
      const seg = String(name).split(".").pop() || "";
      return seg.toLowerCase();
    }
    function guessContentType(name, fallback = "application/octet-stream") {
      const ext = extOf(name);
      if (ext === "pdf") return "application/pdf";
      if (ext === "doc") return "application/msword";
      if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      if (ext === "xls") return "application/vnd.ms-excel";
      if (ext === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) {
        return `image/${ext === "jpg" ? "jpeg" : ext}`;
      }
      if (ext === "txt" || ext === "log") return "text/plain";
      if (ext === "json") return "application/json";
      if (ext === "csv") return "text/csv";
      return fallback;
    }

    function isSupportedFile(file) {
      const type = file?.type?.toLowerCase?.();
      const extension = extOf(file?.name).toLowerCase();
      if (type && allowedMimeTypes.has(type)) return true;
      if (extension && allowedExtensions.has(extension)) return true;
      return false;
    }

    // === NOVO: sempre usar URL pública (bucket público) ===
    function getPublicUrl(bucket, storagePath) {
      if (!bucket || !storagePath || !supabase?.storage) return null;
      try {
        // Você pode manter transform para servir redimensionado pela Image CDN
        const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath, {
          transform: { width: 1600, resize: "contain" },
        });
        return data?.publicUrl || null;
      } catch (e) {
        console.warn("[ImageUpload] getPublicUrl error:", e);
        return null;
      }
    }

    let loadToken = 0;
    async function applyContentImage(rawValue) {
      const token = ++loadToken;
      if (!rawValue) {
        if (token !== loadToken) return;
        storageInfo.value = null;
        officialUrl.value = "";
        displayUrl.value = "";
        syncBannerUrl("");
        return;
      }

      let resolvedUrl = "";
      let resolvedStorage = null;

      // Se vier string: pode ser URL completa ou "path/no/bucket"
      if (typeof rawValue === "string") {
        const trimmed = rawValue.trim();
        if (/^(https?:|data:|blob:)/i.test(trimmed)) {
          resolvedUrl = trimmed; // já é uma URL
        } else {
          const bucket = "banners";
          const publicUrl = getPublicUrl(bucket, trimmed);
          if (token !== loadToken) return;
          resolvedUrl = publicUrl || trimmed;
          resolvedStorage = { bucket, storagePath: trimmed };
        }
      } else if (typeof rawValue === "object") {
        const bucket = rawValue?.bucket || rawValue?.storageBucket || "banners";
        const storagePath = rawValue?.storagePath || rawValue?.objectPath || rawValue?.path || null;
        const hintedUrl = rawValue?.url || rawValue?.publicUrl || rawValue?.signedUrl || "";
        if (hintedUrl) {
          resolvedUrl = hintedUrl;
        }
        if (bucket && storagePath) {
          resolvedStorage = { bucket, storagePath };
          if (!resolvedUrl || resolvedUrl === storagePath) {
            const publicUrl = getPublicUrl(bucket, storagePath);
            if (token !== loadToken) return;
            if (publicUrl) resolvedUrl = publicUrl;
          }
        }
      }

      if (token !== loadToken) return;
      officialUrl.value = resolvedUrl || "";
      displayUrl.value = resolvedUrl || "";
      storageInfo.value = resolvedStorage;
      syncBannerUrl(officialUrl.value);
    }

    // Reagir às mudanças externas do prop
    watch(
      () => props.content?.imageUrl,
      (next) => {
        applyContentImage(next);
      },
      { immediate: true }
    );

    function triggerFileInput() {
      if (isUploading.value) return;
      if (fileInput.value) fileInput.value.click();
    }
    function resetInput(eventTarget) {
      if (eventTarget) eventTarget.value = "";
    }
    // Upload continua igual (precisa passar no RLS de INSERT do storage.objects)
    async function onFileSelected(event) {
      const file = event.target?.files?.[0] || null;
      resetInput(event.target);
      if (!file) return;

      const previousOfficialUrl = officialUrl.value;
      const previousStorage = storageInfo.value ? { ...storageInfo.value } : null;

      let previewUrl = null;
      try {
        if (!isSupportedFile(file)) {
          throw new Error(translate("Tipo de arquivo não suportado."));
        }

        try {
          previewUrl = URL.createObjectURL(file);
          objectUrls.add(previewUrl);
          displayUrl.value = previewUrl;
        } catch (_) {}

        isUploading.value = true;

        await ensureAuthReady();
        const okStorage = await waitForStorage(4000);
        if (!okStorage || !supabase?.storage) {
          throw new Error(translate("Supabase Storage não está pronto. Tente novamente."));
        }

        const { data: userData, error: authErr } = auth?.auth?.getUser
          ? await auth.auth.getUser()
          : { data: { user: null }, error: null };
        if (auth && (authErr || !userData?.user)) {
          throw new Error(
            authErr
              ? `${translate("Erro ao obter usuário do Supabase Auth:")} ${authErr.message || authErr}`
              : translate("Usuário não autenticado no Supabase.")
          );
        }

        const workspace = getVar(workspaceVarId) || "no-workspace";
        const ticket = getVar(ticketVarId) || "no-ticket";
        const bucket = "banners";

        const extension = extOf(file.name);
        const uniqueId = window.crypto?.randomUUID
          ? window.crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
        const objectPath = `${workspace}/${ticket}/banner/${uniqueId}${extension ? `.${extension}` : ""}`;

        // Se você usa uma RPC para validar path, mantenha (ajuste para o bucket 'banners')
        try {
          const { data: allowed, error: rpcError } = sb?.callPostgresFunction
            ? await supabase.rpc("rls_user_in_path_workspace", { obj_name: objectPath })
            : { data: true, error: null };
          if (rpcError) {
            console.warn("[ImageUpload] RLS check falhou:", rpcError);
          } else if (allowed === false) {
            throw new Error(translate("Você não tem permissão para salvar este arquivo."));
          }
        } catch (rlsError) {
          if (rlsError instanceof Error) throw rlsError;
          throw new Error(String(rlsError));
        }

        const contentType = guessContentType(file.name, file.type || "application/octet-stream");
        const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType,
        });
        if (uploadError) {
          throw new Error(uploadError.message || uploadError);
        }

        // === NOVO: usar URL PÚBLICA (não expira) ===
        const publicUrl = getPublicUrl(bucket, objectPath);
        if (!publicUrl) {
          throw new Error(translate("Unable to get public URL for uploaded file."));
        }

        storageInfo.value = { bucket, storagePath: objectPath };
        officialUrl.value = publicUrl;
        displayUrl.value = publicUrl;
        syncBannerUrl(publicUrl);

        emit("trigger-event", {
          name: "onUpload",
          event: {
            value: {
              bucket,
              storagePath: objectPath,
              publicUrl,
              file,
            },
          },
        });
      } catch (error) {
        console.warn("[ImageUpload] Falha no upload:", error);
        storageInfo.value = previousStorage;
        officialUrl.value = previousOfficialUrl;
        displayUrl.value = previousOfficialUrl;
        syncBannerUrl(previousOfficialUrl);
      } finally {
        isUploading.value = false;
        if (previewUrl) {
          try {
            URL.revokeObjectURL(previewUrl);
          } catch (_) {}
          objectUrls.delete(previewUrl);
        }
      }
    }

    function remount() {
      sb = window?.wwLib?.wwPlugins?.supabase;
      supabase = sb?.instance || null;
      auth = window?.wwLib?.wwPlugins?.supabaseAuth?.publicInstance || null;
      applyContentImage(props.content?.imageUrl);
    }

    onBeforeUnmount(() => {
      for (const url of objectUrls) {
        try {
          URL.revokeObjectURL(url);
        } catch (_) {}
      }
      objectUrls.clear();
    });

    return {
      fileInput,
      displayUrl,
      isUploading,
      computedHeight,
      icon,
      triggerFileInput,
      onFileSelected,
      remount,
      translate,
      t: translate,
      iconStyle,
      acceptList,
    };
  },
};
</script>

<style lang="scss" scoped>
.image-upload {
  position: relative;
  width: 100%;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}

.image-upload__file-input {
  display: none;
}

.image-upload__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.image-upload__button:active {
  transform: scale(0.96);
}

.image-upload__button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.image-upload__icon {
  line-height: 1;
}

</style>
