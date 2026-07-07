const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1000,
    minHeight: 700,
    title: "Frosti Blog Contributor Dashboard",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    // Frameless options or custom menu can be set here if desired.
    // For now we will use a standard window with a premium feel.
  });

  // Hide the default electron menu bar for a clean, premium desktop app experience
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// ─── IPC Native Handlers ──────────────────────────────────────────

// 1. Select and Import a Local Markdown File (.md / .mdx)
ipcMain.handle("dialog:select-file", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Import Markdown File",
    properties: ["openFile"],
    filters: [
      { name: "Markdown files", extensions: ["md", "mdx"] },
      { name: "All Files", extensions: ["*"] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const name = path.basename(filePath);
    return {
      canceled: false,
      name: name,
      path: filePath,
      content: content
    };
  } catch (error) {
    console.error("Error reading file:", error);
    return { error: error.message };
  }
});

// 2. Select and Import a Local Image File
ipcMain.handle("dialog:select-image", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select Image for Upload",
    properties: ["openFile"],
    filters: [
      { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif", "svg"] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  try {
    const imageBuffer = fs.readFileSync(filePath);
    const base64Data = imageBuffer.toString("base64");
    const name = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    // Determine mime-type
    let mime = "image/png";
    if (ext === ".jpg" || ext === ".jpeg") mime = "image/jpeg";
    else if (ext === ".webp") mime = "image/webp";
    else if (ext === ".gif") mime = "image/gif";
    else if (ext === ".svg") mime = "image/svg+xml";

    return {
      canceled: false,
      name: name,
      path: filePath,
      mime: mime,
      base64: `data:${mime};base64,${base64Data}`,
      rawBase64: base64Data // useful for direct GitHub raw commits
    };
  } catch (error) {
    console.error("Error reading image:", error);
    return { error: error.message };
  }
});

// 3. Securely Open Links in the System Default Browser
ipcMain.on("shell:open-external", async (_event, url) => {
  // Validate URL prefix to prevent command execution vulnerabilities
  if (url.startsWith("http://") || url.startsWith("https://")) {
    await shell.openExternal(url);
  }
});

// 4. Save Post Draft Locally in AppData
ipcMain.handle("draft:save", async (_event, draftData) => {
  try {
    const userDataPath = app.getPath("userData");
    const draftPath = path.join(userDataPath, "post_draft.json");
    fs.writeFileSync(draftPath, JSON.stringify(draftData, null, 2), "utf-8");
    return { success: true };
  } catch (error) {
    console.error("Error saving draft:", error);
    return { success: false, error: error.message };
  }
});

// 5. Load Post Draft from AppData
ipcMain.handle("draft:load", async () => {
  try {
    const userDataPath = app.getPath("userData");
    const draftPath = path.join(userDataPath, "post_draft.json");
    if (fs.existsSync(draftPath)) {
      const dataStr = fs.readFileSync(draftPath, "utf-8");
      return { exists: true, data: JSON.parse(dataStr) };
    }
    return { exists: false };
  } catch (error) {
    console.error("Error loading draft:", error);
    return { exists: false, error: error.message };
  }
});

// 6. Get App Information
ipcMain.handle("app:info", () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    userDataPath: app.getPath("userData")
  };
});
