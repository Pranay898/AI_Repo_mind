package com.example.policy.controller;

import com.example.policy.service.PolicyService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/policies")
public class PolicyController {

    private final PolicyService policyService;

    public PolicyController(PolicyService policyService) {
        this.policyService = policyService;
    }

    @GetMapping("/{policyId}")
    public double getPolicy(@PathVariable String policyId) {
        return policyService.calculatePremium(policyId);
    }

    @PostMapping("/{policyId}/validate")
    public boolean validatePolicy(@PathVariable String policyId) {
        return policyService.validatePolicy(policyId);
    }
}

