# Stage 1: Build Spring Boot JAR with Maven 3.9 + JDK 21 (using Google Maven Central mirror to avoid 429 rate-limits)
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

RUN mkdir -p /root/.m2 && printf '%s\n' \
  '<settings>' \
  '  <mirrors>' \
  '    <mirror>' \
  '      <id>google-maven-central</id>' \
  '      <name>GCS Maven Central mirror</name>' \
  '      <url>https://maven-central.storage-download.googleapis.com/maven2</url>' \
  '      <mirrorOf>central</mirrorOf>' \
  '    </mirror>' \
  '  </mirrors>' \
  '</settings>' > /root/.m2/settings.xml

COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Lightweight Java 21 Runtime
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
