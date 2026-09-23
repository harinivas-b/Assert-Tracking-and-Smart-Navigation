import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/errorHandler';
import v1Routes from './routes/v1';
import { seedDatabase } from './utils/seed';
import { thingspeakService } from './services/thingspeakService';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1', v1Routes);

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
    
    // Automatically seed initial hierarchy and navigation graph
    await seedDatabase(prisma);

    // Initialize ThingSpeak background synchronization
    await thingspeakService.initialize();
    const tsChannelId = process.env.THINGSPEAK_CHANNEL_ID?.trim();
    if (tsChannelId) {
      const pollInterval = parseInt(process.env.THINGSPEAK_POLL_INTERVAL_MS || '15000', 10);
      thingspeakService.startPolling(pollInterval);
    } else {
      console.log('[ThingSpeakService] THINGSPEAK_CHANNEL_ID not yet configured in .env. Automatic polling will activate once configured.');
    }

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { app, prisma };
export default prisma;
