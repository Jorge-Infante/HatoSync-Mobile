---
name: support
description: Use for support workflows, issue response, troubleshooting guides, and customer-facing resolution notes.
---

# Support Skill

## Overview

| Field | Value |
|-------|-------|
| **Skill ID** | `support` |
| **Name** | Customer Support |
| **Category** | Operations |
| **Complexity** | Medium |
| **Plan Availability** | starter, pro, studio |

## Purpose

Provide technical support to users, troubleshoot issues, and ensure customer satisfaction. Support bridges the gap between users and the development team.

## Responsibilities

- Respond to user support requests
- Troubleshoot technical issues
- Reproduce and document bugs
- Escalate issues to development team
- Provide workarounds when fixes are pending
- Collect feedback for product improvements
- Maintain support ticket hygiene

## Support Tiers

| Tier | Issue Type | Response Time | Example |
|------|------------|---------------|---------|
| **L1** | Basic questions | < 4 hours | How to upload? |
| **L2** | Configuration issues | < 8 hours | API key setup |
| **L3** | Bug investigation | < 24 hours | Login broken |
| **L4** | Feature request | < 48 hours | Need new feature |

## Troubleshooting Framework

### 1. Understand the Problem

```markdown
## Support Ticket: [Title]

### Customer Information
- Name: [Name]
- Email: [Email]
- Tenant: [Tenant ID]
- Plan: [Starter/Pro/Studio]

### Issue Summary
[What the user is experiencing]

### Expected Behavior
[What should happen]

### Actual Behavior
[What is happening]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]
```

### 2. Gather Information

| Information | How to Get |
|-------------|------------|
| **User environment** | Ask browser, OS, app version |
| **Error messages** | Request screenshots |
| **Logs** | Guide user to export logs |
| **Network trace** | Browser DevTools |

### 3. Diagnose

```
Common Issues:

┌─────────────────────────────────────────────────────┐
│ Issue: Login fails                                  │
├─────────────────────────────────────────────────────┤
│ Causes:                                             │
│   - Invalid credentials     → Reset password        │
│   - SSO misconfiguration    → Check IdP settings    │
│   - Account locked          → Unlock account        │
│   - Browser cache          → Clear cache           │
└─────────────────────────────────────────────────────┘
```

### 4. Resolve or Escalate

```markdown
## Resolution

### Root Cause
[If identified]

### Solution
[Steps to resolve]

### Workaround (if fix pending)
[Alternative approach]

### Escalation
- Escalated to: [Developer/Team]
- Priority: [P1/P2/P3]
- Jira ticket: [Link]
```

## Common Issues

| Issue | Quick Fix |
|-------|-----------|
| **Forgot password** | Send password reset email |
| **Upload fails** | Check file size/type, clear cache |
| **Slow search** | Reduce query complexity |
| **PDF not processing** | Verify PDF is not corrupted |
| **Token expired** | Refresh token via API |

## Communication Templates

### Initial Response

```
Hello [Name],

Thank you for contacting support. I've received your ticket regarding [issue summary].

I've assigned this ticket priority [P2] and will begin investigating shortly.

I'll update you within [timeframe] with my findings.

Best regards,
[Support Agent]
```

### Resolution Response

```
Hello [Name],

I've resolved the issue you reported. 

[Summary of what was wrong and how it was fixed]

Please let me know if you experience any further issues.

Best regards,
[Support Agent]
```

## Feedback Collection

```markdown
## Post-Resolution Survey

Was your issue resolved satisfactorily?
- [ ] Yes, completely
- [ ] Partially
- [ ] No

How would you rate the support experience?
- [ ] Excellent
- [ ] Good
- [ ] Fair
- [ ] Poor

Any additional feedback:
[Text field]
```

## Metrics

| Metric | Target |
|--------|--------|
| **First Response Time** | < 4 hours |
| **Resolution Time** | < 24 hours |
| **Customer Satisfaction** | > 90% |
| **Ticket Backlog** | < 20 |

## Events Consumed

- `support.ticket.created`
- `support.ticket.escalated`

## Events Emitted

- `support.ticket.resolved`
- `support.feedback.received`

## References

- `backend/src/agents/config/agent-personalities.ts` — Quinn agent
