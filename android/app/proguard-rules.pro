# Capacitor / Plugins / Firebase / Play Services / In-App Review — safe R8 keep rules
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod <methods>;
}
-keep class com.codetrixstudio.capacitor.** { *; }
-keep class nrn.DoneTogether.com.** { *; }
-keep class com.google.android.play.core.** { *; }
-dontwarn com.google.android.gms.**
-dontwarn com.google.android.play.core.**
