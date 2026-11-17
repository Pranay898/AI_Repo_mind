package com.repomind.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "repositories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RepositoryEntity {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

    @Column(name = "repository_url", nullable = false, length = 512)
    private String repositoryUrl;

    @Column(name = "default_branch", length = 100)
    private String defaultBranch;

    @Column(name = "latest_commit_sha", length = 64)
    private String latestCommitSha;

    @Column(name = "total_files")
    private int totalFiles;

    @Column(name = "total_directories")
    private int totalDirectories;

    @Column(name = "primary_language", length = 100)
    private String primaryLanguage;

    @Column(name = "local_clone_path", length = 512)
    private String localClonePath;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "last_accessed_at", nullable = false)
    private Instant lastAccessedAt;
}

