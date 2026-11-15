package com.repomind.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.repomind.dto.ChatRequest;
import com.repomind.dto.RepositoryAnalysisResult;
import com.repomind.dto.RepositoryAnalysisResult.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RepositoryUnderstandingService {

    private final GitHubRepositoryService gitHubService;
    private final GeminiAIService geminiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final Map<String, RepositoryAnalysisResult> analysisStore = new ConcurrentHashMap<>();
    private final Map<String, Path> repoPathStore = new ConcurrentHashMap<>();
    private final Map<String, Map<String, String>> repoFileContentsStore = new ConcurrentHashMap<>();

    private static final Set<String> IGNORED_DIRS = Set.of(
            ".git", "node_modules", "vendor", "dist", "build", "target", ".next",
            ".idea", ".vscode", "__pycache__", "coverage", ".gradle", ".mvn", "venv", ".venv"
    );

    private static final Set<String> STOP_WORDS = Set.of(
            "what", "how", "why", "where", "when", "who", "which", "this", "that", "these", "those",
            "does", "do", "did", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
            "can", "could", "should", "would", "will", "the", "a", "an", "in", "on", "at", "to", "for",
            "of", "with", "by", "from", "about", "into", "through", "after", "over", "between", "out",
            "against", "during", "without", "before", "under", "around", "among", "repo", "repository",
            "project", "application", "app", "code", "codebase", "explain", "tell", "me", "show", "give",
            "simple", "terms", "fresher", "used", "using", "work", "works", "working", "step"
    );

    public RepositoryAnalysisResult analyzeRepository(String repositoryUrl, String branch) {
        String fullName = gitHubService.extractRepoFullName(repositoryUrl);
        String repoId = UUID.nameUUIDFromBytes(fullName.toLowerCase().getBytes()).toString();

        Path rootPath = gitHubService.cloneRepository(repoId, repositoryUrl, branch);
        repoPathStore.put(repoId, rootPath);

        Map<String, String> fileContentsMap = new LinkedHashMap<>();
        repoFileContentsStore.put(repoId, fileContentsMap);

        Map<String, Integer> langCounts = new LinkedHashMap<>();
        List<ComponentItem> components = new ArrayList<>();
        List<ApiEndpointItem> apis = new ArrayList<>();
        List<DependencyItem> dependencies = new ArrayList<>();
        Set<String> frameworks = new LinkedHashSet<>();
        Set<String> databaseModels = new LinkedHashSet<>();
        Set<String> dataAccessFiles = new LinkedHashSet<>();

        int[] counts = new int[]{0, 0}; // [files, dirs]
        List<FileNode> tree = scanDirectory(
                rootPath, rootPath, langCounts, components, apis,
                databaseModels, dataAccessFiles, fileContentsMap, counts, 0
        );

        // Detect frameworks and dependencies recursively across manifests
        detectManifestsRecursive(rootPath, rootPath, frameworks, dependencies, 0);

        // Also infer frameworks from source imports if manifest was minimal
        inferFrameworksFromSource(fileContentsMap, frameworks);

        // Identify primary language (excluding Markdown/JSON/YAML if code languages exist)
        String primaryLanguage = langCounts.entrySet().stream()
                .filter(e -> !Set.of("Markdown", "JSON", "YAML", "Text", "CSS / SCSS", "HTML").contains(e.getKey()))
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElseGet(() -> langCounts.entrySet().stream()
                        .max(Map.Entry.comparingByValue())
                        .map(Map.Entry::getKey)
                        .orElse("Multi-Language"));

        List<String> dbModelList = new ArrayList<>(databaseModels);
        List<String> dataAccessList = new ArrayList<>(dataAccessFiles);

        // Build Database Info first so Architecture and Workflows can reference actual DB tech
        DatabaseInfo dbInfo = buildDatabaseInfo(fullName, frameworks, dependencies, dbModelList, dataAccessList, components);

        // Build Dynamic GitDiagram-style Architecture Data with real file-to-file import edges
        ArchitectureData architecture = buildArchitecture(fullName, primaryLanguage, frameworks, components, apis, dbInfo);

        // Build Dynamic Repository-Specific Workflows
        List<WorkflowDiagram> workflows = buildWorkflows(fullName, primaryLanguage, frameworks, apis, components, dbInfo);

        // Build Project Overview (enriched by Gemini AI + deep code inspection)
        ProjectOverview overview = buildOverview(fullName, primaryLanguage, langCounts, frameworks, components, apis, dbInfo, rootPath, fileContentsMap);

        // Build 5-Day New Joiner Learning Guide tailored to actual files & functions
        List<OnboardingDay> onboarding = buildOnboardingGuide(fullName, primaryLanguage, frameworks, components, apis, dbInfo);

        List<String> agentSteps = List.of(
                "Cloned repository '" + fullName + "' (" + counts[0] + " files, " + counts[1] + " directories).",
                "Identified primary language: " + primaryLanguage + ", " + dependencies.size() + " dependencies, and frameworks: " + (frameworks.isEmpty() ? "Standard Library" : frameworks) + ".",
                "Extracted " + components.size() + " source modules and " + apis.size() + " functions/routes with import relationships.",
                "Built system architecture diagram and " + workflows.size() + " execution workflow models.",
                "Indexed " + fileContentsMap.size() + " files in memory for contextual question answering."
        );

        RepositoryAnalysisResult result = RepositoryAnalysisResult.builder()
                .repositoryId(repoId)
                .repositoryName(fullName)
                .repositoryUrl("https://github.com/" + fullName)
                .branch(branch != null && !branch.isBlank() ? branch : "default")
                .status("COMPLETED")
                .analyzedAt(Instant.now())
                .totalFiles(counts[0])
                .totalDirectories(counts[1])
                .overview(overview)
                .languageDistribution(langCounts)
                .detectedFrameworks(new ArrayList<>(frameworks))
                .dependencies(dependencies)
                .agentThinkingSteps(agentSteps)
                .fileTree(tree)
                .architecture(architecture)
                .workflows(workflows)
                .components(components)
                .apis(apis)
                .databaseInfo(dbInfo)
                .onboardingGuide(onboarding)
                .build();

        analysisStore.put(repoId, result);
        return result;
    }

    public RepositoryAnalysisResult getAnalysis(String repoId) {
        RepositoryAnalysisResult res = analysisStore.get(repoId);
        if (res == null) {
            throw new IllegalArgumentException("Repository analysis not found for ID: " + repoId);
        }
        return res;
    }

    public List<RepositoryAnalysisResult> listAllAnalyzed() {
        return new ArrayList<>(analysisStore.values());
    }

    public Map<String, Object> answerChatQuestion(String repoId, String question) {
        return answerChatQuestion(repoId, ChatRequest.builder().question(question).build());
    }

    public Map<String, Object> answerChatQuestion(String repoId, ChatRequest request) {
        RepositoryAnalysisResult repo = getAnalysis(repoId);
        Path rootPath = repoPathStore.get(repoId);
        Map<String, String> fileContents = repoFileContentsStore.getOrDefault(repoId, Map.of());

        String qClean = request.getQuestion() == null ? "" : request.getQuestion().trim();
        String qLower = qClean.toLowerCase();

        // Update runtime API key if passed in request
        if (request.getApiKey() != null && !request.getApiKey().isBlank()) {
            geminiService.setRuntimeApiKey(request.getApiKey());
        }

        // Extract meaningful search tokens from the user's question
        List<String> queryTokens = Arrays.stream(qLower.split("[^a-z0-9_./-]+"))
                .filter(t -> t.length() >= 2 && !STOP_WORDS.contains(t))
                .distinct()
                .toList();

        // Rank all components/files by relevance to the specific question
        List<ComponentItem> rankedComponents = rankComponentsForQuestion(repo, fileContents, qLower, queryTokens);

        List<String> matchedFiles = rankedComponents.stream()
                .limit(6)
                .map(ComponentItem::getFilePath)
                .collect(Collectors.toCollection(ArrayList::new));

        if (matchedFiles.isEmpty() && !repo.getComponents().isEmpty()) {
            repo.getComponents().stream().limit(4).forEach(c -> matchedFiles.add(c.getFilePath()));
        }

        StringBuilder codeSnippets = new StringBuilder();
        for (String filePath : matchedFiles) {
            String content = getFileContent(rootPath, fileContents, filePath);
            if (content != null && !content.isBlank()) {
                String excerpt = extractRelevantCodeSnippet(content, queryTokens, 1800);
                codeSnippets.append("\n--- File: ").append(filePath).append(" ---\n")
                        .append(excerpt).append("\n");
            }
        }

        List<String> agentThoughts = new ArrayList<>();
        agentThoughts.add("Analyzed question: \"" + qClean + "\"");
        agentThoughts.add("Extracted core search tokens: " + (queryTokens.isEmpty() ? "[codebase overview]" : queryTokens));
        agentThoughts.add("Scanned " + repo.getComponents().size() + " components and " + repo.getApis().size() + " endpoints in " + repo.getRepositoryName());
        agentThoughts.add("Gathered source code excerpts from: " + matchedFiles);

        String systemPrompt = "You are RepoMind AI, an expert Senior Software Engineer, Principal Architect, and Codebase Intelligence Assistant (operating just like ChatGPT).\n"
                + "You are helping a software engineer deeply understand this GitHub repository: " + repo.getRepositoryName() + ".\n\n"
                + "CODEBASE PROFILE:\n"
                + "- Primary Languages: " + repo.getLanguageDistribution() + "\n"
                + "- Frameworks & Tools: " + (repo.getDetectedFrameworks().isEmpty() ? "Standard" : String.join(", ", repo.getDetectedFrameworks())) + "\n"
                + "- Database & Storage: " + repo.getDatabaseInfo().getDatabaseTechnology() + " | Models: " + repo.getDatabaseInfo().getDetectedModels() + "\n"
                + "- Project Overview: " + repo.getOverview().getPurpose() + "\n"
                + "- High-level Architecture: " + repo.getArchitecture().getExplanation() + "\n\n"
                + "RELEVANT MODULES & COMPONENTS:\n"
                + rankedComponents.stream().limit(8).map(c -> "- " + c.getFilePath() + " (" + c.getCategory() + "): " + c.getResponsibility()).collect(Collectors.joining("\n")) + "\n\n"
                + "RELEVANT FUNCTIONS & APIS IN CODEBASE:\n"
                + repo.getApis().stream().limit(15).map(a -> "- [" + a.getMethod() + "] " + a.getPath() + " (" + a.getFilePath() + "): " + a.getDescription()).collect(Collectors.joining("\n")) + "\n"
                + (codeSnippets.length() > 0 ? "\nACTUAL SOURCE CODE SNIPPETS FROM REPOSITORY:\n" + codeSnippets : "") + "\n\n"
                + "RESPONSE INSTRUCTIONS:\n"
                + "1. Answer the user's specific question directly, thoroughly, and conversationally in ChatGPT's style.\n"
                + "2. Reference actual file names, function names, classes, and logic from this repository.\n"
                + "3. When describing how something works, break down the step-by-step execution flow with clear explanations.\n"
                + "4. Use GitHub-Flavored Markdown: clean code blocks with syntax highlighting, bullet points, and bold text.\n"
                + "5. If the question asks about a feature or file not in this repository, explain what exists instead in this repository.\n"
                + "6. Do not include raw HTML or weird punctuation formatting.";

        List<Map<String, String>> historyList = new ArrayList<>();
        if (request.getHistory() != null) {
            for (ChatRequest.HistoryItem h : request.getHistory()) {
                if (h.getText() != null && !h.getText().isBlank()) {
                    historyList.add(Map.of("role", h.getRole(), "text", h.getText()));
                }
            }
        }

        String aiAnswer = geminiService.generateChat(systemPrompt, historyList, qClean, request.getApiKey());
        String engineModel;

        if (aiAnswer != null && !aiAnswer.isBlank()) {
            engineModel = "Google Gemini AI (Live)";
            agentThoughts.add("Generated live conversational response via Google Gemini AI model.");
        } else {
            engineModel = "RepoMind Intelligent Reasoning Engine";
            agentThoughts.add("Synthesized code-backed answer from repository source files and AST models.");
            aiAnswer = buildDynamicAgentAnswer(repo, rootPath, fileContents, qClean, qLower, queryTokens, rankedComponents, matchedFiles);
        }

        return Map.of(
                "repositoryId", repoId,
                "question", qClean,
                "answer", aiAnswer,
                "agentThoughts", agentThoughts,
                "referencedFiles", matchedFiles,
                "engine", engineModel
        );
    }

    private List<ComponentItem> rankComponentsForQuestion(
            RepositoryAnalysisResult repo,
            Map<String, String> fileContents,
            String qLower,
            List<String> queryTokens) {

        Map<ComponentItem, Integer> scores = new LinkedHashMap<>();

        boolean asksAuth = qLower.matches(".*(auth|login|register|password|otp|user|role|permission|security|session).*");
        boolean asksDb = qLower.matches(".*(db|database|data|store|storage|collection|table|schema|model|firestore|firebase|sql|mongo|entity).*");
        boolean asksUi = qLower.matches(".*(ui|page|dashboard|view|screen|frontend|component|button|style|css|layout|navbar|modal).*");
        boolean asksApiOrFunc = qLower.matches(".*(api|endpoint|route|function|method|def|handler|controller|call).*");
        boolean asksAiOrGen = qLower.matches(".*(ai|gemini|llm|prompt|question|generate|langchain|model|quiz|bank|curriculum).*");
        boolean asksFlowOrEntry = qLower.matches(".*(flow|workflow|start|entry|main|execute|step|architecture|work|connect|communicate).*");

        for (ComponentItem comp : repo.getComponents()) {
            int score = 0;
            String nameLower = comp.getName().toLowerCase();
            String pathLower = comp.getFilePath().toLowerCase();
            String catLower = comp.getCategory().toLowerCase();
            String respLower = comp.getResponsibility().toLowerCase();
            String contentLower = fileContents.getOrDefault(comp.getFilePath(), "").toLowerCase();

            // Direct file or module name mention in question
            String baseName = nameLower.replaceAll("\\.[a-z0-9]+$", "");
            if (qLower.contains(nameLower) || (baseName.length() > 2 && qLower.contains(baseName))) {
                score += 100;
            }

            // Intent-based boosting
            if (asksAuth && (pathLower.contains("auth") || pathLower.contains("login") || respLower.contains("login") || respLower.contains("otp") || contentLower.contains("password"))) {
                score += 45;
            }
            if (asksDb && (catLower.contains("data") || pathLower.contains("db") || pathLower.contains("model") || pathLower.contains("repo") || contentLower.contains("collection") || contentLower.contains("select "))) {
                score += 45;
            }
            if (asksUi && (catLower.contains("view") || catLower.contains("ui") || catLower.contains("page") || pathLower.contains("dashboard") || pathLower.contains("component"))) {
                score += 35;
            }
            if (asksApiOrFunc && (catLower.contains("controller") || catLower.contains("api") || catLower.contains("service") || catLower.contains("route"))) {
                score += 35;
            }
            if (asksAiOrGen && (pathLower.contains("gen") || pathLower.contains("ai") || pathLower.contains("util") || contentLower.contains("gemini") || contentLower.contains("prompt") || contentLower.contains("langchain"))) {
                score += 50;
            }
            if (asksFlowOrEntry && (catLower.contains("entry") || pathLower.equals("app.py") || pathLower.contains("main") || pathLower.contains("index"))) {
                score += 40;
            }

            // Token matching across path, responsibility, imports, and actual file source code
            for (String token : queryTokens) {
                if (pathLower.contains(token)) score += 30;
                if (respLower.contains(token)) score += 20;
                for (String imp : comp.getRelatedComponents()) {
                    if (imp.toLowerCase().contains(token)) score += 15;
                }
                if (!contentLower.isEmpty() && contentLower.contains(token)) {
                    score += 12;
                    // Bonus if token is a function/class definition in this file
                    if (contentLower.contains("def " + token) || contentLower.contains("function " + token) || contentLower.contains("class " + token)) {
                        score += 35;
                    }
                }
            }

            scores.put(comp, score);
        }

        return scores.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .map(Map.Entry::getKey)
                .toList();
    }

    private String buildDynamicAgentAnswer(
            RepositoryAnalysisResult repo,
            Path rootPath,
            Map<String, String> fileContents,
            String question,
            String qLower,
            List<String> queryTokens,
            List<ComponentItem> rankedComponents,
            List<String> matchedFiles) {

        StringBuilder sb = new StringBuilder();

        // 1. Direct match on a specific file or class name
        ComponentItem directFileMatch = repo.getComponents().stream()
                .filter(c -> {
                    String baseName = c.getName().replaceAll("\\.[a-z0-9]+$", "").toLowerCase();
                    return qLower.contains(c.getName().toLowerCase())
                            || (baseName.length() >= 3 && qLower.contains(baseName))
                            || qLower.contains(c.getFilePath().toLowerCase());
                })
                .findFirst()
                .orElse(null);

        if (directFileMatch != null) {
            String content = getFileContent(rootPath, fileContents, directFileMatch.getFilePath());
            String lang = directFileMatch.getLanguage() != null ? directFileMatch.getLanguage().toLowerCase() : "code";
            String codeBlockTag = lang.contains("python") ? "python" : (lang.contains("java") ? "java" : (lang.contains("type") || lang.contains("react") ? "typescript" : "javascript"));

            sb.append("In **").append(repo.getRepositoryName()).append("**, `").append(directFileMatch.getFilePath()).append("` serves as a core **")
                    .append(directFileMatch.getCategory()).append("** component.\n\n");
            sb.append("### Overview of `").append(directFileMatch.getName()).append("`\n\n");
            sb.append("- **Architectural Role:** ").append(directFileMatch.getResponsibility()).append("\n");
            sb.append("- **Language & Runtime:** ").append(directFileMatch.getLanguage()).append("\n");
            if (!directFileMatch.getRelatedComponents().isEmpty()) {
                sb.append("- **Dependencies & Imports:** `").append(String.join("`, `", directFileMatch.getRelatedComponents())).append("`\n");
            }

            List<ApiEndpointItem> fileFuncs = repo.getApis().stream()
                    .filter(a -> a.getFilePath().equals(directFileMatch.getFilePath()))
                    .toList();
            if (!fileFuncs.isEmpty()) {
                sb.append("\n#### Functions & Handlers in this File\n");
                for (ApiEndpointItem fn : fileFuncs) {
                    sb.append("- **`").append(fn.getPath()).append("`** (*").append(fn.getMethod()).append("*): ").append(fn.getDescription()).append("\n");
                }
            }

            if (content != null && !content.isBlank()) {
                String snippet = extractRelevantCodeSnippet(content, queryTokens, 900);
                sb.append("\n#### Code Implementation Walkthrough\n");
                sb.append("```").append(codeBlockTag).append("\n");
                sb.append(snippet.trim()).append("\n```\n");
            }
            return sb.toString();
        }

        // 2. Specific matching functions / endpoints in codebase
        List<ApiEndpointItem> matchingApis = repo.getApis().stream()
                .filter(a -> queryTokens.stream().anyMatch(t -> a.getPath().toLowerCase().contains(t) || a.getDescription().toLowerCase().contains(t)))
                .limit(6)
                .toList();

        if (!matchingApis.isEmpty() && !qLower.matches(".*(how to run|setup|install|start|overview).*")) {
            sb.append("In **").append(repo.getRepositoryName()).append("**, this functionality is implemented across the following functions and routes:\n\n");
            for (ApiEndpointItem api : matchingApis) {
                sb.append("### `").append(api.getPath()).append("` (*").append(api.getMethod()).append("*)\n");
                sb.append("- **Defined in:** `").append(api.getFilePath()).append("`\n");
                sb.append("- **Description:** ").append(api.getDescription()).append("\n");

                String content = getFileContent(rootPath, fileContents, api.getFilePath());
                if (content != null && !content.isBlank()) {
                    String funcSnippet = extractRelevantCodeSnippet(content, List.of(api.getPath().toLowerCase()), 500);
                    if (!funcSnippet.isBlank()) {
                        sb.append("\n```\n").append(funcSnippet.trim()).append("\n```\n");
                    }
                }
                sb.append("\n");
            }
            return sb.toString();
        }

        // 3. Setup / Local Run / Installation
        if (qLower.matches(".*(how to run|setup|install|start|build|deploy|environment|config|local).*")) {
            sb.append("### How to Set Up & Run `").append(repo.getRepositoryName()).append("` Locally\n\n");
            sb.append("#### 1. Clone the Repository\n");
            sb.append("```bash\ngit clone ").append(repo.getRepositoryUrl()).append(".git\ncd ")
                    .append(repo.getRepositoryName().substring(repo.getRepositoryName().indexOf('/') + 1)).append("\n```\n\n");

            if (repo.getLanguageDistribution().containsKey("Python")) {
                sb.append("#### 2. Install Python Dependencies\n");
                sb.append("```bash\npip install -r requirements.txt\n```\n\n");
                sb.append("#### 3. Run the Application\n");
                if (repo.getDetectedFrameworks().contains("Streamlit")) {
                    sb.append("```bash\nstreamlit run app.py\n```\n");
                } else {
                    sb.append("```bash\npython app.py\n```\n");
                }
            } else if (repo.getLanguageDistribution().containsKey("Java")) {
                sb.append("#### 2. Build & Run with Maven\n");
                sb.append("```bash\n./mvnw spring-boot:run\n```\n");
            } else {
                sb.append("#### 2. Install Packages & Start Dev Server\n");
                sb.append("```bash\nnpm install\nnpm run dev\n```\n");
            }
            return sb.toString();
        }

        // 4. General / Architectural / Custom Question Walkthrough
        sb.append("### Codebase Analysis: ").append(question).append("\n\n");
        sb.append("Based on the code analysis of **").append(repo.getRepositoryName()).append("**:\n\n");

        if (!rankedComponents.isEmpty()) {
            sb.append("#### Primary Responsible Modules\n");
            for (ComponentItem comp : rankedComponents.stream().limit(3).toList()) {
                String lang = comp.getLanguage() != null ? comp.getLanguage().toLowerCase() : "code";
                String codeBlockTag = lang.contains("python") ? "python" : (lang.contains("java") ? "java" : "typescript");

                sb.append("- **`").append(comp.getFilePath()).append("`** (").append(comp.getCategory()).append("): ")
                        .append(comp.getResponsibility()).append("\n");

                String content = getFileContent(rootPath, fileContents, comp.getFilePath());
                if (content != null && !content.isBlank()) {
                    String snippet = extractRelevantCodeSnippet(content, queryTokens, 600);
                    if (!snippet.isBlank()) {
                        sb.append("\n```").append(codeBlockTag).append("\n").append(snippet.trim()).append("\n```\n\n");
                    }
                }
            }
        } else {
            sb.append(repo.getOverview().getPurpose()).append("\n\n");
            sb.append("#### Architecture Breakdown\n");
            sb.append(repo.getArchitecture().getExplanation()).append("\n");
        }

        return sb.toString();
    }
    }

    private String getFileContent(Path rootPath, Map<String, String> fileContents, String relPath) {
        if (fileContents != null && fileContents.containsKey(relPath)) {
            return fileContents.get(relPath);
        }
        if (rootPath != null) {
            try {
                Path p = rootPath.resolve(relPath);
                if (Files.exists(p) && Files.size(p) < 150_000) {
                    return Files.readString(p);
                }
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private String extractRelevantCodeSnippet(String content, List<String> tokens, int maxChars) {
        if (content == null || content.isEmpty()) return "";
        String[] lines = content.split("\r?\n");
        if (tokens != null && !tokens.isEmpty()) {
            int bestLineIdx = -1;
            int bestScore = 0;
            for (int i = 0; i < lines.length; i++) {
                String lineLower = lines[i].toLowerCase();
                int score = 0;
                for (String t : tokens) {
                    if (lineLower.contains(t)) {
                        score += 2;
                        if (lineLower.contains("def ") || lineLower.contains("function ") || lineLower.contains("class ") || lineLower.contains("public ")) {
                            score += 5;
                        }
                    }
                }
                if (score > bestScore) {
                    bestScore = score;
                    bestLineIdx = i;
                }
            }
            if (bestLineIdx >= 0) {
                int start = Math.max(0, bestLineIdx - 3);
                int end = Math.min(lines.length, start + 35);
                StringBuilder sb = new StringBuilder();
                for (int i = start; i < end; i++) {
                    sb.append(lines[i]).append("\n");
                    if (sb.length() >= maxChars) break;
                }
                return sb.toString();
            }
        }
        return content.length() > maxChars ? content.substring(0, maxChars) + "\n... [truncated]" : content;
    }

    private List<FileNode> scanDirectory(
            Path root,
            Path current,
            Map<String, Integer> langCounts,
            List<ComponentItem> components,
            List<ApiEndpointItem> apis,
            Set<String> databaseModels,
            Set<String> dataAccessFiles,
            Map<String, String> fileContentsMap,
            int[] counts,
            int depth) {

        if (depth > 14) return List.of();
        List<FileNode> nodes = new ArrayList<>();
        File[] files = current.toFile().listFiles();
        if (files == null) return nodes;

        Arrays.sort(files, (a, b) -> {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.getName().compareToIgnoreCase(b.getName());
        });

        for (File f : files) {
            String name = f.getName();
            if (IGNORED_DIRS.contains(name) || name.startsWith(".env") || name.endsWith(".pyc") || name.endsWith(".log") || name.endsWith(".lock")) {
                continue;
            }
            String relPath = root.relativize(f.toPath()).toString().replace("\\", "/");

            if (f.isDirectory()) {
                counts[1]++;
                List<FileNode> children = scanDirectory(
                        root, f.toPath(), langCounts, components, apis,
                        databaseModels, dataAccessFiles, fileContentsMap, counts, depth + 1
                );
                nodes.add(FileNode.builder()
                        .name(name)
                        .path(relPath)
                        .type("DIRECTORY")
                        .roleSummary(describeDirectoryRole(name))
                        .children(children)
                        .build());
            } else {
                counts[0]++;
                String lang = detectLanguage(name);
                if (lang != null) {
                    langCounts.put(lang, langCounts.getOrDefault(lang, 0) + 1);
                }

                // Inspect source files deeply
                String dynamicRole = describeFileRole(name, relPath, lang);
                if (lang != null && f.length() < 200_000 && !Set.of("JSON", "Markdown", "YAML", "CSS / SCSS").contains(lang)) {
                    String roleFromCode = inspectSourceFile(f, relPath, lang, components, apis, databaseModels, dataAccessFiles, fileContentsMap);
                    if (roleFromCode != null && !roleFromCode.isBlank()) {
                        dynamicRole = roleFromCode;
                    }
                } else if ("Markdown".equals(lang) && f.length() < 100_000) {
                    try {
                        fileContentsMap.put(relPath, Files.readString(f.toPath()));
                    } catch (Exception ignored) {
                    }
                }

                nodes.add(FileNode.builder()
                        .name(name)
                        .path(relPath)
                        .type("FILE")
                        .language(lang != null ? lang : "Asset")
                        .sizeBytes(f.length())
                        .roleSummary(dynamicRole)
                        .build());
            }
        }
        return nodes;
    }

    private String inspectSourceFile(
            File file,
            String relPath,
            String lang,
            List<ComponentItem> components,
            List<ApiEndpointItem> apis,
            Set<String> databaseModels,
            Set<String> dataAccessFiles,
            Map<String, String> fileContentsMap) {

        String name = file.getName();
        String lowerName = name.toLowerCase();
        String lowerPath = relPath.toLowerCase();

        try {
            String content = Files.readString(file.toPath());
            fileContentsMap.put(relPath, content);

            List<String> imports = extractImports(content, lang);
            List<String> discoveredFunctions = new ArrayList<>();

            // 1. PYTHON DEEP ANALYSIS (Streamlit, FastAPI, Flask, Django, LangChain, Firebase, Data Science)
            if (lang.equals("Python")) {
                // Extract Python functions: def func_name(args):
                Matcher defMatcher = Pattern.compile("(?m)^def\\s+([a-zA-Z0-9_]+)\\s*\\(([^)]*)\\)\\s*:").matcher(content);
                while (defMatcher.find()) {
                    String fnName = defMatcher.group(1);
                    String params = defMatcher.group(2).trim();
                    discoveredFunctions.add(fnName + "(" + (params.length() > 25 ? params.substring(0, 25) + "..." : params) + ")");
                    apis.add(ApiEndpointItem.builder()
                            .method("PYTHON FUNC")
                            .path(fnName + "(" + params + ")")
                            .handler(name)
                            .filePath(relPath)
                            .description("Python function in " + relPath + (imports.isEmpty() ? "" : " using " + String.join(", ", imports.stream().limit(4).toList())))
                            .build());
                }

                // Extract FastAPI / Flask HTTP routes
                Matcher pyRoute = Pattern.compile("@(app|router|bp)\\.(get|post|put|delete|route)\\s*\\(\\s*['\"]([^'\"]+)['\"]").matcher(content);
                while (pyRoute.find()) {
                    apis.add(ApiEndpointItem.builder()
                            .method(pyRoute.group(2).toUpperCase())
                            .path(pyRoute.group(3))
                            .handler(name)
                            .filePath(relPath)
                            .description("Python HTTP route handler in " + relPath)
                            .build());
                }

                // Extract Streamlit titles / tabs / sidebar views
                Matcher stTitle = Pattern.compile("st\\.(?:title|header|subheader)\\s*\\(\\s*['\"]([^'\"]+)['\"]").matcher(content);
                while (stTitle.find()) {
                    String viewTitle = stTitle.group(1);
                    apis.add(ApiEndpointItem.builder()
                            .method("UI VIEW")
                            .path(viewTitle)
                            .handler(name)
                            .filePath(relPath)
                            .description("Streamlit interactive UI section in " + name)
                            .build());
                }

                // Extract Firestore collections: db.collection("...")
                Matcher firestoreMatcher = Pattern.compile("collection\\s*\\(\\s*['\"]([^'\"]+)['\"]\\s*\\)").matcher(content);
                while (firestoreMatcher.find()) {
                    databaseModels.add(firestoreMatcher.group(1) + " (Firestore Collection)");
                    dataAccessFiles.add(relPath);
                }

                // Extract SQL tables or SQLAlchemy models
                Matcher sqlTable = Pattern.compile("(?i)__tablename__\\s*=\\s*['\"]([^'\"]+)['\"]|CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?([a-zA-Z0-9_]+)").matcher(content);
                while (sqlTable.find()) {
                    String tbl = sqlTable.group(1) != null ? sqlTable.group(1) : sqlTable.group(2);
                    databaseModels.add(tbl + " (SQL Table)");
                    dataAccessFiles.add(relPath);
                }

                // Categorize Python module accurately
                String category;
                if (lowerName.equals("app.py") || lowerName.equals("main.py") || lowerName.equals("wsgi.py") || lowerName.equals("manage.py")) {
                    category = "Entry & Routing Layer";
                } else if (lowerName.contains("dashboard") || lowerName.contains("view") || lowerName.contains("ui") || lowerName.contains("page")) {
                    category = "UI View / Dashboard";
                } else if (lowerName.contains("db") || lowerName.contains("database") || lowerName.contains("model") || lowerName.contains("schema") || content.contains("firestore.client()")) {
                    category = "Database & Persistence";
                    dataAccessFiles.add(relPath);
                } else if (lowerName.contains("auth") || lowerName.contains("login") || lowerName.contains("security")) {
                    category = "Authentication & Security";
                } else if (content.contains("GoogleGenerativeAI") || content.contains("langchain") || content.contains("openai") || lowerName.contains("gen") || lowerName.contains("ai")) {
                    category = "AI & Core Business Logic";
                } else {
                    category = "Core Service / Utility";
                }

                String responsibility = buildDynamicResponsibility(name, category, discoveredFunctions, imports, content);
                components.add(ComponentItem.builder()
                        .name(name)
                        .category(category)
                        .filePath(relPath)
                        .language(lang)
                        .responsibility(responsibility)
                        .relatedComponents(imports)
                        .build());
                return responsibility;
            }

            // 2. TYPESCRIPT / JAVASCRIPT / REACT / NEXT.JS / NODE / VUE
            if (lang.equals("TypeScript") || lang.equals("JavaScript") || lang.equals("Vue")) {
                // Extract exported functions/components/hooks
                Matcher exportMatcher = Pattern.compile("(?:export\\s+(?:default\\s+)?(?:async\\s+)?function\\s+([a-zA-Z0-9_]+)|export\\s+const\\s+([a-zA-Z0-9_]+)\\s*=)").matcher(content);
                while (exportMatcher.find()) {
                    String fn = exportMatcher.group(1) != null ? exportMatcher.group(1) : exportMatcher.group(2);
                    if (fn != null && !discoveredFunctions.contains(fn)) {
                        discoveredFunctions.add(fn);
                    }
                }

                // Extract Express / Node routes
                Matcher expressMatcher = Pattern.compile("(app|router)\\.(get|post|put|delete|patch)\\s*\\(\\s*['\"]([^'\"]+)['\"]").matcher(content);
                while (expressMatcher.find()) {
                    apis.add(ApiEndpointItem.builder()
                            .method(expressMatcher.group(2).toUpperCase())
                            .path(expressMatcher.group(3))
                            .handler(name)
                            .filePath(relPath)
                            .description("HTTP endpoint in " + relPath)
                            .build());
                }

                // Extract TypeScript interfaces / types in types/models files
                if (lowerPath.contains("type") || lowerPath.contains("model") || lowerPath.contains("schema")) {
                    Matcher interfaceMatcher = Pattern.compile("export\\s+(?:interface|type)\\s+([A-Za-z0-9_]+)").matcher(content);
                    while (interfaceMatcher.find()) {
                        databaseModels.add(interfaceMatcher.group(1) + " (Type Schema)");
                    }
                }

                // Categorize JS/TS file (even if not in standard subfolders!)
                String category;
                if (lowerPath.contains("pages/api/") || lowerPath.contains("app/api/") || lowerPath.contains("routes/") || lowerPath.contains("controllers/")) {
                    category = "API Route / Controller";
                    String routePath = "/" + relPath.replaceAll("\\.(tsx|jsx|ts|js)$", "");
                    apis.add(ApiEndpointItem.builder()
                            .method("API ROUTE")
                            .path(routePath)
                            .handler(name)
                            .filePath(relPath)
                            .description("Backend API route handler in " + relPath)
                            .build());
                } else if (lowerPath.contains("pages/") || lowerPath.contains("app/") || lowerName.equals("app.tsx") || lowerName.equals("app.jsx") || lowerName.equals("main.tsx") || lowerName.equals("index.tsx")) {
                    category = "Entry & Page Route View";
                    String routePath = "/" + relPath
                            .replaceFirst("^(src/)?(pages|app)/", "")
                            .replaceAll("\\.(tsx|jsx|ts|js)$", "")
                            .replaceAll("index$", "");
                    apis.add(ApiEndpointItem.builder()
                            .method("PAGE ROUTE")
                            .path(routePath.isEmpty() ? "/" : routePath)
                            .handler(name)
                            .filePath(relPath)
                            .description("Frontend view/entry rendered by " + name)
                            .build());
                } else if (lowerPath.contains("components/") || name.endsWith(".tsx") || name.endsWith(".jsx") || name.endsWith(".vue")) {
                    category = "UI View / Component";
                } else if (lowerPath.contains("hooks/") || lowerName.startsWith("use")) {
                    category = "Custom Hook / State";
                } else if (lowerPath.contains("context/") || lowerPath.contains("store/") || lowerPath.contains("redux")) {
                    category = "State & Context Management";
                } else if (lowerPath.contains("utils/") || lowerPath.contains("services/") || lowerPath.contains("api") || lowerPath.contains("lib/")) {
                    category = "Data & API Client Layer";
                    dataAccessFiles.add(relPath);
                    for (String fn : discoveredFunctions) {
                        apis.add(ApiEndpointItem.builder()
                                .method("API CLIENT")
                                .path(fn + "()")
                                .handler(name)
                                .filePath(relPath)
                                .description("API / utility function in " + relPath)
                                .build());
                    }
                } else {
                    category = "Core Module / Config";
                }

                String responsibility = buildDynamicResponsibility(name, category, discoveredFunctions, imports, content);
                components.add(ComponentItem.builder()
                        .name(name)
                        .category(category)
                        .filePath(relPath)
                        .language(lang)
                        .responsibility(responsibility)
                        .relatedComponents(imports)
                        .build());
                return responsibility;
            }

            // 3. JAVA / KOTLIN / SPRING BOOT
            if (lang.equals("Java") || lang.equals("Kotlin")) {
                if (lowerPath.contains("test/") || lowerName.endsWith("test.java") || lowerName.endsWith("tests.java")) {
                    return "Automated test suite in " + relPath;
                }

                // Extract public methods
                Matcher methodMatcher = Pattern.compile("public\\s+(?:static\\s+)?[A-Za-z0-9_<>\\[\\],?\\s]+\\s+([a-zA-Z0-9_]+)\\s*\\(([^)]*)\\)").matcher(content);
                while (methodMatcher.find()) {
                    String mName = methodMatcher.group(1);
                    if (!mName.equals(name.replace(".java", "")) && !Set.of("get", "set", "equals", "hashCode", "toString").contains(mName)) {
                        discoveredFunctions.add(mName + "()");
                    }
                }

                // Extract class-level @RequestMapping if present
                String baseUrl = "";
                Matcher classMapping = Pattern.compile("@RequestMapping\\s*\\(\\s*(?:value\\s*=\\s*)?['\"]([^'\"]+)['\"]").matcher(content);
                if (classMapping.find()) {
                    baseUrl = classMapping.group(1);
                }

                // Extract method-level @GetMapping / @PostMapping / etc.
                Matcher mappingMatcher = Pattern.compile("@(Get|Post|Put|Delete|Patch|Request)Mapping(?:\\s*\\(\\s*(?:value\\s*=\\s*)?['\"]([^'\"]*)['\"])?").matcher(content);
                while (mappingMatcher.find()) {
                    String httpMethod = mappingMatcher.group(1).toUpperCase();
                    if (httpMethod.equals("REQUEST")) httpMethod = "HTTP";
                    String subPath = mappingMatcher.group(2) != null ? mappingMatcher.group(2) : "";
                    String fullEndpoint = (baseUrl + "/" + subPath).replaceAll("//+", "/");
                    if (!fullEndpoint.isEmpty()) {
                        apis.add(ApiEndpointItem.builder()
                                .method(httpMethod)
                                .path(fullEndpoint)
                                .handler(name.replace(".java", ""))
                                .filePath(relPath)
                                .description("Spring controller endpoint in " + name)
                                .build());
                    }
                }

                String cleanName = name.replace(".java", "").replace(".kt", "");
                String category;
                if (content.contains("@SpringBootApplication")) {
                    category = "Entry & Routing Layer";
                } else if (content.contains("@RestController") || content.contains("@Controller") || cleanName.endsWith("Controller")) {
                    category = "Entry & REST Controller";
                } else if (content.contains("@Service") || cleanName.endsWith("Service")) {
                    category = "Core Business Service";
                } else if (content.contains("@Repository") || content.contains("Repository<") || cleanName.endsWith("Repository")) {
                    category = "Database & Persistence";
                    dataAccessFiles.add(relPath);
                } else if (content.contains("@Entity") || content.contains("@Table") || content.contains("@Document") || lowerPath.contains("/model/") || lowerPath.contains("/entity/")) {
                    category = "Database Entity / Model";
                    databaseModels.add(cleanName + " (JPA Entity)");
                    dataAccessFiles.add(relPath);
                } else {
                    category = "Core Domain / Config Module";
                }

                String responsibility = buildDynamicResponsibility(cleanName, category, discoveredFunctions, imports, content);
                components.add(ComponentItem.builder()
                        .name(cleanName)
                        .category(category)
                        .filePath(relPath)
                        .language(lang)
                        .responsibility(responsibility)
                        .relatedComponents(imports)
                        .build());
                return responsibility;
            }

            // 4. OTHER LANGUAGES (Go, Rust, C#, PHP, Ruby, etc.)
            String responsibility = buildDynamicResponsibility(name, lang + " Module", discoveredFunctions, imports, content);
            components.add(ComponentItem.builder()
                    .name(name)
                    .category("Core " + lang + " Module")
                    .filePath(relPath)
                    .language(lang)
                    .responsibility(responsibility)
                    .relatedComponents(imports)
                    .build());
            return responsibility;

        } catch (Exception ignored) {
            return null;
        }
    }

    private String buildDynamicResponsibility(
            String name,
            String category,
            List<String> functions,
            List<String> imports,
            String content) {

        StringBuilder sb = new StringBuilder();
        sb.append(category);
        if (!functions.isEmpty()) {
            sb.append(" — defines ");
            sb.append(functions.stream().limit(5).map(f -> "`" + f + "`").collect(Collectors.joining(", ")));
            if (functions.size() > 5) {
                sb.append(" (+" + (functions.size() - 5) + " more)");
            }
        }
        if (!imports.isEmpty()) {
            sb.append("; integrates with ").append(imports.stream().limit(4).collect(Collectors.joining(", ")));
        }
        return sb.toString();
    }

    private List<String> extractImports(String content, String lang) {
        Set<String> imports = new LinkedHashSet<>();
        if ("Python".equals(lang)) {
            Matcher m1 = Pattern.compile("(?m)^from\\s+([a-zA-Z0-9_.]+)\\s+import\\s+([^\r\n#]+)").matcher(content);
            while (m1.find() && imports.size() < 8) {
                String mod = m1.group(1).trim();
                imports.add(mod);
            }
            Matcher m2 = Pattern.compile("(?m)^import\\s+([a-zA-Z0-9_.]+)").matcher(content);
            while (m2.find() && imports.size() < 8) {
                String mod = m2.group(1).trim();
                if (!Set.of("os", "sys", "io", "time", "random", "csv", "datetime", "tempfile").contains(mod)) {
                    imports.add(mod);
                }
            }
        } else if ("Java".equals(lang) || "Kotlin".equals(lang)) {
            Matcher m = Pattern.compile("(?m)^import\\s+(?:static\\s+)?([a-zA-Z0-9_.]+);").matcher(content);
            while (m.find() && imports.size() < 8) {
                String fullImp = m.group(1);
                if (!fullImp.startsWith("java.") && !fullImp.startsWith("lombok.")) {
                    String shortName = fullImp.substring(fullImp.lastIndexOf('.') + 1);
                    imports.add(shortName);
                }
            }
        } else {
            Matcher m = Pattern.compile("from\\s+['\"]([^'\"]+)['\"]").matcher(content);
            while (m.find() && imports.size() < 8) {
                imports.add(m.group(1));
            }
        }
        return new ArrayList<>(imports);
    }

    private void detectManifestsRecursive(
            Path root,
            Path current,
            Set<String> frameworks,
            List<DependencyItem> dependencies,
            int depth) {

        if (depth > 3) return;
        File[] files = current.toFile().listFiles();
        if (files == null) return;

        for (File f : files) {
            String name = f.getName();
            if (f.isDirectory()) {
                if (!IGNORED_DIRS.contains(name)) {
                    detectManifestsRecursive(root, f.toPath(), frameworks, dependencies, depth + 1);
                }
                continue;
            }

            if (name.equalsIgnoreCase("package.json")) {
                try {
                    JsonNode pkg = objectMapper.readTree(f);
                    parseNpmDeps(pkg.path("dependencies"), frameworks, dependencies);
                    parseNpmDeps(pkg.path("devDependencies"), frameworks, dependencies);
                } catch (Exception ignored) {
                }
            } else if (name.equalsIgnoreCase("pom.xml")) {
                frameworks.add("Maven");
                try {
                    String pom = Files.readString(f.toPath());
                    if (pom.contains("spring-boot")) frameworks.add("Spring Boot");
                    if (pom.contains("spring-boot-starter-web")) frameworks.add("Spring Web MVC");
                    if (pom.contains("data-jpa")) frameworks.add("Spring Data JPA");
                    if (pom.contains("spring-security")) frameworks.add("Spring Security");
                    if (pom.contains("thymeleaf")) frameworks.add("Thymeleaf UI");
                    if (pom.contains("postgresql")) dependencies.add(new DependencyItem("postgresql", "runtime", "Maven", "PostgreSQL JDBC Driver"));
                    if (pom.contains("mysql")) dependencies.add(new DependencyItem("mysql-connector", "runtime", "Maven", "MySQL JDBC Driver"));
                    if (pom.contains("h2")) dependencies.add(new DependencyItem("h2", "runtime", "Maven", "In-Memory SQL Database"));
                    if (pom.contains("lombok")) dependencies.add(new DependencyItem("lombok", "compile", "Maven", "Java annotation processor"));

                    // Extract actual Maven artifactIds
                    Matcher depM = Pattern.compile("<artifactId>([^<]+)</artifactId>").matcher(pom);
                    while (depM.find() && dependencies.size() < 45) {
                        String art = depM.group(1).trim();
                        if (dependencies.stream().noneMatch(d -> d.getName().equals(art))) {
                            dependencies.add(new DependencyItem(art, "managed", "Maven", describeJavaArtifact(art)));
                        }
                    }
                } catch (Exception ignored) {
                }
            } else if (name.equalsIgnoreCase("build.gradle") || name.equalsIgnoreCase("build.gradle.kts")) {
                frameworks.add("Gradle");
                try {
                    String gradle = Files.readString(f.toPath());
                    if (gradle.contains("org.springframework.boot")) frameworks.add("Spring Boot");
                    if (gradle.contains("data-jpa")) frameworks.add("Spring Data JPA");
                } catch (Exception ignored) {
                }
            } else if (name.equalsIgnoreCase("requirements.txt") || name.equalsIgnoreCase("pyproject.toml")) {
                try {
                    for (String line : Files.readAllLines(f.toPath())) {
                        String clean = line.trim();
                        if (clean.isEmpty() || clean.startsWith("#") || clean.startsWith("[")) continue;
                        String[] parts = clean.split("[=<>~!]+");
                        String depName = parts[0].trim().replaceAll("[\"']", "");
                        if (depName.isEmpty()) continue;
                        String ver = parts.length > 1 ? parts[1].trim() : "latest";
                        String purpose = describePythonPackage(depName, frameworks);
                        if (dependencies.stream().noneMatch(d -> d.getName().equalsIgnoreCase(depName))) {
                            dependencies.add(new DependencyItem(depName, ver, "PyPI", purpose));
                        }
                    }
                } catch (Exception ignored) {
                }
            }
        }
    }

    private String describePythonPackage(String pkg, Set<String> frameworks) {
        String lower = pkg.toLowerCase();
        if (lower.equals("streamlit")) { frameworks.add("Streamlit"); return "Interactive Python Web UI & Dashboard framework"; }
        if (lower.contains("langchain_google_genai") || lower.contains("google-generativeai")) { frameworks.add("Google Gemini AI"); return "Google Gemini LLM integration"; }
        if (lower.contains("langchain")) { frameworks.add("LangChain"); return "AI Agent & LLM orchestration framework"; }
        if (lower.contains("firebase_admin") || lower.contains("firebase")) { frameworks.add("Firebase Firestore"); return "Firebase Admin SDK & Firestore NoSQL client"; }
        if (lower.equals("fastapi")) { frameworks.add("FastAPI"); return "High-performance async Python REST framework"; }
        if (lower.equals("flask")) { frameworks.add("Flask"); return "Lightweight Python web application framework"; }
        if (lower.equals("django")) { frameworks.add("Django"); return "Full-stack Python web framework"; }
        if (lower.equals("pandas")) { frameworks.add("Pandas"); return "Tabular data manipulation, CSV & Excel analytics"; }
        if (lower.equals("fpdf") || lower.equals("reportlab")) { frameworks.add("FPDF PDF Engine"); return "Dynamic PDF document & certificate generation"; }
        if (lower.equals("pymupdf") || lower.equals("fitz") || lower.equals("pypdf2")) { frameworks.add("PyMuPDF / PDF Parser"); return "PDF text extraction & document parsing"; }
        if (lower.equals("pytesseract")) { frameworks.add("Tesseract OCR"); return "Optical Character Recognition (OCR) from images"; }
        if (lower.equals("pil") || lower.equals("pillow")) { return "Python Imaging Library for image processing"; }
        if (lower.equals("docx2txt") || lower.equals("python-docx")) { return "Microsoft Word (.docx) text extraction"; }
        if (lower.equals("pptx") || lower.equals("python-pptx")) { return "PowerPoint (.pptx) slide text parser"; }
        if (lower.equals("smtplib")) { return "SMTP client for sending OTP & notification emails"; }
        if (lower.equals("psutil")) { return "System CPU, memory, and process monitoring"; }
        return "Python runtime module";
    }

    private String describeJavaArtifact(String artifact) {
        String lower = artifact.toLowerCase();
        if (lower.contains("web")) return "Spring MVC REST & HTTP web starter";
        if (lower.contains("jpa")) return "Spring Data JPA relational persistence";
        if (lower.contains("thymeleaf")) return "Server-side HTML template engine";
        if (lower.contains("actuator")) return "Production health checks & metrics";
        if (lower.contains("validation")) return "Bean validation with Jakarta annotations";
        if (lower.contains("test")) return "JUnit & Spring Boot test framework";
        return "Maven project module / dependency";
    }

    private void inferFrameworksFromSource(Map<String, String> fileContentsMap, Set<String> frameworks) {
        for (String content : fileContentsMap.values()) {
            if (content.contains("import streamlit")) frameworks.add("Streamlit");
            if (content.contains("langchain_google_genai") || content.contains("GoogleGenerativeAI")) frameworks.add("Google Gemini AI");
            if (content.contains("firebase_admin") || content.contains("firestore.client")) frameworks.add("Firebase Firestore");
            if (content.contains("@SpringBootApplication")) frameworks.add("Spring Boot");
        }
    }

    private void parseNpmDeps(JsonNode node, Set<String> frameworks, List<DependencyItem> dependencies) {
        if (!node.isObject()) return;
        node.fields().forEachRemaining(entry -> {
            String name = entry.getKey();
            String ver = entry.getValue().asText();
            String purpose = "JavaScript / TypeScript library";

            if (name.equals("next")) { frameworks.add("Next.js"); purpose = "React SSR & routing framework"; }
            else if (name.equals("react")) { frameworks.add("React"); purpose = "Component UI library"; }
            else if (name.equals("vite")) { frameworks.add("Vite"); purpose = "Next-gen frontend build tool"; }
            else if (name.contains("vue")) { frameworks.add("Vue.js"); purpose = "Progressive UI framework"; }
            else if (name.contains("@angular/core")) { frameworks.add("Angular"); purpose = "Frontend SPA framework"; }
            else if (name.equals("express")) { frameworks.add("Express.js"); purpose = "Node.js web server"; }
            else if (name.equals("tailwindcss")) { frameworks.add("Tailwind CSS"); purpose = "Utility-first CSS styling"; }
            else if (name.equals("sass") || name.equals("node-sass")) { frameworks.add("Sass / SCSS"); purpose = "CSS preprocessor styling"; }
            else if (name.equals("axios")) { frameworks.add("Axios"); purpose = "Promise-based HTTP client"; }
            else if (name.contains("prisma")) { frameworks.add("Prisma ORM"); purpose = "TypeScript database ORM"; }
            else if (name.contains("mongoose")) { frameworks.add("Mongoose (MongoDB)"); purpose = "MongoDB object modeling"; }
            else if (name.equals("typescript")) { frameworks.add("TypeScript"); purpose = "Static type-checking"; }
            else if (name.equals("lucide-react") || name.contains("icons")) { purpose = "Vector UI icon library"; }

            if (dependencies.size() < 45) {
                dependencies.add(new DependencyItem(name, ver, "NPM", purpose));
            }
        });
    }

    private ArchitectureData buildArchitecture(
            String fullName,
            String primaryLanguage,
            Set<String> frameworks,
            List<ComponentItem> components,
            List<ApiEndpointItem> apis,
            DatabaseInfo dbInfo) {

        List<ArchitectureLayer> layers = new ArrayList<>();

        // Categorize all discovered components dynamically so NO bucket is ever static!
        List<ComponentItem> entryComponents = components.stream()
                .filter(c -> c.getCategory().contains("Entry") || c.getCategory().contains("Route") || c.getCategory().contains("Controller"))
                .limit(8).toList();

        List<ComponentItem> viewComponents = components.stream()
                .filter(c -> !entryComponents.contains(c) && (c.getCategory().contains("View") || c.getCategory().contains("UI") || c.getCategory().contains("Dashboard")))
                .limit(8).toList();

        List<ComponentItem> coreLogicComponents = components.stream()
                .filter(c -> !entryComponents.contains(c) && !viewComponents.contains(c)
                        && (c.getCategory().contains("Logic") || c.getCategory().contains("Service") || c.getCategory().contains("Auth")
                        || c.getCategory().contains("Hook") || c.getCategory().contains("Context") || c.getCategory().contains("Core") || c.getCategory().contains("Module")))
                .limit(10).toList();

        List<ComponentItem> dataComponents = components.stream()
                .filter(c -> !entryComponents.contains(c) && !viewComponents.contains(c) && !coreLogicComponents.contains(c)
                        && (c.getCategory().contains("Database") || c.getCategory().contains("Data") || c.getCategory().contains("Persistence") || c.getCategory().contains("Entity")))
                .limit(8).toList();

        StringBuilder sb = new StringBuilder();
        sb.append("flowchart TB\n");
        sb.append("    Client([\"User / Browser Client\"]):::clientFill\n\n");

        Map<String, String> nodeIdsByFile = new LinkedHashMap<>();
        int nodeCounter = 0;

        // Subgraph 1: Entry & Routing
        if (!entryComponents.isEmpty()) {
            sb.append("    subgraph EntryLayer [\"Entry Points, Routing & Controllers\"]\n");
            for (ComponentItem c : entryComponents) {
                String id = "N" + (++nodeCounter);
                nodeIdsByFile.put(c.getFilePath(), id);
                nodeIdsByFile.put(c.getName().replaceAll("\\.[a-z0-9]+$", "").toLowerCase(), id);
                sb.append("        ").append(id).append("[\"").append(sanitizeMermaidLabel(c.getName())).append("\"]:::entryFill\n");
            }
            sb.append("    end\n\n");
            layers.add(new ArchitectureLayer("Entry & Routing Layer",
                    "Bootstraps the application, handles user authentication/sessions, and routes requests",
                    entryComponents.stream().map(ComponentItem::getFilePath).toList()));
        }

        // Subgraph 2: Views & Dashboards
        if (!viewComponents.isEmpty()) {
            sb.append("    subgraph ViewLayer [\"Interactive Views, Dashboards & UI Components\"]\n");
            for (ComponentItem c : viewComponents) {
                String id = "N" + (++nodeCounter);
                nodeIdsByFile.put(c.getFilePath(), id);
                nodeIdsByFile.put(c.getName().replaceAll("\\.[a-z0-9]+$", "").toLowerCase(), id);
                sb.append("        ").append(id).append("[\"").append(sanitizeMermaidLabel(c.getName())).append("\"]:::viewFill\n");
            }
            sb.append("    end\n\n");
            layers.add(new ArchitectureLayer("Views & Dashboards Layer",
                    "Interactive role dashboards, reusable UI components, and visual presentation modules",
                    viewComponents.stream().map(ComponentItem::getFilePath).toList()));
        }

        // Subgraph 3: Core Business, AI & State Logic
        if (!coreLogicComponents.isEmpty()) {
            sb.append("    subgraph CoreLayer [\"Core Business Services, AI & State Logic\"]\n");
            for (ComponentItem c : coreLogicComponents) {
                String id = "N" + (++nodeCounter);
                nodeIdsByFile.put(c.getFilePath(), id);
                nodeIdsByFile.put(c.getName().replaceAll("\\.[a-z0-9]+$", "").toLowerCase(), id);
                sb.append("        ").append(id).append("[\"").append(sanitizeMermaidLabel(c.getName())).append("\"]:::coreFill\n");
            }
            sb.append("    end\n\n");
            layers.add(new ArchitectureLayer("Core Services, AI & State Layer",
                    "Implements domain workflows, AI generation, authentication helpers, and state management",
                    coreLogicComponents.stream().map(ComponentItem::getFilePath).toList()));
        }

        // Subgraph 4: Data Access & External Integrations
        sb.append("    subgraph DataLayer [\"Data Access, Persistence & External APIs\"]\n");
        for (ComponentItem c : dataComponents) {
            String id = "N" + (++nodeCounter);
            nodeIdsByFile.put(c.getFilePath(), id);
            nodeIdsByFile.put(c.getName().replaceAll("\\.[a-z0-9]+$", "").toLowerCase(), id);
            sb.append("        ").append(id).append("[\"").append(sanitizeMermaidLabel(c.getName())).append("\"]:::dataFill\n");
        }
        String dbNodeId = "DBStore";
        sb.append("        ").append(dbNodeId).append("[(\"").append(sanitizeMermaidLabel(dbInfo.getDatabaseTechnology())).append("\")]:::dbFill\n");
        if (frameworks.contains("Google Gemini AI") || frameworks.contains("LangChain")) {
            sb.append("        AIEngine{{\"Google Gemini LLM API\"}}:::aiFill\n");
        }
        sb.append("    end\n\n");

        if (!dataComponents.isEmpty() || !dbInfo.getDetectedModels().isEmpty()) {
            List<String> dataLayerItems = new ArrayList<>(dataComponents.stream().map(ComponentItem::getFilePath).toList());
            if (dataLayerItems.isEmpty()) dataLayerItems.addAll(dbInfo.getDataAccessFiles());
            if (dataLayerItems.isEmpty()) dataLayerItems.add(dbInfo.getDatabaseTechnology());
            layers.add(new ArchitectureLayer("Data & Persistence Layer",
                    "Manages database collections/entities (" + dbInfo.getDatabaseTechnology() + ") and external API integrations",
                    dataLayerItems));
        }

        // Build REAL file-to-file dependency edges from actual imports!
        Set<String> addedEdges = new LinkedHashSet<>();

        // Connect Client to Entry Layer (or View Layer if no Entry Layer)
        List<ComponentItem> topTargets = !entryComponents.isEmpty() ? entryComponents : (!viewComponents.isEmpty() ? viewComponents : coreLogicComponents);
        for (ComponentItem c : topTargets.stream().limit(3).toList()) {
            String targetId = nodeIdsByFile.get(c.getFilePath());
            if (targetId != null) {
                addedEdges.add("    Client --> " + targetId);
            }
        }

        // Connect components based on actual extracted `relatedComponents` (imports)
        for (ComponentItem src : components) {
            String srcId = nodeIdsByFile.get(src.getFilePath());
            if (srcId == null) continue;

            for (String imp : src.getRelatedComponents()) {
                String cleanImp = imp.replaceAll("^\\.+/", "").replaceAll("\\.(py|ts|tsx|js|jsx|java)$", "").toLowerCase();
                if (cleanImp.contains("/")) {
                    cleanImp = cleanImp.substring(cleanImp.lastIndexOf('/') + 1);
                }
                String targetId = nodeIdsByFile.get(cleanImp);
                if (targetId != null && !targetId.equals(srcId)) {
                    addedEdges.add("    " + srcId + " --> " + targetId);
                }
            }

            // Connect AI modules to AIEngine node
            if ((frameworks.contains("Google Gemini AI") || frameworks.contains("LangChain"))
                    && (src.getResponsibility().contains("GoogleGenerativeAI") || src.getResponsibility().contains("langchain") || src.getName().contains("util") || src.getName().contains("gen"))) {
                addedEdges.add("    " + srcId + " -.->|\"LLM Prompt\"| AIEngine");
            }
        }

        // Connect Data Access components to DBStore
        for (ComponentItem d : dataComponents) {
            String dId = nodeIdsByFile.get(d.getFilePath());
            if (dId != null) {
                addedEdges.add("    " + dId + " --> " + dbNodeId);
            }
        }

        // Ensure connected flow if repo uses implicit/framework wiring (e.g., Spring DI or folder routing)
        if (addedEdges.size() <= 3) {
            if (!entryComponents.isEmpty() && !viewComponents.isEmpty()) {
                addedEdges.add("    " + nodeIdsByFile.get(entryComponents.get(0).getFilePath()) + " --> " + nodeIdsByFile.get(viewComponents.get(0).getFilePath()));
            }
            if (!entryComponents.isEmpty() && !coreLogicComponents.isEmpty()) {
                addedEdges.add("    " + nodeIdsByFile.get(entryComponents.get(0).getFilePath()) + " --> " + nodeIdsByFile.get(coreLogicComponents.get(0).getFilePath()));
            }
            if (!coreLogicComponents.isEmpty()) {
                addedEdges.add("    " + nodeIdsByFile.get(coreLogicComponents.get(0).getFilePath()) + " --> " + dbNodeId);
            }
        }

        for (String edge : addedEdges) {
            sb.append(edge).append("\n");
        }

        // GitDiagram color styling
        sb.append("\n    classDef clientFill fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#e0f2fe;\n");
        sb.append("    classDef entryFill fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#e0e7ff;\n");
        sb.append("    classDef viewFill fill:#042f2e,stroke:#2dd4bf,stroke-width:2px,color:#ccfbf1;\n");
        sb.append("    classDef coreFill fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#d1fae5;\n");
        sb.append("    classDef dataFill fill:#451a03,stroke:#fbbf24,stroke-width:2px,color:#fef3c7;\n");
        sb.append("    classDef dbFill fill:#3b0764,stroke:#c084fc,stroke-width:2px,color:#f3e8ff;\n");
        sb.append("    classDef aiFill fill:#4c0519,stroke:#fb7185,stroke-width:2px,color:#ffe4e6;\n");

        return ArchitectureData.builder()
                .mermaidDiagram(sb.toString())
                .explanation("Interactive GitDiagram topology synthesized from '" + fullName + "' (" + primaryLanguage + ") mapping "
                        + components.size() + " real source modules and " + addedEdges.size() + " cross-module dependency links.")
                .layers(layers)
                .build();
    }

    private String sanitizeMermaidLabel(String raw) {
        if (raw == null) return "Module";
        return raw.replaceAll("[\"\\[\\](){}<>;:|]", "").trim();
    }

    private List<WorkflowDiagram> buildWorkflows(
            String fullName,
            String primaryLanguage,
            Set<String> frameworks,
            List<ApiEndpointItem> apis,
            List<ComponentItem> components,
            DatabaseInfo dbInfo) {

        List<WorkflowDiagram> list = new ArrayList<>();

        // Pick actual components from this repository for dynamic workflow generation!
        String entryName = components.stream()
                .filter(c -> c.getCategory().contains("Entry") || c.getCategory().contains("Route") || c.getCategory().contains("Controller"))
                .map(ComponentItem::getName).findFirst()
                .orElse(components.isEmpty() ? "MainApp" : components.get(0).getName());

        String viewOrController = components.stream()
                .filter(c -> !c.getName().equals(entryName) && (c.getCategory().contains("View") || c.getCategory().contains("Dashboard") || c.getCategory().contains("UI") || c.getCategory().contains("Controller")))
                .map(ComponentItem::getName).findFirst()
                .orElse(components.size() > 1 ? components.get(1).getName() : "CoreHandler");

        String serviceOrLogic = components.stream()
                .filter(c -> !c.getName().equals(entryName) && !c.getName().equals(viewOrController)
                        && (c.getCategory().contains("Logic") || c.getCategory().contains("Service") || c.getCategory().contains("Hook") || c.getCategory().contains("AI")))
                .map(ComponentItem::getName).findFirst()
                .orElse(components.size() > 2 ? components.get(2).getName() : "ServiceModule");

        String dataModule = dbInfo.getDataAccessFiles().isEmpty()
                ? dbInfo.getDatabaseTechnology()
                : dbInfo.getDataAccessFiles().get(0);

        List<String> topFuncs = apis.stream().limit(4).map(ApiEndpointItem::getPath).toList();
        String fn1 = !topFuncs.isEmpty() ? sanitizeMermaidLabel(topFuncs.get(0)) : "initializeSession()";
        String fn2 = topFuncs.size() > 1 ? sanitizeMermaidLabel(topFuncs.get(1)) : "processUserAction()";
        String fn3 = topFuncs.size() > 2 ? sanitizeMermaidLabel(topFuncs.get(2)) : "executeCoreLogic()";

        // Workflow 1: Dynamic Sequence Diagram with REAL repository files & functions
        String wf1Mermaid = "sequenceDiagram\n"
                + "    actor User\n"
                + "    participant Entry as " + sanitizeMermaidLabel(entryName) + "\n"
                + "    participant View as " + sanitizeMermaidLabel(viewOrController) + "\n"
                + "    participant Logic as " + sanitizeMermaidLabel(serviceOrLogic) + "\n"
                + "    participant Data as " + sanitizeMermaidLabel(dataModule) + "\n"
                + "    User->>Entry: Accesses " + sanitizeMermaidLabel(fullName) + " (" + fn1 + ")\n"
                + "    Entry->>View: Routes user to active view (" + fn2 + ")\n"
                + "    View->>Logic: Invokes business / AI handler (" + fn3 + ")\n"
                + "    Logic->>Data: Queries or persists in " + sanitizeMermaidLabel(dbInfo.getDatabaseTechnology()) + "\n"
                + "    Data-->>Logic: Returns records / model state\n"
                + "    Logic-->>User: Renders updated output in " + sanitizeMermaidLabel(viewOrController) + "\n";

        list.add(WorkflowDiagram.builder()
                .title("End-to-End Request & Execution Lifecycle (" + entryName + " -> " + dataModule + ")")
                .description("Traces how a user action flows through " + entryName + ", " + viewOrController + ", " + serviceOrLogic + ", and " + dataModule + " in " + fullName)
                .mermaidCode(wf1Mermaid)
                .steps(List.of(
                        "1. Entry point `" + entryName + "` receives user interaction and triggers `" + fn1 + "`.",
                        "2. Control routes to `" + viewOrController + "` (`" + fn2 + "`) to coordinate UI/request parameters.",
                        "3. Core module `" + serviceOrLogic + "` executes `" + fn3 + "` and processes domain/AI rules.",
                        "4. Data layer `" + dataModule + "` reads/writes state via " + dbInfo.getDatabaseTechnology() + " and returns the response."
                ))
                .build());

        // Workflow 2: Dynamic Module Call & Feature Flow built from discovered components
        StringBuilder wf2 = new StringBuilder("flowchart LR\n");
        List<ComponentItem> wfComps = components.stream().limit(6).toList();
        for (int i = 0; i < wfComps.size(); i++) {
            ComponentItem c = wfComps.get(i);
            wf2.append("    M").append(i).append("[\"").append(sanitizeMermaidLabel(c.getName()))
                    .append("\\n(").append(sanitizeMermaidLabel(c.getCategory())).append(")\"]\n");
            if (i > 0) {
                wf2.append("    M").append(i - 1).append(" --> M").append(i).append("\n");
            }
        }
        if (wfComps.isEmpty()) {
            wf2.append("    M0[\"Repository Root\"] --> M1[\"Core Modules\"]\n");
        }

        List<String> wf2Steps = new ArrayList<>();
        for (int i = 0; i < wfComps.size(); i++) {
            ComponentItem c = wfComps.get(i);
            wf2Steps.add((i + 1) + ". `" + c.getFilePath() + "`: " + c.getResponsibility());
        }

        list.add(WorkflowDiagram.builder()
                .title("Repository Module Interaction Pipeline")
                .description("How the primary source files in " + fullName + " collaborate across layers")
                .mermaidCode(wf2.toString())
                .steps(wf2Steps.isEmpty() ? List.of("1. Initialize repository modules") : wf2Steps)
                .build());

        return list;
    }

    private DatabaseInfo buildDatabaseInfo(
            String fullName,
            Set<String> frameworks,
            List<DependencyItem> deps,
            List<String> models,
            List<String> dataAccessFiles,
            List<ComponentItem> components) {

        String dbTech = "In-Memory / Client State & REST APIs";
        if (frameworks.contains("Firebase Firestore")) {
            dbTech = "Google Firebase Firestore (NoSQL Document DB)";
        } else {
            for (DependencyItem d : deps) {
                String n = d.getName().toLowerCase();
                if (n.contains("firebase")) { dbTech = "Google Firebase Firestore"; break; }
                else if (n.contains("postgres") || n.contains("pg")) { dbTech = "PostgreSQL Relational DB"; break; }
                else if (n.contains("mysql")) { dbTech = "MySQL Relational DB"; break; }
                else if (n.contains("h2")) { dbTech = "H2 / JPA Relational Database"; break; }
                else if (n.contains("data-jpa") || n.contains("hibernate")) { dbTech = "Spring Data JPA / Hibernate SQL"; break; }
                else if (n.contains("mongo") || n.contains("mongoose")) { dbTech = "MongoDB NoSQL Database"; break; }
                else if (n.contains("prisma")) { dbTech = "Prisma ORM Database"; break; }
                else if (n.contains("redis")) { dbTech = "Redis Key-Value Store"; break; }
                else if (n.contains("axios") && dbTech.startsWith("In-Memory")) { dbTech = "External REST API via Axios Client"; }
            }
        }

        // Build dynamic Mermaid ER / Collection diagram showing actual models & files!
        StringBuilder er = new StringBuilder("flowchart LR\n");
        er.append("    DB[(\"") .append(sanitizeMermaidLabel(dbTech)).append("\")]\n");

        List<String> accessList = dataAccessFiles.isEmpty()
                ? components.stream().limit(3).map(ComponentItem::getFilePath).toList()
                : dataAccessFiles.stream().limit(5).toList();

        for (int i = 0; i < accessList.size(); i++) {
            er.append("    DA").append(i).append("[\"").append(sanitizeMermaidLabel(accessList.get(i))).append("\"] --> DB\n");
        }

        if (!models.isEmpty()) {
            int idx = 0;
            for (String m : models.stream().limit(8).toList()) {
                idx++;
                er.append("    DB --> COL").append(idx).append("[\"").append(sanitizeMermaidLabel(m)).append("\"]\n");
            }
        }

        return DatabaseInfo.builder()
                .databaseTechnology(dbTech)
                .dataFlowSummary("In " + fullName + ", data persistence is powered by " + dbTech
                        + (models.isEmpty() ? "." : " with " + models.size() + " discovered collections/entities/schemas: " + String.join(", ", models) + "."))
                .mermaidErDiagram(er.toString())
                .detectedModels(models)
                .dataAccessFiles(dataAccessFiles)
                .build();
    }

    private ProjectOverview buildOverview(
            String fullName,
            String primaryLanguage,
            Map<String, Integer> langCounts,
            Set<String> frameworks,
            List<ComponentItem> components,
            List<ApiEndpointItem> apis,
            DatabaseInfo dbInfo,
            Path rootPath,
            Map<String, String> fileContentsMap) {

        String readmeExcerpt = "";
        try {
            File readme = rootPath.resolve("README.md").toFile();
            if (readme.exists()) {
                String raw = Files.readString(readme.toPath());
                readmeExcerpt = raw.length() > 1500 ? raw.substring(0, 1500) : raw;
            }
        } catch (Exception ignored) {
        }

        String appType;
        if (frameworks.contains("Streamlit")) {
            appType = "Python Streamlit AI & Interactive Dashboard Web Application";
        } else if (frameworks.contains("Next.js") || frameworks.contains("React")) {
            appType = "Modern React / Next.js Web Application";
        } else if (frameworks.contains("Spring Boot")) {
            appType = "Java Spring Boot Enterprise Application";
        } else if (frameworks.contains("FastAPI") || frameworks.contains("Flask") || frameworks.contains("Django")) {
            appType = "Python Backend & Web Service";
        } else {
            appType = primaryLanguage + " Software Application";
        }

        List<String> topComponentNames = components.stream().limit(6).map(ComponentItem::getName).toList();
        List<String> topFuncNames = apis.stream().limit(6).map(ApiEndpointItem::getPath).toList();

        String purpose = fullName + " is a " + appType + " built with " + primaryLanguage
                + (frameworks.isEmpty() ? "" : " (" + String.join(", ", frameworks) + ")")
                + " and backed by " + dbInfo.getDatabaseTechnology() + ". "
                + "It organizes its logic across " + components.size() + " modules (including "
                + String.join(", ", topComponentNames) + ") and exposes " + apis.size() + " functions/views/routes.";

        String cleanReadme = readmeExcerpt
                .replaceAll("(?s)<!--.*?-->", " ")
                .replaceAll("<[^>]+>", " ")
                .replaceAll("!\\[[^\\]]*\\]\\([^)]*\\)", " ")
                .replaceAll("\\[([^\\]]+)\\]\\([^)]*\\)", "$1")
                .replaceAll("[#*`>~_]+", " ")
                .replaceAll("\\s+", " ")
                .trim();

        String businessFunc = (cleanReadme.isBlank()
                ? "Core capabilities discovered from code include: "
                + components.stream().limit(5).map(c -> c.getName() + " (" + c.getResponsibility().replace("`", "") + ")").collect(Collectors.joining("; "))
                : "From README & Source Analysis: " + cleanReadme);

        if (geminiService.isConfigured()) {
            String prompt = "You are explaining the GitHub repository '" + fullName + "' to a newly joined developer.\n"
                    + "Languages: " + langCounts + "\n"
                    + "Frameworks: " + frameworks + "\n"
                    + "Database: " + dbInfo.getDatabaseTechnology() + " | Models/Collections: " + dbInfo.getDetectedModels() + "\n"
                    + "Discovered Modules: " + components.stream().limit(12).map(c -> c.getFilePath() + " (" + c.getResponsibility() + ")").toList() + "\n"
                    + "Discovered Functions/Views: " + topFuncNames + "\n"
                    + "README excerpt:\n" + readmeExcerpt + "\n\n"
                    + "Write a clear, specific 3-4 sentence explanation of: (1) What this specific project does and what problem it solves, and (2) How its actual modules (" + topComponentNames + ") work together.";
            String aiText = geminiService.generateText(prompt);
            if (aiText != null && !aiText.isBlank()) {
                purpose = aiText;
            }
        }

        List<String> mainModules = components.stream()
                .map(c -> c.getName() + " [" + c.getCategory() + "]")
                .limit(10)
                .toList();

        return ProjectOverview.builder()
                .purpose(purpose)
                .businessFunctionality(businessFunc.length() > 750 ? businessFunc.substring(0, 750) + "..." : businessFunc)
                .applicationType(appType)
                .architectureSummary("Built with " + primaryLanguage
                        + (frameworks.isEmpty() ? "" : " using " + String.join(", ", frameworks))
                        + ", integrating " + components.size() + " source modules with " + dbInfo.getDatabaseTechnology() + ".")
                .mainModules(mainModules)
                .build();
    }

    private List<OnboardingDay> buildOnboardingGuide(
            String fullName,
            String primaryLanguage,
            Set<String> frameworks,
            List<ComponentItem> components,
            List<ApiEndpointItem> apis,
            DatabaseInfo dbInfo) {

        List<String> entryFiles = components.stream()
                .filter(c -> c.getCategory().contains("Entry") || c.getCategory().contains("Route") || c.getCategory().contains("Controller"))
                .map(ComponentItem::getFilePath).limit(4).toList();
        if (entryFiles.isEmpty()) {
            entryFiles = components.stream().limit(3).map(ComponentItem::getFilePath).toList();
        }

        List<String> viewOrServiceFiles = components.stream()
                .filter(c -> c.getCategory().contains("View") || c.getCategory().contains("Dashboard") || c.getCategory().contains("Logic") || c.getCategory().contains("Service"))
                .map(ComponentItem::getFilePath).limit(5).toList();
        if (viewOrServiceFiles.isEmpty()) {
            viewOrServiceFiles = components.stream().skip(1).limit(4).map(ComponentItem::getFilePath).toList();
        }

        List<String> dataFiles = !dbInfo.getDataAccessFiles().isEmpty()
                ? dbInfo.getDataAccessFiles()
                : apis.stream().map(ApiEndpointItem::getFilePath).distinct().limit(4).toList();

        String sampleFunc = apis.isEmpty() ? "the main entry handler" : "`" + apis.get(0).getPath() + "` in `" + apis.get(0).getFilePath() + "`";

        return List.of(
                OnboardingDay.builder()
                        .day(1)
                        .title("Day 1: Setup & Entry Point Walkthrough (" + fullName + ")")
                        .focusArea("Understand the architecture of " + fullName + ", install its " + primaryLanguage + " dependencies, and trace the main entry file.")
                        .filesToRead(entryFiles.isEmpty() ? List.of("README.md") : entryFiles)
                        .keyConcepts(List.of(
                                "Primary Stack: " + primaryLanguage + (frameworks.isEmpty() ? "" : " (" + String.join(", ", frameworks) + ")"),
                                "Entry point initialization & routing in " + (entryFiles.isEmpty() ? "root" : entryFiles.get(0)),
                                "Data store connection: " + dbInfo.getDatabaseTechnology()
                        ))
                        .practicalExercise("Clone " + fullName + ", install dependencies, and trace how " + (entryFiles.isEmpty() ? "the main file" : "`" + entryFiles.get(0) + "`") + " initializes the app.")
                        .verificationQuestions(List.of(
                                "Which file boots up " + fullName + " and what modules does it import?",
                                "What environment variables or credential files are required on startup?"
                        ))
                        .build(),
                OnboardingDay.builder()
                        .day(2)
                        .title("Day 2: Dashboards, Views & Core Business Logic")
                        .focusArea("Trace how user actions move from views/controllers into core business and AI logic.")
                        .filesToRead(viewOrServiceFiles.isEmpty() ? entryFiles : viewOrServiceFiles)
                        .keyConcepts(List.of(
                                "Core modules: " + String.join(", ", viewOrServiceFiles),
                                "Execution of " + sampleFunc,
                                "Cross-module imports and state passing"
                        ))
                        .practicalExercise("Open " + (viewOrServiceFiles.isEmpty() ? "a core module" : "`" + viewOrServiceFiles.get(0) + "`") + " and trace every function it calls.")
                        .verificationQuestions(List.of(
                                "How does " + sampleFunc + " validate input and process business logic?",
                                "Which helper modules are shared across multiple views/services?"
                        ))
                        .build(),
                OnboardingDay.builder()
                        .day(3)
                        .title("Day 3: Database Layer, Models & External APIs")
                        .focusArea("Master how " + fullName + " reads and persists data using " + dbInfo.getDatabaseTechnology() + ".")
                        .filesToRead(dataFiles.isEmpty() ? entryFiles : dataFiles)
                        .keyConcepts(List.of(
                                "Database technology: " + dbInfo.getDatabaseTechnology(),
                                "Models / Collections: " + (dbInfo.getDetectedModels().isEmpty() ? "Application state" : String.join(", ", dbInfo.getDetectedModels())),
                                "Data access files: " + (dataFiles.isEmpty() ? "Core modules" : String.join(", ", dataFiles))
                        ))
                        .practicalExercise("Inspect " + (dataFiles.isEmpty() ? "the data layer" : "`" + dataFiles.get(0) + "`") + " and map out every collection, table, or external API payload.")
                        .verificationQuestions(List.of(
                                "Which collections or tables store core application data?",
                                "How are database or API errors handled when a query fails?"
                        ))
                        .build(),
                OnboardingDay.builder()
                        .day(4)
                        .title("Day 4: End-to-End Feature & Workflow Deep Dive")
                        .focusArea("Follow a complete user workflow from UI interaction down to database persistence.")
                        .filesToRead(components.stream().limit(6).map(ComponentItem::getFilePath).toList())
                        .keyConcepts(List.of(
                                "Full request lifecycle across all " + components.size() + " discovered modules",
                                "Authentication, role checks, and session state",
                                "File exports, reports, or response formatting"
                        ))
                        .practicalExercise("Use the GitDiagram Architecture tab to trace a complete workflow from the user down to " + dbInfo.getDatabaseTechnology() + ".")
                        .verificationQuestions(List.of(
                                "What happens step-by-step when a user triggers the primary feature?",
                                "Which modules would be impacted if the data schema changes?"
                        ))
                        .build(),
                OnboardingDay.builder()
                        .day(5)
                        .title("Day 5: First Contribution & Impact Verification")
                        .focusArea("Make a small, safe feature enhancement in " + fullName + " and verify zero regressions.")
                        .filesToRead(entryFiles)
                        .keyConcepts(List.of(
                                "Safe code modification using component dependency links",
                                "Local testing and verification",
                                "Pull request readiness"
                        ))
                        .practicalExercise("Add a small enhancement to " + (viewOrServiceFiles.isEmpty() ? "the main view" : "`" + viewOrServiceFiles.get(0) + "`") + " and verify all connected modules work cleanly.")
                        .verificationQuestions(List.of(
                                "Which upstream and downstream files depend on the module you edited?",
                                "Did all routes/views render cleanly after your change?"
                        ))
                        .build()
        );
    }

    private String detectLanguage(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".java")) return "Java";
        if (lower.endsWith(".tsx")) return "TypeScript";
        if (lower.endsWith(".ts")) return "TypeScript";
        if (lower.endsWith(".jsx")) return "JavaScript";
        if (lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) return "JavaScript";
        if (lower.endsWith(".py")) return "Python";
        if (lower.endsWith(".go")) return "Go";
        if (lower.endsWith(".rs")) return "Rust";
        if (lower.endsWith(".cpp") || lower.endsWith(".cc") || lower.endsWith(".hpp") || lower.endsWith(".h")) return "C++";
        if (lower.endsWith(".c")) return "C";
        if (lower.endsWith(".cs")) return "C#";
        if (lower.endsWith(".kt") || lower.endsWith(".kts")) return "Kotlin";
        if (lower.endsWith(".rb")) return "Ruby";
        if (lower.endsWith(".php")) return "PHP";
        if (lower.endsWith(".swift")) return "Swift";
        if (lower.endsWith(".dart")) return "Dart";
        if (lower.endsWith(".vue")) return "Vue";
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "HTML";
        if (lower.endsWith(".scss") || lower.endsWith(".sass") || lower.endsWith(".css")) return "CSS / SCSS";
        if (lower.endsWith(".sql")) return "SQL";
        if (lower.endsWith(".sh") || lower.endsWith(".bash")) return "Shell";
        if (lower.endsWith(".yml") || lower.endsWith(".yaml")) return "YAML";
        if (lower.endsWith(".json")) return "JSON";
        if (lower.endsWith(".md")) return "Markdown";
        if (lower.equals("dockerfile")) return "Dockerfile";
        return null;
    }

    private String describeDirectoryRole(String dirName) {
        return switch (dirName.toLowerCase()) {
            case "src" -> "Primary source code root directory";
            case "components" -> "Reusable UI components and visual widgets";
            case "pages", "app", "views" -> "Application route views and page templates";
            case "hooks" -> "Custom React hooks for state and lifecycle management";
            case "context", "store", "redux" -> "Global application state and context providers";
            case "utils", "helpers", "lib" -> "Shared utility functions, API clients, and helpers";
            case "styles", "css" -> "Stylesheets, SCSS modules, and theme variables";
            case "public", "assets", "static" -> "Static assets, images, icons, and public files";
            case "config", "configs" -> "Application configuration and environment setup";
            case "types", "models", "entities", "dto" -> "Data models, TypeScript interfaces, and schemas";
            case "controller", "controllers", "routes", "api" -> "API route handlers and HTTP controllers";
            case "service", "services" -> "Business logic and external service integrations";
            case "repository", "repositories", "dao" -> "Database access and persistence layer";
            case "test", "tests", "__tests__" -> "Automated unit and integration test suites";
            default -> "Project module directory (" + dirName + ")";
        };
    }

    private String describeFileRole(String fileName, String relPath, String lang) {
        String lower = fileName.toLowerCase();
        if (lower.equals("package.json")) return "NPM project manifest defining scripts, dependencies, and metadata";
        if (lower.equals("requirements.txt")) return "Python PyPI package dependencies manifest";
        if (lower.equals("tsconfig.json")) return "TypeScript compiler configuration and path aliases";
        if (lower.equals("next.config.js") || lower.equals("next.config.mjs")) return "Next.js framework configuration";
        if (lower.equals("vite.config.ts") || lower.equals("vite.config.js")) return "Vite bundler and dev server configuration";
        if (lower.equals("pom.xml")) return "Maven build configuration and Java dependency manifest";
        if (lower.equals("build.gradle") || lower.equals("build.gradle.kts")) return "Gradle build script and dependency configuration";
        if (lower.equals("readme.md")) return "Project overview, setup instructions, and documentation";
        if (lower.equals("dockerfile") || lower.equals("docker-compose.yml")) return "Container build and orchestration specification";
        return (lang != null ? lang : "Source") + " module in " + relPath;
    }
}
