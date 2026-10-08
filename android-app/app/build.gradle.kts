import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

// Release signing: reads android-app/keystore.properties (gitignored, never commit it).
// Until that file exists, release builds fall back to the debug keystore so the
// project still builds end to end — see android-app/README.md for how to generate
// a real signing key before shipping anywhere.
val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) keystorePropsFile.inputStream().use { load(it) }
}

android {
    namespace = "com.emurm.app"
    compileSdk = 35

    // AGP's default ignoreAssetsPattern contains `<dir>_*`, which silently DROPS every
    // asset directory whose name starts with an underscore -- including Next.js's
    // `_next/` (all the CSS and JS). The APK then had the HTML but no stylesheets or
    // scripts: every /_next/... request 404'd, so the page rendered unstyled and never
    // hydrated, on every device, regardless of WebView version. Same pattern as the
    // default minus that one entry.
    androidResources {
        ignoreAssetsPattern = "!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~"
    }

    defaultConfig {
        applicationId = "com.emurm.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "1.1.0"

        // The real, deployed site. EmuRM's own service worker (public/sw.js) is what
        // gives this app its offline support and asset caching — the app itself never
        // bundles a second copy of the web build, so it never drifts out of sync with
        // what's actually live. See README.md "Architecture" for why. MainActivity
        // derives the "is this navigation same-origin" host check from this URL at
        // runtime rather than a second BASE_HOST constant, so editing this one value
        // (e.g. for local dev) can't leave the two out of sync with each other.
        buildConfigField("String", "BASE_URL", "\"https://www.emurm.com/\"")
    }

    signingConfigs {
        getByName("debug") {
            enableV1Signing = true
            enableV2Signing = true
            enableV3Signing = true
        }
        if (keystorePropsFile.exists()) {
            create("release") {
                storeFile = rootProject.file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
            // Points the WebView at the same production site by default (there's no
            // staging server) but as its own BuildConfig constant, so you can flip this
            // to e.g. "http://10.0.2.2:3000/" for an emulator talking to `npm run dev`
            // on the host machine, or your LAN IP for a physical device, without
            // touching the release config. The debug-only network security config
            // (src/debug/res/xml) permits cleartext *only* for localhost/10.0.2.2 so
            // this works without weakening the release build's HTTPS-only policy.
            buildConfigField("String", "BASE_URL", "\"https://www.emurm.com/\"")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = if (keystorePropsFile.exists()) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
        }
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources.excludes.add("META-INF/*.version")
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.core.splashscreen)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.activity.ktx)
    implementation(libs.androidx.browser)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.material)
}

// Always package a validated, root-path static export, including every core and skin.
val webExport = rootProject.layout.projectDirectory.dir("../out")
val bundledWeb = layout.buildDirectory.dir("generated/emurmAssets")
val bundleWebAssets by tasks.registering(Sync::class) {
    from(webExport)
    into(bundledWeb.map { it.dir("web") })
    doFirst {
        require(webExport.file("index.html").asFile.exists()) {
            "Build the web app first: npm ci && npm run build (without NEXT_BASE_PATH)."
        }
        require(!webExport.file("index.html").asFile.readText().contains("/EmuRM/_next/")) {
            "Android requires a root-path export. Rebuild without NEXT_BASE_PATH."
        }
    }
}
android.sourceSets.getByName("main").assets.srcDir(bundledWeb)
tasks.named("preBuild").configure { dependsOn(bundleWebAssets) }
