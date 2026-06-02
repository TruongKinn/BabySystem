package com.mom.notification;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;
import java.io.File;
import java.nio.file.Files;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@EnableCaching
@EnableScheduling
@SpringBootApplication
public class NotificationServiceApplication {

    public static void main(String[] args) {
        autoConfigureVaultToken();
        SpringApplication.run(NotificationServiceApplication.class, args);
    }

    private static void autoConfigureVaultToken() {
        String envToken = System.getenv("VAULT_TOKEN");
        String propToken = System.getProperty("spring.cloud.vault.token");

        if ((envToken == null || envToken.trim().isEmpty() || "root".equals(envToken)) &&
            (propToken == null || propToken.trim().isEmpty() || "root".equals(propToken))) {

            String[] possiblePaths = {
                "../../infrastructure/vault/cluster-keys.json",
                "codebase/infrastructure/vault/cluster-keys.json",
                "../infrastructure/vault/cluster-keys.json",
                "infrastructure/vault/cluster-keys.json"
            };

            for (String path : possiblePaths) {
                File file = new File(path);
                if (file.exists() && file.isFile()) {
                    try {
                        String content = new String(Files.readAllBytes(file.toPath()));
                        Pattern pattern = Pattern.compile("\"root_token\"\\s*:\\s*\"([^\"]+)\"");
                        Matcher matcher = pattern.matcher(content);
                        if (matcher.find()) {
                            String rootToken = matcher.group(1);
                            System.setProperty("spring.cloud.vault.token", rootToken);
                            System.out.println("[Vault AutoConfig] Successfully auto-configured Vault Token from: " + file.getAbsolutePath());
                            return;
                        }
                    } catch (Exception e) {
                        System.err.println("[Vault AutoConfig] Failed to read Vault keys from " + path + ": " + e.getMessage());
                    }
                }
            }
            System.out.println("[Vault AutoConfig] cluster-keys.json not found, falling back to default configuration.");
        }
    }
}
