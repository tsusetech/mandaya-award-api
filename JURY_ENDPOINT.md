# Jury Dashboard Endpoint

## Overview
The new jury endpoint provides a comprehensive dashboard for jury members to review and score submissions for the Mandaya Award competition.

## Endpoint Details

### GET `/assessments/jury/dashboard`

**Description:** Retrieves dashboard statistics and recent reviews for jury members.

**Authentication:** Required (JWT token)
**Authorization:** JURI role only

### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `search` | string | No | Search by group name, participant name, or email | "Sample Organization" |
| `page` | number | No | Page number for recent reviews (starts from 1) | 1 |
| `limit` | number | No | Number of recent reviews per page | 10 |

### Response Structure

```json
{
  "success": true,
  "message": "Jury dashboard data retrieved successfully",
  "data": {
    "statistics": {
      "totalAssigned": 1,
      "reviewed": 0,
      "inProgress": 1,
      "pending": 0
    },
    "recentReviews": [
      {
        "id": 1,
        "sessionId": 1,
        "groupName": "Sample Organization A",
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "submittedAt": "2025-08-22T00:00:00Z",
        "status": "submitted",
        "progressPercentage": 100
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### Statistics Categories

- **totalAssigned**: All submissions that are submitted or beyond (submitted, pending_review, under_review, passed_to_jury, jury_scoring, jury_deliberation, final_decision, completed) OR have been approved by admin (decision: approve)
- **reviewed**: Completed submissions (completed, final_decision)
- **inProgress**: Currently being reviewed (jury_scoring, jury_deliberation, under_review)
- **pending**: Waiting for jury review - includes sessions with admin approval (decision: approve) or status (submitted, pending_review, passed_to_jury)

### Usage Examples

#### Get dashboard without search
```bash
GET /assessments/jury/dashboard
Authorization: Bearer <jwt_token>
```

#### Search for specific submissions
```bash
GET /assessments/jury/dashboard?search=Sample Organization
Authorization: Bearer <jwt_token>
```

#### Get paginated results
```bash
GET /assessments/jury/dashboard?page=2&limit=5
Authorization: Bearer <jwt_token>
```

#### Combined search and pagination
```bash
GET /assessments/jury/dashboard?search=John&page=1&limit=10
Authorization: Bearer <jwt_token>
```

## Integration with Frontend

This endpoint is designed to support the jury dashboard interface shown in the image, providing:

1. **Summary Cards**: Statistics for total assigned, reviewed, in-progress, and pending submissions
2. **Search Functionality**: Search by organization name, participant name, or email
3. **Recent Reviews List**: Paginated list of submissions with key information
4. **Quick Actions**: Data to support "Start Reviewing", "View History", and "Review Guidelines" actions

## Error Responses

- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: User doesn't have JURI role

## Notes

- The endpoint uses existing database schema and doesn't require any new tables
- All data is filtered based on assessment session statuses
- Search is case-insensitive and supports partial matches
- Results are ordered by last activity date (most recent first)
