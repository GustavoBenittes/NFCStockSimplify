module.exports = {
  expo: {
    name: "NFCStockSimplify",
    slug: "NFCStockSimplify",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/adaptive-icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    plugins: [
      "expo-dev-client"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.nfcstocksimplify.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.nfcstocksimplify.app",
      permissions: [
        "android.permission.NFC"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "fd6ddbd8-7780-404f-aa0d-f0fe19306f75"
      }
    }
  }
};
