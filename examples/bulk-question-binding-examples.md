# Bulk Question Binding Examples

This document provides practical examples of how to use the bulk question binding functionality for efficiently binding multiple questions to groups.

## Overview

The bulk question binding system allows you to:
- Bind multiple questions to a group in a single API call
- Apply default values to all questions (section title, subsection, tahap group, etc.)
- Override default values for individual questions when needed
- Validate all questions and order numbers before binding
- Use database transactions for data consistency

## Example 1: Basic Bulk Binding

Bind multiple questions with individual configurations:

```http
POST /groups/1/questions/bulk
Content-Type: application/json

{
  "questions": [
    {
      "questionId": 1,
      "orderNumber": 1,
      "sectionTitle": "Section 1: Basic Information",
      "subsection": "Personal Details"
    },
    {
      "questionId": 2,
      "orderNumber": 2,
      "sectionTitle": "Section 1: Basic Information",
      "subsection": "Personal Details"
    },
    {
      "questionId": 3,
      "orderNumber": 3,
      "sectionTitle": "Section 2: Contact Information",
      "subsection": "Address Details"
    }
  ]
}
```

### Expected Response
```json
{
  "message": "Multiple questions bound to group successfully",
  "groupQuestions": [
    {
      "id": 1,
      "questionId": 1,
      "groupId": 1,
      "orderNumber": 1,
      "sectionTitle": "Section 1: Basic Information",
      "subsection": "Personal Details",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "question": {
        "id": 1,
        "questionText": "What is your name?",
        "inputType": "text"
      },
      "group": {
        "id": 1,
        "groupName": "Assessment Group",
        "description": "Basic assessment questions"
      }
    }
  ],
  "count": 3
}
```

## Example 2: Bulk Binding with Default Values

Use default values for common properties and override only when needed:

```http
POST /groups/1/questions/bulk
Content-Type: application/json

{
  "questions": [
    {
      "questionId": 1,
      "orderNumber": 1
    },
    {
      "questionId": 2,
      "orderNumber": 2
    },
    {
      "questionId": 3,
      "orderNumber": 3,
      "sectionTitle": "Section 2: Special Section"
    }
  ],
  "defaultSectionTitle": "Section 1: Default Section",
  "defaultSubsection": "Default Subsection",
  "defaultTahapGroup": "Tahap 1 Delta",
  "defaultCalculationType": "delta",
  "defaultGroupIdentifier": "default_metrics",
  "defaultIsGrouped": true
}
```

## Example 3: Poverty Metrics Bulk Binding

Bind multiple poverty-related questions with tahap grouping:

```http
POST /groups/1/questions/bulk
Content-Type: application/json

{
  "questions": [
    {
      "questionId": 1,
      "orderNumber": 1
    },
    {
      "questionId": 2,
      "orderNumber": 2
    },
    {
      "questionId": 3,
      "orderNumber": 3
    },
    {
      "questionId": 4,
      "orderNumber": 4
    },
    {
      "questionId": 5,
      "orderNumber": 5
    },
    {
      "questionId": 6,
      "orderNumber": 6
    }
  ],
  "defaultSectionTitle": "Dimensi Hasil - 1. Penurunan Kantong-Kantong Kemiskinan",
  "defaultSubsection": "Poverty Metrics",
  "defaultTahapGroup": "Tahap 1 Delta",
  "defaultCalculationType": "delta",
  "defaultGroupIdentifier": "poverty_metrics",
  "defaultIsGrouped": true
}
```

## Example 4: Cross-subsection Bulk Binding

Bind questions from different subsections:

