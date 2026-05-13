package com.mom.baby;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@EnableCaching
@SpringBootApplication
public class BabyServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(BabyServiceApplication.class, args);
    }
}
