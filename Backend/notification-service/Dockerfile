# Stage 1: Build with Maven
FROM maven:3.9-eclipse-temurin-17-alpine AS builder
WORKDIR /build
COPY pom.xml .
COPY gateway-service/pom.xml gateway-service/pom.xml
COPY inventory-service/pom.xml inventory-service/pom.xml
COPY auth-service/pom.xml auth-service/pom.xml
COPY sales-service/pom.xml sales-service/pom.xml
COPY customer-service/pom.xml customer-service/pom.xml
COPY reporting-service/pom.xml reporting-service/pom.xml
COPY notification-service/pom.xml notification-service/pom.xml
COPY common-lib/pom.xml common-lib/pom.xml
COPY common-lib/src common-lib/src
COPY notification-service/src notification-service/src
RUN mvn -pl common-lib,notification-service -am -DskipTests clean package -q

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-alpine
VOLUME /tmp
COPY --from=builder /build/notification-service/target/*.jar app.jar
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "/app.jar"]
