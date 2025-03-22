import { Request } from 'express';
import { IUser } from '../models/models';

declare global {
  namespace Express {
    interface Request {
      user?: IUser; // Type matches the User model
    }
  }
}