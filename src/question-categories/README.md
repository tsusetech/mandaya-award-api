# Question Categories Module

This module provides endpoints for managing question categories in the Mandaya Award API.

## Overview

Question categories are used to categorize and score questions in the assessment system. Each category has:
- A unique name
- Optional description
- Weight multiplier for scoring
- Min/max value constraints
- Score type (number, percentage, currency, rating, boolean)

## Endpoints

### Authentication
All endpoints require JWT authentication. Admin operations require ADMIN or SUPERADMIN role.

### Base URL
`/question-categories`

### Available Endpoints

#### 1. Create Question Category
- **POST** `/question-categories`
- **Auth**: ADMIN, SUPERADMIN
- **Body**: `CreateQuestionCategoryDto`
- **Response**: Created question category

#### 2. Get All Question Categories
- **GET** `/question-categories`
- **Auth**: Any authenticated user
- **Query Parameters**:
  - `scoreType` (optional): Filter by score type
- **Response**: List of question categories

#### 3. Get Question Category by ID
- **GET** `/question-categories/:id`
- **Auth**: Any authenticated user
- **Response**: Single question category

#### 4. Update Question Category
- **PATCH** `/question-categories/:id`
- **Auth**: ADMIN, SUPERADMIN
- **Body**: `UpdateQuestionCategoryDto`
- **Response**: Updated question category

#### 5. Delete Question Category
- **DELETE** `/question-categories/:id`
- **Auth**: ADMIN, SUPERADMIN
- **Response**: Success message
- **Note**: Cannot delete if used in group questions

## Data Models

### CreateQuestionCategoryDto
```typescript
{
  name: string;                    // Required, unique
  description?: string;            // Optional
  weight?: number;                 // Optional, default: 1.0
  minValue?: number;               // Optional
  maxValue?: number;               // Optional
  scoreType?: ScoreType;           // Optional, default: 'number'
}
```

### ScoreType Enum
- `number` - Numeric values
- `percentage` - Percentage values (0-100)
- `currency` - Currency values
- `rating` - Rating values
- `boolean` - True/false values

### QuestionCategoryResponseDto
```typescript
{
  id: number;
  name: string;
  description?: string | null;
  weight: number;
  minValue?: number | null;
  maxValue?: number | null;
  scoreType: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  deletedBy?: number | null;
}
```

## Usage Examples

### Create a new question category
```bash
curl -X POST /question-categories \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Economic Impact",
    "description": "Questions related to economic impact assessment",
    "weight": 1.5,
    "minValue": 0,
    "maxValue": 100,
    "scoreType": "percentage"
  }'
```

### Get all question categories
```bash
curl -X GET /question-categories \
  -H "Authorization: Bearer <token>"
```

### Filter by score type
```bash
curl -X GET "/question-categories?scoreType=percentage" \
  -H "Authorization: Bearer <token>"
```

## Error Handling

- **400**: Invalid input data
- **401**: Unauthorized
- **403**: Insufficient permissions
- **404**: Question category not found
- **409**: Name already exists or cannot delete (in use)

## Database Schema

The module uses the `QuestionCategory` table with the following structure:
- `id`: Primary key
- `name`: Unique category name
- `description`: Optional description
- `weight`: Decimal weight multiplier
- `minValue`: Optional minimum value
- `maxValue`: Optional maximum value
- `scoreType`: Scoring type
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp
- `deletedAt`: Soft delete timestamp
- `deletedBy`: User who deleted the record
