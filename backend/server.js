import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';

// Route imports
import authRoutes from './routes/auth.js';
import propertyRoutes from './routes/properties.js';
import transferRoutes from './routes/transfers.js';
import userRoutes from './routes/users.js';
import statsRoutes from './routes/stats.js';

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json());

// Initialize Database connection
connectDB();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` TerraSecure Land Registry Backend Running `);
  console.log(` Port: ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`==================================================`);
});

export default server;

