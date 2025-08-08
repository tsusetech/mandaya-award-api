# Welcome Email Examples

This document provides examples of how to use the new welcome email functionality that automatically sends account credentials to new users after signup.

## Features

- **Automatic Trigger**: Welcome emails are automatically sent after successful user signup
- **Account Details**: Includes username, email, and password
- **Login Link**: Provides a direct link to the login page
- **Professional Design**: Beautiful HTML email template with responsive design
- **Security Notice**: Includes security recommendations for users

## Environment Variables

Make sure to set the following environment variables:

```env
# Frontend URL for login links
FRONTEND_URL=https://your-frontend-domain.com

# Email service configuration (Mailgun, SendGrid, etc.)
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-mailgun-domain
```

## API Endpoints

### 1. Automatic Welcome Email (Signup)

When a user signs up through the `/auth/signup` endpoint, a welcome email is automatically sent:

```bash
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "john_doe",
    "name": "John Doe",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "userRoles": [
      {
        "role": {
          "name": "PESERTA"
        }
      }
    ]
  }
}
```

### 2. Manual Welcome Email with Credentials

You can also manually send a welcome email with credentials using the dedicated endpoint:

```bash
POST /notifications/email/welcome-with-credentials
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "to": "user@example.com",
  "username": "john_doe",
  "email": "user@example.com",
  "password": "securepassword123",
  "loginUrl": "https://your-frontend-domain.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Welcome email with credentials sent successfully",
  "data": {
    "messageId": "email-sent-id",
    "status": "sent"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/notifications/email/welcome-with-credentials"
}
```

### 3. Bulk Signup with Welcome Emails

For bulk user registration, welcome emails are automatically sent for each successfully created user:

```bash
POST /auth/bulk-signup
Authorization: Bearer <admin-token>
Content-Type: application/json

[
  {
    "email": "user1@example.com",
    "username": "user1",
    "password": "password123",
    "name": "User One",
    "role": "PESERTA"
  },
  {
    "email": "user2@example.com",
    "username": "user2",
    "password": "password456",
    "name": "User Two",
    "role": "PESERTA"
  }
]
```

## Email Template Features

The welcome email includes:

1. **Professional Header**: Mandaya Awards branding
2. **Personalized Greeting**: Uses the user's username
3. **Account Details Section**: 
   - Username
   - Email address
   - Password (plain text)
4. **Login Button**: Direct link to login page
5. **Security Notice**: Recommendations for password security
6. **Responsive Design**: Works on desktop and mobile devices

## Email Content Example

```
Subject: Welcome to Mandaya Awards Platform - Your Account Details

Hello john_doe,

Thank you for joining the Mandaya Awards platform! We're excited to have you on board.

Here are your account details:

Username: john_doe
Email: user@example.com
Password: securepassword123

Click the button below to access your account:
[Login to Your Account]

Or copy and paste this link into your browser:
https://your-frontend-domain.com/login

Security Notice: Please keep your login credentials secure and consider changing your password after your first login.

Best regards,
The Mandaya Awards Team
```

## Error Handling

- If email sending fails, the signup process continues successfully
- Email errors are logged but don't prevent user creation
- The system gracefully handles email service outages

## Security Considerations

1. **Password Transmission**: Passwords are sent in plain text via email (consider this for your security requirements)
2. **Email Security**: Ensure your email service uses TLS/SSL
3. **Token Expiration**: Consider implementing password change requirements on first login
4. **Rate Limiting**: Implement rate limiting on signup endpoints to prevent abuse

## Customization

You can customize the email template by modifying the `sendWelcomeEmailWithCredentials` method in `src/notifications/notifications.service.ts`.

The template supports:
- Custom branding colors
- Different email layouts
- Additional content sections
- Multiple language support (with template modifications)
