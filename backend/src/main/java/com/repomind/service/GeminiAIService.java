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
import java.util.*;

@Service
@Slf4j
public class GeminiAIService {

    private volatile String apiKey;
    private final String configuredModel;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    // Verified active Google Gemini models
    private static final String[] MODEL_FALLBACKS = {
            "gemini-1.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-pro",
            "gemini-2.0-flash-lite"
    };

    public GeminiAIService(
            @Value("${repomind.gemini.api-key:}") String injectedKey,
            @Value("${repomind.gemini.model:gemini-1.5-flash}") String configuredModel) {
        this.configuredModel = configuredModel;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
        this.objectMapper = new ObjectMapper();
        this.apiKey = resolveApiKey(injectedKey);
        if (isConfigured()) {
            log.info("GeminiAIService initialized with API key (length={})", this.apiKey.length());
        } else {
            log.info("GeminiAIService initialized without API key; local Codebase Reasoning Engine will be used until key is provided.");
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
        // Check local .env files automatically
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
            log.info("Updated Gemini API key at runtime (length={})", this.apiKey.length());
        }
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.trim().isEmpty();
    }

    public String getApiKey() {
        return apiKey;
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

        List<String> modelsToTry = buildModelList();

        for (String model : modelsToTry) {
            String res = invokeModel(model, prompt, activeKey);
            if (res != null && !res.isBlank()) {
                return res;
            }
        }
        return null;
    }

    public String generateChat(
            String systemInstruction,
            List<Map<String, String>> history,
            String question,
            String overrideApiKey) {

        String activeKey = (overrideApiKey != null && !overrideApiKey.trim().isEmpty())
                ? overrideApiKey.trim()
                : this.apiKey;

        if (activeKey == null || activeKey.trim().isEmpty()) {
            return null;
        }

        List<String> modelsToTry = buildModelList();

        for (String model : modelsToTry) {
            String res = invokeChatModel(model, systemInstruction, history, question, activeKey);
            if (res != null && !res.isBlank()) {
                return res;
            }
        }
        return null;
    }

    private List<String> buildModelList() {
        List<String> modelsToTry = new ArrayList<>();
        if (configuredModel != null && !configuredModel.isBlank()) {
            modelsToTry.add(configuredModel.trim());
        }
        for (String fallback : MODEL_FALLBACKS) {
            if (!modelsToTry.contains(fallback)) {
                modelsToTry.add(fallback);
            }
        }
        return modelsToTry;
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
                    .timeout(Duration.ofSeconds(45))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                return extractTextFromResponse(response.body());
            } else {
                log.warn("Gemini model {} returned HTTP {}: {}", model, response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.warn("Gemini model {} invocation failed: {}", model, e.getMessage());
        }
        return null;
    }

    private String invokeChatModel(
            String model,
            String systemInstruction,
            List<Map<String, String>> history,
            String question,
            String activeKey) {

        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + model + ":generateContent?key=" + activeKey;

            List<Map<String, Object>> contents = new ArrayList<>();

            // If history is provided, add previous turns (user / model)
            if (history != null && !history.isEmpty()) {
                for (Map<String, String> item : history) {
                    String role = item.getOrDefault("role", "user");
                    String text = item.getOrDefault("text", "");
                    if (!text.isBlank()) {
                        String geminiRole = "assistant".equalsIgnoreCase(role) || "model".equalsIgnoreCase(role)
                                ? "model"
                                : "user";
                        contents.add(Map.of(
                                "role", geminiRole,
                                "parts", List.of(Map.of("text", text))
                        ));
                    }
                }
            }

            // Append current user question
            contents.add(Map.of(
                    "role", "user",
                    "parts", List.of(Map.of("text", question))
            ));

            Map<String, Object> body = new HashMap<>();
            body.put("contents", contents);

            if (systemInstruction != null && !systemInstruction.isBlank()) {
                body.put("system_instruction", Map.of(
                        "parts", List.of(Map.of("text", systemInstruction))
                ));
            }

            String json = objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .timeout(Duration.ofSeconds(45))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                return extractTextFromResponse(response.body());
            } else {
                log.warn("Gemini chat model {} returned HTTP {}: {}", model, response.statusCode(), response.body());
                // If 400 because system_instruction is not supported on this model version, retry with prepended prompt
                if (response.statusCode() == 400 && systemInstruction != null) {
                    String combinedPrompt = systemInstruction + "\n\nUser Question: " + question;
                    return invokeModel(model, combinedPrompt, activeKey);
                }
            }
        } catch (Exception e) {
            log.warn("Gemini chat model {} invocation failed: {}", model, e.getMessage());
        }
        return null;
    }

    private String extractTextFromResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    StringBuilder textBuilder = new StringBuilder();
                    for (JsonNode part : parts) {
                        String text = part.path("text").asText("");
                        textBuilder.append(text);
                    }
                    return textBuilder.toString();
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse Gemini JSON response: {}", e.getMessage());
        }
        return null;
    }
}
