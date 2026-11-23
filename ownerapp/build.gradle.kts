plugins {
    alias(libs.plugins.android.application)
}
android {
    namespace = "com.deela.owner"
    compileSdk = 37
    defaultConfig {
        applicationId = "com.deela.owner"
        minSdk = 27
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
        val publicUrl = System.getenv("DEELA_OWNER_URL")?.trim()
            ?.takeIf { it.startsWith("https://") && !it.contains("\"") }
            ?: "https://deela-owner.invalid/"
        buildConfigField("String", "DEELA_OWNER_URL", "\"" + publicUrl + "\"")
    }
    buildFeatures { buildConfig = true }
    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
