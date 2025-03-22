import express, { Application, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import bodyParser from 'body-parser';

import authRoutes from './routes/authRoutes';
import businessRoutes from './routes/businessRoutes';
import tokenRoutes from './routes/tokenRoutes';
import usdcRoutes from './routes/usdcRoutes';
import mpesaRoutes from './routes/mpesaRoutes';
import { connect } from './services/database';
import { Verification } from './models/verificationModel';
import { client, africastalking } from './services/auth';
import config from './config/env'; // Add this import

const app: Application = express();
const PORT = process.env.PORT || 8000;

// Security middlewares
app.use(helmet());

// Define allowed origins
const allowedOrigins: string[] = [
  'http://localhost:3000',
  'https://nexuspayapp-snowy.vercel.app',
  'https://app.nexuspayapp.xyz',
];

// CORS middleware
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parser middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Compression middleware
app.use(compression());

// HTTP request logger
app.use(morgan('dev'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Route middlewares
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/token', tokenRoutes);
app.use('/api/usdc', usdcRoutes);
app.use('/api/mpesa', mpesaRoutes);

// Verification routes
app.post('/api/verifications', async (req: Request, res: Response) => {
  try {
    const { providerId, providerName, phoneNumber, proof, verified } = req.body;
    const verification = new Verification({ providerId, providerName, phoneNumber, proof, verified });
    await verification.save();
    res.status(201).send(verification);
  } catch (error: any) {
    console.error('Error creating verification:', error.message);
    res.status(400).send({ message: 'Failed to create verification', details: error.message });
  }
});

app.get('/api/verifications', async (req: Request, res: Response) => {
  try {
    const verifications = await Verification.find();
    res.status(200).send(verifications);
  } catch (error: any) {
    console.error('Error fetching verifications:', error.message);
    res.status(500).send({ message: 'Failed to fetch verifications', details: error.message });
  }
});

// Database connection and server start
connect()
  .then(() => {
    console.log('✅ MongoDB connection established, starting server...');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log('Thirdweb client initialized with secret key:', client ? 'present' : 'missing');
      console.log('Africa\'s Talking initialized:', africastalking.SMS ? 'present' : 'missing');
      console.log('MongoDB URL:', config.MONGO_URL || 'not set in env'); // Updated to config.MONGO_URL
    });
  })
  .catch((err: Error) => {
    console.error('❌ Failed to connect to MongoDB, server not started:', err.message);
    process.exit(1); // Exit if DB connection fails
  });

// 404 Error Handling Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).send({ message: `Route ${req.url} Not found.` });
});

// Global Error Handling Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error:', err.stack);
  res.status(500).send({ message: 'Internal Server Error', details: err.message });
});