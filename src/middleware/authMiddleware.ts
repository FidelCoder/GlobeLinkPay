import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/env';

// Define the expected shape of the JWT payload based on User model
interface JwtPayload {
  _id: string;
  phoneNumber: string;
  walletAddress: string;
  chain?: string; // Optional, added from updated User model
  iat?: number; // Issued at (added by jwt.sign)
  exp?: number; // Expiration (added by jwt.sign)
}

// Extend Express Request type to include user with specific shape
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload; // Strongly typed user object
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer <token>"

  if (!token) {
    return res.status(401).send({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET || 'zero') as JwtPayload;
    req.user = decoded; // Attach decoded payload to req.user with proper typing
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error);
    return res.status(403).send({ 
      message: 'Invalid or expired token',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};