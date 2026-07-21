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
public class TransferLegacyDataRepair implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        if (!hasColumn("transfers", "created_by_id") || !hasColumn("transfers", "user_id")) {
            return;
        }

        int repairedFromLegacyUser = jdbcTemplate.update("""
                UPDATE transfers t
                JOIN users u ON u.id = t.user_id
                SET t.created_by_id = t.user_id
                WHERE t.created_by_id IS NULL OR t.created_by_id = 0
                """);

        int repairedWithFallback = jdbcTemplate.update("""
                UPDATE transfers t
                SET t.created_by_id = (SELECT MIN(u.id) FROM users u)
                WHERE (t.created_by_id IS NULL OR t.created_by_id = 0)
                  AND (SELECT MIN(u.id) FROM users u) IS NOT NULL
                """);

        if (repairedFromLegacyUser > 0 || repairedWithFallback > 0) {
            log.info("Repaired {} transfer.created_by_id values from legacy user_id and {} with fallback user.",
                    repairedFromLegacyUser, repairedWithFallback);
        }
    }

    private boolean hasColumn(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = ?
                  AND column_name = ?
                """, Integer.class, tableName, columnName);
        return count != null && count > 0;
    }
}
