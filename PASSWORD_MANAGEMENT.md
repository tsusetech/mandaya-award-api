# Password Management Endpoints

This document describes the new password management functionality added to the Mandaya Awards API.

## Overview

The API now includes comprehensive password management features:
- **Change Password**: For authenticated users to change their password
- **Forgot Password**: For users to request password reset emails
- **Reset Password**: For users to reset their password using reset tokens

## New Endpoints

### 1. Change Password

**Endpoint**: `POST /auth/change-password`  
**Authentication**: Required (JWT Bearer Token)  
**Access**: All authenticated users

**Request Body**:
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

**Response**:
```json
{
  "message": "Password changed successfully",
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Features**:
- Requires current password verification
- Password confirmation validation
- Password strength requirements (min 8 chars, letters + numbers)
- Secure password hashing with bcrypt

### 2. Forgot Password

**Endpoint**: `POST /auth/forgot-password`  
**Authentication**: Not required  
**Access**: Public

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "message": "If an account with that email exists, a password reset link has been sent",
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Features**:
- Security-focused (doesn't reveal if email exists)
- Generates secure JWT reset token
- Sends password reset email via existing notification system
- 1-hour token expiration

### 3. Reset Password

**Endpoint**: `POST /auth/reset-password`  
**Authentication**: Not required (uses reset token)  
**Access**: Public

**Request Body**:
```json
{
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

**Response**:
```json
{
  "message": "Password reset successfully",
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Features**:
- Token validation and expiration checking
- Password confirmation validation
- Secure password hashing
- Automatic token cleanup after use

## Password Requirements

- **Minimum length**: 8 characters
- **Maximum length**: 128 characters
- **Must contain**: At least one letter and one number
- **Allowed characters**: All printable ASCII characters

## Security Features

### Token Security
- JWT-based reset tokens with 1-hour expiration
- Tokens are stored in database with expiration timestamps
- Tokens are automatically cleaned up after use
- Secure token generation using existing JWT service

### Password Security
- Current password verification for change operations
- Secure password hashing using bcrypt with salt
- Password confirmation to prevent typos
- No password history (can reuse old passwords)

### Email Security
- Reset emails don't reveal if account exists
- Secure reset links with short expiration
- Professional email templates with security notices

## Database Changes

### New Fields Added to User Table
```sql
ALTER TABLE "User" ADD COLUMN "resetToken" TEXT UNIQUE;
ALTER TABLE "User" ADD COLUMN "resetTokenExpires" TIMESTAMP;
CREATE INDEX "User_resetToken_idx" ON "User"("resetToken");
```

### Migration
Run the SQL migration file: `prisma/migrations/add_password_reset_fields.sql`

## Error Handling

### Common Error Responses

**400 Bad Request**:
- Password confirmation mismatch
- Invalid password format
- Current password incorrect
- Invalid or expired reset token

**401 Unauthorized**:
- Missing or invalid JWT token (for change-password)

**404 Not Found**:
- User not found (for change-password)

## Usage Examples

### Frontend Integration

#### Change Password Form
```javascript
const changePassword = async (currentPassword, newPassword, confirmPassword) => {
  const response = await fetch('/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
      confirmPassword
    })
  });
  
  if (response.ok) {
    // Show success message
    showMessage('Password changed successfully');
  }
};
```

#### Forgot Password Form
```javascript
const forgotPassword = async (email) => {
  const response = await fetch('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  if (response.ok) {
    // Show generic message (don't reveal if email exists)
    showMessage('If an account with that email exists, a password reset link has been sent');
  }
};
```

#### Reset Password Form
```javascript
const resetPassword = async (resetToken, newPassword, confirmPassword) => {
  const response = await fetch('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resetToken,
      newPassword,
      confirmPassword
    })
  });
  
  if (response.ok) {
    // Redirect to login
    window.location.href = '/login';
  }
};
```

## Testing

### Test Cases

1. **Change Password**:
   - Valid current password + new password
   - Invalid current password
   - Password confirmation mismatch
   - Weak password (too short, no letters/numbers)

2. **Forgot Password**:
   - Valid email address
   - Non-existent email address
   - Invalid email format

3. **Reset Password**:
   - Valid reset token
   - Expired reset token
   - Invalid reset token
   - Password confirmation mismatch

### Postman Collection

Import the following endpoints to your Postman collection:

```json
{
  "name": "Password Management",
  "item": [
    {
      "name": "Change Password",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/auth/change-password",
        "headers": {
          "Authorization": "Bearer {{accessToken}}",
          "Content-Type": "application/json"
        },
        "body": {
          "mode": "raw",
          "raw": "{\n  \"currentPassword\": \"oldPassword123\",\n  \"newPassword\": \"newPassword123\",\n  \"confirmPassword\": \"newPassword123\"\n}"
        }
      }
    },
    {
      "name": "Forgot Password",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/auth/forgot-password",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"user@example.com\"\n}"
        }
      }
    },
    {
      "name": "Reset Password",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/auth/reset-password",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": {
          "mode": "raw",
          "raw": "{\n  \"resetToken\": \"{{resetToken}}\",\n  \"newPassword\": \"newPassword123\",\n  \"confirmPassword\": \"newPassword123\"\n}"
        }
      }
    }
  ]
}
```

## Dependencies

The password management system uses these existing services:
- **JWT Service**: For token generation and validation
- **Notifications Service**: For sending password reset emails
- **Prisma Service**: For database operations
- **bcrypt**: For password hashing (already included)

## Future Enhancements

Potential improvements for future versions:
- Password history tracking
- Password complexity requirements
- Account lockout after failed attempts
- Two-factor authentication integration
- Password expiration policies
- Audit logging for password changes
