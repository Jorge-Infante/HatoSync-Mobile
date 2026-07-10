---
name: project-intake
description: Collecting and structuring project information for seamless onboarding and team assignment.
agent_ids: [sam]
---

# Project Intake Skill

Collect and structure project information for seamless onboarding and team assignment.

## Intake Form

```markdown
## Project Intake Form

### Basic Information
- **Project Name:** 
- **Description:** 
- **Project Type:** [New Feature | Enhancement | Bug Fix | Refactor]

### Stakeholders
- **Requestor:** 
- **Product Owner:** 
- **Technical Lead:** 

### Scope
- **Target Users:** 
- **Success Metrics:** 
- **Out of Scope:** 

### Technical
- **Tech Stack:** 
- **Constraints:** 
- **Dependencies:** 

### Timeline & Budget
- **Timeline:** 
- **Budget:** 
- **Priority:** [P0/P1/P2/P3]

### Attachments
- [ ] Requirements doc
- [ ] Design mockups
- [ ] API contracts
- [ ] Other
```

## Intake Validation Checklist

- [ ] Project name is unique and descriptive
- [ ] Description explains the "why" not just the "what"
- [ ] Target users are identified
- [ ] Tech stack is specified or can be inferred
- [ ] Timeline is realistic
- [ ] Success criteria are measurable
- [ ] Out of scope is clearly defined

## Information Gathering Questions

1. What problem does this solve?
2. Who are the target users?
3. What does success look like?
4. What's the deadline and why?
5. What tech stack is preferred/required?
6. Are there any constraints (budget, compliance, etc.)?
7. Who has final say on acceptance?

## Routing After Intake

| Project Type | Route To | Complexity |
|-------------|----------|------------|
| Simple feature | Direct to specialist | Low |
| Complex feature | Taylor (PM) | Medium-High |
| Bug | Jordan/Alex | Low-Medium |
| Refactor | Jordan + Casey | Medium |
| New product | Taylor + Atlas | High |

## Follow-up Timeline

```yaml
follow_up:
  24h:
    action: Confirm receipt
    template: "Thanks for your request. We're reviewing it now."
  48h:
    action: Initial assessment
    template: "We've assessed your request and..."
  72h:
    action: Assign owner
    template: "Your project has been assigned to {agent}."
```
