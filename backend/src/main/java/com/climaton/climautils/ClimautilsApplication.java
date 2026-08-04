package com.climaton.climautils;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import com.climaton.climautils.service.RegressionEngineService;

import lombok.RequiredArgsConstructor;

@SpringBootApplication
@RequiredArgsConstructor
public class ClimautilsApplication {

	private final RegressionEngineService modelService;

	public static void main(String[] args) {
		SpringApplication.run(ClimautilsApplication.class, args);
	}

	@Bean
    public CommandLineRunner initDataAndTrainModel() {
        return args -> {
            System.out.println("--- INICIANDO PIPELINE DE DADOS ---");

            modelService.initDataAndTrainModel();

            System.out.println("--- PIPELINE CONCLUÍDO. MODELO TREINADO E PRONTO PARA PREDIÇÃO ---");
        };
    }

}
