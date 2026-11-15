package com.repomind.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepositoryAnalysisResult {
    private String repositoryId;
    private String repositoryName;
    private String repositoryUrl;
    private String branch;
    private String status; // ANALYZING, COMPLETED, FAILED
    private Instant analyzedAt;
    private int totalFiles;
    private int totalDirectories;

    // Feature C: Project Overview
    private ProjectOverview overview;

    // Feature B: Languages & Frameworks
    private Map<String, Integer> languageDistribution;
    @Builder.Default
    private List<String> detectedFrameworks = new ArrayList<>();
    @Builder.Default
    private List<DependencyItem> dependencies = new ArrayList<>();
    @Builder.Default
    private List<String> agentThinkingSteps = new ArrayList<>();

    // Feature E: Repository Explorer Tree
    @Builder.Default
    private List<FileNode> fileTree = new ArrayList<>();

    // Feature D: Visual Architecture
    private ArchitectureData architecture;

    // Feature F: Application Workflows
    @Builder.Default
    private List<WorkflowDiagram> workflows = new ArrayList<>();

    // Feature G: Component Explorer
    @Builder.Default
    private List<ComponentItem> components = new ArrayList<>();

    // Feature H: API Explorer
    @Builder.Default
    private List<ApiEndpointItem> apis = new ArrayList<>();

    // Feature I: Database & Data Flow
    private DatabaseInfo databaseInfo;

    // Feature J: New Joiner Learning Guide
    @Builder.Default
    private List<OnboardingDay> onboardingGuide = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectOverview {
        private String purpose;
        private String businessFunctionality;
        private String applicationType;
        private String architectureSummary;
        private List<String> mainModules;

        public String getPrimaryLanguage() {
            return applicationType;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FileNode {
        private String name;
        private String path;
        private String type; // FILE or DIRECTORY
        private String language;
        private long sizeBytes;
        private String roleSummary;
        @Builder.Default
        private List<FileNode> children = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ArchitectureData {
        private String mermaidDiagram;
        private String mermaidChart;
        private String explanation;
        @Builder.Default
        private List<ArchitectureLayer> layers = new ArrayList<>();

        public String getMermaidChart() {
            return (mermaidChart != null && !mermaidChart.isBlank()) ? mermaidChart : mermaidDiagram;
        }

        public String getMermaidDiagram() {
            return (mermaidDiagram != null && !mermaidDiagram.isBlank()) ? mermaidDiagram : mermaidChart;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ArchitectureLayer {
        private String name;
        private String responsibility;
        private List<String> relatedFiles;

        public String getDescription() {
            return responsibility;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkflowDiagram {
        private String title;
        private String description;
        private String mermaidCode;
        private String mermaidChart;
        private List<String> steps;

        public String getMermaidChart() {
            return (mermaidChart != null && !mermaidChart.isBlank()) ? mermaidChart : mermaidCode;
        }

        public String getMermaidCode() {
            return (mermaidCode != null && !mermaidCode.isBlank()) ? mermaidCode : mermaidChart;
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ComponentItem {
        private String name;
        private String category; // Controller, Service, UI Component, Route, Model, Utility, Config
        private String filePath;
        private String language;
        private String responsibility;
        private List<String> relatedComponents;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApiEndpointItem {
        private String method; // GET, POST, PUT, DELETE, ROUTE
        private String path;
        private String handler;
        private String filePath;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DatabaseInfo {
        private String databaseTechnology;
        private String dataFlowSummary;
        private String mermaidErDiagram;
        @Builder.Default
        private List<String> detectedModels = new ArrayList<>();
        @Builder.Default
        private List<String> dataAccessFiles = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DependencyItem {
        private String name;
        private String version;
        private String ecosystem; // NPM, Maven, PyPI, Go, Cargo, etc.
        private String purpose;

        public String getType() {
            return ecosystem != null ? ecosystem : "Package";
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OnboardingDay {
        private int day;
        private String title;
        private String focusArea;
        private List<String> filesToRead;
        private List<String> keyConcepts;
        private String practicalExercise;
        private List<String> verificationQuestions;

        public String getGoal() {
            return focusArea != null ? focusArea : (practicalExercise != null ? practicalExercise : title);
        }

        public List<String> getTasks() {
            List<String> list = new ArrayList<>();
            if (filesToRead != null && !filesToRead.isEmpty()) {
                list.add("Study files: " + String.join(", ", filesToRead));
            }
            if (keyConcepts != null && !keyConcepts.isEmpty()) {
                list.add("Master concepts: " + String.join(", ", keyConcepts));
            }
            if (practicalExercise != null && !practicalExercise.isBlank()) {
                list.add("Exercise: " + practicalExercise);
            }
            return list.isEmpty() ? List.of("Review codebase modules") : list;
        }
    }
}

