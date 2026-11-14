package com.repomind.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyzeRepoRequest {
    @NotBlank(message = "GitHub repository URL is required")
    private String repositoryUrl;
    private String branch;
}

