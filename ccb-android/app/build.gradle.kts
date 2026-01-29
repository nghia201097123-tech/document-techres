plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.techres.ccb"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.techres.ccb"
        minSdk = 23  // Android 6.0 Marshmallow - Compatible với máy POS cũ
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
            // APISIX Gateway URL - điều hướng request qua header x-svc-id
            buildConfigField("String", "APISIX_GATEWAY_URL", "\"http://localhost:4000/\"")
            // Service port IDs (dùng làm x-svc-id header)
            buildConfigField("String", "SVC_ID_OAUTH", "\"1506\"")
            buildConfigField("String", "SVC_ID_DASHBOARD", "\"1503\"")
            buildConfigField("String", "SVC_ID_MASTER_DATA", "\"1504\"")
            buildConfigField("String", "SVC_ID_UPLOAD", "\"1505\"")
            buildConfigField("String", "SVC_ID_SOCKET", "\"1507\"")
            buildConfigField("String", "SVC_ID_APP_FOOD", "\"1509\"")
            // Socket-service (port 1507)
            buildConfigField("String", "SOCKET_URL", "\"https://beta-socket.techres.vn\"")
        }
        release {
            isMinifyEnabled = true
            // APISIX Gateway URL
            buildConfigField("String", "APISIX_GATEWAY_URL", "\"https://api.techres.vn/\"")
            // Service port IDs
            buildConfigField("String", "SVC_ID_OAUTH", "\"1506\"")
            buildConfigField("String", "SVC_ID_DASHBOARD", "\"1503\"")
            buildConfigField("String", "SVC_ID_MASTER_DATA", "\"1504\"")
            buildConfigField("String", "SVC_ID_UPLOAD", "\"1505\"")
            buildConfigField("String", "SVC_ID_SOCKET", "\"1507\"")
            buildConfigField("String", "SVC_ID_APP_FOOD", "\"1509\"")
            // Socket-service production URL
            buildConfigField("String", "SOCKET_URL", "\"https://socket.techres.vn\"")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        // Enable desugaring for Java 8+ APIs (java.time, etc.) on Android 6.0+
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

// Room schema export - placed at project level to access projectDir correctly
ksp {
    arg("room.schemaLocation", "$projectDir/schemas")
}

dependencies {
    // Desugaring for Java 8+ APIs on Android 6.0+ (java.time, streams, etc.)
    coreLibraryDesugaring(libs.desugar.jdk.libs)

    // AndroidX Core
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)

    // Material Design (for XML themes)
    implementation(libs.material)

    // Compose
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)

    // Navigation
    implementation(libs.androidx.navigation.compose)

    // Hilt
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)

    // Room
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)

    // Network
    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.gson)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)

    // Coroutines
    implementation(libs.kotlinx.coroutines.android)

    // DataStore
    implementation(libs.datastore.preferences)

    // WorkManager (Android 6+ compatible)
    implementation(libs.work.runtime.ktx)
    implementation(libs.hilt.work)
    ksp(libs.hilt.work.compiler)

    // Image Loading
    implementation(libs.coil.compose)

    // QR Code Generation
    implementation("com.google.zxing:core:3.5.2")

    // Gson
    implementation(libs.gson)

    // Logging
    implementation(libs.timber)

    // Socket.IO Client (for real-time payment notifications)
    implementation(libs.socket.io.client)

    // Testing
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
}
