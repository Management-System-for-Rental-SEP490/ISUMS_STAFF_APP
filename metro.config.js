const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = config.resolver;
config.transformer.babelTransformerPath = require.resolve(
  "react-native-svg-transformer"
);
config.resolver.assetExts = assetExts.filter((ext) => ext !== "svg");
config.resolver.sourceExts = [...sourceExts, "svg"];

/**
 * Tăng độ ổn định cho Metro trên Windows:
 * - watcher.healthCheck: Metro tự kiểm tra file watcher mỗi 30s;
 *   nếu watcher chết sẽ tự khởi động lại thay vì treo im.
 * - server.timeout = 0: tắt giới hạn thời gian idle của HTTP server
 *   (mặc định Node.js có thể đóng kết nối lâu không dùng).
 */
config.watcher = {
  ...config.watcher,
  healthCheck: {
    enabled: true,
    filePrefix: ".metro-health-check",
    interval: 30000,
    timeout: 5000,
  },
};

config.server = {
  ...config.server,
  timeout: 0,
};

module.exports = config;
