package com.repomind.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "analysis_records", indexes = {
        @Index(name = "idx_analysis_repo_branch", columnList = "repository_id, branch")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalysisRecordEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private RepositoryEntity repository;

    @Column(length = 100)
    private String branch;

    @Column(name = "commit_sha", length = 64)
    private String commitSha;

    @Column(name = "overview_json", columnDefinition = "TEXT")
    private String overviewJson;

    @Column(name = "architecture_json", columnDefinition = "TEXT")
    private String architectureJson;

    @Column(name = "database_info_json", columnDefinition = "TEXT")
    private String databaseInfoJson;

    @Column(name = "file_tree_json", columnDefinition = "TEXT")
    private String fileTreeJson;

    @Column(name = "components_json", columnDefinition = "TEXT")
    private String componentsJson;

    @Column(name = "apis_json", columnDefinition = "TEXT")
    private String apisJson;

    @Column(name = "dependencies_json", columnDefinition = "TEXT")
    private String dependenciesJson;

    @Column(name = "frameworks_json", columnDefinition = "TEXT")
    private String frameworksJson;

    @Column(name = "language_distribution_json", columnDefinition = "TEXT")
    private String languageDistributionJson;

    @Column(name = "thinking_steps_json", columnDefinition = "TEXT")
    private String thinkingStepsJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}

