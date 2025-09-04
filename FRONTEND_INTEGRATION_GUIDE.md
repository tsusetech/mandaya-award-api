# Frontend Integration Guide - Password Management

This guide provides complete implementation instructions for integrating the new password management endpoints into your frontend application.

## 🎯 Overview

The API now provides three password management endpoints:
1. **Change Password** - For logged-in users to change their password
2. **Forgot Password** - For users to request password reset emails
3. **Reset Password** - For users to reset their password using reset tokens

## 📋 API Endpoints Summary

| Endpoint | Method | Auth Required | Purpose |
|----------|--------|---------------|---------|
| `/auth/change-password` | POST | ✅ JWT Token | Change password for logged-in user |
| `/auth/forgot-password` | POST | ❌ | Request password reset email |
| `/auth/reset-password` | POST | ❌ | Reset password using token |

## 🔧 Implementation Guide

### 1. Change Password Feature

#### API Call Function
```javascript
// utils/authApi.js
const API_BASE_URL = 'http://localhost:3001'; // or your API URL

export const changePassword = async (currentPassword, newPassword, confirmPassword, accessToken) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to change password');
    }

    return data;
  } catch (error) {
    throw error;
  }
};
```

#### React Component Example
```jsx
// components/ChangePasswordForm.jsx
import React, { useState } from 'react';
import { changePassword } from '../utils/authApi';

const ChangePasswordForm = ({ accessToken, onSuccess }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Client-side validation
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New password and confirmation password do not match');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(formData.newPassword)) {
      setError('Password must contain at least one letter and one number');
      setLoading(false);
      return;
    }

    try {
      const result = await changePassword(
        formData.currentPassword,
        formData.newPassword,
        formData.confirmPassword,
        accessToken
      );

      setSuccess('Password changed successfully!');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-form">
      <h2>Change Password</h2>
      
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="currentPassword">Current Password</label>
          <input
            type="password"
            id="currentPassword"
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="newPassword">New Password</label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            required
            disabled={loading}
            minLength={8}
          />
          <small>Must be at least 8 characters with letters and numbers</small>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Changing Password...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
};

export default ChangePasswordForm;
```

### 2. Forgot Password Feature

#### API Call Function
```javascript
// utils/authApi.js
export const forgotPassword = async (email) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send reset email');
    }

    return data;
  } catch (error) {
    throw error;
  }
};
```

#### React Component Example
```jsx
// components/ForgotPasswordForm.jsx
import React, { useState } from 'react';
import { forgotPassword } from '../utils/authApi';

const ForgotPasswordForm = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const result = await forgotPassword(email);
      setSuccess('If an account with that email exists, a password reset link has been sent');
      setEmail('');
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-form">
      <h2>Forgot Password</h2>
      <p>Enter your email address and we'll send you a link to reset your password.</p>
      
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            placeholder="Enter your email address"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <div className="form-footer">
        <a href="/login">Back to Login</a>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
```

### 3. Reset Password Feature

#### API Call Function
```javascript
// utils/authApi.js
export const resetPassword = async (resetToken, newPassword, confirmPassword) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resetToken,
        newPassword,
        confirmPassword
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to reset password');
    }

    return data;
  } catch (error) {
    throw error;
  }
};
```

#### React Component Example
```jsx
// components/ResetPasswordForm.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../utils/authApi';

const ResetPasswordForm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }
    setResetToken(token);
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Client-side validation
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New password and confirmation password do not match');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(formData.newPassword)) {
      setError('Password must contain at least one letter and one number');
      setLoading(false);
      return;
    }

    try {
      const result = await resetPassword(
        resetToken,
        formData.newPassword,
        formData.confirmPassword
      );

      setSuccess('Password reset successfully! Redirecting to login...');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <div className="reset-password-form">
        <div className="alert alert-error">
          Invalid or missing reset token. Please check your email for the correct reset link.
        </div>
        <a href="/forgot-password" className="btn btn-primary">
          Request New Reset Link
        </a>
      </div>
    );
  }

  return (
    <div className="reset-password-form">
      <h2>Reset Password</h2>
      <p>Enter your new password below.</p>
      
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="newPassword">New Password</label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            required
            disabled={loading}
            minLength={8}
          />
          <small>Must be at least 8 characters with letters and numbers</small>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Resetting Password...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordForm;
```

## 🎨 CSS Styling Examples

```css
/* styles/password-forms.css */
.change-password-form,
.forgot-password-form,
.reset-password-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-group input:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: #666;
  font-size: 0.875rem;
}

.btn {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-primary:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.alert {
  padding: 0.75rem;
  margin-bottom: 1rem;
  border-radius: 4px;
  font-weight: 500;
}

.alert-error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.alert-success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.form-footer {
  text-align: center;
  margin-top: 1rem;
}

.form-footer a {
  color: #007bff;
  text-decoration: none;
}

.form-footer a:hover {
  text-decoration: underline;
}
```

