import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
    namespace Express {
      interface Request {
        user?: any; // Define the type according to what you store in user
      }
    }
}

const JWT_SECRET = process.env.JWT_SECRET || 'zero'; // Use environment variable for JWT secret

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: "Invalid token" });
            } else if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: "Token expired" });
            } else {
                return res.status(403).json({ message: "Unauthorized access" });
            }
        }
        req.user = user;
        next();
    });
};