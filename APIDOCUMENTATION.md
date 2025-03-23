GlobeLinkPay API Documentation

npm run dev


Install Postman if you haven’t already (download from postman.com).
Create a new collection (e.g., “GlobeLinkPay API”) to organize your requests.

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










Authentication:

Most endpoints require a JWT token via the Authorization header (e.g., Bearer <token>).
Get a token by logging in first (see Step 1 below).
Test Data:
Have at least one registered user and one business in your database. You can create these via:
POST /api/auth/register (for a user).
POST /api/business/complete-creation (for a business).
Example MongoDB entries:
User: { phoneNumber: "254759280875", walletAddress: "0x...", chain: "mantle", ... }
Business: { merchantId: "NX-12345", walletAddress: "0x...", chain: "mantle", userId: "<user-id>", ... }


Testnet Funds:
Ensure the wallet addresses have testnet funds (e.g., MNT on Mantle Testnet from faucet.testnet.mantle.xyz).
Step 1: Login to Get JWT Token
Endpoint: POST /api/auth/login

Request Setup:
Method: POST
URL: http://localhost:8000/api/auth/login
Headers:
Content-Type: application/json
Body (raw, JSON):
json


{
  "phoneNumber": "254759280875",
  "password": "testpass"
}


Send Request:
Click “Send” in Postman.
Expected Response:
Status: 200 OK
Body:
json


{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Logged in successfully!",
  "walletAddress": "0x...",
  "phoneNumber": "254759280875",
  "chain": "mantle"
}

Copy the token value for use in subsequent requests.
Save Token:
In Postman, set an environment variable (e.g., jwt_token):
Go to “Environments” > Create new > Add jwt_token = <paste-token-here> > Save.
Use it in headers as Authorization: Bearer {{jwt_token}}.
Step 2: Test getBalance (authController.ts)
Endpoint: POST /api/auth/balance

Request Setup:
Method: POST
URL: http://localhost:8000/api/auth/balance
Headers:
Content-Type: application/json
Authorization: Bearer {{jwt_token}}
Body (raw, JSON):
json


{
  "chain": "mantle",
  "tokenType": "native"
}


Send Request:
Click “Send”.
Expected Response:
Status: 200 OK
Body:
json


{
  "message": "Balance retrieved successfully!",
  "phoneNumber": "254759280875",
  "walletAddress": "0x...",
  "balance": "0.5", // Depends on testnet funds
  "token": "MNT",
  "chain": "mantle"
}
Troubleshooting:
401 Unauthorized: Check the Authorization header.
404 Not Found: Ensure the user exists in MongoDB.
0 Balance: Fund the wallet via the Mantle Testnet faucet.
Step 3: Test transferFunds (authController.ts)
Endpoint: POST /api/auth/transfer


Request Setup:
Method: POST
URL: http://localhost:8000/api/auth/transfer
Headers:
Content-Type: application/json
Authorization: Bearer {{jwt_token}}
Body (raw, JSON):
json


{
  "toPhoneNumber": "254123456789", // Another registered user
  "amount": "0.1",
  "tokenType": "native",
  "chain": "mantle"
}


Send Request:
Click “Send”.
Expected Response:
Status: 200 OK
Body:
json


{
  "message": "Transfer successful!",
  "from": "254759280875",
  "to": "254123456789",
  "amount": "0.1",
  "token": "MNT",
  "chain": "mantle",
  "transactionHash": "0x..."
}


Troubleshooting:
404 Recipient Not Found: Ensure the toPhoneNumber matches a registered user.
400 Chain Mismatch: Both sender and recipient must be on "mantle".
Insufficient Funds: Check the sender’s balance.
Step 4: Test transferCrossChain (authController.ts)
Endpoint: POST /api/auth/transfer-cross-chain

Request Setup:
Method: POST
URL: http://localhost:8000/api/auth/transfer-cross-chain
Headers:
Content-Type: application/json
Authorization: Bearer {{jwt_token}}
Body (raw, JSON):
json


{
  "toPhoneNumber": "254123456789",
  "amount": "0.2",
  "tokenType": "native",
  "fromChain": "mantle",
  "toChain": "zksync"
}


Send Request:
Click “Send”.
Expected Response:
Status: 200 OK
Body:
json


{
  "message": "Cross-chain transfer simulated (actual bridging TBD)!",
  "from": "254759280875",
  "to": "254123456789",
  "amount": "0.2",
  "token": "native",
  "fromChain": "mantle",
  "toChain": "zksync",
  "transactionHash": "SIMULATED-CROSS-CHAIN-TX-..."
}
Note: This is a simulation; actual bridging isn’t implemented.
Troubleshooting:
400 Missing Fields: Ensure all required fields are present.
Step 5: Test payBusiness (businessController.ts)
Endpoint: POST /api/business/pay

Request Setup:
Method: POST
URL: http://localhost:8000/api/business/pay
Headers:
Content-Type: application/json
Authorization: Bearer {{jwt_token}}
Body (raw, JSON):
json


{
  "merchantId": "NX-12345", // From a created business
  "amount": "0.05",
  "tokenType": "native",
  "chain": "mantle"
}


Send Request:
Click “Send”.
Expected Response:
Status: 200 OK
Body:
json


{
  "message": "Payment successful!",
  "from": "254759280875",
  "to": "Test Shop",
  "amount": "0.05",
  "token": "MNT",
  "merchantId": "NX-12345",
  "chain": "mantle",
  "transactionHash": "0x..."
}

Troubleshooting:
404 Business Not Found: Verify the merchantId exists.
400 Chain Mismatch: Ensure the user and business are on "mantle".
Step 6: Test transferFundsToPersonal (businessController.ts)
Endpoint: POST /api/business/transfer-to-personal



Request Setup:
Method: POST
URL: http://localhost:8000/api/business/transfer-to-personal
Headers:
Content-Type: application/json
Authorization: Bearer {{jwt_token}}
Body (raw, JSON):
json


{
  "businessId": "<business-id>", // From MongoDB
  "amount": "0.03",
  "tokenType": "native",
  "chain": "mantle",
  "otp": "<otp>" // Generate via /api/business/request-creation first
}


Send Request:
Click “Send”.
Expected Response:
Status: 200 OK
Body:
json


{
  "message": "Funds transferred successfully!",
  "from": "Test Shop",
  "to": "254759280875",
  "amount": "0.03",
  "token": "MNT",
  "chain": "mantle",
  "transactionHash": "0x..."
}
Troubleshooting:
400 Invalid OTP: Request an OTP first via POST /api/business/request-creation.
404 Business Not Found: Verify the businessId.
Step 7: Test getBusinessBalance (businessController.ts)
Endpoint: POST /api/business/balance

Request Setup:
Method: POST
URL: http://localhost:8000/api/business/balance
Headers:
Content-Type: application/json
Authorization: Bearer {{jwt_token}}
Body (raw, JSON):
json


{
  "businessId": "<business-id>",
  "chain": "mantle",
  "tokenType": "native"
}
Send Request:
Click “Send”.
Expected Response:
Status: 200 OK
Body:
json


{
  "message": "Balance retrieved successfully!",
  "businessName": "Test Shop",
  "walletAddress": "0x...",
  "balance": "0.45", // Depends on previous transactions
  "token": "MNT",
  "chain": "mantle"
}
Troubleshooting:
404 Not Found: Check the businessId.