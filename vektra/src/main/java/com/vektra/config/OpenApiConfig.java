package com.vektra.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI vektraOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Vektra API")
                        .description("Reward platform REST API (servlet context path is /api).")
                        .version("0.0.1"));
    }
}
