---
name: regression
description: Use for regression triage, reproduction, test gaps, and behavior preservation.
---

# Regression Skill

## Overview

| Field | Value |
|-------|-------|
| **Skill ID** | `regression` |
| **Name** | Regression Testing & Prevention |
| **Category** | Quality Assurance |
| **Complexity** | High |
| **Plan Availability** | starter, pro, studio |

## Purpose

Prevent newly introduced code changes from breaking existing functionality. Regression testing ensures that features continue to work correctly as the codebase evolves.

## Responsibilities

- Maintain and update regression test suites
- Identify which tests are affected by code changes
- Execute regression tests before releases
- Analyze test failures to distinguish new bugs from pre-existing issues
- Automate regression test execution where possible
- Track regression defects over time

## Regression Test Strategy

### Core Regression Suite

| Category | Test Count | Execution Time | Run Trigger |
|----------|------------|---------------|-------------|
| **Smoke Tests** | 10-20 | < 1 min | Every PR |
| **Core Tests** | 50-100 | < 5 min | Every PR |
| **Full Suite** | 200+ | < 30 min | Pre-release |

### Risk-Based Regression

```typescript
// Example: Risk assessment for changes
interface ChangeImpact {
  changedFiles: string[];
  affectedModules: string[];
  affectedFeatures: string[];
}

function assessRegressionRisk(change: ChangeImpact): RegressionScope {
  const highRiskModules = ['auth', 'payment', 'document-processing'];
  const affectedHighRisk = change.affectedModules.filter(
    m => highRiskModules.includes(m)
  );

  if (affectedHighRisk.length > 0) {
    return {
      scope: 'full',
      additionalTests: [...highRiskModules]
    };
  }

  return {
    scope: 'core',
    additionalTests: change.affectedModules
  };
}
```

## Regression Test Categories

### 1. Functional Regression

```typescript
// Verify existing features still work
describe('Document Regression Suite', () => {
  it('should create document successfully', async () => {
    const result = await documentService.create(testDocument);
    expect(result.id).toBeDefined();
  });

  it('should list documents in folder', async () => {
    const results = await documentService.listByFolder(testFolder.id);
    expect(results).toBeInstanceOf(Array);
  });

  it('should search documents by title', async () => {
    const results = await documentService.search({ query: 'test' });
    expect(results.length).toBeGreaterThan(0);
  });
});
```

### 2. Integration Regression

```typescript
// Verify external integrations still work
it('should upload document to storage', async () => {
  const result = await storageService.upload(testFile);
  expect(result.url).toContain('minio');
});

it('should generate embeddings via OpenAI', async () => {
  const embeddings = await embeddingService.generate(['test text']);
  expect(embeddings[0]).toHaveLength(1536);
});
```

### 3. Data Integrity Regression

```typescript
// Verify data consistency
it('should maintain document-folder relationship', async () => {
  const doc = await documentService.create({ ... });
  const folder = await folderService.getById(doc.folderId);
  expect(folder.documentIds).toContain(doc.id);
});
```

## Regression Prevention Practices

| Practice | Description |
|----------|-------------|
| **Test Coverage** | Maintain > 80% code coverage |
| **CI/CD Integration** | Run tests on every PR |
| **Feature Flags** | Enable/disable features without deployment |
| **Canary Releases** | Deploy to subset of users first |
| **Feature Toggle** | Gradual rollout of new features |

## Test Selection Strategies

### Impact Analysis

```typescript
// Determine which tests to run based on changes
function selectRegressionTests(changes: CodeChange): string[] {
  const testMappings: Record<string, string[]> = {
    'DocumentService': [
      'should create document',
      'should delete document',
      'should list documents',
      'should move document'
    ],
    'AuthService': [
      'should authenticate user',
      'should refresh token',
      'should handle invalid credentials'
    ]
  };

  return changes.modifiedFiles.flatMap(
    file => testMappings[file] || []
  );
}
```

## Regression Defect Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **Defect Escape Rate** | < 5% | > 10% |
| **MTTR (Mean Time to Repair)** | < 4 hours | > 24 hours |
| **Regression Test Pass Rate** | > 98% | < 95% |
| **Test Execution Time** | < 30 min | > 45 min |

## Regression vs Smoke Tests

| Aspect | Regression | Smoke |
|--------|------------|-------|
| **Scope** | Full feature set | Critical paths only |
| **Trigger** | Code changes | Every deployment |
| **Time** | 30+ minutes | < 5 minutes |
| **Failure Action** | Block release | Alert and continue |

## Quality Criteria

- Regression suite must be deterministic
- Failed regression tests block releases
- New features must include regression tests
- Test execution must be automated in CI/CD

## Events Emitted

- `regression.started`
- `regression.completed`
- `regression.failed`
- `regression.test.escaped`

## References

- `backend/src/agents/config/agent-personalities.ts` — Casey agent
- Test-Driven Development (TDD)
