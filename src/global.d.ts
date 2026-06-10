import type { BubuNotesApi } from "./types";

declare global {
  interface Window {
    bubuNotes?: BubuNotesApi;
    Capacitor?: {
      isNativePlatform?: () => boolean;
    };
  }
}

declare module "*.svg" {
  const src: string;
  export default src;
}
