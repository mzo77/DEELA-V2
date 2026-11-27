import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
}

val localProps = Properties().apply {
    val file = rootProject.layout.projectDirectory.file("local.properties").asFile
    if (file.exists()) file.inputStream().use(::load)
}
fun signingProperty(name: String): String? = localProps.getProperty(name) ?: System.getenv(name)

android {
    namespace = "com.deela.books.admin"
    compileSdk = 37
    defaultConfig {
        applicationId = "com.deela.books.admin"
        minSdk = 27
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
    }
    signingConfigs {
        val store = signingProperty("AuraStoreFile")?.let { file(it) }
        val storePassword = signingProperty("AuraStorePassword")
        if (store != null && store.isFile && storePassword != null) {
            create("release") {
                storeFile = store
                this.storePassword = storePassword
                keyAlias = signingProperty("AuraStoreKeyAlias") ?: "aurastore"
                keyPassword = signingProperty("AuraStoreKeyPassword") ?: storePassword
            }
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfigs.findByName("release")?.let { signingConfig = it }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