```http
POST /groups/1/questions/bulk
Content-Type: application/json

{
  "questions": [
    {
      "questionId": 1,
      "orderNumber": 1,
      "sectionTitle": "Dimensi Hasil - 1. Penurunan Kantong-Kantong Kemiskinan",
      "subsection": "Poverty Metrics"
    },
    {
      "questionId": 2,
      "orderNumber": 2,
      "sectionTitle": "Dimensi Hasil - 1. Penurunan Kantong-Kantong Kemiskinan",
      "subsection": "Poverty Metrics"
    },
    {
      "questionId": 3,
      "orderNumber": 3,
      "sectionTitle": "Dimensi Hasil - 2. Pengurangan Beban Pengeluaran",
      "subsection": "Expenditure Metrics"
    },
    {
      "questionId": 4,
      "orderNumber": 4,
      "sectionTitle": "Dimensi Hasil - 2. Pengurangan Beban Pengeluaran",
      "subsection": "Expenditure Metrics"
    }
  ],
  "defaultTahapGroup": "Tahap 1 Delta",
  "defaultCalculationType": "delta",
  "defaultGroupIdentifier": "comprehensive_metrics",
  "defaultIsGrouped": true
}
```

## Example 5: P0-P2 Average Calculation Bulk Binding

Bind P0, P1, and P2 questions for average calculation:

```http
POST /groups/1/questions/bulk
Content-Type: application/json

{
  "questions": [
    {
      "questionId": 7,
      "orderNumber": 1,
      "subsection": "P0 Metrics"
    },
    {
      "questionId": 8,
      "orderNumber": 2,
      "subsection": "P0 Metrics"
    },
    {
      "questionId": 9,
      "orderNumber": 3,
      "subsection": "P0 Metrics"
    },
    {
      "questionId": 10,
      "orderNumber": 4,
      "subsection": "P1 Metrics"
    },
    {
      "questionId": 11,
      "orderNumber": 5,
      "subsection": "P1 Metrics"
    },
    {
      "questionId": 12,
      "orderNumber": 6,
      "subsection": "P1 Metrics"
    },
    {
      "questionId": 13,
      "orderNumber": 7,
      "subsection": "P2 Metrics"
    },
    {
      "questionId": 14,
      "orderNumber": 8,
      "subsection": "P2 Metrics"
    },
    {
      "questionId": 15,
      "orderNumber": 9,
      "subsection": "P2 Metrics"
    }
  ],
  "defaultSectionTitle": "Dimensi Hasil - 1. Penurunan Kantong-Kantong Kemiskinan",
  "defaultTahapGroup": "Tahap 2",
  "defaultCalculationType": "average",
  "defaultGroupIdentifier": "p0_p2_average",
  "defaultIsGrouped": true
}
```

## Example 6: JavaScript/TypeScript Integration

```javascript
// Example function to bind multiple questions
const bindMultipleQuestions = async (groupId, questions, defaults = {}) => {
  const response = await fetch(`/groups/${groupId}/questions/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      questions,
      ...defaults
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
};

// Usage example
const povertyQuestions = [
  { questionId: 1, orderNumber: 1 },
  { questionId: 2, orderNumber: 2 },
  { questionId: 3, orderNumber: 3 }
];

const defaults = {
  defaultSectionTitle: 'Dimensi Hasil - 1. Penurunan Kantong-Kantong Kemiskinan',
  defaultSubsection: 'Poverty Metrics',
  defaultTahapGroup: 'Tahap 1 Delta',
  defaultCalculationType: 'delta',
  defaultGroupIdentifier: 'poverty_metrics',
  defaultIsGrouped: true
};

try {
  const result = await bindMultipleQuestions(1, povertyQuestions, defaults);
  console.log(`Successfully bound ${result.count} questions`);
} catch (error) {
  console.error('Error binding questions:', error.message);
}
```

## Example 7: React Component Integration

```jsx
import React, { useState } from 'react';

