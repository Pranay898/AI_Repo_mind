package com.repomind.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

@Service
@Slf4j
public class GitHubRepositoryService {

    private final String cloneBaseDir;

    public GitHubRepositoryService(@Value("${repomind.storage.clone-dir}") String cloneBaseDir) {
        this.cloneBaseDir = cloneBaseDir;
    }

    public String extractRepoFullName(String url) {
        if (url == null || !url.contains("github.com/")) {
            throw new IllegalArgumentException("Please provide a valid public GitHub repository URL (e.g. https://github.com/owner/repo)");
        }
        String cleaned = url.trim()
                .replace("https://github.com/", "")
                .replace("http://github.com/", "");
        if (cleaned.endsWith(".git")) {
            cleaned = cleaned.substring(0, cleaned.length() - 4);
        }
        if (cleaned.endsWith("/")) {
            cleaned = cleaned.substring(0, cleaned.length() - 1);
        }
        String[] parts = cleaned.split("/");
        if (parts.length < 2) {
            throw new IllegalArgumentException("Invalid GitHub repository URL format. Expected https://github.com/owner/repo");
        }
        return parts[0] + "/" + parts[1];
    }

    public Path cloneRepository(String repoId, String repoUrl, String branch) {
        String fullName = extractRepoFullName(repoUrl);
        String cleanCloneUrl = "https://github.com/" + fullName + ".git";

        Path targetPath = Path.of(cloneBaseDir, repoId);
        try {
            if (Files.exists(targetPath)) {
                deleteDirectory(targetPath);
            }
            Files.createDirectories(targetPath);

            List<String> cmd = (branch != null && !branch.isBlank())
                    ? List.of("git", "clone", "--depth", "1", "--branch", branch.trim(), cleanCloneUrl, targetPath.toString())
                    : List.of("git", "clone", "--depth", "1", cleanCloneUrl, targetPath.toString());

            log.info("Cloning repository {} into {}", cleanCloneUrl, targetPath);
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            Process process = pb.start();
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                throw new IllegalArgumentException("Could not clone repository from GitHub. Verify that the repository is public and URL is valid: " + repoUrl);
            }
            return targetPath;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to clone repository {}: {}", repoUrl, e.getMessage());
            throw new IllegalArgumentException("Failed to fetch repository: " + e.getMessage());
        }
    }

    private void deleteDirectory(Path path) {
        try (Stream<Path> walk = Files.walk(path)) {
            walk.sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
        } catch (Exception ignored) {
        }
    }
}

