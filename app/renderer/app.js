// Frosti Contributor App - Renderer Process JavaScript
const $ = (id) => document.getElementById(id);

// --- Global States ---
let currentDraftId = null;
let stagedImages = []; // List of image objects { name, path, mime, base64, rawBase64 }

// Hardcoded friend sites from the blog configuration for native side-drawer viewing
const friendSites = [
  {
    name: "梦夜十六",
    url: "https://dreamnight.net.cn/",
    description: "大模型和视频制作相关喵。偶尔写点别的技术栈和自己的想法",
    avatar: "https://i.ibb.co/gMwpFW7Z/IMG-20260328-163133.jpg"
  },
  {
    name: "Frosti Demo",
    url: "https://frosti.saroprock.com/",
    description: "The official demo site of Frosti Astro theme.",
    avatar: "❄️"
  }
];

// --- Initialize App ---
document.addEventListener("DOMContentLoaded", async () => {
  initAppInfo();
  initTheme();
  initTabs();
  initEditor();
  initMediaLibrary();
  initSettings();
  initFriendLinks();
  loadAutoSaveDraft();
});

// 1. App Info Loading
async function initAppInfo() {
  if (window.electronAPI) {
    const info = await window.electronAPI.getAppInfo();
    $("app-version").textContent = info.version;
  }
}

// 2. Theme Management
function initTheme() {
  const storedTheme = localStorage.getItem("app-theme") || "dark";
  document.documentElement.setAttribute("data-theme", storedTheme === "dark" ? "dracula" : "winter");
  $("theme-toggle").checked = storedTheme === "dark";

  $("theme-toggle").addEventListener("change", (e) => {
    const theme = e.target.checked ? "dark" : "light";
    localStorage.setItem("app-theme", theme);
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dracula" : "winter");
    toast(`Switched to ${theme} theme`, "info");
  });
}

// 3. Tab Navigation
function initTabs() {
  const navButtons = document.querySelectorAll(".nav-btn");
  const tabSections = document.querySelectorAll(".tab-content");

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      
      // Update sidebar nav state
      navButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Show/Hide target panels
      tabSections.forEach((sec) => {
        if (sec.id === tabId) {
          sec.classList.add("active");
        } else {
          sec.classList.remove("active");
        }
      });
      
      toast(`Entered ${btn.textContent.trim().substring(2)}`, "info");
    });
  });
}

