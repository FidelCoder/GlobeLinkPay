import { Response } from 'express';

// Error handling function (already updated)
export const handleError = (error: any, res: Response, message: string, statusCode: number = 500): Response => {
  console.error(`Failed to ${message.toLowerCase()} Error:`, error);
  return res.status(statusCode).send({
    error: message,
    details: error.message || 'An unexpected error occurred.',
  });
};

// Delay utility function
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};