import express from 'express';
import Participant from '../models/Participant.js';
import Expense from '../models/Expense.js';

const router = express.Router();

// GET all participants
router.get('/', async (req, res) => {
  try {
    const participants = await Participant.find().sort({ createdAt: 1 });
    res.json(participants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add participant
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Duplicate check (case-insensitive)
    const existing = await Participant.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });
    if (existing) {
      return res.status(409).json({ error: 'Participant already exists' });
    }

    const participant = await Participant.create({ name: name.trim() });
    res.status(201).json(participant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE participant — only if not used in any expense
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if participant is used in any expense
    const usedInExpense = await Expense.findOne({
      $or: [{ payerId: id }, { 'splits.participantId': id }],
    });

    if (usedInExpense) {
      return res.status(400).json({
        error: 'Cannot remove — participant is used in an existing expense',
      });
    }

    await Participant.findByIdAndDelete(id);
    res.json({ message: 'Participant removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