// 4. Toast Notifications
function toast(message, type = "info") {
  const container = $("toast-container");
  const toast = document.createElement("div");
  
  const bgClasses = {
    info: "alert-info text-info-content",
    success: "alert-success text-success-content",
    error: "alert-error text-error-content",
    warning: "alert-warning text-warning-content"
  };

  toast.className = `alert ${bgClasses[type]} shadow-lg py-2.5 px-4 text-xs font-semibold rounded-xl border border-base-content/10 transition-all duration-300 transform translate-x-12 opacity-0 pointer-events-auto`;
  toast.innerHTML = `
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.classList.remove("translate-x-12", "opacity-0");
  }, 10);

  // Remove after duration
  setTimeout(() => {
    toast.classList.add("translate-x-12", "opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// 5. Friend Links Side-Drawer & Webview Loading
function initFriendLinks() {
  const list = $("friend-sites-list");
  list.innerHTML = "";

  friendSites.forEach((site) => {
    const el = document.createElement("div");
    el.className = "bg-base-100 p-3 rounded-xl border border-base-content/5 hover:border-primary/20 hover:bg-base-200/50 transition cursor-pointer select-none flex items-center gap-3";
    
    const avatarHtml = site.avatar.startsWith("http") 
      ? `<img class="w-8 h-8 rounded-full object-cover" src="${site.avatar}" alt="" />`
      : `<div class="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center text-sm">${site.avatar}</div>`;

    el.innerHTML = `
      ${avatarHtml}
      <div class="flex-grow min-w-0">
        <div class="font-bold text-xs truncate">${site.name}</div>
        <div class="text-[10px] text-base-content/50 truncate">${site.description || site.url}</div>
      </div>
      <div class="text-xs text-primary">➔</div>
    `;

    el.addEventListener("click", () => {
      // Load site in built-in iframe
      $("blog-iframe").src = site.url;
      $("friend-drawer").classList.add("translate-x-full");
      toast(`Browsing friend link: ${site.name}`, "success");
    });

    list.appendChild(el);
  });

  $("btn-friend-links").addEventListener("click", () => {
    $("friend-drawer").classList.toggle("translate-x-full");
  });

  $("btn-close-friends").addEventListener("click", () => {
    $("friend-drawer").classList.add("translate-x-full");
  });

  $("btn-open-browser").addEventListener("click", () => {
    const currentUrl = $("blog-iframe").src;
    if (window.electronAPI) {
      window.electronAPI.openExternal(currentUrl);
      toast("Opened URL in your system browser", "info");
    } else {
      window.open(currentUrl, "_blank");
    }
  });

  // Handle external link clicks in renderer safely
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("link-external") || e.target.closest(".link-external")) {
      e.preventDefault();
      const href = e.target.getAttribute("href") || e.target.closest(".link-external").getAttribute("href");
      if (window.electronAPI) {
        window.electronAPI.openExternal(href);
      } else {
        window.open(href, "_blank");
      }
    }
  });
}

// 6. Markdown Editor Engine
function initEditor() {
  const textarea = $("editor-textarea");
  const preview = $("preview-container");

  // Configure marked for custom prose rules
  marked.setOptions({
    breaks: true,
    gfm: true
  });

  // Real-time rendering
  const updatePreview = () => {
    const mdText = textarea.value;
    preview.innerHTML = mdText.trim() ? marked.parse(mdText) : '<p class="text-base-content/30 italic">Start writing to see preview...</p>';
    
    // Character and line count
    $("char-count").textContent = mdText.length;
    $("line-count").textContent = mdText.split("\n").length;

    // Trigger local auto-saving
    debouncedSaveDraft();
  };

  textarea.addEventListener("input", updatePreview);

  // Set default date if blank
  if (!$("meta-date").value) {
    $("meta-date").value = new Date().toISOString().split("T")[0];
  }

  // Trigger preview updates on metadata changes (forces draft autosave)
  const metaInputs = ["meta-title", "meta-date", "meta-desc", "meta-image", "meta-badge", "meta-slug", "meta-categories", "meta-tags", "meta-draft"];
  metaInputs.forEach(id => {
    $(id).addEventListener("change", () => debouncedSaveDraft());
  });

  // Toolbar actions
  const tools = document.querySelectorAll(".tool-icon-btn");
  tools.forEach((btn) => {
    btn.addEventListener("click", () => {
      const shortcut = btn.getAttribute("data-shortcut");
      insertShortcut(shortcut);
    });
  });

  // Handle file imports
  $("btn-import-md").addEventListener("click", async () => {
    if (!window.electronAPI) {
      toast("Native file import is only available in Desktop App Mode", "warning");
      return;
    }
    const result = await window.electronAPI.selectFile();
    if (result.canceled) return;

    if (result.error) {
      toast(`Failed to load file: ${result.error}`, "error");
      return;
    }

    importMDContent(result.content, result.name);
  });

  // Clear / Reset Editor
  $("btn-clear-editor").addEventListener("click", () => {
    if (confirm("Are you sure you want to clear your current progress? This will reset the editor, staged assets, and drafts.")) {
      textarea.value = "";
      $("meta-title").value = "";
      $("meta-desc").value = "";
      $("meta-date").value = new Date().toISOString().split("T")[0];
      $("meta-image").value = "";
      $("meta-badge").value = "";
      $("meta-slug").value = "";
      $("meta-categories").value = "";
      $("meta-tags").value = "";
      $("meta-draft").checked = false;
      
      stagedImages = [];
      renderMediaGallery();
      updatePreview();
      
      toast("Editor reset successfully", "success");
    }
  });

  // Open Publish Modal
  $("btn-open-publish-modal").addEventListener("click", () => {
    if (!validateMetadata()) return;
    
    // Populate stats in modal
    $("asset-upload-progress").textContent = `0/${stagedImages.length}`;
    
    // Clear logs
    $("publish-logs").innerHTML = "[system] Idle... Ready to launch.";
    
    // Hide PR viewer button, show execute buttons
    $("btn-view-pr").classList.add("hidden");
    $("btn-cancel-modal").classList.remove("hidden");
    $("btn-execute-publish").classList.remove("hidden");
    $("modal-error-msg").textContent = "";

    // Reset progress visuals
    document.querySelectorAll(".step-progress-row").forEach(el => {
      el.className = "step-progress-row";
      el.querySelector(".loading").classList.add("hidden");
      el.querySelector(".check-mark").classList.add("hidden");
    });

    $("publish-modal").showModal();
  });

  // Modal actions
  $("btn-cancel-modal").addEventListener("click", () => {
    $("publish-modal").close();
  });

  $("btn-execute-publish").addEventListener("click", () => {
    executePRContributionPipeline();
  });
}

// 7. Shortcut Insertion inside Textarea
function insertShortcut(type) {
  const textarea = $("editor-textarea");
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selectedText = text.substring(start, end);
  let replacement = "";
  let cursorOffset = 0;

  switch (type) {
    case "bold":
      replacement = `**${selectedText || "Bold Text"}**`;
      cursorOffset = selectedText ? 0 : -2;
      break;
    case "italic":
      replacement = `*${selectedText || "Italic Text"}*`;
      cursorOffset = selectedText ? 0 : -1;
      break;
    case "header":
      replacement = `\n## ${selectedText || "Header"}\n`;
      cursorOffset = selectedText ? 0 : 0;
      break;
    case "code":
      replacement = `\n\`\`\`javascript\n${selectedText || "// code block"}\n\`\`\`\n`;
      cursorOffset = selectedText ? 0 : -5;
      break;
    case "link":
      replacement = `[${selectedText || "Link Text"}](https://example.com)`;
      cursorOffset = selectedText ? 0 : -21;
      break;
    case "quote":
      replacement = `\n> ${selectedText || "Blockquote"}\n`;
      cursorOffset = selectedText ? 0 : 0;
      break;
    case "table":
      replacement = `\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n`;
      break;
    case "image":
      replacement = `![${selectedText || "Image Description"}](https://example.com/image.jpg)`;
      cursorOffset = selectedText ? 0 : -25;
      break;
  }

  textarea.value = text.substring(0, start) + replacement + text.substring(end);
  textarea.focus();
  textarea.setSelectionRange(start + replacement.length + cursorOffset, start + replacement.length + cursorOffset);
  
  // Trigger preview update
  textarea.dispatchEvent(new Event("input"));
}

