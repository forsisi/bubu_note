import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.bubu.notes",
  appName: "卜卜笔记",
  webDir: "dist-web",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https"
  }
};

export default config;
