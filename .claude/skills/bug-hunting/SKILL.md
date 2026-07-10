---
name: bug-hunting
description: Use for bug reports, reproduction steps, root-cause isolation, and fix verification.
---

# Bug Hunting Skill

## Overview

| Field | Value |
|-------|-------|
| **Skill ID** | `bug-hunting` |
| **Name** | Bug Hunting & Debugging |
| **Category** | Quality Assurance |
| **Complexity** | High |
| **Plan Availability** | starter, pro, studio |

## Purpose

Systematically identify, isolate, and document bugs in the codebase. Bug hunting requires analytical thinking, systematic elimination, and deep understanding of the system under investigation.

## Responsibilities

- Investigate bug reports and user complaints
- Reproduce bugs in a controlled environment
- Isolate root causes through systematic debugging
- Document findings with clear steps to reproduce
- Provide fix recommendations to developers
- Verify bug fixes once implemented
- Identify patterns that indicate systemic issues

## Bug Classification

| Severity | Definition | Example | Response Time |
|----------|------------|---------|---------------|
| **Critical** | System down, data loss | Login broken for all users | Immediate |
| **High** | Major feature broken | Cannot upload documents | < 4 hours |
| **Medium** | Feature degraded | Slow search results | < 24 hours |
| **Low** | Minor issue | Typo in error message | < 1 week |

## Debugging Methodology

### 1. Reproduce

```typescript
// First, establish a reproducible test case
describe('Bug Reproduction', () => {
  it('should handle concurrent document access', async () => {
    // Given
    const doc = await createTestDocument();
    const user1 = await createTestUser();
    const user2 = await createTestUser();

    // When - concurrent operations
    const [result1, result2] = await Promise.all([
      documentService.move(doc.id, folder1.id),
      documentService.move(doc.id, folder2.id)
    ]);

    // Then - verify consistent state
    const finalDoc = await documentService.getById(doc.id);
    expect(finalDoc.folderId).toBe(folder1.id); // or folder2.id, but must be consistent
  });
});
```

### 2. Isolate

```
Root Cause Analysis Tree:

Bug: Document search returns wrong results
├── Could be: Database query incorrect
│   ├── Run query directly
│   └── Check SQL logs
├── Could be: Index outdated
│   ├── Check index health
│   └── Rebuild index
├── Could be: Chunking issue
│   ├── Verify chunk boundaries
│   └── Check chunk overlap
└── Could be: Embedding mismatch
    ├── Compare embedding generation
    └── Verify vector storage
```

### 3. Fix

- Apply minimal fix to address root cause
- Add regression test
- Verify fix doesn't break other functionality

## Debugging Tools

| Tool | Use Case |
|------|----------|
| **Console Logging** | Quick state inspection |
| **Debugger** | Step-through execution |
| **SQL Logs** | Query analysis |
| **Performance Profiler** | Performance issues |
| **Network Inspector** | API communication |

## Common Bug Patterns

| Pattern | Symptoms | Investigation |
|---------|----------|---------------|
| **Race Condition** | Intermittent failures | Thread logs, reproduce with stress test |
| **Memory Leak** | Increasing memory usage | Heap snapshots |
| **Null Reference** | NPE on specific input | Null check audit |
| **Off-by-One** | Edge case failures | Boundary condition tests |
| **Timezone Bug** | Date display issues | UTC vs local conversion |
| **Encoding Bug** | Strange characters | Character set analysis |

## Documentation Template

```markdown
## Bug Report: [Title]

### Severity
[Critical | High | Medium | Low]

### Environment
- Version: [version number]
- Browser/OS: [if applicable]
- Database: [if applicable]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Root Cause
[Technical root cause]

### Fix Recommendation
[How to fix]

### Test Case
[Test to verify fix]
```

## Quality Criteria

- Every bug must have a reproducible test case
- Root cause must be identified before recommending fix
- Bug reports must be actionable and complete
- Critical bugs require immediate escalation

## Collaboration

- Work with developers to prioritize bug fixes
- Coordinate with QA for regression testing
- Escalate blockers to tech lead
- Track bug metrics for trend analysis

## Events Emitted

- `bug.found`
- `bug.reproduced`
- `bug.fixed`
- `bug.escalated`

## References

- `backend/src/agents/config/agent-personalities.ts` — Casey agent
- How to Debug - Chrome DevTools
