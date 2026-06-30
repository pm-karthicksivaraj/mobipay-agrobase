plugins {
    id("com.android.application")
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.mobipay.agrobase_mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.mobipay.agrobase_mobile"

        // ─── Low-end phone support ───────────────────────────
        // Android 7.0 (API 24) covers 98%+ of devices in Uganda, Ghana, Kenya
        // Supports phones with 1GB RAM (most Tecno, Itel, Infinix budget phones)
        minSdk = 24
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName

        // ─── APK size optimization ───────────────────────────
        // Split per ABI to reduce APK size by ~40%
        ndk {
            abiFilters += listOf("armeabi-v7a", "arm64-v8a", "x86_64")
        }
    }

    buildTypes {
        release {
            // ─── Size + performance optimization ─────────────────
            // R8 + ProGuard for tree-shaking + code shrinking
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("debug")
        }
        debug {
            isMinifyEnabled = false
        }
    }

    // ─── APK splits for smaller downloads ──────────────────────
    splits {
        abi {
            isEnable = true
            reset()
            include("armeabi-v7a", "arm64-v8a")
            isUniversalApk = true
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
