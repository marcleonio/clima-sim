package com.climaton.climautils.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("ClimaUtils API - Painel ClimaBrasil")
                        .version("1.0.0")
                        .description("API REST de simulação preditiva e cálculo de trade-offs para o Painel ClimaBrasil usando Regressão OLS.")
                        .contact(new Contact()
                                .name("Equipe ClimaUtils")
                                .email("contato@climautils.com")));
    }
}