package com.example.policy.service;

import com.example.policy.entity.Policy;
import com.example.policy.repository.PolicyRepository;

public class PolicyService {
    private final PolicyRepository policyRepository;

    public PolicyService(PolicyRepository policyRepository) {
        this.policyRepository = policyRepository;
    }

    public double calculatePremium(String policyId) {
        Policy policy = policyRepository.findById(policyId).orElse(null);
        if (policy == null) {
            return 0.0;
        }
        return policy.getBaseAmount() * 1.25;
    }

    public boolean validatePolicy(String policyId) {
        return calculatePremium(policyId) > 0.0;
    }
}

