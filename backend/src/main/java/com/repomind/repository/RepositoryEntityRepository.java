package com.repomind.repository;

import com.repomind.entity.RepositoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface RepositoryEntityRepository extends JpaRepository<RepositoryEntity, String> {
    Optional<RepositoryEntity> findByRepositoryUrlIgnoreCase(String repositoryUrl);
    List<RepositoryEntity> findByLastAccessedAtBefore(Instant cutoff);
}

