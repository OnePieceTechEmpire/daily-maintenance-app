import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sitediary2u.app",
  appName: "SiteDiary2U",
  webDir: "dist", // dummy folder (we'll create it)
  server: {
    url: "https://www.sitediary2u.com",
    cleartext: false,
  },
};

export default config;
