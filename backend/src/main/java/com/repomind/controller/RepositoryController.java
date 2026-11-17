package com.repomind.controller;

import com.repomind.dto.AnalyzeRepoRequest;
import com.repomind.dto.ChatRequest;
import com.repomind.dto.RepositoryAnalysisResult;
import com.repomind.service.GeminiAIService;
import com.repomind.service.RepositoryUnderstandingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/repositories")
@RequiredArgsConstructor
@Tag(name = "RepoMind AI", description = "Multi-language GitHub repository visual understanding, workflows, and AI onboarding APIs")
public class RepositoryController {

    private final RepositoryUnderstandingService understandingService;
    private final GeminiAIService geminiService;

    @GetMapping("/health")
    @Operation(summary = "Health and Gemini AI status check")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "RepoMind AI Backend",
                "geminiConfigured", geminiService.isConfigured()
        ));
    }

    @PostMapping("/config/api-key")
    @Operation(summary = "Set or update Gemini API key at runtime without restarting the server")
    public ResponseEntity<Map<String, Object>> updateApiKey(@RequestBody Map<String, String> body) {
        String key = body.getOrDefault("apiKey", "");
        geminiService.setRuntimeApiKey(key);
        return ResponseEntity.ok(Map.of(
                "geminiConfigured", geminiService.isConfigured(),
                "message", geminiService.isConfigured()
                        ? "Gemini API Key saved and active!"
                        : "API key was empty; using Local Codebase Reasoning Agent."
        ));
    }

    @PostMapping("/analyze")
    @Operation(summary = "Clone and analyze any public GitHub repository across all languages")
    public ResponseEntity<RepositoryAnalysisResult> analyzeRepository(@Valid @RequestBody AnalyzeRepoRequest request) {
        return ResponseEntity.ok(understandingService.analyzeRepository(request.getRepositoryUrl(), request.getBranch()));
    }

    @GetMapping
    @Operation(summary = "List all analyzed repositories in current session")
    public ResponseEntity<List<RepositoryAnalysisResult>> listRepositories() {
        return ResponseEntity.ok(understandingService.listAllAnalyzed());
    }

    @GetMapping("/{repositoryId}")
    @Operation(summary = "Get full repository analysis result")
    public ResponseEntity<RepositoryAnalysisResult> getRepository(@PathVariable String repositoryId) {
        return ResponseEntity.ok(understandingService.getAnalysis(repositoryId));
    }

    @GetMapping("/{repositoryId}/structure")
    @Operation(summary = "Get interactive repository folder and file tree")
    public ResponseEntity<List<RepositoryAnalysisResult.FileNode>> getStructure(@PathVariable String repositoryId) {
        return ResponseEntity.ok(understandingService.getAnalysis(repositoryId).getFileTree());
    }

    @GetMapping("/{repositoryId}/file")
    @Operation(summary = "Get raw source code and metadata of a specific file in the repository")
    public ResponseEntity<Map<String, Object>> getFile(
            @PathVariable String repositoryId,
            @RequestParam String path) {
        return ResponseEntity.ok(understandingService.getFileContent(repositoryId, path));
    }

    @GetMapping("/{repositoryId}/overview")
    @Operation(summary = "Get plain-English project overview and language distribution")
    public ResponseEntity<RepositoryAnalysisResult.ProjectOverview> getOverview(@PathVariable String repositoryId) {
        return ResponseEntity.ok(understandingService.getAnalysis(repositoryId).getOverview());
    }

    @GetMapping("/{repositoryId}/architecture")
    @Operation(summary = "Get visual architecture Mermaid diagram and layer breakdown")
    public ResponseEntity<RepositoryAnalysisResult.ArchitectureData> getArchitecture(@PathVariable String repositoryId) {
        return ResponseEntity.ok(understandingService.getAnalysis(repositoryId).getArchitecture());
    }

    @GetMapping("/{repositoryId}/workflows")
    @Operation(summary = "Get application execution workflow diagrams")
    public ResponseEntity<List<RepositoryAnalysisResult.WorkflowDiagram>> getWorkflows(@PathVariable String repositoryId) {
        return ResponseEntity.ok(understandingService.getAnalysis(repositoryId).getWorkflows());
    }

    @GetMapping("/{repositoryId}/components")
    @Operation(summary = "Get discovered classes, components, hooks, services, and modules")
    public ResponseEntity<List<RepositoryAnalysisResult.ComponentItem>> getComponents(@PathVariable String repositoryId) {
        return ResponseEntity.ok(understandingService.getAnalysis(repositoryId).getComponents());
    }

    @GetMapping("/{repositoryId}/apis")
    @Operation(summary = "Get discovered REST APIs, functions, views, and frontend page routes")
    public ResponseEntity<List<RepositoryAnalysisResult.ApiEndpointItem>> getApis(@PathVariable String repositoryId) {
        return ResponseEntity.ok(understandingService.getAnalysis(repositoryId).getApis());
    }

    @GetMapping("/{repositoryId}/dependencies")
    @Operation(summary = "Get detected package dependencies across NPM, Maven, PyPI, etc.")
    public ResponseEntity<List<RepositoryAnalysisResult.DependencyItem>> getDependencies(@PathVariable String repositoryId) {
        return ResponseEntity.ok(understandingService.getAnalysis(repositoryId).getDependencies());
    }

    @GetMapping("/{repositoryId}/onboarding-guide")
    @Operation(summary = "Get customized 5-day new joiner onboarding guide")
    public ResponseEntity<List<RepositoryAnalysisResult.OnboardingDay>> getOnboardingGuide(@PathVariable String repositoryId) {
        return ResponseEntity.ok(understandingService.getAnalysis(repositoryId).getOnboardingGuide());
    }

    @PostMapping("/{repositoryId}/chat")
    @Operation(summary = "Ask Gemini AI or Codebase Reasoning Agent questions about the repository with file context")
    public ResponseEntity<Map<String, Object>> chat(
            @PathVariable String repositoryId,
            @Valid @RequestBody ChatRequest request) {
        return ResponseEntity.ok(understandingService.answerChatQuestion(repositoryId, request));
    }
}
