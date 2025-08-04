<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

# Mandaya Award API

A comprehensive API for managing award applications with advanced grouping and calculation capabilities.

## Features

- **User Management**: Authentication, authorization, and role-based access control
- **Group Management**: Create and manage groups for organizing questions
- **Question Management**: Create and manage questions with various input types
- **Response Management**: Handle user responses with auto-save functionality
- **Review System**: Comprehensive review workflow for submissions
- **Tahap-based Grouping**: Advanced grouping system for cross-subsection calculations

## Tahap-based Grouping System

The API includes an advanced grouping system that allows you to create calculation groups that can span across multiple subsections. This is particularly useful for implementing multi-stage calculations like "Tahap 1 Delta" and "Tahap 2" as shown in the Google Sheet.

### Key Concepts

1. **Tahap Groups**: Calculation stages (e.g., "Tahap 1 Delta", "Tahap 2")
2. **Group Identifiers**: Unique identifiers for grouping related questions
3. **Calculation Types**: Types of calculations (delta, average, sum, custom)
4. **Cross-subsection Support**: Questions can be grouped across different subsections

### Database Schema

The `GroupQuestion` model has been enhanced with new fields:

```prisma
model GroupQuestion {
  id            Int      @id @default(autoincrement())
  groupId       Int
  questionId    Int
  orderNumber   Int
  sectionTitle  String?
  subsection    String?
  // New fields for tahap-based grouping
  tahapGroup    String?  // e.g., "Tahap 1 Delta", "Tahap 2"
  calculationType String? // e.g., "delta", "average", "sum"
  groupIdentifier String? // e.g., "poverty_metrics", "expenditure_metrics"
  isGrouped     Boolean  @default(false) // indicates if this question is part of a calculation group
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  group    Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  question Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  responses QuestionResponse[]

  @@index([groupId])
  @@index([questionId])
  @@index([tahapGroup])
  @@index([groupIdentifier])
}
```

### API Endpoints

#### Create Tahap Group
```http
POST /groups/{groupId}/tahap-groups
```

**Request Body:**
```json
{
  "tahapGroup": "Tahap 1 Delta",
  "groupIdentifier": "poverty_metrics",
  "calculationType": "delta",
  "description": "Poverty reduction metrics for delta calculation",
  "questionIds": [1, 2, 3]
}
```

#### Update Tahap Group
```http
PUT /groups/{groupId}/tahap-groups/{groupIdentifier}
```

#### Delete Tahap Group
```http
DELETE /groups/{groupId}/tahap-groups/{groupIdentifier}
```

#### Get All Tahap Groups
```http
GET /groups/{groupId}/tahap-groups
```

**Query Parameters:**
- `tahapGroup`: Filter by tahap group
- `groupIdentifier`: Filter by group identifier

#### Get Tahap Group Details
```http
GET /groups/{groupId}/tahap-groups/{groupIdentifier}
```

#### Get Cross-subsection Groups
```http
GET /groups/{groupId}/cross-subsection-groups
```

### Usage Examples

#### Example 1: Creating a Tahap 1 Delta Group

Based on the Google Sheet, you can create a group for poverty metrics that spans across subsections:

```javascript
// Create a tahap group for poverty metrics (questions 1-3)
const tahapGroup = {
  tahapGroup: "Tahap 1 Delta",
  groupIdentifier: "poverty_metrics",
  calculationType: "delta",
  description: "Poverty reduction metrics for delta calculation",
  questionIds: [1, 2, 3] // Questions about poor population for 2022, 2023, 2024
};

// POST to /groups/1/tahap-groups
```

#### Example 2: Creating a Tahap 2 Group

For the average calculation of P0-P2 metrics:

```javascript
// Create a tahap group for P0-P2 average calculation
const tahapGroup = {
  tahapGroup: "Tahap 2",
  groupIdentifier: "p0_p2_average",
  calculationType: "average",
  description: "Average calculation from P0-P2 poverty indices",
  questionIds: [7, 8, 9, 10, 11, 12, 13, 14, 15] // P0, P1, P2 questions for 2022-2024
};

// POST to /groups/1/tahap-groups
```

#### Example 3: Cross-subsection Grouping

You can group questions from different subsections:

```javascript
// Group questions from "Poverty Metrics" and "Expenditure Metrics" subsections
const crossSubsectionGroup = {
  tahapGroup: "Tahap 1 Delta",
  groupIdentifier: "comprehensive_metrics",
  calculationType: "delta",
  description: "Comprehensive metrics across multiple subsections",
  questionIds: [1, 2, 3, 16, 17, 18] // Questions from different subsections
};
```

### Response Structure

#### Tahap Group Response
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

#### Cross-subsection Groups Response
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
      "groupIdentifier": "poverty_metrics",
      "calculationType": "delta",
      "subsections": ["Poverty Metrics", "Expenditure Metrics"],
      "questionCount": 6,
      "isCrossSubsection": true
    }
  ],
  "crossSubsectionGroups": [
    {
      "tahapGroup": "Tahap 1 Delta",
      "groupIdentifier": "poverty_metrics",
      "calculationType": "delta",
      "subsections": ["Poverty Metrics", "Expenditure Metrics"],
      "questionCount": 6,
      "isCrossSubsection": true
    }
  ],
  "count": 1
}
```

### Benefits

1. **Flexible Grouping**: Group questions across different subsections
2. **Calculation Support**: Define calculation types for each group
3. **Multi-stage Processing**: Support for multiple calculation stages (Tahap 1, Tahap 2, etc.)
4. **Easy Management**: Simple API endpoints for creating and managing groups
5. **Cross-subsection Analysis**: Identify and manage groups that span multiple subsections

### Migration

To apply the database changes:

```bash
# Generate Prisma client with new schema
npx prisma generate

# Run database migration
npx prisma migrate dev --name add-tahap-grouping
```

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file with the following variables:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/mandaya_award"
JWT_SECRET="your-jwt-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## Running the Application

```bash
# Development
npm run start:dev

# Production
npm run start:prod
```

## API Documentation

Once the application is running, visit `http://localhost:3000/api` for the Swagger documentation.
