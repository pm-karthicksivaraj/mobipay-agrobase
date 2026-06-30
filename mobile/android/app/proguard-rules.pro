# ProGuard rules for Agrobase V3 mobile app
# Optimizes APK size and protects against reverse engineering

# ─── Flutter / Dart ───────────────────────────────────────────
# Keep Flutter engine
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }

# ─── SQLite (drift database) ──────────────────────────────────
-keep class * extends androidx.sqlite.db.SupportSQLiteOpenHelper { *; }
-keep class androidx.sqlite.db.** { *; }
-keep class com.squareup.sqldelight.** { *; }
-keep class drift.** { *; }
-keep class sqlite3.** { *; }
-keep class * extends drift.DatabaseConnection { *; }
-keepclassmembernames class * {
    @drift.* <methods>;
}

# ─── Connectivity Plus ────────────────────────────────────────
-keep class com.lynxal.connectivity_plus.** { *; }

# ─── WorkManager (background sync) ────────────────────────────
-keep class androidx.work.** { *; }
-keep class dev.fluttercommunity.workmanager.** { *; }

# ─── Shared Preferences ───────────────────────────────────────
-keep class io.flutter.plugins.sharedpreferences.** { *; }

# ─── HTTP ─────────────────────────────────────────────────────
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# ─── UUID ─────────────────────────────────────────────────────
-keep class uuid.** { *; }

# ─── Share Plus ───────────────────────────────────────────────
-keep class io.flutter.plugins.share.** { *; }

# ─── General Flutter protection ───────────────────────────────
-dontwarn android.**
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses
