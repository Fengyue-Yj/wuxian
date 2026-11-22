(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (root && typeof root === "object") {
    root.WuxianImageOptimizer = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_MAX_WIDTH = 1600;
  const DEFAULT_MAX_HEIGHT = 1600;
  const DEFAULT_WEBP_QUALITY = 0.82;
  const DEFAULT_MEDIA_FOLDER = "public/images";
  const DEFAULT_PUBLIC_FOLDER = "/wuxian/images";
  const DEFAULT_REPO = "Fengyue-Yj/wuxian";
  const DEFAULT_BRANCH = "master";

  function fitWithinMaxDimensions(width, height, maxWidth, maxHeight) {
    const w = Number(width);
    const h = Number(height);
    const maxW = Number(maxWidth) > 0 ? Number(maxWidth) : DEFAULT_MAX_WIDTH;
    const maxH = Number(maxHeight) > 0 ? Number(maxHeight) : DEFAULT_MAX_HEIGHT;

    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      return { width: 0, height: 0, resized: false, scale: 1 };
    }
    if (w <= maxW && h <= maxH) {
      return { width: Math.round(w), height: Math.round(h), resized: false, scale: 1 };
    }
    const scale = Math.min(maxW / w, maxH / h);
    return {
      width: Math.max(1, Math.round(w * scale)),
      height: Math.max(1, Math.round(h * scale)),
      resized: true,
      scale,
    };
  }

  function formatBytes(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return "0 B";
    if (n < 1024) return `${Math.round(n)} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  function shortHashBytes(bytes) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < bytes.length; i += 1) {
      hash ^= bytes[i];
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function parseDataImageUri(uri) {
    if (typeof uri !== "string") return null;
    const match = uri.match(/^data:(image\/[a-zA-Z0-9.+-]+)(?:;[^,]*)?;base64,([A-Za-z0-9+/=\s]+)$/i);
    if (!match) return null;
    const mime = match[1].toLowerCase();
    const base64 = match[2].replace(/\s+/g, "");
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    const estimatedBytes = Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
    return { mime, base64, estimatedBytes };
  }

  function base64ToUint8Array(base64) {
    const clean = String(base64 || "").replace(/\s+/g, "");
    if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") {
      return new Uint8Array(Buffer.from(clean, "base64"));
    }
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function uint8ArrayToBase64(bytes) {
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (typeof Buffer !== "undefined" && typeof Buffer.from === "function") {
      return Buffer.from(arr).toString("base64");
    }
    const chunkSize = 0x8000;
    const parts = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      const sub = arr.subarray(i, i + chunkSize);
      parts.push(String.fromCharCode.apply(null, sub));
    }
    return btoa(parts.join(""));
  }

  function dataUriToUint8Array(uri) {
    const parsed = parseDataImageUri(uri);
    if (!parsed) return null;
    return {
      mime: parsed.mime,
      bytes: base64ToUint8Array(parsed.base64),
    };
  }

  function sanitizeFilenameStem(name) {
    const stripped = String(name || "")
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!stripped || /^[0-9a-f]{16,64}$/i.test(stripped) || /^(?:image|img|pic|photo|blob|mmexport\d*)$/i.test(stripped)) {
      return "essay-img";
    }
    return stripped.slice(0, 40);
  }

  function buildSafeWebpFilename(options) {
    const opts = options || {};
    const stem = sanitizeFilenameStem(opts.prefix || opts.originalName || "essay-img");
    const datePart = opts.dateStamp || new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const indexPart =
      typeof opts.index === "number" && opts.index >= 0
        ? `-${String(opts.index + 1).padStart(2, "0")}`
        : "";
    const hashPart = opts.contentHash
      ? `-${String(opts.contentHash).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}`
      : "";
    const ext = opts.extension || "webp";
    return `${stem}-${datePart}${indexPart}${hashPart}.${ext}`;
  }

  function isConvertibleMimeType(mime) {
    const m = String(mime || "").toLowerCase();
    if (!m.startsWith("image/")) return false;
    if (m === "image/svg+xml" || m === "image/gif") return false;
    return true;
  }

  function extractMarkdownImageSources(markdown) {
    const text = String(markdown || "");
    const re = /!\[([^\]]*)\]\(\s*([^)\s]+(?:\s+"[^"]*")?)\s*\)/g;
    const results = [];
    let match;
    while ((match = re.exec(text)) !== null) {
      let src = match[2].trim();
      const titleMatch = src.match(/^(\S+)\s+"[^"]*"$/);
      if (titleMatch) src = titleMatch[1];
      const dataParsed = parseDataImageUri(src);
      results.push({
        fullMatch: match[0],
        start: match.index,
        end: match.index + match[0].length,
        alt: match[1],
        src,
        isDataUri: Boolean(dataParsed),
        mime: dataParsed ? dataParsed.mime : null,
        estimatedBytes: dataParsed ? dataParsed.estimatedBytes : null,
        isExternal: /^(?:https?:)?\/\//i.test(src),
      });
    }
    return results;
  }

  function replaceMarkdownImageSources(markdown, replacementMap) {
    if (!markdown || !replacementMap) return String(markdown || "");
    const getNewSrc =
      typeof replacementMap.get === "function"
        ? (k) => replacementMap.get(k)
        : (k) => (Object.prototype.hasOwnProperty.call(replacementMap, k) ? replacementMap[k] : undefined);

    return String(markdown).replace(/!\[([^\]]*)\]\(\s*([^)\s]+(?:\s+"([^"]*)")?)\s*\)/g, (full, alt, rawSrc, title) => {
      const cleanSrc = title ? rawSrc.replace(/\s+"[^"]*"$/, "").trim() : rawSrc.trim();
      const nextSrc = getNewSrc(cleanSrc);
      if (!nextSrc) return full;
      return title ? `![${alt}](${nextSrc} "${title}")` : `![${alt}](${nextSrc})`;
    });
  }

  function normalizeRepoFolder(folder) {
    return String(folder || "").replace(/^\/+|\/+$/g, "");
  }

  function joinPublicUrl(publicFolder, filename) {
    const base = String(publicFolder || DEFAULT_PUBLIC_FOLDER).replace(/\/+$/g, "");
    return `${base}/${encodeURIComponent(filename).replace(/%2F/gi, "/")}`;
  }

  function buildGithubUploadRequest(opts) {
    const repo = opts.repo || DEFAULT_REPO;
    const branch = opts.branch || DEFAULT_BRANCH;
    const mediaFolder = normalizeRepoFolder(opts.mediaFolder || DEFAULT_MEDIA_FOLDER);
    const filename = String(opts.filename || "").replace(/^\/+/, "");
    const repoPath = mediaFolder ? `${mediaFolder}/${filename}` : filename;
    const encodedPath = repoPath
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
    const url = `https://api.github.com/repos/${repo}/contents/${encodedPath}`;
    const body = {
      message: opts.message || `上传压缩图片：${filename}`,
      content: opts.base64Content,
      branch,
    };
    if (opts.sha) {
      body.sha = opts.sha;
    }
    return { url, repoPath, branch, body };
  }

  async function uploadImageToGithub(options) {
    const opts = options || {};
    const token = opts.token;
    if (!token) {
      return { ok: false, reason: "no-auth", message: "未检测到 GitHub 登录凭据，请先在后台登录后上传。" };
    }
    const fetchFn = opts.fetchImpl || (typeof fetch === "function" ? fetch : null);
    if (!fetchFn) {
      return { ok: false, reason: "no-fetch", message: "当前环境不支持 fetch 请求。" };
    }

    let bytes;
    if (opts.bytes instanceof Uint8Array) {
      bytes = opts.bytes;
    } else if (typeof Blob !== "undefined" && opts.blob instanceof Blob) {
      bytes = new Uint8Array(await opts.blob.arrayBuffer());
    } else {
      return { ok: false, reason: "no-data", message: "缺少待上传的图片数据。" };
    }

    const base64Content = uint8ArrayToBase64(bytes);
    const repo = opts.repo || DEFAULT_REPO;
    const branch = opts.branch || DEFAULT_BRANCH;
    const mediaFolder = opts.mediaFolder || DEFAULT_MEDIA_FOLDER;
    const publicFolder = opts.publicFolder || DEFAULT_PUBLIC_FOLDER;
    const filename = opts.filename;

    const reqInfo = buildGithubUploadRequest({
      repo,
      branch,
      mediaFolder,
      filename,
      base64Content,
      message: opts.message || `上传压缩图片：${filename}`,
    });

    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Check if hash-named file already exists on branch so we reuse without duplicate commits
    try {
      const checkRes = await fetchFn(`${reqInfo.url}?ref=${encodeURIComponent(branch)}`, {
        method: "GET",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (checkRes.ok) {
        return {
          ok: true,
          reused: true,
          filename,
          repoPath: reqInfo.repoPath,
          publicUrl: joinPublicUrl(publicFolder, filename),
        };
      }
    } catch {
      // Ignore preflight check errors and attempt PUT directly
    }

    const putRes = await fetchFn(reqInfo.url, {
      method: "PUT",
      headers,
      body: JSON.stringify(reqInfo.body),
    });

    if (!putRes.ok) {
      let detail = `HTTP ${putRes.status}`;
      try {
        const errJson = await putRes.json();
        if (errJson && errJson.message) detail = errJson.message;
      } catch {
        // Ignore parse error
      }
      return {
        ok: false,
        status: putRes.status,
        reason: putRes.status === 401 || putRes.status === 403 ? "auth-error" : "api-error",
        message: `GitHub 上传失败 (${filename}): ${detail}`,
      };
    }

    return {
      ok: true,
      reused: false,
      filename,
      repoPath: reqInfo.repoPath,
      publicUrl: joinPublicUrl(publicFolder, filename),
    };
  }

  async function decodeImageDimensionsAndDraw(blob, maxWidth, maxHeight) {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(blob);
      try {
        const origW = bitmap.width;
        const origH = bitmap.height;
        const dims = fitWithinMaxDimensions(origW, origH, maxWidth, maxHeight);
        return { bitmap, origW, origH, dims, cleanup: () => bitmap.close && bitmap.close() };
      } catch (err) {
        if (bitmap.close) bitmap.close();
        throw err;
      }
    }

    if (typeof Image === "undefined" || typeof URL === "undefined") {
      throw new Error("当前环境不支持浏览器图像解码。");
    }

    const objUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("无法解码图片内容。"));
        el.src = objUrl;
      });
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;
      const dims = fitWithinMaxDimensions(origW, origH, maxWidth, maxHeight);
      return { bitmap: img, origW, origH, dims, cleanup: () => URL.revokeObjectURL(objUrl) };
    } catch (err) {
      URL.revokeObjectURL(objUrl);
      throw err;
    }
  }

  async function encodeCanvasToWebpBlob(sourceBitmap, width, height, quality) {
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      if (ctx && typeof canvas.convertToBlob === "function") {
        ctx.drawImage(sourceBitmap, 0, 0, width, height);
        const webpBlob = await canvas.convertToBlob({ type: "image/webp", quality });
        if (webpBlob && webpBlob.type === "image/webp") {
          return webpBlob;
        }
        return await canvas.convertToBlob({ type: "image/jpeg", quality });
      }
    }

    if (typeof document === "undefined") {
      throw new Error("当前环境缺少 Canvas API。");
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法创建 2D Canvas 上下文。");
    ctx.drawImage(sourceBitmap, 0, 0, width, height);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(
        (b) => {
          if (b && b.type === "image/webp") {
            resolve(b);
          } else {
            canvas.toBlob((jpgBlob) => resolve(jpgBlob), "image/jpeg", quality);
          }
        },
        "image/webp",
        quality
      );
    });
    if (!blob) throw new Error("Canvas 图片导出失败。");
    return blob;
  }

  async function compressBlobToWebp(blob, options) {
    const opts = options || {};
    const maxWidth = opts.maxWidth || DEFAULT_MAX_WIDTH;
    const maxHeight = opts.maxHeight || DEFAULT_MAX_HEIGHT;
    const quality = typeof opts.quality === "number" ? opts.quality : DEFAULT_WEBP_QUALITY;

    if (!blob) throw new Error("空图片对象。");
    const originalMime = (blob.type || "").toLowerCase();
    const originalBytes = blob.size || 0;

    if (originalMime && !isConvertibleMimeType(originalMime)) {
      const buf = new Uint8Array(await blob.arrayBuffer());
      const ext = originalMime === "image/svg+xml" ? "svg" : originalMime === "image/gif" ? "gif" : "bin";
      return {
        blob,
        bytes: buf,
        mime: originalMime,
        extension: ext,
        converted: false,
        resized: false,
        originalBytes,
        compressedBytes: originalBytes,
        width: null,
        height: null,
        originalWidth: null,
        originalHeight: null,
        contentHash: shortHashBytes(buf),
      };
    }

    const decoded = await decodeImageDimensionsAndDraw(blob, maxWidth, maxHeight);
    try {
      const { bitmap, origW, origH, dims } = decoded;
      const encodedBlob = await encodeCanvasToWebpBlob(bitmap, dims.width, dims.height, quality);

      // Keep original only if it was already lightweight WebP and wasn't resized or shrunk
      const keepOriginal =
        originalMime === "image/webp" &&
        !dims.resized &&
        originalBytes > 0 &&
        originalBytes <= encodedBlob.size &&
        originalBytes <= 350 * 1024;

      const finalBlob = keepOriginal ? blob : encodedBlob;
      const finalBytes = new Uint8Array(await finalBlob.arrayBuffer());
      const finalMime = finalBlob.type || "image/webp";
      const extension = finalMime === "image/jpeg" ? "jpg" : "webp";

      return {
        blob: finalBlob,
        bytes: finalBytes,
        mime: finalMime,
        extension,
        converted: !keepOriginal,
        resized: dims.resized,
        originalBytes,
        compressedBytes: finalBytes.length,
        width: dims.width,
        height: dims.height,
        originalWidth: origW,
        originalHeight: origH,
        contentHash: shortHashBytes(finalBytes),
      };
    } finally {
      decoded.cleanup();
    }
  }

  async function compressFileToWebpFile(file, options) {
    const opts = options || {};
    const result = await compressBlobToWebp(file, opts);
    const filename = buildSafeWebpFilename({
      prefix: opts.prefix,
      originalName: file.name || "pasted-image",
      index: opts.index,
      contentHash: result.contentHash,
      extension: result.extension,
      dateStamp: opts.dateStamp,
    });
    const outFile =
      typeof File !== "undefined"
        ? new File([result.blob], filename, { type: result.mime, lastModified: Date.now() })
        : result.blob;
    return {
      ...result,
      file: outFile,
      filename,
    };
  }

  async function fetchExternalImageAsBlob(url, options) {
    const opts = options || {};
    const fetchFn = opts.fetchImpl || (typeof fetch === "function" ? fetch : null);
    if (!fetchFn) {
      return { ok: false, reason: "no-fetch", url, message: "浏览器不支持 fetch。" };
    }
    const targetUrl = url.startsWith("//") ? `https:${url}` : url;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), opts.timeoutMs || 3500) : null;

    try {
      const res = await fetchFn(targetUrl, {
        mode: "cors",
        credentials: "omit",
        signal: controller ? controller.signal : undefined,
      });
      if (!res.ok) {
        return {
          ok: false,
          reason: "http-error",
          status: res.status,
          url,
          message: `外链图片抓取失败（HTTP ${res.status}）：${targetUrl.slice(0, 70)}`,
        };
      }
      const blob = await res.blob();
      if (!blob || !blob.size || (blob.type && !blob.type.startsWith("image/"))) {
        return {
          ok: false,
          reason: "not-image",
          url,
          message: `外链响应不是有效图片：${targetUrl.slice(0, 70)}`,
        };
      }
      return { ok: true, blob, url };
    } catch (err) {
      const isAbort = err && err.name === "AbortError";
      let hostLabel = targetUrl;
      try {
        hostLabel = new URL(targetUrl).hostname;
      } catch {
        // Ignore URL parse error
      }
      return {
        ok: false,
        reason: isAbort ? "timeout" : "cors",
        url,
        message: `外部图床（${hostLabel}）受跨域 CORS/防盗链限制，浏览器无法自动转存：${targetUrl.slice(0, 68)}... 请在该图片上右键“复制图片”直接粘贴（或先保存到本地再上传），后台将自动压缩为 WebP。`,
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return {
    DEFAULT_MAX_WIDTH,
    DEFAULT_MAX_HEIGHT,
    DEFAULT_WEBP_QUALITY,
    DEFAULT_MEDIA_FOLDER,
    DEFAULT_PUBLIC_FOLDER,
    DEFAULT_REPO,
    DEFAULT_BRANCH,
    fitWithinMaxDimensions,
    formatBytes,
    shortHashBytes,
    parseDataImageUri,
    base64ToUint8Array,
    uint8ArrayToBase64,
    dataUriToUint8Array,
    sanitizeFilenameStem,
    buildSafeWebpFilename,
    isConvertibleMimeType,
    extractMarkdownImageSources,
    replaceMarkdownImageSources,
    buildGithubUploadRequest,
    uploadImageToGithub,
    compressBlobToWebp,
    compressFileToWebpFile,
    fetchExternalImageAsBlob,
  };
});
