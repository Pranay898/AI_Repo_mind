package com.example.policy.repository;

import com.example.policy.entity.Policy;
import java.util.Optional;

public interface PolicyRepository {
    Optional<Policy> findById(String id);
    Policy save(Policy policy);
}