// 8. Markdown Parsing (Import)
function importMDContent(content, filename) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)/);
  let fm = {};
  let body = content;

  if (match) {
    body = match[2] || "";
    const fmText = match[1];
    const lines = fmText.split(/\r?\n/);
    let currentKey = "";
    let currentArray = null;

    for (const line of lines) {
      const arrayMatch = line.match(/^\s*-\s*(.*)/);
      if (arrayMatch && currentArray) {
        currentArray.push(arrayMatch[1].replace(/^["']|["']$/g, "").trim());
        continue;
      }

      const kvMatch = line.match(/^(\w+):\s*(.*)/);
      if (kvMatch) {
        currentKey = kvMatch[1];
        const val = kvMatch[2].replace(/^["']|["']$/g, "").trim();
        if (!val) {
          fm[currentKey] = [];
          currentArray = fm[currentKey];
        } else {
          if (val === "true") fm[currentKey] = true;
          else if (val === "false") fm[currentKey] = false;
          else fm[currentKey] = val;
          currentArray = null;
        }
      }
    }
  }

  // Populate editor fields
  $("editor-textarea").value = body;
  $("meta-title").value = fm.title || filename.replace(/\.(md|mdx)$/i, "");
  $("meta-desc").value = fm.description || "";
  
  const dStr = fm.pubDate;
  $("meta-date").value = dStr && !isNaN(new Date(dStr)) ? new Date(dStr).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
  $("meta-image").value = fm.image || "";
  $("meta-badge").value = fm.badge || "";
  $("meta-slug").value = filename.replace(/\.(md|mdx)$/i, "");
  
  $("meta-categories").value = Array.isArray(fm.categories) ? fm.categories.join(", ") : (fm.categories || "");
  $("meta-tags").value = Array.isArray(fm.tags) ? fm.tags.join(", ") : (fm.tags || "");
  $("meta-draft").checked = fm.draft === true;

  // Trigger preview updating
  $("editor-textarea").dispatchEvent(new Event("input"));
  toast(`Imported successfully: ${filename}`, "success");
}

// 9. Build Frontmatter and Compile Markdown for export/PR
function compileMDForPublish() {
  const title = $("meta-title").value.trim();
  const desc = $("meta-desc").value.trim();
  const date = $("meta-date").value;
  const image = $("meta-image").value.trim();
  const badge = $("meta-badge").value.trim();
  const isDraft = $("meta-draft").checked;
  const categories = $("meta-categories").value.split(",").map(c => c.trim()).filter(Boolean);
  const tags = $("meta-tags").value.split(",").map(t => t.trim()).filter(Boolean);
  const body = $("editor-textarea").value;

  const lines = ["---"];
  lines.push(`title: "${title}"`);
  lines.push(`description: "${desc}"`);
  lines.push(`pubDate: "${date}"`);
  if (image) lines.push(`image: "${image}"`);
  if (badge) lines.push(`badge: "${badge}"`);
  if (isDraft) lines.push("draft: true");

  if (categories.length) {
    lines.push("categories:");
    categories.forEach(c => lines.push(`  - "${c}"`));
  }
  if (tags.length) {
    lines.push("tags:");
    tags.forEach(t => lines.push(`  - "${t}"`));
  }
  lines.push("---");
  lines.push("");
  lines.push(body);

  return lines.join("\n");
}

// 10. Form Validation
function validateMetadata() {
  const title = $("meta-title").value.trim();
  const desc = $("meta-desc").value.trim();
  const date = $("meta-date").value;
  const body = $("editor-textarea").value.trim();

  if (!title) { toast("Post title is required", "error"); return false; }
  if (!desc) { toast("Description is required", "error"); return false; }
  if (!date) { toast("Publish date is required", "error"); return false; }
  if (!body) { toast("Post body content cannot be empty", "error"); return false; }

  // Check Settings exist
  const pat = localStorage.getItem("frosti-pat") || "";
  const owner = localStorage.getItem("frosti-owner") || "";
  const name = localStorage.getItem("frosti-name") || "";
  
  if (!pat || !owner || !name) {
    toast("GitHub Credentials missing! Please fill them in the Settings tab first.", "error");
    return false;
  }

  return true;
}

// 11. Media Library Management
function initMediaLibrary() {
  const dropZone = $("media-drop-zone");

  const triggerSelectImage = async () => {
    if (!window.electronAPI) {
      toast("Image local browsing is only available in Desktop App Mode", "warning");
      return;
    }
    const result = await window.electronAPI.selectImage();
    if (result.canceled) return;
    if (result.error) {
      toast(`Error loading image: ${result.error}`, "error");
      return;
    }
    addImageToGallery(result);
  };

  dropZone.addEventListener("click", triggerSelectImage);
  $("btn-add-image").addEventListener("click", triggerSelectImage);

  // Setup drag drop on zone
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("bg-base-200/80", "border-primary");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("bg-base-200/80", "border-primary");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("bg-base-200/80", "border-primary");
    
    // Note: in Sandboxed Electron, dropped file operations are safer processed via Electron IPC.
    // For pure drag drop files, we can read them using FileReader in browser.
    const files = [...e.dataTransfer.files];
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast(`Skipped ${file.name}: not an image file`, "warning");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result;
        const rawBase64 = base64.split(",")[1];
        addImageToGallery({
          name: file.name,
          mime: file.type,
          base64: base64,
          rawBase64: rawBase64
        });
      };
      reader.readAsDataURL(file);
    });
  });
}

