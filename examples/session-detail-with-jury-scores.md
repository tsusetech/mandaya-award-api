# Session Detail Endpoint with Jury Scores

## GET /assessments/session/{sessionId}/detail

This endpoint now includes jury scores for each question in the session detail response.

### Updated Response Structure

The response now includes a `juryScores` array for each question that contains jury scoring data.

### Example Response

```json
{
  "success": true,
  "message": "Session detail retrieved successfully",
  "data": {
    "id": 1,
    "userId": 1,
    "groupId": 1,
    "groupName": "Award Assessment 2024",
    "status": "submitted",
    "progressPercentage": 100,
    "autoSaveEnabled": true,
    "currentQuestionId": null,
    "questions": [
      {
        "id": 9,
        "questionText": "1. Berapakah jumlah penduduk miskin pada tahun 2022?",
        "inputType": "numeric-open",
        "isRequired": true,
        "orderNumber": 9,
        "sectionTitle": "Dimensi Hasil 1",
        "subsection": "Penurunan Kantong-Kantong Kemiskinan",
        "isGrouped": true,
        "category": {
          "id": 4,
          "name": "PROVINSI - Penurunan Kantong-Kantong Kemiskinan",
          "description": "PROVINSI - Penurunan Kantong-Kantong Kemiskinan",
          "weight": 1.75,
          "minValue": 100,
          "maxValue": -100,
          "scoreType": "percentage"
        },
        "options": [],
        "response": "100",
        "isAnswered": true,
        "isSkipped": false,
        "reviewComments": [],
        "juryScores": [
          {
            "id": 1,
            "questionId": 9,
            "score": 10,
            "comments": "good",
            "createdAt": "2025-08-25T16:20:21.469Z"
          }
        ]
      }
    ],
    "startedAt": "2024-01-01T00:00:00Z",
    "lastAutoSaveAt": "2024-01-01T00:00:00Z",
    "lastActivityAt": "2024-01-01T00:00:00Z",
    "completedAt": "2024-01-01T00:00:00Z",
    "submittedAt": "2024-01-01T00:00:00Z",
    "reviewStage": "jury_scoring",
    "reviewDecision": "approve",
    "reviewScore": 85.5,
    "reviewedAt": "2024-01-01T00:00:00Z",
    "reviewerName": "John Reviewer",
    "reviewComments": "Overall assessment is well-structured"
  }
}
```

### Jury Score Structure

Each jury score in the `juryScores` array contains:

- `id`: Unique identifier for the jury score record
- `questionId`: ID of the question being scored
- `score`: Numeric score (0-10 scale)
- `comments`: Optional comments from the jury member
- `createdAt`: Timestamp when the score was created

### Key Features

- **Jury Scores Integration**: Each question now includes a `juryScores` array
- **Multiple Scores**: A question can have multiple jury scores from different jury members
- **Score Details**: Each score includes the numeric value and optional comments
- **Timestamps**: Creation timestamps are included for audit purposes
- **Empty Arrays**: Questions without jury scores will have an empty `juryScores` array

### Usage

The endpoint can be accessed with:

```bash
curl -X GET "https://mandaya-award-api-production.up.railway.app/assessments/session/1/detail" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Notes

- Jury scores are only included if they exist for the session
- The scores are grouped by question ID for easy access
- All jury score data is read-only in this endpoint
- The endpoint maintains backward compatibility - existing clients will continue to work
