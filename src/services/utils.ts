import { Response } from 'express';

export const handleError = (error: any, res: Response, message: string, statusCode: number = 500) => {
    console.error(message, error);
    return res.status(statusCode).send({ error: message, details: error.message });
};

export const delay = async (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};