# Tahap-based Grouping Examples

This document provides practical examples of how to use the tahap-based grouping system for cross-subsection calculations.

## Overview

The tahap-based grouping system allows you to:
- Group questions across different subsections
- Define calculation types (delta, average, sum, custom)
- Support multi-stage calculations (Tahap 1, Tahap 2, etc.)
- Manage complex calculation workflows

## Example 1: Poverty Metrics Delta Calculation

Based on the Google Sheet structure, here's how to create a Tahap 1 Delta group for poverty metrics:

### Step 1: Create Questions
First, ensure you have the questions created in your database:

```sql
-- Questions for poor population (2022-2024)
INSERT INTO "Question" (questionText, inputType, isRequired) VALUES
('Berapakah jumlah penduduk miskin pada tahun 2022?', 'numeric', true),
('Berapakah jumlah penduduk miskin pada tahun 2023?', 'numeric', true),
('Berapakah jumlah penduduk miskin pada tahun 2024?', 'numeric', true);
```

### Step 2: Bind Questions to Group
```http
POST /groups/1/questions
Content-Type: application/json

{
  "questionId": 1,
  "orderNumber": 1,
  "sectionTitle": "Dimensi Hasil - 1. Penurunan Kantong-Kantong Kemiskinan",
  "subsection": "Poverty Metrics"
}
```

### Step 3: Create Tahap Group
```http
POST /groups/1/tahap-groups
Content-Type: application/json

{
  "tahapGroup": "Tahap 1 Delta",
  "groupIdentifier": "poverty_metrics",
  "calculationType": "delta",
  "description": "Poverty reduction metrics for delta calculation",
  "questionIds": [1, 2, 3]
}
```

### Expected Response
```json
{
  "message": "Tahap group created successfully",
  "tahapGroup": {
    "tahapGroup": "Tahap 1 Delta",
    "groupIdentifier": "poverty_metrics",
    "calculationType": "delta",
    "description": "Poverty reduction metrics for delta calculation",
    "questionCount": 3,
    "questions": [
      {
        "id": 1,
        "orderNumber": 1,
        "sectionTitle": "Dimensi Hasil - 1. Penurunan Kantong-Kantong Kemiskinan",
        "subsection": "Poverty Metrics",
        "tahapGroup": "Tahap 1 Delta",
        "calculationType": "delta",
        "groupIdentifier": "poverty_metrics",
        "isGrouped": true,
        "question": {
          "id": 1,
          "questionText": "Berapakah jumlah penduduk miskin pada tahun 2022?",
          "inputType": "numeric"
        }
      }
    ]
  }
}
```

## Example 2: P0-P2 Average Calculation (Tahap 2)

For the second stage calculation that averages P0, P1, and P2 indices:

### Step 1: Create P0-P2 Questions
```sql
-- P0 questions (percentage of poor people)
INSERT INTO "Question" (questionText, inputType, isRequired) VALUES
('Berapakah tingkat persentase penduduk miskin (P0) tahun 2022?', 'numeric', true),
('Berapakah tingkat persentase penduduk miskin (P0) tahun 2023?', 'numeric', true),
('Berapakah tingkat persentase penduduk miskin (P0) tahun 2024?', 'numeric', true);

-- P1 questions (poverty gap index)
INSERT INTO "Question" (questionText, inputType, isRequired) VALUES
('Berapakah tingkat kedalaman kemiskinan (P1) kabupaten tahun 2022?', 'numeric', true),
('Berapakah tingkat kedalaman kemiskinan (P1) kabupaten tahun 2023?', 'numeric', true),
('Berapakah tingkat kedalaman kemiskinan (P1) kabupaten tahun 2024?', 'numeric', true);

-- P2 questions (severity of poverty index)
INSERT INTO "Question" (questionText, inputType, isRequired) VALUES
('Berapakah tingkat keparahan kemiskinan (P2) tahun 2022?', 'numeric', true),
('Berapakah tingkat keparahan kemiskinan (P2) tahun 2023?', 'numeric', true),
('Berapakah tingkat keparahan kemiskinan (P2) tahun 2024?', 'numeric', true);
```

