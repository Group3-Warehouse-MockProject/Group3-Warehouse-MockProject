package com.fpt.sccw.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseSchemaRepair implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            log.info("Checking and repairing approval_histories table schema constraints...");
            jdbcTemplate.execute("ALTER TABLE approval_histories MODIFY COLUMN inventory_check_id BIGINT NULL");
            jdbcTemplate.execute("ALTER TABLE approval_histories MODIFY COLUMN transfer_id BIGINT NULL");
            jdbcTemplate.execute("ALTER TABLE approval_histories MODIFY COLUMN warehouse_receipt_id BIGINT NULL");
            jdbcTemplate.execute("ALTER TABLE approval_histories MODIFY COLUMN old_status VARCHAR(255) NULL");
            log.info("Successfully repaired approval_histories nullable constraints.");
        } catch (Exception e) {
            log.warn("Notice during schema repair for approval_histories: {}", e.getMessage());
        }
    }
}
