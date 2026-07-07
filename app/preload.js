const { contextBridge, ipcRenderer } = require("electron");

// Expose secure, native channels through the contextBridge
contextBridge.exposeInMainWorld("electronAPI", {
  // Dialog operations
  selectFile: () => ipcRenderer.invoke("dialog:select-file"),
  selectImage: () => ipcRenderer.invoke("dialog:select-image"),
  
  // Shell actions
  openExternal: (url) => ipcRenderer.send("shell:open-external", url),
  
  // Draft management
  saveDraft: (draftData) => ipcRenderer.invoke("draft:save", draftData),
  loadDraft: () => ipcRenderer.invoke("draft:load"),
  
  // System info
  getAppInfo: () => ipcRenderer.invoke("app:info")
});
