const { withAppBuildGradle } = require("@expo/config-plugins");

const withAppAuthRedirectScheme = (config, { scheme }) => {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") {
      return cfg;
    }
    let contents = cfg.modResults.contents;

    if (contents.includes("appAuthRedirectScheme:")) {
      return cfg;
    }

    const insertion = `\n        manifestPlaceholders = [\n            appAuthRedirectScheme: '${scheme}'\n        ]\n`;

    const reactNativeReleaseLevelMarker = /buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL"[^\n]*\n/;
    const match = contents.match(reactNativeReleaseLevelMarker);
    if (match && match.index != null) {
      const insertAt = match.index + match[0].length;
      contents = contents.slice(0, insertAt) + insertion + contents.slice(insertAt);
    } else {
      const versionNameMarker = /versionName "[^"]+"\n/;
      const m2 = contents.match(versionNameMarker);
      if (m2 && m2.index != null) {
        const insertAt = m2.index + m2[0].length;
        contents = contents.slice(0, insertAt) + insertion + contents.slice(insertAt);
      } else {
        throw new Error("withAppAuthRedirectScheme: cannot find insertion point in app/build.gradle");
      }
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
};

module.exports = withAppAuthRedirectScheme;
