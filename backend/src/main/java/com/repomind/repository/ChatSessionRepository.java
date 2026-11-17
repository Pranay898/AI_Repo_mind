package com.repomind.repository;

import com.repomind.entity.ChatSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSessionEntity, String> {
    List<ChatSessionEntity> findByRepositoryIdOrderByLastActiveAtDesc(String repositoryId);
    Optional<ChatSessionEntity> findFirstByRepositoryIdAndSessionTokenOrderByLastActiveAtDesc(String repositoryId, String sessionToken);
    void deleteByRepositoryId(String repositoryId);
}

