import type { BubuNotesApi } from "./types";

declare global {
  interface Window {
    bubuNotes: BubuNotesApi;
  }
}

declare module "*.svg" {
  const src: string;
  export default src;
}
