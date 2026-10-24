plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "com.emurm.rg353v"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.emurm.rg353v"
        minSdk = 26
        // 30 = the target device's Android 11. Keeps the platform behavior this app was
        // designed against (scoped storage via SAF, package-visibility <queries>).
        targetSdk = 30
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            // No code shrinking: the app is small, and an installable build matters more
            // than a few hundred KB. Signed with the debug key so it installs directly.
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    buildFeatures { buildConfig = true }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.recyclerview)
    testImplementation(libs.junit)
}
