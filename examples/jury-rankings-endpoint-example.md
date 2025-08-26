# Jury Rankings Endpoint

## Overview
The jury rankings endpoint provides a comprehensive view of all assessed submissions organized by categories with scores and rankings.

## Endpoint
```
GET /assessments/jury/rankings
```

## Authentication
Requires JWT authentication with one of the following roles:
- JURI
- ADMIN  
- SUPERADMIN

## Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| search | string | No | Search by group name, participant, category, or nomination | "Telkom" |
| category | string | No | Filter by specific category | "BUMN/Swasta" |

## Request Examples

### Basic Request
```bash
curl -X GET "http://localhost:3000/assessments/jury/rankings" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### With Search Filter
```bash
curl -X GET "http://localhost:3000/assessments/jury/rankings?search=Telkom" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### With Category Filter
```bash
curl -X GET "http://localhost:3000/assessments/jury/rankings?category=BUMN/Swasta" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "message": "Jury rankings retrieved successfully",
  "data": {
    "totalNominations": 9,
    "categories": [
      {
        "categoryName": "BUMN/Swasta",
        "subCategory": "Mitra Nonpemerintah",
        "rankings": [
          {
            "id": 1,
            "sessionId": 1,
            "groupName": "PT Telkom Indonesia",
            "participantInfo": "Direktur Utama PT Telkom • dirut@telkom.co.id",
            "score": 93.7,
            "submittedAt": "2025-08-21T00:00:00Z",
            "lastReviewedAt": "2025-08-24T00:00:00Z",
            "rank": 1,
            "trophyType": "gold"
          },
          {
            "id": 2,
            "sessionId": 2,
            "groupName": "PT Bank Rakyat Indonesia",
            "participantInfo": "Direktur Utama BRI • dirut@bri.co.id",
            "score": 90.2,
            "submittedAt": "2025-08-22T00:00:00Z",
            "lastReviewedAt": "2025-08-25T00:00:00Z",
            "rank": 2,
            "trophyType": "silver"
          }
        ]
      },
      {
        "categoryName": "Desa",
        "subCategory": "Pemerintah Daerah Pendukung Pemberdayaan",
        "rankings": [
          {
            "id": 3,
            "sessionId": 3,
            "groupName": "Desa Cihideung",
            "participantInfo": "Kepala Desa Cihideung • kades@cihideung.desa.id",
            "score": 89.5,
            "submittedAt": "2025-08-21T00:00:00Z",
            "lastReviewedAt": "2025-08-24T00:00:00Z",
            "rank": 1,
            "trophyType": "gold"
          },
          {
            "id": 4,
            "sessionId": 4,
            "groupName": "Desa Mekarjaya",
            "participantInfo": "Kepala Desa Mekarjaya • kades@mekarjaya.desa.id",
            "score": 87.2,
            "submittedAt": "2025-08-22T00:00:00Z",
            "lastReviewedAt": "2025-08-25T00:00:00Z",
            "rank": 2,
            "trophyType": "silver"
          }
        ]
      }
    ]
  }
}
```

### Error Responses

#### Unauthorized (401)
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

#### Forbidden (403)
```json
{
  "message": "Forbidden - JURI, ADMIN, or SUPERADMIN role required",
  "statusCode": 403
}
```

## Data Structure

### JuryRankingItemDto
| Field | Type | Description |
|-------|------|-------------|
| id | number | Unique identifier |
| sessionId | number | Assessment session ID |
| groupName | string | Organization/group name |
| participantInfo | string | Participant name and email |
| score | number | Jury score (0-100) |
| submittedAt | string | Submission date (ISO 8601) |
| lastReviewedAt | string | Last review date (ISO 8601) |
| rank | number | Ranking position within category |
| trophyType | string | Trophy type: "gold", "silver", "bronze" |

### JuryRankingCategoryDto
| Field | Type | Description |
|-------|------|-------------|
| categoryName | string | Category name |
| subCategory | string | Subcategory description |
| rankings | JuryRankingItemDto[] | Array of ranked items |

### JuryRankingsResponseDto
| Field | Type | Description |
|-------|------|-------------|
| totalNominations | number | Total number of nominations |
| categories | JuryRankingCategoryDto[] | Array of categories with rankings |

## Business Logic

### Filtering Criteria
- Only includes sessions with completed jury reviews
- Sessions must have `totalScore` not null
- Stage must be `jury_scoring` or `jury_deliberation`
- Decision must be `completed` or `approve`

### Ranking Logic
- Rankings are calculated within each category
- Higher scores rank higher
- Ties are resolved by submission date (earlier submissions rank higher)
- Trophy types are assigned based on rank:
  - Rank 1: "gold"
  - Rank 2: "silver" 
  - Rank 3+: "bronze"

### Search Functionality
- Searches across group names, participant names, and email addresses
- Case-insensitive search
- Partial matching supported

### Category Filtering
- Can filter by specific category names
- "All Categories" shows all categories
- Categories are determined by the group's associated categories

## Integration Notes

### Frontend Integration
The endpoint is designed to support the jury rankings UI shown in the design:
- Supports search functionality for the search bar
- Provides category filtering for the filter buttons
- Returns data structured for easy rendering of ranking cards
- Includes trophy types for visual indicators

### Performance Considerations
- Query includes proper indexing on `totalScore`, `stage`, and `decision`
- Uses efficient joins to fetch related data
- Results are ordered by score for optimal performance

### Security
- Requires authentication and proper role authorization
- Only returns data for sessions that have been properly reviewed
- No sensitive information is exposed beyond what's needed for rankings
