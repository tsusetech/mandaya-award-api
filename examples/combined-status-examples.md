# Combined Status Feature

## Overview

The assessment endpoint now supports a unified status filtering system that combines both session status and review status into a single `combinedStatus` parameter. This makes it easier for frontend applications to filter assessments without needing to understand the complex relationship between session and review statuses.

## API Changes

### Before (Old API)
```http
GET /assessments/user-sessions?status=submitted&reviewStatus=needs_revision
```

### After (New API)
```http
GET /assessments/user-sessions?combinedStatus=needs_revision
```

## Combined Status Values

| Combined Status | Description | Session Status | Review Status | Review Stage |
|----------------|-------------|----------------|---------------|--------------|
| `draft` | Assessment is in draft mode | `draft` | - | - |
| `in_progress` | Assessment is being worked on | `in_progress` | - | - |
| `submitted` | Assessment submitted, no review yet | `submitted` | `null` | - |
| `pending_review` | Assessment submitted, waiting for review | `submitted` | `pending` or `null` | - |
| `under_review` | Assessment is currently being reviewed | `submitted` | `under_review` | - |
| `needs_revision` | Assessment needs revision | `submitted` | `needs_revision` | - |
| `resubmitted` | Assessment resubmitted after revision | `submitted` | `null` | - |
| `approved` | Assessment approved | `submitted` | `approved` | - |
| `rejected` | Assessment rejected | `submitted` | `rejected` | - |
| `passed_to_jury` | Assessment passed to jury | `submitted` | `passed_to_jury` | - |
| `jury_scoring` | Jury is scoring the assessment | `submitted` | - | `jury_scoring` |
| `jury_deliberation` | Jury is deliberating | `submitted` | - | `jury_deliberation` |
| `final_decision` | Final decision stage | `submitted` | - | `final_decision` |
| `completed` | Assessment process completed | `submitted` | `approved`/`rejected`/`completed` | - |

## Response Changes

The response now includes a `combinedStatus` field that represents the overall state:

```json
{
  "data": [
    {
      "id": 1,
      "sessionId": 1,
      "userId": 2,
      "userEmail": "user@example.com",
      "userName": "John Doe",
      "groupId": 1,
      "groupName": "Provinsi",
      "status": "submitted",
      "combinedStatus": "resubmitted",
      "progressPercentage": 47,
      "startedAt": "2025-08-03T10:37:36.500Z",
      "lastActivityAt": "2025-08-09T06:28:14.201Z",
      "submittedAt": "2025-08-07T00:02:06.961Z",
      "reviewStatus": null,
      "reviewStage": "admin_validation",
      "reviewDecision": null,
      "reviewScore": null,
      "reviewedAt": null,
      "reviewerName": null,
      "reviewComments": null
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "hasNext": false,
  "hasPrev": false
}
```

## Usage Examples

### Get all assessments that need revision
```http
GET /assessments/user-sessions?combinedStatus=needs_revision
```

### Get all resubmitted assessments
```http
GET /assessments/user-sessions?combinedStatus=resubmitted
```

### Get all assessments in jury scoring stage
```http
GET /assessments/user-sessions?combinedStatus=jury_scoring
```

### Get all completed assessments
```http
GET /assessments/user-sessions?combinedStatus=completed
```

### Get all assessments in progress
```http
GET /assessments/user-sessions?combinedStatus=in_progress
```

### Combine with other filters
```http
GET /assessments/user-sessions?combinedStatus=submitted&groupId=1&page=1&limit=20
```

## Migration Guide

### Frontend Changes

1. **Replace separate status filters**: Instead of filtering by `status` and `reviewStatus` separately, use the new `combinedStatus` parameter.

2. **Update filter UI**: Update your filter dropdowns to use the new combined status values.

3. **Use combinedStatus in responses**: The response now includes a `combinedStatus` field that you can use for display purposes.

### Example Frontend Code

```javascript
// Old way
const filters = {
  status: 'submitted',
  reviewStatus: 'needs_revision'
};

// New way
const filters = {
  combinedStatus: 'needs_revision'
};

// API call
const response = await fetch('/assessments/user-sessions?' + new URLSearchParams(filters));
const data = await response.json();

// Display combined status
data.data.forEach(assessment => {
  console.log(`Assessment ${assessment.id}: ${assessment.combinedStatus}`);
});
```

## Benefits

1. **Simplified API**: Single parameter instead of two separate status filters
2. **Better UX**: Frontend can show meaningful status labels without complex logic
3. **Consistent Status**: All possible states are clearly defined in one enum
4. **Easier Maintenance**: Status logic is centralized in the backend
5. **Future-Proof**: Easy to add new combined statuses without breaking existing code

## Backward Compatibility

The old `status` and `reviewStatus` parameters are no longer supported. All frontend applications should be updated to use the new `combinedStatus` parameter.
