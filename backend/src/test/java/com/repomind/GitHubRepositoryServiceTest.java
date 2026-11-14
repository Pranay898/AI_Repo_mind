package com.repomind;

import com.repomind.service.GitHubRepositoryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class GitHubRepositoryServiceTest {

    private final GitHubRepositoryService service = new GitHubRepositoryService(System.getProperty("java.io.tmpdir"));

    @Test
    @DisplayName("Should extract owner/repo from valid GitHub URLs")
    void testExtractRepoFullName() {
        assertEquals("ayushiee/nextflix", service.extractRepoFullName("https://github.com/ayushiee/nextflix"));
        assertEquals("spring-projects/spring-petclinic", service.extractRepoFullName("https://github.com/spring-projects/spring-petclinic.git"));
    }

    @Test
    @DisplayName("Should reject invalid non-GitHub URLs")
    void testInvalidUrl() {
        assertThrows(IllegalArgumentException.class, () -> service.extractRepoFullName("https://example.com/not-github"));
    }
}

