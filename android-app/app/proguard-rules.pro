# Keep the JS bridge's public surface intact — R8 must not rename or strip methods
# called from the WebView's JavaScript side, or every window.AndroidNative.* call
# on the web silently breaks in release builds with no error on either side.
-keepclassmembers class com.emurm.app.JsBridge {
    public *;
}
-keepattributes JavascriptInterface

# Standard WebView reflection safety net (harmless if unused).
-keepclassmembers class * extends android.webkit.WebChromeClient {
    public void openFileChooser(...);
}
