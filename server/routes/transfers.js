import express from 'express';
import CompletedTransfer from '../models/CompletedTransfer.js';

const router = express.Router();

// GET all completed transfer keys
router.get('/', async (req, res) => {
  try {
    const transfers = await CompletedTransfer.find().sort({ createdAt: 1 });
    res.json(transfers.map((t) => t.transferKey));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST mark a transfer as complete (idempotent)
router.post('/', async (req, res) => {
  try {
    const { transferKey } = req.body;
    if (!transferKey) return res.status(400).json({ error: 'transferKey is required' });

    const existing = await CompletedTransfer.findOne({ transferKey });
    if (existing) {
      return res.status(409).json({ error: 'Transfer already marked complete' });
    }

    const transfer = await CompletedTransfer.create({ transferKey });
    res.status(201).json(transfer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE all completed transfers (called when expenses change — plan invalidated)
router.delete('/', async (req, res) => {
  try {
    await CompletedTransfer.deleteMany({});
    res.json({ message: 'All completed transfers cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
