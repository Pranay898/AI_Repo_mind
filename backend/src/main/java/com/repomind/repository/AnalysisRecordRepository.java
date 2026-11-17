package com.repomind.repository;

import com.repomind.entity.AnalysisRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AnalysisRecordRepository extends JpaRepository<AnalysisRecordEntity, String> {
    Optional<AnalysisRecordEntity> findFirstByRepository_IdOrderByCreatedAtDesc(String repositoryId);
    void deleteByRepository_Id(String repositoryId);
}

