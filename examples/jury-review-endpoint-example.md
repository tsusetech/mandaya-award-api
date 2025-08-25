# Jury Review Endpoint Example

## POST /assessments/jury/{sessionId}/review

This endpoint allows jury members to submit their review scores for assessment sessions. The endpoint only inserts/updates data in the `JuryScore` table as requested.

### Endpoint Details

- **URL**: `POST /assessments/jury/{sessionId}/review`
- **Authentication**: Required (JWT Bearer token)
- **Role Required**: `JURI`
- **Content-Type**: `application/json`

### Request Parameters

- `sessionId` (path parameter): The ID of the assessment session to review

### Request Body

```json
{
  "decision": "needs_deliberation",
  "deliberationNotes": "",
  "internalNotes": "",
  "juryComments": "",
  "juryScores": [
    {
      "questionId": 9,
      "score": 10,
      "comments": "testing"
    }
  ],
  "overallComments": "It's all good",
  "questionComments": [
    {
      "questionId": 9,
      "comment": "testing",
      "isCritical": false,
      "stage": "juri_scoring"
    }
  ],
  "stage": "juri_scoring",
  "totalScore": 10,
  "updateExisting": true,
  "validationChecklist": []
}
```

### Field Descriptions

- `decision`: Review decision (approve, reject, needs_revision, pass_to_jury, needs_deliberation)
- `deliberationNotes`: Notes from jury deliberation
- `internalNotes`: Internal notes (not visible to user)
- `juryComments`: General jury comments
- `juryScores`: Array of scores for individual questions
  - `questionId`: ID of the question being scored
  - `score`: Score value (0-10)
  - `comments`: Comments for this specific score
- `overallComments`: Overall review comments
- `questionComments`: Array of comments for specific questions
  - `questionId`: ID of the question
  - `comment`: Comment text
  - `isCritical`: Whether this is a critical issue
  - `stage`: Review stage when comment was made
- `stage`: Current review stage
- `totalScore`: Total jury score (0-100)
- `updateExisting`: Whether to update existing review or create new one
- `validationChecklist`: Array of validation checklist items

### Response

#### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Jury review submitted successfully",
  "data": {
    "sessionId": 1,
    "totalScoresAdded": 1,
    "message": "Jury scores saved successfully"
  }
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "success": false,
  "message": "Invalid request data",
  "error": "Validation failed"
}
```

**401 Unauthorized**
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": "Invalid or missing authentication token"
}
```

**403 Forbidden**
```json
{
  "success": false,
  "message": "Forbidden - JURI role required",
  "error": "Insufficient permissions"
}
```

**404 Not Found**
```json
{
  "success": false,
  "message": "Session not found",
  "error": "Assessment session with ID 1 not found"
}
```

### Example Usage with cURL

```bash
curl -X POST "http://localhost:3000/assessments/jury/1/review" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "decision": "needs_deliberation",
    "deliberationNotes": "",
    "internalNotes": "",
    "juryComments": "",
    "juryScores": [
      {
        "questionId": 9,
        "score": 10,
        "comments": "testing"
      }
    ],
    "overallComments": "It'\''s all good",
    "questionComments": [
      {
        "questionId": 9,
        "comment": "testing",
        "isCritical": false,
        "stage": "juri_scoring"
      }
    ],
    "stage": "juri_scoring",
    "totalScore": 10,
    "updateExisting": true,
    "validationChecklist": []
  }'
```

### Example Usage with JavaScript/Node.js

```javascript
const axios = require('axios');

const submitJuryReview = async (sessionId, juryData, token) => {
  try {
    const response = await axios.post(
      `http://localhost:3000/assessments/jury/${sessionId}/review`,
      juryData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Jury review submitted successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error submitting jury review:', error.response?.data || error.message);
    throw error;
  }
};

// Example usage
const juryData = {
  decision: "needs_deliberation",
  deliberationNotes: "",
  internalNotes: "",
  juryComments: "",
  juryScores: [
    {
      questionId: 9,
      score: 10,
      comments: "testing"
    }
  ],
  overallComments: "It's all good",
  questionComments: [
    {
      questionId: 9,
      comment: "testing",
      isCritical: false,
      stage: "juri_scoring"
    }
  ],
  stage: "juri_scoring",
  totalScore: 10,
  updateExisting: true,
  validationChecklist: []
};

submitJuryReview(1, juryData, 'YOUR_JWT_TOKEN');
```

### Notes

- This endpoint only inserts/updates data in the `JuryScore` table as requested
- The endpoint uses upsert logic to handle both new scores and updates to existing scores
- All other payload fields are accepted but not processed (as per requirements)
- The endpoint requires JURI role authentication
- Session validation ensures the session exists before processing
