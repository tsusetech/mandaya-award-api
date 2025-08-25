# Jury Review Filtering Logic

## Updated Filtering Criteria

The jury review endpoint (`GET /assessments/jury/reviews`) now uses jury scores count to determine the status of submissions instead of relying on session status.

### Filter Categories

#### 1. **Pending** (`filter=pending`)
- **Criteria**: Sessions with `decision = 'approve'` AND `juryScoresCount = 0`
- **Description**: Submissions that have been approved by admin but haven't received any jury scores yet
- **Example**: A submission that was approved but no jury member has scored it yet

#### 2. **In Progress** (`filter=in_progress`)
- **Criteria**: Sessions with `decision = 'approve'` AND `juryScoresCount > 0`
- **Description**: Submissions that have been approved by admin and have received at least one jury score
- **Example**: A submission that has been scored by one or more jury members

#### 3. **Completed** (`filter=completed`)
- **Criteria**: Sessions with status `'completed'` or `'final_decision'`
- **Description**: Submissions that have reached the final stage of the review process
- **Example**: Submissions that have been fully reviewed and finalized

#### 4. **All** (`filter=all`)
- **Criteria**: All sessions with `decision = 'approve'`
- **Description**: All approved submissions regardless of jury scoring status
- **Example**: Shows all submissions that are eligible for jury review

### Implementation Details

The filtering logic works as follows:

1. **Fetch Sessions**: Get all sessions with their jury scores included
2. **Count Jury Scores**: For each session, count the number of jury scores
3. **Apply Filters**: Use the jury scores count to determine the appropriate category
4. **Calculate Counts**: Update the filter counts in the response

### Example Response

```json
{
  "success": true,
  "message": "Jury review submissions retrieved successfully",
  "data": {
    "submissions": [
      {
        "id": 1,
        "sessionId": 1,
        "groupName": "Provinsi",
        "userName": "Provinsi",
        "userEmail": "provinsi@gmail.com",
        "submittedAt": "2025-08-25T15:16:27.238Z",
        "status": "approved",
        "progressPercentage": 100,
        "decision": "approve",
        "stage": "admin_validation"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    },
    "filters": {
      "all": 1,
      "pending": 1,
      "inProgress": 0,
      "completed": 0
    }
  }
}
```

### Database Query

The endpoint now includes jury scores in the initial query:

```typescript
const allSessions = await this.prisma.responseSession.findMany({
  where: {
    deletedAt: null,
    ...searchConditions,
  },
  include: {
    user: { select: { email: true, name: true } },
    group: { select: { groupName: true } },
    reviewer: { select: { name: true } },
    juryScores: true, // Include jury scores to count them
  },
  orderBy: { lastActivityAt: 'desc' },
});
```

### Benefits

1. **Accurate Status**: Reflects the actual state of jury scoring rather than session status
2. **Real-time Updates**: Shows current jury scoring progress
3. **Clear Categorization**: Makes it easy to identify which submissions need attention
4. **Consistent Logic**: Uses the same criteria for filtering and counting

### Migration Notes

- Existing frontend code should continue to work as the API structure remains the same
- The filter counts will now accurately reflect jury scoring status
- The "Pending" tab will show submissions that truly need jury attention
- The "In Progress" tab will show submissions that are actively being scored
