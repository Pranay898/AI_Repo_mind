package com.repomind.service;

import com.repomind.entity.RepositoryEntity;
import com.repomind.repository.AnalysisRecordRepository;
import com.repomind.repository.ChatMessageRepository;
import com.repomind.repository.ChatSessionRepository;
import com.repomind.repository.RepositoryEntityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CachePruningService {

    private final RepositoryEntityRepository repoEntityRepo;
    private final AnalysisRecordRepository analysisRepo;
    private final ChatSessionRepository sessionRepo;
    private final ChatMessageRepository messageRepo;

    @Value("${gitly.storage.cache-retention-hours:48}")
    private int cacheRetentionHours;

    /**
     * Automatic background pruning scheduled every 6 hours.
     * Deletes locally cloned repositories on disk that have been inactive
     * for longer than the retention threshold (industry standard 48 hours).
     */
    @Scheduled(cron = "0 0 */6 * * *")
    @Transactional
    public void pruneInactiveClones() {
        log.info("Starting scheduled cache pruning (retention threshold = {} hours)...", cacheRetentionHours);
        Instant cutoff = Instant.now().minus(Duration.ofHours(cacheRetentionHours));
        List<RepositoryEntity> inactive = repoEntityRepo.findByLastAccessedAtBefore(cutoff);

        int prunedCount = 0;
        for (RepositoryEntity repo : inactive) {
            if (repo.getLocalClonePath() != null) {
                try {
                    Path path = Path.of(repo.getLocalClonePath());
                    if (Files.exists(path)) {
                        deleteDirectoryRecursively(path);
                        log.info("Pruned inactive cloned directory: {}", path);
                        prunedCount++;
                    }
                } catch (Exception e) {
                    log.warn("Failed to prune directory for repo {}: {}", repo.getFullName(), e.getMessage());
                }
            }
        }
        log.info("Completed cache pruning: {} inactive repository clones cleaned from disk.", prunedCount);
    }

    /**
     * On-demand cache clearing for a specific repository.
     * Purges local cloned files on disk and cached analysis records,
     * forcing fresh clone and re-analysis on subsequent requests.
     */
    @Transactional
    public boolean clearRepositoryCache(String repositoryId, Path memoryClonePath) {
        log.info("Manual cache eviction requested for repository ID: {}", repositoryId);

        // 1. Delete on-disk files if clone path is known
        try {
            if (memoryClonePath != null && Files.exists(memoryClonePath)) {
                deleteDirectoryRecursively(memoryClonePath);
            }
        } catch (Exception e) {
            log.warn("Error deleting memory clone path: {}", e.getMessage());
        }

        repoEntityRepo.findById(repositoryId).ifPresent(repo -> {
            if (repo.getLocalClonePath() != null) {
                try {
                    Path p = Path.of(repo.getLocalClonePath());
                    if (Files.exists(p)) {
                        deleteDirectoryRecursively(p);
                    }
                } catch (Exception e) {
                    log.warn("Error deleting DB clone path: {}", e.getMessage());
                }
            }
        });

        // 2. Clear cached database analysis records
        try {
            analysisRepo.deleteByRepository_Id(repositoryId);
            return true;
        } catch (Exception e) {
            log.warn("Failed to clear analysis records in DB: {}", e.getMessage());
            return false;
        }
    }

    private void deleteDirectoryRecursively(Path root) {
        try {
            if (!Files.exists(root)) return;
            Files.walk(root)
                    .sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
        } catch (Exception e) {
            log.warn("Error recursively deleting {}: {}", root, e.getMessage());
        }
    }
}

