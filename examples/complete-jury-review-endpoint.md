# Complete Jury Review Endpoint

## POST /assessments/jury/{sessionId}/complete

This endpoint allows jury members to complete their review by updating the ResponseSession table and inserting a StatusProgress record. This finalizes the jury review process.

### Endpoint Details

- **URL**: `POST /assessments/jury/{sessionId}/complete`
- **Authentication**: Required (JWT Bearer token)
- **Role Required**: `JURI`
- **Content-Type**: `application/json`

### Request Parameters

- `sessionId` (path parameter): The ID of the assessment session to complete

### Request Body

```json
{
  "stage": "jury_scoring",
  "decision": "completed",
  "sessionId": 1,
  "juryId": 6,
  "overallComments": "It's all good",
  "juryComments": "",
  "questionScores": [
    {
      "questionId": 9,
      "comment": "good",
      "score": 10,
      "weight": 1.75,
      "scoreResult": 17.5
    },
    {
      "questionId": 10,
      "comment": "",
      "score": 10,
      "weight": 1.75,
      "scoreResult": 17.5
    }
  ],
  "totalScore": 1499,
  "validationChecklist": [],
  "updateExisting": true
}
```

### Field Descriptions

- `stage`: Current review stage (jury_scoring, jury_deliberation, final_decision)
- `decision`: Review decision (completed, needs_deliberation, etc.)
- `sessionId`: Session ID (should match path parameter)
- `juryId`: ID of the jury member completing the review
- `overallComments`: Overall review comments
- `juryComments`: Jury-specific comments (used for deliberationNotes and internalNotes)
- `questionScores`: Array of question scores with weights and calculated results
  - `questionId`: ID of the question
  - `comment`: Optional comment for the question
  - `score`: Score value (0-10)
  - `weight`: Weight multiplier for the question
  - `scoreResult`: Calculated result (score * weight)
- `totalScore`: Total calculated score
- `validationChecklist`: Array of validation checklist items
- `updateExisting`: Whether to update existing review

### Database Updates

This endpoint performs the following database operations:

#### 1. **ResponseSession Table Updates**
- `totalScore`: Updated with the provided total score
- `stage`: Updated with the current stage
- `decision`: Updated with the decision
- `juryId`: Updated with the jury member ID
- `deliberationNotes`: Set to juryComments value
- `internalNotes`: Set to juryComments value
- `overallComments`: Updated with overall comments
- `validationChecklist`: Updated with validation checklist
- `reviewedAt`: Set to current timestamp

#### 2. **StatusProgress Table Insert**
- `sessionId`: Session ID
- `status`: Set to the decision value
- `previousStatus`: Previous decision or 'submitted'
- `changedBy`: Jury member ID
- `changedAt`: Current timestamp

#### 3. **JuryScore Table Updates**
- Inserts or updates jury scores for each question in questionScores array
- Uses upsert logic to handle existing scores

### Response

#### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Jury review completed successfully",
  "data": {
    "sessionId": 1,
    "totalScore": 1499,
    "stage": "jury_scoring",
    "decision": "completed",
    "message": "Jury review completed and session updated"
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
curl -X POST "https://mandaya-award-api-production.up.railway.app/assessments/jury/1/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "stage": "jury_scoring",
    "decision": "completed",
    "sessionId": 1,
    "juryId": 6,
    "overallComments": "It'\''s all good",
    "juryComments": "",
    "questionScores": [
      {
        "questionId": 9,
        "comment": "good",
        "score": 10,
        "weight": 1.75,
        "scoreResult": 17.5
      }
    ],
    "totalScore": 1499,
    "validationChecklist": [],
    "updateExisting": true
  }'
```

### Example Usage with JavaScript/Node.js

```javascript
const axios = require('axios');

const completeJuryReview = async (sessionId, reviewData, token) => {
  try {
    const response = await axios.post(
      `https://mandaya-award-api-production.up.railway.app/assessments/jury/${sessionId}/complete`,
      reviewData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Jury review completed successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error completing jury review:', error.response?.data || error.message);
    throw error;
  }
};

// Example usage
const reviewData = {
  stage: "jury_scoring",
  decision: "completed",
  sessionId: 1,
  juryId: 6,
  overallComments: "It's all good",
  juryComments: "",
  questionScores: [
    {
      questionId: 9,
      comment: "good",
      score: 10,
      weight: 1.75,
      scoreResult: 17.5
    }
  ],
  totalScore: 1499,
  validationChecklist: [],
  updateExisting: true
};

completeJuryReview(1, reviewData, 'YOUR_JWT_TOKEN');
```

### Key Features

- **Transaction Safety**: Uses database transactions to ensure data consistency
- **Complete Updates**: Updates all relevant fields in ResponseSession table
- **Status Tracking**: Inserts StatusProgress record for audit trail
- **Score Management**: Handles jury scores with upsert logic
- **Validation**: Comprehensive input validation with proper error handling
- **Role-based Access**: Requires JURI role authentication

### Notes

- This endpoint finalizes the jury review process
- All database operations are wrapped in a transaction for consistency
- The juryComments field is used for both deliberationNotes and internalNotes
- Question scores are inserted/updated in the JuryScore table
- StatusProgress is created to track the status change
- The endpoint maintains backward compatibility with existing data structures