## 🛣️ Routing Setup (React Router)

```jsx
// App.jsx or your routing file
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChangePasswordForm from './components/ChangePasswordForm';
import ForgotPasswordForm from './components/ForgotPasswordForm';
import ResetPasswordForm from './components/ResetPasswordForm';

function App() {
  return (
    <Router>
      <Routes>
        {/* Other routes */}
        <Route path="/change-password" element={<ChangePasswordForm />} />
        <Route path="/forgot-password" element={<ForgotPasswordForm />} />
        <Route path="/reset-password" element={<ResetPasswordForm />} />
      </Routes>
    </Router>
  );
}
```

## 🔐 Authentication Integration

### Getting Access Token
```javascript
// utils/auth.js
export const getAccessToken = () => {
  return localStorage.getItem('accessToken');
};

export const setAccessToken = (token) => {
  localStorage.setItem('accessToken', token);
};

export const removeAccessToken = () => {
  localStorage.removeItem('accessToken');
};
```

### Protected Route Example
```jsx
// components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { getAccessToken } from '../utils/auth';

const ProtectedRoute = ({ children }) => {
  const token = getAccessToken();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export default ProtectedRoute;
```

### Using in App
```jsx
// App.jsx
import ProtectedRoute from './components/ProtectedRoute';
import ChangePasswordForm from './components/ChangePasswordForm';

function App() {
  return (
    <Router>
      <Routes>
        <Route 
          path="/change-password" 
          element={
            <ProtectedRoute>
              <ChangePasswordForm />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}
```

## 📱 Mobile Responsive Considerations

```css
/* Mobile styles */
@media (max-width: 768px) {
  .change-password-form,
  .forgot-password-form,
  .reset-password-form {
    margin: 1rem;
    padding: 1.5rem;
  }
  
  .form-group input {
    font-size: 16px; /* Prevents zoom on iOS */
  }
}
```

## 🧪 Testing Examples

### Unit Test Example (Jest)
```javascript
// __tests__/authApi.test.js
import { changePassword, forgotPassword, resetPassword } from '../utils/authApi';

// Mock fetch
global.fetch = jest.fn();

describe('Auth API', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test('changePassword should make correct API call', async () => {
    const mockResponse = {
      message: 'Password changed successfully',
      success: true,
      timestamp: '2024-01-15T10:30:00.000Z'
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await changePassword('oldPass', 'newPass', 'newPass', 'token');
    
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/auth/change-password',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        },
        body: JSON.stringify({
          currentPassword: 'oldPass',
          newPassword: 'newPass',
          confirmPassword: 'newPass'
        })
      })
    );
    
    expect(result).toEqual(mockResponse);
  });
});
```

## 🚨 Error Handling Best Practices

### Common Error Messages
- **400 Bad Request**: Invalid input data, password mismatch, weak password
- **401 Unauthorized**: Invalid or expired JWT token
- **500 Internal Server Error**: Server-side issues

### Error Handling Strategy
```javascript
// utils/errorHandler.js
export const handleApiError = (error) => {
  if (error.message.includes('Current password is incorrect')) {
    return 'The current password you entered is incorrect.';
  }
  
  if (error.message.includes('Password must be at least 8 characters')) {
    return 'Password must be at least 8 characters long.';
  }
  
  if (error.message.includes('must contain at least one letter and one number')) {
    return 'Password must contain at least one letter and one number.';
  }
  
  if (error.message.includes('Invalid or expired reset token')) {
    return 'This reset link is invalid or has expired. Please request a new one.';
  }
  
  return error.message || 'An unexpected error occurred. Please try again.';
};
```

## 📋 Implementation Checklist

- [ ] Create API utility functions
- [ ] Implement ChangePasswordForm component
- [ ] Implement ForgotPasswordForm component  
- [ ] Implement ResetPasswordForm component
- [ ] Add routing for password management pages
- [ ] Add CSS styling
- [ ] Implement error handling
- [ ] Add loading states
- [ ] Test all scenarios
- [ ] Add mobile responsiveness
- [ ] Update navigation menus
- [ ] Add success/error notifications

## 🔗 Integration Points

1. **User Profile/Settings Page**: Add "Change Password" link
2. **Login Page**: Add "Forgot Password?" link
3. **Email Templates**: Ensure reset emails link to your frontend
4. **Navigation**: Update menus and breadcrumbs
5. **Authentication Flow**: Integrate with existing auth system

This guide provides everything your frontend team needs to implement the password management features! 🚀
