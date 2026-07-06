package com.fpt.sccw;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class SccwApplication {

	public static void main(String[] args) {
		SpringApplication.run(SccwApplication.class, args);
	}

}
