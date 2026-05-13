package com.mom.insight;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@EnableCaching
@SpringBootApplication
public class InsightServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(InsightServiceApplication.class, args);
    }
}
