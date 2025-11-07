
// This file tells Gradle how to build a Paper plugin

plugins {
    id("java")
}

group = "me.nothingai" // You can change this
version = "1.0-SNAPSHOT"

// Set Java version
java {
    toolchain.languageVersion.set(JavaLanguageVersion.of(17))
}

repositories {
    mavenCentral()
    maven("https://repo.papermc.io/repository/maven-public/")
}

dependencies {
    // This is the Paper API. We set it to 1.20.1, but this can be updated.
    compileOnly("io.papermc.paper:paper-api:1.20.1-R0.1-SNAPSHOT")
}

tasks.getByName<Jar>("jar") {
    // This sets the name of the final .jar file
    archiveFileName.set("MyPlugin.jar")
}
