import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/env';

declare global {
  namespace Express {
    interface Request {
      user?: any; // Define the type according to what you store in user
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
    const decoded = jwt.verify(token, config.JWT_SECRET || 'zero');
    req.user = decoded as any; // Add decoded payload to req.user
    next();
  } catch (error) {
    return res.status(403).send({ message: 'Invalid or expired token' });
  }
};