pragma circom 2.0.0;

/*
  This circuit checks a simple safety protocol rule:
  If a hazardous reagent is present, a safety cabinet must be used.
  
  Inputs:
  - hazardous_reagent_present: 1 if hazardous reagent is present, 0 otherwise.
  - safety_cabinet_used: 1 if safety cabinet was used, 0 otherwise.

  Output:
  - The circuit will only compile and allow proof generation if the condition is met.
    Specifically, it checks that (1 - hazardous_reagent_present) * safety_cabinet_used == 0
    AND hazardous_reagent_present * (1 - safety_cabinet_used) == 0.
    This means:
    - If hazardous_reagent_present is 0, safety_cabinet_used can be anything (first term becomes 0).
    - If hazardous_reagent_present is 1, safety_cabinet_used must be 1 (second term becomes 0).
      If safety_cabinet_used is 0 when hazardous_reagent_present is 1, the second term is 1, and the constraint fails.
*/
/* template ProtocolCheck() {
    // Inputs
    signal input hazardous_reagent_present;
    signal input safety_cabinet_used;

    // Constraints
    // Ensure inputs are binary (0 or 1)
    hazardous_reagent_present * (hazardous_reagent_present - 1) === 0;
    safety_cabinet_used * (safety_cabinet_used - 1) === 0;

    // Main safety logic:
    // If hazardous_reagent_present is 1, then safety_cabinet_used must also be 1.
    // This can be expressed as: hazardous_reagent_present => safety_cabinet_used
    // Which is equivalent to: NOT hazardous_reagent_present OR safety_cabinet_used
    // Or in arithmetic terms for Circom (where we want the expression to be 0 for valid states):
    // hazardous_reagent_present * (1 - safety_cabinet_used) === 0;
    // This means if hazardous_reagent_present = 1 AND safety_cabinet_used = 0, then 1 * (1 - 0) = 1, which is not 0, so constraint fails.
    // All other combinations result in 0.
    //   0 * (1-0) = 0
    //   0 * (1-1) = 0
    //   1 * (1-1) = 0

    hazardous_reagent_present * (1 - safety_cabinet_used) === 0;
}

component main = ProtocolCheck(); */

// Protocol Validation Circuit for Bio Experiments
// Validates: step ordering, reagent provenance, BSL-2 safety compliance
template ProtocolCheck(maxSteps, maxReagents) {
    // Public inputs
    signal input protocolHash; // Hash of the protocol template
    signal input experimenterId; // Public key of experimenter
    signal input timestamp; // Execution timestamp
    
    // Private inputs (witnesses)
    signal steps[maxSteps]; // Step execution order
    signal reagentIds[maxReagents]; // Reagent identifiers
    signal reagentSources[maxReagents]; // Source verification
    signal safetyChecklist[10]; // BSL-2 safety measures (binary)
    
    // Outputs
    signal output isValid; // 1 if protocol is valid, 0 otherwise
    signal output complianceScore; // 0-100 compliance score
    
    // Components for validation
    component stepOrderCheck = StepOrderValidator(maxSteps);
    component reagentCheck = ReagentProvenanceValidator(maxReagents);
    component safetyCheck = BSL2SafetyValidator();
    
    // Validate step ordering (each step must be >= previous)
    for (var i = 0; i < maxSteps; i++) {
        stepOrderCheck.steps[i] <== steps[i];
    }
    
    // Validate reagent provenance
    for (var i = 0; i < maxReagents; i++) {
        reagentCheck.reagentIds[i] <== reagentIds[i];
        reagentCheck.sources[i] <== reagentSources[i];
    }
    
    // Validate BSL-2 safety compliance
    for (var i = 0; i < 10; i++) {
        safetyCheck.checklist[i] <== safetyChecklist[i];
    }
    
    // Combine all validation results
    signal stepValid <== stepOrderCheck.isValid;
    signal reagentValid <== reagentCheck.isValid;
    signal safetyValid <== safetyCheck.isValid;
    
    // Protocol is valid only if all checks pass
    isValid <== stepValid * reagentValid * safetyValid;
    
    // Calculate compliance score (weighted average)
    signal stepScore <== stepOrderCheck.score * 40; // 40% weight
    signal reagentScore <== reagentCheck.score * 30; // 30% weight
    signal safetyScore <== safetyCheck.score * 30; // 30% weight
    
    complianceScore <== (stepScore + reagentScore + safetyScore) / 100;
}

