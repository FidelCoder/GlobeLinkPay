GlobeLinkPay API Documentation
This document outlines the available APIs for the GlobeLinkPay application as of March 22, 2025. These APIs handle user authentication, registration, password reset, and business creation workflows.

Base URL
All endpoints are relative to the base URL: http://localhost:8000 (or your deployed server URL).

Authentication APIs
Initiate User Registration
Method: POST
Path: /api/auth/initiate-register
Request Body:
json


{
  "phoneNumber": "+254703229363",
  "password": "babybaby"
}
Register User
Method: POST
Path: /api/auth/register
Request Body:
json


{
  "phoneNumber": "+254703229363",
  "password": "babybaby",
  "otp": "123456"
}
Login User
Method: POST
Path: /api/auth/login
Request Body:
json


{
  "phoneNumber": "+254703229363",
  "password": "babybaby"
}
Request Password Reset
Method: POST
Path: /api/auth/request-password-reset
Request Body:
json

Collapse

Wrap

Copy
{
  "phoneNumber": "+254703229363"
}
Reset Password
Method: POST
Path: /api/auth/reset-password
Request Body:
json


{
  "phoneNumber": "+254703229363",
  "otp": "123456",
  "newPassword": "newpassword123"
}
Business APIs
Request Business Creation
Method: POST
Path: /api/business/request-creation
Request Body:
json


{
  "businessName": "Test Shop",
  "ownerName": "Griffins",
  "phoneNumber": "254759280875",
  "email": "griffinesonyango@gmail.com",
  "location": "Nairobi, Kenya",
  "businessType": "Retail"
}
Complete Business Creation
Method: POST
Path: /api/business/complete-creation
Request Body:
json


{
  "businessName": "Test Shop",
  "ownerName": "Griffins",
  "phoneNumber": "254759280875",
  "email": "griffinesonyango@gmail.com",
  "location": "Nairobi, Kenya",
  "businessType": "Retail",
  "otp": "123456"
}