### Step 2: Create Tahap 2 Group
```http
POST /groups/1/tahap-groups
Content-Type: application/json

{
  "tahapGroup": "Tahap 2",
  "groupIdentifier": "p0_p2_average",
  "calculationType": "average",
  "description": "Average calculation from P0-P2 poverty indices",
  "questionIds": [7, 8, 9, 10, 11, 12, 13, 14, 15]
}
```

## Example 3: Cross-subsection Grouping

Group questions from different subsections for comprehensive analysis:

### Step 1: Create Questions from Different Subsections
```sql
-- Poverty Metrics Subsection
INSERT INTO "Question" (questionText, inputType, isRequired) VALUES
('Berapakah jumlah penduduk miskin pada tahun 2022?', 'numeric', true),
('Berapakah jumlah penduduk miskin pada tahun 2023?', 'numeric', true),
('Berapakah jumlah penduduk miskin pada tahun 2024?', 'numeric', true);

-- Expenditure Metrics Subsection
INSERT INTO "Question" (questionText, inputType, isRequired) VALUES
('Berapakah jumlah penerima bansos yang bersumber dari APBD kabupaten pada tahun 2022?', 'numeric', true),
('Berapakah jumlah penerima bansos yang bersumber dari APBD kabupaten pada tahun 2023?', 'numeric', true),
('Berapakah jumlah penerima bansos yang bersumber dari APBD kabupaten pada tahun 2024?', 'numeric', true);
```

### Step 2: Bind Questions with Different Subsections
```http
POST /groups/1/questions
Content-Type: application/json

{
  "questionId": 1,
  "orderNumber": 1,
  "sectionTitle": "Dimensi Hasil - 1. Penurunan Kantong-Kantong Kemiskinan",
  "subsection": "Poverty Metrics"
}
```

```http
POST /groups/1/questions
Content-Type: application/json

{
  "questionId": 4,
  "orderNumber": 4,
  "sectionTitle": "Dimensi Hasil - 2. Pengurangan Beban Pengeluaran",
  "subsection": "Expenditure Metrics"
}
```

### Step 3: Create Cross-subsection Tahap Group
```http
POST /groups/1/tahap-groups
Content-Type: application/json

{
  "tahapGroup": "Tahap 1 Delta",
  "groupIdentifier": "comprehensive_metrics",
  "calculationType": "delta",
  "description": "Comprehensive metrics across multiple subsections",
  "questionIds": [1, 2, 3, 4, 5, 6]
}
```

### Step 4: Verify Cross-subsection Grouping
```http
GET /groups/1/cross-subsection-groups
```

**Expected Response:**
```json
{
  "message": "Cross-subsection groups retrieved successfully",
  "group": {
    "id": 1,
    "groupName": "Kabupaten Assessment",
    "description": "Assessment for kabupaten level"
  },
  "tahapGroups": [
    {
      "tahapGroup": "Tahap 1 Delta",
      "groupIdentifier": "comprehensive_metrics",
      "calculationType": "delta",
      "subsections": ["Poverty Metrics", "Expenditure Metrics"],
      "questionCount": 6,
      "isCrossSubsection": true
    }
  ],
  "crossSubsectionGroups": [
    {
      "tahapGroup": "Tahap 1 Delta",
      "groupIdentifier": "comprehensive_metrics",
      "calculationType": "delta",
      "subsections": ["Poverty Metrics", "Expenditure Metrics"],
      "questionCount": 6,
      "isCrossSubsection": true
    }
  ],
  "count": 1
}
```

## Example 4: Managing Tahap Groups

### Get All Tahap Groups
```http
GET /groups/1/tahap-groups
```

### Filter by Tahap Group
```http
GET /groups/1/tahap-groups?tahapGroup=Tahap%201%20Delta
```

### Get Specific Tahap Group Details
```http
GET /groups/1/tahap-groups/poverty_metrics
```

### Update Tahap Group
```http
PUT /groups/1/tahap-groups/poverty_metrics
Content-Type: application/json

{
  "calculationType": "custom",
  "description": "Updated description for poverty metrics calculation"
}
```

### Delete Tahap Group
```http
DELETE /groups/1/tahap-groups/poverty_metrics
```

## Example 5: Complex Multi-stage Workflow

