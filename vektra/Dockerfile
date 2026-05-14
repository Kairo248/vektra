# --- Build stage: compile the Spring Boot fat JAR with Maven ---
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN mvn -B -DskipTests package \
    && JAR="$(ls /app/target/*.jar | grep -v plain)" \
    && cp "$JAR" /app/application.jar

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=build /app/application.jar /app/app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
