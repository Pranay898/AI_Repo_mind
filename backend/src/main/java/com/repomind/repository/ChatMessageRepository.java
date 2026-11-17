package com.repomind.repository;

import com.repomind.entity.ChatMessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, String> {
    List<ChatMessageEntity> findBySession_IdOrderByCreatedAtAsc(String sessionId);
    void deleteBySession_Id(String sessionId);
}