// Step order validation: ensures steps are executed in proper sequence
template StepOrderValidator(maxSteps) {
    signal input steps[maxSteps];
    signal output isValid;
    signal output score;
    
    component lte[maxSteps - 1];
    signal validSteps[maxSteps - 1];
    
    // Each step must be <= next step (allowing parallel execution)
    for (var i = 0; i < maxSteps - 1; i++) {
        lte[i] = LessEqThan(32);
        lte[i].in[0] <== steps[i];
        lte[i].in[1] <== steps[i + 1];
        validSteps[i] <== lte[i].out;
    }
    
    // All steps must be valid
    component and = MultiAND(maxSteps - 1);
    for (var i = 0; i < maxSteps - 1; i++) {
        and.in[i] <== validSteps[i];
    }
    isValid <== and.out;
    
    // Score based on number of valid step transitions
    signal sumValid <== sum(validSteps);
    score <== (sumValid * 100) / (maxSteps - 1);
}

// Reagent provenance validation: ensures reagents come from approved sources
template ReagentProvenanceValidator(maxReagents) {
    signal input reagentIds[maxReagents];
    signal input sources[maxReagents];
    signal output isValid;
    signal output score;
    
    // List of approved source IDs (hardcoded for this demo)
    signal approvedSources[5];
    approvedSources[0] <== 1001; // ValleyDAO
    approvedSources[1] <== 1002; // MycoDAO
    approvedSources[2] <== 1003; // GlobalBioLab
    approvedSources[3] <== 1004; // BioDAO Network
    approvedSources[4] <== 1005; // Emergency Backup
    
    component sourceCheck[maxReagents];
    signal validSources[maxReagents];
    
    for (var i = 0; i < maxReagents; i++) {
        sourceCheck[i] = IsInSet(5);
        sourceCheck[i].value <== sources[i];
        for (var j = 0; j < 5; j++) {
            sourceCheck[i].set[j] <== approvedSources[j];
        }
        validSources[i] <== sourceCheck[i].out;
    }
    
    // All reagents must have valid sources
    component and = MultiAND(maxReagents);
    for (var i = 0; i < maxReagents; i++) {
        and.in[i] <== validSources[i];
    }
    isValid <== and.out;
    
    // Score based on percentage of valid sources
    signal sumValid <== sum(validSources);
    score <== (sumValid * 100) / maxReagents;
}

// BSL-2 safety validation: ensures proper safety measures are followed
template BSL2SafetyValidator() {
    signal input checklist[10]; // Binary checklist items
    signal output isValid;
    signal output score;
    
    // Critical safety items (must all be 1)
    signal criticalItems[5];
    criticalItems[0] <== checklist[0]; // Biosafety cabinet used
    criticalItems[1] <== checklist[1]; // PPE worn
    criticalItems[2] <== checklist[2]; // Waste disposal protocol
    criticalItems[3] <== checklist[3]; // Access control
    criticalItems[4] <== checklist[4]; // Emergency procedures known
    
    // All critical items must be checked
    component criticalAnd = MultiAND(5);
    for (var i = 0; i < 5; i++) {
        criticalAnd.in[i] <== criticalItems[i];
    }
    
    // Additional safety items (recommended but not critical)
    signal additionalItems[5];
    for (var i = 0; i < 5; i++) {
        additionalItems[i] <== checklist[i + 5];
    }
    
    // Valid if all critical items are checked
    isValid <== criticalAnd.out;
    
    // Score includes both critical and additional items
    signal criticalSum <== sum(criticalItems);
    signal additionalSum <== sum(additionalItems);
    score <== ((criticalSum * 70) + (additionalSum * 30)) / 10; // Weighted score
}

// Helper templates
template MultiAND(n) {
    signal input in[n];
    signal output out;
    
    if (n == 1) {
        out <== in[0];
    } else {
        component and = AND();
        and.a <== in[0];
        component subAnd = MultiAND(n - 1);
        for (var i = 0; i < n - 1; i++) {
            subAnd.in[i] <== in[i + 1];
        }
        and.b <== subAnd.out;
        out <== and.out;
    }
}

template IsInSet(setSize) {
    signal input value;
    signal input set[setSize];
    signal output out;
    
    component eq[setSize];
    signal matches[setSize];
    
    for (var i = 0; i < setSize; i++) {
        eq[i] = IsEqual();
        eq[i].in[0] <== value;
        eq[i].in[1] <== set[i];
        matches[i] <== eq[i].out;
    }
    
    // OR all matches
    signal sumMatches <== sum(matches);
    component isPositive = GreaterThan(8);
    isPositive.in[0] <== sumMatches;
    isPositive.in[1] <== 0;
    out <== isPositive.out;
}

// Sum helper function
function sum(arr) {
    var total = 0;
    for (var i = 0; i < arr.length; i++) {
        total += arr[i];
    }
    return total;
}

// Main component with realistic constraints
component main = ProtocolCheck(50, 20); // Max 50 steps, 20 reagents 