### Stage 1: Create Multiple Tahap Groups
```javascript
// Poverty Metrics Delta
const povertyDelta = {
  tahapGroup: "Tahap 1 Delta",
  groupIdentifier: "poverty_metrics",
  calculationType: "delta",
  description: "Poverty reduction metrics for delta calculation",
  questionIds: [1, 2, 3]
};

// Extreme Poverty Delta
const extremePovertyDelta = {
  tahapGroup: "Tahap 1 Delta",
  groupIdentifier: "extreme_poverty_metrics",
  calculationType: "delta",
  description: "Extreme poverty reduction metrics for delta calculation",
  questionIds: [4, 5, 6]
};

// P0-P2 Average
const p0p2Average = {
  tahapGroup: "Tahap 2",
  groupIdentifier: "p0_p2_average",
  calculationType: "average",
  description: "Average calculation from P0-P2 poverty indices",
  questionIds: [7, 8, 9, 10, 11, 12, 13, 14, 15]
};
```

### Stage 2: Process Results
```javascript
// Get all Tahap 1 Delta groups
const tahap1Groups = await fetch('/groups/1/tahap-groups?tahapGroup=Tahap%201%20Delta');

// Get all Tahap 2 groups
const tahap2Groups = await fetch('/groups/1/tahap-groups?tahapGroup=Tahap%202');

// Get cross-subsection groups
const crossSubsectionGroups = await fetch('/groups/1/cross-subsection-groups');
```

## Best Practices

1. **Use Descriptive Group Identifiers**: Use clear, descriptive names like `poverty_metrics`, `expenditure_metrics`, etc.

2. **Plan Your Calculation Stages**: Design your tahap groups based on your calculation workflow.

3. **Validate Question Types**: Ensure questions in calculation groups have compatible input types.

4. **Document Your Groups**: Use descriptive descriptions for each tahap group.

5. **Monitor Cross-subsection Groups**: Use the cross-subsection endpoint to identify complex groupings.

6. **Version Control**: Consider using version numbers in group identifiers for complex workflows.

## Error Handling

Common errors and solutions:

### Question Not Bound to Group
```json
{
  "statusCode": 400,
  "message": "One or more questions are not bound to this group"
}
```
**Solution**: Ensure all questions are bound to the group before creating tahap groups.

### Tahap Group Already Exists
```json
{
  "statusCode": 400,
  "message": "Tahap group 'Tahap 1 Delta' with identifier 'poverty_metrics' already exists in this group"
}
```
**Solution**: Use a different group identifier or update the existing group.

### Group Not Found
```json
{
  "statusCode": 404,
  "message": "Group not found"
}
```
**Solution**: Ensure the group exists and you have the correct group ID.

## Integration with Frontend

```javascript
// Example React component for managing tahap groups
const TahapGroupManager = ({ groupId }) => {
  const [tahapGroups, setTahapGroups] = useState([]);
  const [crossSubsectionGroups, setCrossSubsectionGroups] = useState([]);

  useEffect(() => {
    // Load tahap groups
    fetch(`/groups/${groupId}/tahap-groups`)
      .then(res => res.json())
      .then(data => setTahapGroups(data.tahapGroups));

    // Load cross-subsection groups
    fetch(`/groups/${groupId}/cross-subsection-groups`)
      .then(res => res.json())
      .then(data => setCrossSubsectionGroups(data.crossSubsectionGroups));
  }, [groupId]);

  const createTahapGroup = async (tahapGroupData) => {
    const response = await fetch(`/groups/${groupId}/tahap-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tahapGroupData)
    });
    return response.json();
  };

  return (
    <div>
      <h2>Tahap Groups</h2>
      {tahapGroups.map(group => (
        <div key={group.groupIdentifier}>
          <h3>{group.tahapGroup} - {group.groupIdentifier}</h3>
          <p>Calculation Type: {group.calculationType}</p>
          <p>Question Count: {group.questionCount}</p>
        </div>
      ))}
      
      <h2>Cross-subsection Groups</h2>
      {crossSubsectionGroups.map(group => (
        <div key={group.groupIdentifier}>
          <h3>{group.tahapGroup} - {group.groupIdentifier}</h3>
          <p>Subsections: {group.subsections.join(', ')}</p>
          <p>Question Count: {group.questionCount}</p>
        </div>
      ))}
    </div>
  );
};
```

This comprehensive example system provides a flexible and powerful way to manage complex calculation workflows across multiple subsections, exactly as needed for the Mandaya Award application system. 