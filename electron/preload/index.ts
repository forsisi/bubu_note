import { contextBridge, ipcRenderer } from "electron";
import type { BubuNotesApi, Note, WebDavSettings } from "../../src/types";

const api: BubuNotesApi = {
  loadNotes: () => ipcRenderer.invoke("notes:load"),
  saveNotes: (notes: Note[]) => ipcRenderer.invoke("notes:save", notes),
  exportMarkdown: (note: Note) => ipcRenderer.invoke("notes:exportMarkdown", note),
  exportJson: (notes: Note[]) => ipcRenderer.invoke("notes:exportJson", notes),
  importMarkdown: () => ipcRenderer.invoke("notes:importMarkdown"),
  testWebDavConnection: (settings: WebDavSettings) => ipcRenderer.invoke("webdav:test", settings),
  loadWebDavNotes: (settings: WebDavSettings) => ipcRenderer.invoke("webdav:load", settings),
  saveWebDavNotes: (settings: WebDavSettings, notes: Note[]) => ipcRenderer.invoke("webdav:save", settings, notes)
};

contextBridge.exposeInMainWorld("bubuNotes", api);
