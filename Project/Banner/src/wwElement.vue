<template>
  <div
    class="banner"
    :class="{ 'is-uploading': isUploading }"
    :style="{ height: computedHeight }"
  >
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="banner__file-input"
      @change="onFileSelected"
    />

    <div
      v-if="displayUrl"
      class="banner__image-wrapper"
      :class="{ 'is-uploading': isUploading }"
      @click="triggerFileInput"
    >
      <img :src="displayUrl" alt="" class="banner__image" />
      <div class="banner__overlay">
        <span v-if="isUploading">{{ t("Send image…") }}</span>
        <span v-else>{{ t("Click to change") }}</span>
      </div>
    </div>

    <div v-else class="banner__empty" @click="triggerFileInput">
      <span class="banner__empty-icon">+</span>
      <span class="banner__empty-text">{{ t("Add image") }}</span>
    </div>

    <transition name="banner-popup">
      <div v-if="popup.visible" class="banner__popup" :class="popup.type">
        {{ popup.message }}
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { translatePhrase } from "./translation";

export default {
  name: "Banner",
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
    const popup = ref({ visible: false, type: "", message: "" });

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
        console.warn("[Banner] translatePhrase error:", error);
      }

      try {
        const translated = window.translateText?.(value);
        if (translated !== undefined && translated !== null && translated !== "") {
          return translated;
        }
      } catch (error) {
        console.warn("[Banner] Translation error:", error);
      }

      return value;
    }

    const computedHeight = computed(() => {
      const raw = (props.content?.imageHeight || "medium").toString().toLowerCase();
      return heightMap[raw] || heightMap.medium;
    });

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
      if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) {
        return `image/${ext === "jpg" ? "jpeg" : ext}`;
      }
      if (ext === "txt" || ext === "log") return "text/plain";
      if (ext === "json") return "application/json";
      if (ext === "csv") return "text/csv";
      return fallback;
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
        console.warn("[Banner] getPublicUrl error:", e);
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
    function showPopup(type, message, { autoClose = true } = {}) {
      popup.value = { visible: true, type, message: translate(message) };
      if (autoClose) {
        window.setTimeout(() => {
          popup.value.visible = false;
        }, type === "error" ? 4000 : 1500);
      }
    }
    function showSuccess(message) {
      showPopup("success", message, { autoClose: true });
    }
    function showError(message) {
      showPopup("error", message, { autoClose: false });
    }

    // Upload continua igual (precisa passar no RLS de INSERT do storage.objects)
    async function onFileSelected(event) {
      const file = event.target?.files?.[0] || null;
      resetInput(event.target);
      if (!file) return;

      if (!file.type?.startsWith("image/") && !/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(file.name)) {
        showError(translate("Please select a valid image file."));
        return;
      }

      const previousOfficialUrl = officialUrl.value;
      const previousStorage = storageInfo.value ? { ...storageInfo.value } : null;

      let previewUrl = null;
      try {
        previewUrl = URL.createObjectURL(file);
        objectUrls.add(previewUrl);
        displayUrl.value = previewUrl;
      } catch (_) {}

      isUploading.value = true;

      try {
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
            console.warn("[Banner] RLS check falhou:", rpcError);
          } else if (allowed === false) {
            throw new Error(translate("Você não tem permissão para salvar esta imagem."));
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
          throw new Error(translate("Unable to get public URL for uploaded image."));
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

        showSuccess(translate("Image loaded successfully."));
      } catch (error) {
        console.warn("[Banner] Falha no upload:", error);
        storageInfo.value = previousStorage;
        officialUrl.value = previousOfficialUrl;
        displayUrl.value = previousOfficialUrl;
        syncBannerUrl(previousOfficialUrl);
        showError(error?.message || String(error));
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
      popup,
      computedHeight,
      triggerFileInput,
      onFileSelected,
      remount,
      translate,
      t: translate,
    };
  },
};
</script>

<style lang="scss" scoped>
.banner {
  position: relative;
  width: 100%;
  min-height: 120px;
}

.banner__file-input {
  display: none;
}

.banner__image-wrapper,
.banner__empty {
  width: 100%;
  height: 100%;
  border-radius: 1px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}

.banner__image-wrapper:hover,
.banner__empty:hover {
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18);
}

.banner__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.banner__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.5);
  color: #ffffff;
  font-size: 15px;
  font-weight: 500;
  opacity: 0;
  transition: opacity 0.2s ease;
  text-align: center;
  padding: 0 16px;
}

.banner__image-wrapper:hover .banner__overlay,
.banner__image-wrapper.is-uploading .banner__overlay,
.banner.is-uploading .banner__overlay {
  opacity: 1;
}

.banner__empty {
  border: 2px dashed #cbd5f5;
  color: #475569;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
}

.banner__empty-icon {
  font-size: 48px;
  line-height: 1;
}

.banner__empty-text {
  font-weight: 500;
}

.banner__popup {
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  padding: 10px 16px;
  border-radius: 1px;
  font-size: 13px;
  font-weight: 500;
  color: #0f172a;
  background: #f1f5f9;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.2);
}

.banner__popup.success {
  background: #dcfce7;
  color: #166534;
}

.banner__popup.error {
  background: #fee2e2;
  color: #b91c1c;
}

.banner-popup-enter-active,
.banner-popup-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.banner-popup-enter-from,
.banner-popup-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
</style>