const BulkQuestionBinder = ({ groupId, onSuccess }) => {
  const [questions, setQuestions] = useState([]);
  const [defaults, setDefaults] = useState({
    defaultSectionTitle: '',
    defaultSubsection: '',
    defaultTahapGroup: '',
    defaultCalculationType: '',
    defaultGroupIdentifier: '',
    defaultIsGrouped: false
  });
  const [loading, setLoading] = useState(false);

  const addQuestion = () => {
    setQuestions([...questions, {
      questionId: '',
      orderNumber: questions.length + 1,
      sectionTitle: '',
      subsection: ''
    }]);
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index][field] = value;
    setQuestions(updatedQuestions);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/groups/${groupId}/questions/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          questions: questions.map(q => ({
            ...q,
            questionId: parseInt(q.questionId),
            orderNumber: parseInt(q.orderNumber)
          })),
          ...defaults
        })
      });

      if (!response.ok) {
        throw new Error('Failed to bind questions');
      }

      const result = await response.json();
      onSuccess(result);
      setQuestions([]);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to bind questions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Bulk Question Binding</h3>
      
      {/* Default Values */}
      <div>
        <h4>Default Values (Optional)</h4>
        <input
          type="text"
          placeholder="Default Section Title"
          value={defaults.defaultSectionTitle}
          onChange={(e) => setDefaults({...defaults, defaultSectionTitle: e.target.value})}
        />
        <input
          type="text"
          placeholder="Default Subsection"
          value={defaults.defaultSubsection}
          onChange={(e) => setDefaults({...defaults, defaultSubsection: e.target.value})}
        />
        <select
          value={defaults.defaultTahapGroup}
          onChange={(e) => setDefaults({...defaults, defaultTahapGroup: e.target.value})}
        >
          <option value="">Select Tahap Group</option>
          <option value="Tahap 1 Delta">Tahap 1 Delta</option>
          <option value="Tahap 2">Tahap 2</option>
          <option value="Tahap 3">Tahap 3</option>
        </select>
      </div>

      {/* Questions */}
      <div>
        <h4>Questions</h4>
        {questions.map((question, index) => (
          <div key={index}>
            <input
              type="number"
              placeholder="Question ID"
              value={question.questionId}
              onChange={(e) => updateQuestion(index, 'questionId', e.target.value)}
            />
            <input
              type="number"
              placeholder="Order Number"
              value={question.orderNumber}
              onChange={(e) => updateQuestion(index, 'orderNumber', e.target.value)}
            />
            <input
              type="text"
              placeholder="Section Title (optional)"
              value={question.sectionTitle}
              onChange={(e) => updateQuestion(index, 'sectionTitle', e.target.value)}
            />
            <input
              type="text"
              placeholder="Subsection (optional)"
              value={question.subsection}
              onChange={(e) => updateQuestion(index, 'subsection', e.target.value)}
            />
            <button type="button" onClick={() => removeQuestion(index)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={addQuestion}>
          Add Question
        </button>
      </div>

      <button type="submit" disabled={loading || questions.length === 0}>
        {loading ? 'Binding...' : 'Bind Questions'}
      </button>
    </form>
  );
};

export default BulkQuestionBinder;
```

## Error Handling

### Common Error Scenarios

1. **Question Not Found**
```json
{
  "statusCode": 400,
  "message": "Questions with IDs 5, 6 not found"
}
```

2. **Questions Already Bound**
```json
{
  "statusCode": 400,
  "message": "Questions with IDs 1, 2 are already bound to this group"
}
```

3. **Order Number Conflicts**
```json
{
  "statusCode": 400,
  "message": "Order numbers 1, 3 are already taken in this group"
}
```

4. **Group Not Found**
```json
{
  "statusCode": 404,
  "message": "Group not found"
}
```

## Best Practices

1. **Use Default Values**: Set common properties as defaults to reduce redundancy
2. **Validate Order Numbers**: Ensure order numbers are unique and sequential
3. **Group Related Questions**: Use consistent section titles and subsections for related questions
4. **Use Tahap Grouping**: Leverage tahap groups for calculation workflows
5. **Error Handling**: Always handle potential errors in your frontend code
6. **Transaction Safety**: The API uses database transactions for data consistency

## Performance Considerations

- The bulk binding operation is wrapped in a database transaction
- All validations are performed before any database operations
- The operation is atomic - either all questions are bound or none are
- Consider the number of questions being bound in a single request (recommended: 50 or fewer)

## Integration with Existing Features

The bulk binding functionality integrates seamlessly with:
- Individual question binding (`POST /groups/:id/questions`)
- Tahap group creation (`POST /groups/:id/tahap-groups`)
- Cross-subsection grouping
- Question reordering
- Group management features

This provides a comprehensive solution for efficiently managing question-group relationships in your application. 