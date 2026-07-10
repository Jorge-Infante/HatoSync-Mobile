---
name: handoffs
description: Use for cross-role handoffs, implementation notes, acceptance criteria, and continuation context.
---

# Handoffs Skill

## Overview

| Field | Value |
|-------|-------|
| **Skill ID** | `handoffs` |
| **Name** | Handoffs & Transitions |
| **Category** | Operations |
| **Complexity** | Medium |
| **Plan Availability** | starter, pro, studio |

## Purpose

Ensure smooth transitions between team members, shifts, or project phases. Effective handoffs prevent information loss and maintain continuity.

## Responsibilities

- Document handoff notes for ongoing work
- Communicate pending tasks and context
- Ensure handoff recipient has required access
- Verify understanding through confirmation
- Track handoff completion
- Maintain handoff logs for audit

## Handoff Types

| Type | Trigger | Recipients |
|------|---------|------------|
| **Shift Handoff** | End of shift | On-call team member |
| **Project Handoff** | Phase completion | Different team |
| **Vacation Handoff** | Leave | Backup assignee |
| **Onboarding Handoff** | New team member | Buddy/mentor |

## Handoff Document Template

```markdown
# Handoff: [Context]

## Date & Time
[Date and time of handoff]

## From
[Name and role of person handing off]

## To
[Name and role of person receiving]

## Priority Items

### 🔴 Critical (Handle Immediately)
| Item | Status | Notes |
|------|--------|-------|
| Item 1 | In Progress | [Context] |
| Item 2 | Blocked | Waiting on [X] |

### 🟡 In Progress
| Item | Status | Notes |
|------|--------|-------|
| Item 1 | 80% complete | [Context] |

### 🟢 Completed (Context for Continuity)
| Item | Notes |
|------|-------|
| Item 1 | [Outcome] |

## Context & Background

### Project Overview
[Brief description of current work]

### Key Decisions
- [Decision 1]: [Rationale]
- [Decision 2]: [Rationale]

### Pending Decisions
| Decision | Owner | Deadline |
|----------|-------|----------|
| [Decision] | [Name] | [Date] |

## Access & Credentials

| System | Username | Notes |
|--------|----------|-------|
| AWS | [User] | SSO login |
| GitHub | [@user] | Org member |
| Datadog | [Email] | Read-only |

## Upcoming Deadlines

| Task | Due Date | Notes |
|------|----------|-------|
| Task 1 | [Date] | [Context] |
| Task 2 | [Date] | [Context] |

## Open Questions / Blockers

- [ ] Question 1
- [ ] Question 2

## Confirmation

- [ ] Recipient acknowledged handoff
- [ ] Recipient had opportunity to ask questions
- [ ] All access granted

---

### Signatures
Handoff from: _________________ Date: _______
Handoff to: _________________ Date: _______
```

## Shift Handoff Protocol

```typescript
interface ShiftHandoff {
  timestamp: Date;
  outgoing: Agent;
  incoming: Agent;
  priorityItems: HandoffItem[];
  metrics: {
    openTickets: number;
    criticalAlerts: number;
    pendingDeployments: number;
  };
  notes: string;
}

async function performHandoff(handoff: ShiftHandoff): Promise<void> {
  // 1. Create handoff document
  const doc = await createHandoffDocument(handoff);

  // 2. Notify incoming agent
  await notifyAgent(handoff.incoming, doc);

  // 3. Verify acknowledgment
  await waitForAcknowledgment(handoff.incoming);

  // 4. Log handoff completion
  await logHandoffCompletion(handoff);
}
```

## Communication Channels

| Priority | Channel | Response Time |
|----------|---------|---------------|
| **Critical** | PagerDuty/Slack | < 5 min |
| **High** | Slack | < 30 min |
| **Normal** | Email/Slack | < 4 hours |

## Handoff Checklist

### Outgoing Agent Must
- [ ] Document all priority items
- [ ] Update ticket statuses
- [ ] Ensure recipient has access
- [ ] Communicate any urgent context verbally
- [ ] Be available for questions for 30 minutes after handoff

### Incoming Agent Must
- [ ] Acknowledge receipt
- [ ] Review handoff document
- [ ] Ask clarifying questions
- [ ] Confirm understanding
- [ ] Take ownership of priority items

## Quality Criteria

- Handoff must be completed before outgoing agent departs
- Critical items must have explicit acknowledgment
- Access must be verified before handoff is considered complete
- Handoff log must be retained for audit

## Events Emitted

- `handoff.started`
- `handoff.completed`
- `handoff.acknowledged`

## References

- `backend/src/agents/config/agent-personalities.ts` — Quinn agent