function addImageToGallery(imgObj) {
  if (stagedImages.some(s => s.name === imgObj.name)) {
    toast(`Asset with name ${imgObj.name} is already staged`, "warning");
    return;
  }

  stagedImages.push(imgObj);
  renderMediaGallery();
  toast(`Staged image: ${imgObj.name}`, "success");
}

function renderMediaGallery() {
  const container = $("media-gallery");
  $("media-count").textContent = `${stagedImages.length} Images`;

  if (stagedImages.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center py-12 text-sm text-base-content/30 italic">No image assets staged. Add some to reference in your post!</div>`;
    return;
  }

  container.innerHTML = "";
  stagedImages.forEach((img, index) => {
    const card = document.createElement("div");
    card.className = "image-card aspect-square p-2 flex flex-col relative group select-none";
    
    // Auto calculate reference path based on current post slug
    const slug = $("meta-slug").value.trim() || slugify($("meta-title").value.trim()) || "draft-post";
    const refPath = `/image/contributions/${slug}/${img.name}`;

    card.innerHTML = `
      <div class="flex-grow flex items-center justify-center overflow-hidden rounded-lg bg-base-300">
        <img src="${img.base64}" class="object-cover w-full h-full max-h-48" alt="" />
      </div>
      <div class="mt-2 text-[10px] font-semibold flex flex-col">
        <span class="truncate block text-base-content/90">${img.name}</span>
        <span class="text-base-content/40 block mt-0.5 font-mono truncate">${refPath}</span>
      </div>

      <!-- Action Overlay on Hover -->
      <div class="image-overlay">
        <button class="btn btn-xs btn-primary gap-1 px-3" onclick="copyImageRef('${refPath}')">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
          <span>Copy MD Link</span>
        </button>
        <button class="btn btn-xs btn-outline btn-error gap-1 px-3 mt-1" onclick="removeStagedImage(${index})">
          <span>Delete</span>
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

window.copyImageRef = (refPath) => {
  const mdLink = `![Image Reference](${refPath})`;
  navigator.clipboard.writeText(mdLink);
  toast("Image markdown tag copied to clipboard!", "success");
};

window.removeStagedImage = (index) => {
  const removed = stagedImages.splice(index, 1)[0];
  renderMediaGallery();
  toast(`Removed staged image: ${removed.name}`, "info");
};

// 12. GitHub Settings Panel
function initSettings() {
  // Load settings from local storage
  $("set-pat").value = localStorage.getItem("frosti-pat") || "";
  $("set-repo-owner").value = localStorage.getItem("frosti-owner") || "muyufly";
  $("set-repo-name").value = localStorage.getItem("frosti-name") || "muyufly.github.io";
  $("set-branch").value = localStorage.getItem("frosti-branch") || "main";

  // Save Settings
  $("btn-save-settings").addEventListener("click", () => {
    const pat = $("set-pat").value.trim();
    const owner = $("set-repo-owner").value.trim();
    const name = $("set-repo-name").value.trim();
    const branch = $("set-branch").value.trim() || "main";

    if (!pat) { toast("GitHub token is required to save", "error"); return; }
    if (!owner) { toast("Owner details required", "error"); return; }
    if (!name) { toast("Repo name required", "error"); return; }

    localStorage.setItem("frosti-pat", pat);
    localStorage.setItem("frosti-owner", owner);
    localStorage.setItem("frosti-name", name);
    localStorage.setItem("frosti-branch", branch);

    toast("GitHub configuration saved locally", "success");
  });

  // Test Settings
  $("btn-test-settings").addEventListener("click", async () => {
    const pat = $("set-pat").value.trim();
    const owner = $("set-repo-owner").value.trim();
    const name = $("set-repo-name").value.trim();

    if (!pat || !owner || !name) {
      toast("Fill in all credentials first", "warning");
      return;
    }

    $("btn-test-settings").disabled = true;
    $("btn-test-settings").textContent = "⏳ Testing...";

    const statusBadge = $("settings-status-badge");
    statusBadge.className = "text-xs font-semibold";
    statusBadge.classList.add("hidden");

    try {
      // Connect to API and check repo info
      const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
        headers: {
          "Authorization": `token ${pat}`,
          "Accept": "application/vnd.github.v3+json"
        }
      });

      if (res.status === 200) {
        statusBadge.textContent = "✓ Connected Successfully";
        statusBadge.className = "text-xs font-bold text-success";
        statusBadge.classList.remove("hidden");
        toast("Connected to GitHub API successfully!", "success");
      } else {
        const errData = await res.json();
        throw new Error(errData.message || `HTTP ${res.status}`);
      }
    } catch (err) {
      statusBadge.textContent = `✕ Connection Failed: ${err.message}`;
      statusBadge.className = "text-xs font-bold text-error";
      statusBadge.classList.remove("hidden");
      toast(`GitHub connection failed: ${err.message}`, "error");
    } finally {
      $("btn-test-settings").disabled = false;
      $("btn-test-settings").textContent = "Test Connection";
    }
  });
}

// 13. Auto Save Draft Core Engine
let saveTimeout = null;
function debouncedSaveDraft() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveAutoSaveDraft, 1200); // Trigger auto save after 1.2s of inactivity
}

async function saveAutoSaveDraft() {
  const title = $("meta-title").value.trim();
  const desc = $("meta-desc").value.trim();
  const date = $("meta-date").value;
  const image = $("meta-image").value.trim();
  const badge = $("meta-badge").value.trim();
  const isDraft = $("meta-draft").checked;
  const categories = $("meta-categories").value;
  const tags = $("meta-tags").value;
  const body = $("editor-textarea").value;
  const slug = $("meta-slug").value.trim();

  // If editor is completely empty, don't auto-save a blank draft
  if (!title && !body && !desc) return;

  const draftData = {
    title, desc, date, image, badge, isDraft, categories, tags, body, slug,
    stagedImages: stagedImages.map(img => ({
      name: img.name,
      mime: img.mime,
      base64: img.base64,
      rawBase64: img.rawBase64
    }))
  };

  const badgeEl = $("draft-badge");
  badgeEl.textContent = "⏳ Saving...";
  badgeEl.className = "badge badge-sm badge-warning";

  if (window.electronAPI) {
    const res = await window.electronAPI.saveDraft(draftData);
    if (res.success) {
      badgeEl.textContent = "✓ Draft Saved";
      badgeEl.className = "badge badge-sm badge-ghost";
    } else {
      badgeEl.textContent = "✕ Save Failed";
      badgeEl.className = "badge badge-sm badge-error";
    }
  } else {
    // Fallback to localStorage in webview
    localStorage.setItem("frosti-web-draft", JSON.stringify(draftData));
    badgeEl.textContent = "✓ Web Stored";
    badgeEl.className = "badge badge-sm badge-ghost";
  }
}

async function loadAutoSaveDraft() {
  let draftData = null;

  if (window.electronAPI) {
    const res = await window.electronAPI.loadDraft();
    if (res.exists) draftData = res.data;
  } else {
    const dataStr = localStorage.getItem("frosti-web-draft");
    if (dataStr) draftData = JSON.parse(dataStr);
  }

  if (!draftData) return;

  // Populate fields
  $("meta-title").value = draftData.title || "";
  $("meta-desc").value = draftData.desc || "";
  $("meta-date").value = draftData.date || new Date().toISOString().split("T")[0];
  $("meta-image").value = draftData.image || "";
  $("meta-badge").value = draftData.badge || "";
  $("meta-slug").value = draftData.slug || "";
  $("meta-categories").value = draftData.categories || "";
  $("meta-tags").value = draftData.tags || "";
  $("meta-draft").checked = draftData.isDraft === true;
  $("editor-textarea").value = draftData.body || "";

  if (draftData.stagedImages && draftData.stagedImages.length) {
    stagedImages = draftData.stagedImages;
    renderMediaGallery();
  }

  // Trigger preview update
  $("editor-textarea").dispatchEvent(new Event("input"));
  toast("Auto-saved draft restored successfully", "success");
}

// 14. Slugify Helper
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-"); // Replace multiple - with single -
}

// =====================================================================
// ================= GH PULL REQUEST PIPELINE ENGINE ===================
// =====================================================================

async function executePRContributionPipeline() {
  // Disable button, show loading
  $("btn-execute-publish").disabled = true;
  $("btn-execute-publish").textContent = "⏳ Running Pipeline...";
  $("btn-cancel-modal").classList.add("hidden");
  
  const consoleLog = (msg, isError = false) => {
    const el = $("publish-logs");
    const color = isError ? "text-error" : "text-emerald-400";
    el.innerHTML += `\n<span class="${color}">[system] ${msg}</span>`;
    el.scrollTop = el.scrollHeight;
  };

  const updateProgressState = (stepId, state) => {
    // state: 'pending', 'active', 'completed', 'failed'
    const row = $(`step-${stepId}`);
    const indicator = row.querySelector(".step-indicator");
    const loading = indicator.querySelector(".loading");
    const check = indicator.querySelector(".check-mark");
    const num = indicator.querySelector(".step-num");

    row.className = `step-progress-row ${state}`;
    
    if (state === "active") {
      loading.classList.remove("hidden");
      check.classList.add("hidden");
      num.classList.add("hidden");
    } else if (state === "completed") {
      loading.classList.add("hidden");
      check.classList.remove("hidden");
      num.classList.add("hidden");
    } else if (state === "failed") {
      loading.classList.add("hidden");
      check.classList.add("hidden");
      num.classList.remove("hidden");
      num.textContent = "✕";
    } else {
      loading.classList.add("hidden");
      check.classList.add("hidden");
      num.classList.remove("hidden");
      num.textContent = stepId === "fork" ? "1" : stepId === "branch" ? "2" : stepId === "assets" ? "3" : stepId === "commit-md" ? "4" : "5";
    }
  };

  // GitHub credentials loaded from localStorage
  const token = localStorage.getItem("frosti-pat");
  const upstreamOwner = localStorage.getItem("frosti-owner");
  const upstreamRepo = localStorage.getItem("frosti-name");
  const baseBranch = localStorage.getItem("frosti-branch") || "main";

  // Post details
  const title = $("meta-title").value.trim();
  const slug = $("meta-slug").value.trim() || slugify(title);
  const markdownContent = compileMDForPublish();

  let userGitHubName = ""; // Filled dynamically during fork/verification

  const headers = {
    "Authorization": `token ${token}`,
    "Accept": "application/vnd.github.v3+json"
  };

  consoleLog("Initializing connection to GitHub API...");

  try {
    // -----------------------------------------------------------------
    // STEP 0: Verify Token and Get Contributor Identity
    // -----------------------------------------------------------------
    const userRes = await fetch("https://api.github.com/user", { headers });
    if (userRes.status !== 200) {
      throw new Error(`Authentication token invalid or expired. GitHub returned ${userRes.status}`);
    }
    const userData = await userRes.json();
    userGitHubName = userData.login;
    consoleLog(`Authenticated as: @${userGitHubName}`);

    // -----------------------------------------------------------------
    // STEP 1: Forking Repository
    // -----------------------------------------------------------------
    updateProgressState("fork", "active");
    consoleLog(`Checking fork of ${upstreamOwner}/${upstreamRepo} under @${userGitHubName}...`);
    
    // Check if fork already exists
    const checkForkRes = await fetch(`https://api.github.com/repos/${userGitHubName}/${upstreamRepo}`, { headers });
    let forkExists = checkForkRes.status === 200;

    if (!forkExists) {
      consoleLog(`Fork does not exist. Triggering Fork creation...`);
      const triggerForkRes = await fetch(`https://api.github.com/repos/${upstreamOwner}/${upstreamRepo}/forks`, {
        method: "POST",
        headers
      });
      
      if (triggerForkRes.status !== 202) {
        throw new Error("Unable to trigger repository fork via GitHub API.");
      }
      
      consoleLog("Fork triggered. Waiting for repository compilation (this takes ~5-15 seconds)...");
      
      // Polling loop to wait for fork completion
      let forkReady = false;
      for (let attempt = 1; attempt <= 10; attempt++) {
        await new Promise(r => setTimeout(r, 3000));
        consoleLog(`Polling fork status (attempt ${attempt}/10)...`);
        const pollRes = await fetch(`https://api.github.com/repos/${userGitHubName}/${upstreamRepo}`, { headers });
        if (pollRes.status === 200) {
          forkReady = true;
          break;
        }
      }
      
      if (!forkReady) {
        throw new Error("Fork polling timed out. GitHub is taking too long to create the repository.");
      }
    }
    
    consoleLog("Fork is ready! Repository matched successfully.");
    updateProgressState("fork", "completed");

    // -----------------------------------------------------------------
    // STEP 2: Creating Branch
    // -----------------------------------------------------------------
    updateProgressState("branch", "active");
    consoleLog(`Fetching default branch SHA from fork (@${userGitHubName}/${upstreamRepo})...`);

    // Get default branch commit SHA
    const branchRes = await fetch(`https://api.github.com/repos/${userGitHubName}/${upstreamRepo}/branches/${baseBranch}`, { headers });
    if (branchRes.status !== 200) {
      throw new Error(`Unable to fetch default branch ${baseBranch}. Repository may be missing commits.`);
    }
    const branchData = await branchRes.json();
    const parentSHA = branchData.commit.sha;
    consoleLog(`Latest commit SHA on fork: ${parentSHA}`);

    // Create unique branch for contribution
    const uniqueBranchName = `contribute/post-${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    consoleLog(`Creating dedicated contribution branch: ${uniqueBranchName}...`);
    
    const createBranchRes = await fetch(`https://api.github.com/repos/${userGitHubName}/${upstreamRepo}/git/refs`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: `refs/heads/${uniqueBranchName}`,
        sha: parentSHA
      })
    });

    if (createBranchRes.status !== 201) {
      const err = await createBranchRes.json();
      throw new Error(`Failed to create branch: ${err.message}`);
    }
    consoleLog(`Branch created successfully! Ref link configured.`);
    updateProgressState("branch", "completed");

    // -----------------------------------------------------------------
    // STEP 3: Uploading Staged Image Assets
    // -----------------------------------------------------------------
    updateProgressState("assets", "active");
    const totalAssets = stagedImages.length;
    consoleLog(`Staged assets processing list size: ${totalAssets}`);

    for (let i = 0; i < totalAssets; i++) {
      const img = stagedImages[i];
      $("asset-upload-progress").textContent = `${i + 1}/${totalAssets}`;
      const imagePath = `public/image/contributions/${slug}/${img.name}`;
      consoleLog(`Uploading image [${i + 1}/${totalAssets}]: ${imagePath}...`);

      const uploadImgRes = await fetch(`https://api.github.com/repos/${userGitHubName}/${upstreamRepo}/contents/${imagePath}`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `🖼️ Stage image asset: ${img.name} for contribution`,
          content: img.rawBase64, // GitHub API expects raw Base64 string without data prefix
          branch: uniqueBranchName
        })
      });

      if (uploadImgRes.status !== 200 && uploadImgRes.status !== 201) {
        const err = await uploadImgRes.json();
        throw new Error(`Image upload failed for ${img.name}: ${err.message}`);
      }
      consoleLog(`Image uploaded successfully: ${img.name}`);
    }
    updateProgressState("assets", "completed");

    // -----------------------------------------------------------------
    // STEP 4: Committing Markdown Post
    // -----------------------------------------------------------------
    updateProgressState("commit-md", "active");
    const mdPath = `src/content/blog/${slug}.md`;
    consoleLog(`Committing Markdown post content to: ${mdPath}...`);

    // Encode MD body to base64 safely without deprecated warnings
    const bytes = new TextEncoder().encode(markdownContent);
    let binary = "";
    const len = bytes.byteLength;
    for (let j = 0; j < len; j++) {
      binary += String.fromCharCode(bytes[j]);
    }
    const mdBase64 = btoa(binary);

    const uploadMdRes = await fetch(`https://api.github.com/repos/${userGitHubName}/${upstreamRepo}/contents/${mdPath}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `📝 Add post: "${title}" via Frosti Contributor App`,
        content: mdBase64,
        branch: uniqueBranchName
      })
    });

    if (uploadMdRes.status !== 200 && uploadMdRes.status !== 201) {
      const err = await uploadMdRes.json();
      throw new Error(`Markdown commit failed: ${err.message}`);
    }
    consoleLog("Markdown post committed successfully!");
    updateProgressState("commit-md", "completed");

    // -----------------------------------------------------------------
    // STEP 5: Opening Pull Request
    // -----------------------------------------------------------------
    updateProgressState("pr", "active");
    consoleLog(`Submitting Pull Request to original upstream repository: ${upstreamOwner}/${upstreamRepo}...`);

    const prPayload = {
      title: `📝 Contribution: "${title}" by @${userGitHubName}`,
      head: `${userGitHubName}:${uniqueBranchName}`,
      base: baseBranch,
      body: `This Pull Request was securely generated entirely from the browser using the **Frosti Desktop Contributor App** on behalf of @${userGitHubName}.\n\n### Contribution Summary\n- **Title**: ${title}\n- **Date**: ${$("meta-date").value}\n- **Staged Images**: ${totalAssets} image assets uploaded.\n- **Description**: ${$("meta-desc").value}\n\nPlease review and merge this draft to host it statically on the blog!`
    };

    const createPRRes = await fetch(`https://api.github.com/repos/${upstreamOwner}/${upstreamRepo}/pulls`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(prPayload)
    });

    if (createPRRes.status !== 201) {
      const err = await createPRRes.json();
      throw new Error(`Failed to create Pull Request: ${err.message}`);
    }

    const prData = await createPRRes.json();
    consoleLog(`🎉 Pull Request created successfully! PR Link: ${prData.html_url}`);
    updateProgressState("pr", "completed");

    // Clear loading, configure final state
    $("btn-execute-publish").classList.add("hidden");
    $("btn-view-pr").classList.remove("hidden");
    $("btn-view-pr").href = prData.html_url;
    $("btn-cancel-modal").classList.remove("hidden");
    $("btn-cancel-modal").textContent = "Close Panel";
    
    toast("🎉 Pull Request submitted successfully!", "success");

  } catch (err) {
    console.error(err);
    consoleLog(`CRITICAL PIPELINE FAILURE: ${err.message}`, true);
    
    // Find active step and mark failed
    const activeStep = document.querySelector(".step-progress-row.active");
    if (activeStep) {
      activeStep.classList.remove("active");
      activeStep.classList.add("failed");
      const indicator = activeStep.querySelector(".step-indicator");
      indicator.querySelector(".loading").classList.add("hidden");
      const num = indicator.querySelector(".step-num");
      num.classList.remove("hidden");
      num.textContent = "✕";
    }

    $("modal-error-msg").textContent = `Error: ${err.message}`;
    
    // Enable execute buttons again to retry
    $("btn-execute-publish").disabled = false;
    $("btn-execute-publish").textContent = "Retry Publish";
    $("btn-cancel-modal").classList.remove("hidden");
    toast("Contribution pipeline failed", "error");
  }
}
