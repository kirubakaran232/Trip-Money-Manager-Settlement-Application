import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import participantsRouter from './routes/participants.js';
import expensesRouter from './routes/expenses.js';
import transfersRouter from './routes/transfers.js';

import Participant from './models/Participant.js';
import Expense from './models/Expense.js';
import CompletedTransfer from './models/CompletedTransfer.js';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tripsettle';

let dbStatus = 'connecting';
let dbError = null;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'ok',
    db: isConnected ? 'connected' : dbStatus,
    error: dbError,
    uri: MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
  });
});

// Middleware to guard database routes
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: `MongoDB is not connected (${dbStatus}). ${dbError || 'Please ensure the local MongoDB service is running.'}`,
    });
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/participants', participantsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/transfers', transfersRouter);

// Reset to demo data endpoint
app.post('/api/reset', async (req, res) => {
  try {
    await CompletedTransfer.deleteMany({});
    await Expense.deleteMany({});
    await Participant.deleteMany({});

    const [asha, bala, charan] = await Participant.insertMany([
      { name: 'Asha' },
      { name: 'Bala' },
      { name: 'Charan' },
    ]);

    await Expense.insertMany([
      {
        title: 'Group Transportation',
        amount: '900.00',
        category: 'Travel',
        payerId: asha._id,
        splitMethod: 'equal',
        splits: [
          { participantId: asha._id, share: '300.00' },
          { participantId: bala._id, share: '300.00' },
          { participantId: charan._id, share: '300.00' },
        ],
      },
      {
        title: 'Group Meal',
        amount: '300.00',
        category: 'Food',
        payerId: bala._id,
        splitMethod: 'equal',
        splits: [
          { participantId: asha._id, share: '150.00' },
          { participantId: bala._id, share: '150.00' },
        ],
      },
    ]);

    res.json({ message: 'Demo data restored successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DB Connect + Seed ─────────────────────────────────────────
async function seedDemoIfEmpty() {
  const count = await Participant.countDocuments();
  if (count > 0) {
    console.log(`[Seed] DB already has ${count} participant(s) — keeping existing data.`);
    return;
  }

  console.log('[Seed] Empty DB detected — seeding demo data…');

  const [asha, bala, charan] = await Participant.insertMany([
    { name: 'Asha' },
    { name: 'Bala' },
    { name: 'Charan' },
  ]);

  await Expense.insertMany([
    {
      title: 'Group Transportation',
      amount: '900.00',
      category: 'Travel',
      payerId: asha._id,
      splitMethod: 'equal',
      splits: [
        { participantId: asha._id, share: '300.00' },
        { participantId: bala._id, share: '300.00' },
        { participantId: charan._id, share: '300.00' },
      ],
    },
    {
      title: 'Group Meal',
      amount: '300.00',
      category: 'Food',
      payerId: bala._id,
      splitMethod: 'equal',
      splits: [
        { participantId: asha._id, share: '150.00' },
        { participantId: bala._id, share: '150.00' },
      ],
    },
  ]);

  console.log('[Seed] Demo data seeded — Asha, Bala, Charan with 2 expenses.');
}

// Start Express server immediately
app.listen(PORT, () => {
  console.log(`[Server] API running at http://localhost:${PORT}`);
});

// Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    dbStatus = 'connected';
    dbError = null;
    console.log(`[MongoDB] Connected successfully to ${MONGO_URI}`);
    await seedDemoIfEmpty();
  })
  .catch((err) => {
    dbStatus = 'error';
    dbError = err.message;
    console.error('[MongoDB] Connection failed:', err.message);
  });
