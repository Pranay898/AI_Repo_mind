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
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class GeminiAIService {

    private volatile String apiKey;
    private final String configuredModel;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    // Cache discovered models per API key
    private final Map<String, List<String>> discoveredModelsCache = new ConcurrentHashMap<>();

    // Fallback models in priority order based on Google AI Studio latest endpoints
    private static final String[] STATIC_FALLBACK_MODELS = {
            "gemini-3.8-flash",
            "gemini-3.5-flash-lite",
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-pro"
    };

    public GeminiAIService(
            @Value("${repomind.gemini.api-key:}") String injectedKey,
            @Value("${repomind.gemini.model:gemini-3.8-flash}") String configuredModel) {
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

        List<String> modelsToTry = buildModelList(activeKey);

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

        List<String> modelsToTry = buildModelList(activeKey);

        for (String model : modelsToTry) {
            String res = invokeChatModel(model, systemInstruction, history, question, activeKey);
            if (res != null && !res.isBlank()) {
                return res;
            }
        }
        return null;
    }

    /**
     * Dynamically discovers supported models from Google's ModelService.ListModels API.
     * Caches the list to avoid latency on subsequent calls.
     */
    private List<String> buildModelList(String activeKey) {
        List<String> models = new ArrayList<>();

        // Add explicitly configured model if set
        if (configuredModel != null && !configuredModel.isBlank()) {
            models.add(cleanModelName(configuredModel));
        }

        // Check if we have already discovered models from Google API
        List<String> discovered = discoveredModelsCache.get(activeKey);
        if (discovered == null || discovered.isEmpty()) {
            discovered = queryGoogleForSupportedModels(activeKey);
            if (!discovered.isEmpty()) {
                discoveredModelsCache.put(activeKey, discovered);
            }
        }

        if (discovered != null && !discovered.isEmpty()) {
            for (String dm : discovered) {
                if (!models.contains(dm)) {
                    models.add(dm);
                }
            }
        }

        // Add static fallbacks as safeguards
        for (String fallback : STATIC_FALLBACK_MODELS) {
            if (!models.contains(fallback)) {
                models.add(fallback);
            }
        }

        return models;
    }

    private List<String> queryGoogleForSupportedModels(String activeKey) {
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models?key=" + activeKey;
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .timeout(Duration.ofSeconds(10))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode modelsArray = root.path("models");
                if (modelsArray.isArray() && !modelsArray.isEmpty()) {
                    List<String> usable = new ArrayList<>();
                    for (JsonNode m : modelsArray) {
                        JsonNode methods = m.path("supportedGenerationMethods");
                        boolean supportsGenerate = false;
                        if (methods.isArray()) {
                            for (JsonNode method : methods) {
                                if ("generateContent".equalsIgnoreCase(method.asText())) {
                                    supportsGenerate = true;
                                    break;
                                }
                            }
                        }
                        if (supportsGenerate) {
                            String name = cleanModelName(m.path("name").asText(""));
                            if (!name.isBlank()) {
                                usable.add(name);
                            }
                        }
                    }

                    // Sort flash/chat models to the top
                    usable.sort((a, b) -> {
                        int aScore = (a.contains("flash") ? 10 : 0) + (a.contains("3.") ? 5 : 0) + (a.contains("2.") ? 3 : 0);
                        int bScore = (b.contains("flash") ? 10 : 0) + (b.contains("3.") ? 5 : 0) + (b.contains("2.") ? 3 : 0);
                        return Integer.compare(bScore, aScore);
                    });

                    log.info("Discovered active Google Gemini models: {}", usable);
                    return usable;
                }
            } else {
                log.warn("ModelService.ListModels returned HTTP {}: {}", response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.warn("ModelService.ListModels call failed: {}", e.getMessage());
        }
        return Collections.emptyList();
    }

    private String cleanModelName(String raw) {
        if (raw == null) return "";
        String s = raw.trim();
        if (s.startsWith("models/")) {
            s = s.substring("models/".length());
        }
        return s;
    }

    private String invokeModel(String model, String prompt, String activeKey) {
        String cleanModel = cleanModelName(model);
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + cleanModel + ":generateContent?key=" + activeKey;

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
                log.warn("Gemini model {} returned HTTP {}: {}", cleanModel, response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.warn("Gemini model {} invocation failed: {}", cleanModel, e.getMessage());
        }
        return null;
    }

    private String invokeChatModel(
            String model,
            String systemInstruction,
            List<Map<String, String>> history,
            String question,
            String activeKey) {

        String cleanModel = cleanModelName(model);
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + cleanModel + ":generateContent?key=" + activeKey;

            List<Map<String, Object>> contents = new ArrayList<>();

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
                log.warn("Gemini chat model {} returned HTTP {}: {}", cleanModel, response.statusCode(), response.body());
                // If model returns 400 because system_instruction isn't supported, retry with prepended prompt
                if (response.statusCode() == 400 && systemInstruction != null) {
                    String combinedPrompt = systemInstruction + "\n\nUser Question: " + question;
                    return invokeModel(cleanModel, combinedPrompt, activeKey);
                }
            }
        } catch (Exception e) {
            log.warn("Gemini chat model {} invocation failed: {}", cleanModel, e.getMessage());
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
