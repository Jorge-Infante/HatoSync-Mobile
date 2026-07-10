---
name: testing
description: Use for unit, integration, E2E, and regression test strategy in this workspace.
---

# Testing Skill

## Overview

| Field | Value |
|-------|-------|
| **Skill ID** | `testing` |
| **Name** | Software Testing |
| **Category** | Quality Assurance |
| **Complexity** | Medium |
| **Plan Availability** | starter, pro, studio |

## Purpose

Design and execute comprehensive test strategies that validate software functionality, catch regressions, and ensure quality deliverables. Testing is the primary defense against bugs reaching production.

## Responsibilities

- Design test strategies and test plans for features
- Write unit tests covering business logic and edge cases
- Write integration tests for API contracts and data flows
- Create end-to-end tests for critical user journeys
- Perform exploratory testing when automated coverage is insufficient
- Analyze test failures and provide clear bug reports
- Measure and report code coverage metrics

## Test Strategy Principles

### Test Pyramid

```
        /\
       /  \      E2E Tests (few, slow, high confidence)
      /----\
     /      \    Integration Tests (medium count, medium speed)
    /--------\
   /          \  Unit Tests (many, fast, isolated)
  /____________\
```

### Test Naming Convention

Use descriptive names that explain the scenario:

```
✅ should_return_404_when_document_not_found
✅ should_aggregate_chunk_embeddings_for_rag_query
❌ test1
❌ testDocument
```

### Arrange-Act-Assert Pattern

```typescript
describe('DocumentService', () => {
  it('should throw NotFoundException when document does not exist', async () => {
    // Arrange
    const nonExistentId = Guid.create();
    const repository = new MockDocumentRepository(null);

    // Act & Assert
    await expect(service.getById(nonExistentId)).rejects.toThrow(NotFoundException);
  });
});
```

## Test Types

### Unit Tests

| Aspect | Guideline |
|--------|-----------|
| **Target** | Business logic, use cases, utilities |
| **Scope** | Single function or class in isolation |
| **Dependencies** | Mocked |
| **Speed** | < 1ms per test |
| **Coverage Target** | > 80% for use cases |

### Integration Tests

| Aspect | Guideline |
|--------|-----------|
| **Target** | API endpoints, repository queries |
| **Scope** | Multiple components working together |
| **Dependencies** | Real database or test container |
| **Speed** | < 100ms per test |
| **Coverage Target** | Critical paths |

### End-to-End Tests

| Aspect | Guideline |
|--------|-----------|
| **Target** | Critical user journeys |
| **Scope** | Full stack including UI |
| **Dependencies** | Real services running |
| **Speed** | < 30s per test |
| **Coverage Target** | Happy path + key error paths |

## Test Data Management

### Factories over Fixtures

```typescript
// ✅ Factory pattern - flexible, readable
const document = DocumentFactory.create({
  title: 'Test Document',
  tenantId: testTenant.id
});

// ❌ Fixture - rigid, unclear dependencies
const document = {
  id: '123',
  title: 'Test Document',
  ...
};
```

### Cleanup

```typescript
afterEach(async () => {
  await testDb.cleanupTables(['documents', 'folders']);
});
```

## Mocking Guidelines

| Layer | Mock Strategy |
|-------|---------------|
| **External APIs** | Mock always (OpenAI, S3) |
| **Database** | Use test container or in-memory |
| **Logger** | Mock to verify calls |
| **Date/Time** | Freeze or mock |

## Coverage Requirements

| Component Type | Minimum Coverage |
|----------------|------------------|
| Use Cases | 90% |
| Services | 80% |
| Controllers | 70% |
| Utilities | 95% |

## Quality Criteria

- Tests must be **deterministic** (no flaky tests)
- Tests must **fail fast** with clear error messages
- Tests must be **isolated** (no cross-test contamination)
- Tests must be **maintainable** (no magic numbers or strings)
- Tests must **describe intent** (not implementation)

## Collaboration

- Report coverage gaps to the responsible developer
- Escalate flaky tests immediately
- Review test quality during code review
- Pair with developers on TDD when appropriate

## Events Emitted

- `testing.completed`
- `testing.failed`
- `coverage.threshold.not.met`

## References

- `backend/src/agents/config/agent-personalities.ts` — Casey agent
- Jest for unit/integration testing
- Playwright for E2E testing
