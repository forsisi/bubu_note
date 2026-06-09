import { contextBridge, ipcRenderer } from "electron";
import type { BubuNotesApi, Note } from "../../src/types";

const api: BubuNotesApi = {
  loadNotes: () => ipcRenderer.invoke("notes:load"),
  saveNotes: (notes: Note[]) => ipcRenderer.invoke("notes:save", notes),
  exportMarkdown: (note: Note) => ipcRenderer.invoke("notes:exportMarkdown", note),
  exportJson: (notes: Note[]) => ipcRenderer.invoke("notes:exportJson", notes),
  importMarkdown: () => ipcRenderer.invoke("notes:importMarkdown")
};

contextBridge.exposeInMainWorld("bubuNotes", api);
