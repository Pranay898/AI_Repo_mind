package com.repomind.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
@Slf4j
public class DatabaseConfig {

    @Bean
    @Primary
    public DataSource dataSource(DataSourceProperties properties) {
        String dbUrl = System.getenv("DATABASE_URL");
        if (dbUrl == null || dbUrl.isBlank()) {
            dbUrl = System.getenv("SPRING_DATASOURCE_URL");
        }

        // Render & Heroku provide URLs like: postgres://user:password@host:port/database
        if (dbUrl != null && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
            try {
                URI uri = new URI(dbUrl.replace("postgresql://", "http://").replace("postgres://", "http://"));
                String host = uri.getHost();
                int port = uri.getPort() == -1 ? 5432 : uri.getPort();
                String path = uri.getPath();
                String userInfo = uri.getUserInfo();

                String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path;
                if (uri.getQuery() != null) {
                    jdbcUrl += "?" + uri.getQuery();
                } else if (!jdbcUrl.contains("sslmode") && !host.equals("localhost") && !host.equals("127.0.0.1") && !host.equals("postgres")) {
                    jdbcUrl += "?sslmode=require";
                }

                properties.setUrl(jdbcUrl);
                if (userInfo != null && userInfo.contains(":")) {
                    String[] parts = userInfo.split(":", 2);
                    properties.setUsername(parts[0]);
                    properties.setPassword(parts[1]);
                }
                log.info("Configured PostgreSQL DataSource from environment URL: {}:{}", host, port);
            } catch (Exception e) {
                log.warn("Could not parse cloud database URL, falling back to default properties: {}", e.getMessage());
            }
        }

        return properties.initializeDataSourceBuilder().build();
    }
}

