package com.repomind.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GeminiAIService {

    private volatile String apiKey;
    private final String configuredModel;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    private static final String[] MODEL_FALLBACKS = {
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-1.5-flash-latest",
            "gemini-1.5-flash",
            "gemini-1.5-pro-latest"
    };

    public GeminiAIService(
            @Value("${repomind.gemini.api-key:}") String injectedKey,
            @Value("${repomind.gemini.model:gemini-2.5-flash}") String configuredModel) {
        this.configuredModel = configuredModel;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
        this.objectMapper = new ObjectMapper();
        this.apiKey = resolveApiKey(injectedKey);
        if (isConfigured()) {
            log.info("GeminiAIService initialized with API key (length={})", this.apiKey.length());
        } else {
            log.info("GeminiAIService initialized without API key; local Codebase Reasoning Agent will be used until key is provided.");
        }
    }

    private String resolveApiKey(String injectedKey) {
        if (injectedKey != null && !injectedKey.trim().isEmpty()) {
            return injectedKey.trim();
        }
        String envKey = System.getenv("GEMINI_API_KEY");
        if (envKey != null && !envKey.trim().isEmpty()) {
            return envKey.trim();
        }
        String googleKey = System.getenv("GOOGLE_API_KEY");
        if (googleKey != null && !googleKey.trim().isEmpty()) {
            return googleKey.trim();
        }
        // Check local .env files automatically for beginner convenience
        String[] candidates = {".env", "../.env", "../docker/.env", "backend/.env", "docker/.env"};
        for (String path : candidates) {
            try {
                File f = new File(path);
                if (f.exists() && f.isFile()) {
                    for (String line : Files.readAllLines(f.toPath())) {
                        String trimmed = line.trim();
                        if (trimmed.startsWith("GEMINI_API_KEY=") || trimmed.startsWith("GOOGLE_API_KEY=")) {
                            String val = trimmed.substring(trimmed.indexOf('=') + 1).trim()
                                    .replaceAll("^[\"']|[\"']$", "");
                            if (!val.isEmpty() && !val.startsWith("your_")) {
                                return val;
                            }
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }
        return "";
    }

    public void setRuntimeApiKey(String newKey) {
        if (newKey != null && !newKey.trim().isEmpty()) {
            this.apiKey = newKey.trim();
            log.info("Updated Gemini API key at runtime.");
        }
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.trim().isEmpty();
    }

    public String generateText(String prompt) {
        return generateText(prompt, null);
    }

    public String generateText(String prompt, String overrideApiKey) {
        String activeKey = (overrideApiKey != null && !overrideApiKey.trim().isEmpty())
                ? overrideApiKey.trim()
                : this.apiKey;

        if (activeKey == null || activeKey.trim().isEmpty()) {
            return null;
        }

        List<String> modelsToTry = new ArrayList<>();
        if (configuredModel != null && !configuredModel.isBlank()) {
            modelsToTry.add(configuredModel.trim());
        }
        for (String fallback : MODEL_FALLBACKS) {
            if (!modelsToTry.contains(fallback)) {
                modelsToTry.add(fallback);
            }
        }

        for (String model : modelsToTry) {
            String res = invokeModel(model, prompt, activeKey);
            if (res != null && !res.isBlank()) {
                return res;
            }
        }
        return null;
    }

    private String invokeModel(String model, String prompt, String activeKey) {
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + model + ":generateContent?key=" + activeKey;

            Map<String, Object> body = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(Map.of("text", prompt)))
                    )
            );

            String json = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && !candidates.isEmpty()) {
                    JsonNode parts = candidates.get(0).path("content").path("parts");
                    if (parts.isArray() && !parts.isEmpty()) {
                        return parts.get(0).path("text").asText();
                    }
                }
            } else if (response.statusCode() != 404) {
                log.warn("Gemini API ({}) returned HTTP {}: {}", model, response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.warn("Gemini model {} invocation warning: {}", model, e.getMessage());
        }
        return null;
    }
}
