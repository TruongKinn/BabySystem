FROM eclipse-temurin:17-jdk-alpine

ARG JAR_FILE=target/*.jar

COPY ${JAR_FILE} authentication-service.jar

ENTRYPOINT ["java", "-jar", "authentication-service.jar"]

EXPOSE 8081