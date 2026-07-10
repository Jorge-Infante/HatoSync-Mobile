---
name: knowledge-base
description: Use for maintaining searchable project knowledge, references, and durable team context.
---

# Knowledge Base Skill

## Overview

| Field | Value |
|-------|-------|
| **Skill ID** | `knowledge-base` |
| **Name** | Knowledge Base Management |
| **Category** | Operations |
| **Complexity** | Medium |
| **Plan Availability** | starter, pro, studio |

## Purpose

Build and maintain a centralized knowledge repository that captures institutional knowledge, solutions to common problems, and best practices. The knowledge base enables self-service support and accelerates learning.

## Responsibilities

- Curate and organize knowledge articles
- Tag and categorize content for discoverability
- Maintain search indexes
- Update content based on user feedback
- Archive outdated information
- Ensure knowledge base quality

## Knowledge Categories

| Category | Content | Examples |
|----------|---------|----------|
| **How-To Guides** | Step-by-step instructions | "How to upload documents" |
| **Troubleshooting** | Problem-solution articles | "Fixing login issues" |
| **FAQs** | Frequently asked questions | "What file types are supported?" |
| **Best Practices** | Recommendations | "Document organization tips" |
| **Release Notes** | Product updates | "What's new in v1.2" |
| **API Reference** | Technical specs | "Authentication API" |

## Article Structure

```markdown
# Article: [Title]

## Overview
[Brief description of what this article covers]

## Prerequisites
- Item 1
- Item 2

## Steps

### Step 1: [Title]
[Instructions]

### Step 2: [Title]
[Instructions]

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Issue 1 | Solution 1 |
| Issue 2 | Solution 2 |

## Related Articles
- [Article 1](link)
- [Article 2](link)

## Feedback
Was this article helpful?
👍 Yes | 👎 No
```

## Search Optimization

```typescript
// Knowledge base search with relevance scoring
interface SearchResult {
  article: Article;
  score: number;
  matchedTerms: string[];
  snippets: string[];
}

async function searchKnowledgeBase(
  query: string,
  tenantId: string
): Promise<SearchResult[]> {
  // 1. Extract search terms
  const terms = extractSearchTerms(query);

  // 2. Full-text search
  const candidates = await searchIndex.search(terms, { tenantId });

  // 3. Rerank by relevance
  const results = candidates.map(article => ({
    article,
    score: calculateRelevance(article, terms),
    matchedTerms: terms.filter(t => article.content.includes(t)),
    snippets: extractSnippets(article.content, terms)
  }));

  // 4. Sort and return top results
  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}
```

## Content Management

### Versioning

```typescript
interface KnowledgeArticle {
  id: string;
  slug: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
  metadata: {
    views: number;
    helpful: number;
    notHelpful: number;
  };
}
```

### Workflow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Draft   │ → │  Review  │ → │ Published │ → │ Archived │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

## Categorization

```typescript
const categories = {
  'getting-started': {
    name: 'Getting Started',
    description: 'Initial setup and onboarding',
    icon: 'rocket'
  },
  'documents': {
    name: 'Documents',
    description: 'Document management and search',
    icon: 'file'
  },
  'account': {
    name: 'Account & Billing',
    description: 'Account settings and billing',
    icon: 'user'
  },
  'integrations': {
    name: 'Integrations',
    description: 'Third-party integrations',
    icon: 'plug'
  }
};
```

## Analytics

| Metric | Description |
|--------|-------------|
| **Views** | Number of article views |
| **Searches** | Knowledge base searches |
| **No Results** | Searches with no results |
| **Helpful Votes** | Positive feedback |
| **Article Coverage** | % of support tickets with KB links |

## Quality Standards

- Articles must have clear, descriptive titles
- Step-by-step instructions must be numbered
- Code examples must be tested
- Screenshots must be current
- Related articles must be linked

## Events Consumed

- `support.ticket.resolved`

## Events Emitted

- `kb.article.created`
- `kb.article.updated`
- `kb.search.performed`

## References

- `backend/src/agents/config/agent-personalities.ts` — Quinn agent
