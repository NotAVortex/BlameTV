const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("blametvDesktop", {
  isDesktop: true,
  platform: process.platform,
});
