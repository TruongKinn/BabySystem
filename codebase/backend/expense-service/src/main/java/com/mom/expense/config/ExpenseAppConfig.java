package com.mom.expense.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.client.RestTemplate;

@Configuration
@EnableScheduling
public class ExpenseAppConfig {

    /**
     * RestTemplate để fetch tỷ giá từ Vietcombank (external).
     * Timeout tương đối cao vì external network call.
     */
    @Bean(name = "exchangeRateRestTemplate")
    public RestTemplate exchangeRateRestTemplate() {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.getInterceptors().add((request, body, execution) -> {
            request.getHeaders().set(
                    org.springframework.http.HttpHeaders.USER_AGENT,
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            );
            return execution.execute(request, body);
        });
        return restTemplate;
    }

    /**
     * RestTemplate để gọi nội bộ account-service (internal).
     */
    @Bean(name = "internalRestTemplate")
    public RestTemplate internalRestTemplate() {
        return new RestTemplate();
    }
}
