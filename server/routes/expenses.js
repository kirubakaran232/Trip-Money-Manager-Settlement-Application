import express from 'express';
import Expense from '../models/Expense.js';
import CompletedTransfer from '../models/CompletedTransfer.js';

const router = express.Router();

// GET all expenses
router.get('/', async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ createdAt: 1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create expense
router.post('/', async (req, res) => {
  try {
    const { title, amount, category, payerId, splitMethod, splits } = req.body;

    // Basic validation
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
      return res.status(400).json({ error: 'Valid positive amount is required' });
    if (!payerId) return res.status(400).json({ error: 'Payer is required' });
    if (!splits || splits.length === 0)
      return res.status(400).json({ error: 'At least one beneficiary required' });

    // Validate custom split totals match
    if (splitMethod === 'custom') {
      const totalPaise = Math.round(parseFloat(amount) * 100);
      const splitTotal = splits.reduce(
        (sum, s) => sum + Math.round(parseFloat(s.share) * 100),
        0
      );
      if (splitTotal !== totalPaise) {
        return res.status(400).json({
          error: `Custom shares (₹${(splitTotal / 100).toFixed(2)}) do not match expense amount (₹${parseFloat(amount).toFixed(2)})`,
        });
      }
    }

    const expense = await Expense.create({
      title: title.trim(),
      amount: parseFloat(amount).toFixed(2),
      category,
      payerId,
      splitMethod,
      splits,
    });

    // When a new expense is added, clear completed transfers (settlement plan invalidated)
    await CompletedTransfer.deleteMany({});

    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update expense
router.put('/:id', async (req, res) => {
  try {
    const { title, amount, category, payerId, splitMethod, splits } = req.body;

    if (splitMethod === 'custom') {
      const totalPaise = Math.round(parseFloat(amount) * 100);
      const splitTotal = splits.reduce(
        (sum, s) => sum + Math.round(parseFloat(s.share) * 100),
        0
      );
      if (splitTotal !== totalPaise) {
        return res.status(400).json({ error: 'Custom shares do not match expense amount' });
      }
    }

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        title: title.trim(),
        amount: parseFloat(amount).toFixed(2),
        category,
        payerId,
        splitMethod,
        splits,
      },
      { new: true, runValidators: true }
    );

    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    // Invalidate settlement plan
    await CompletedTransfer.deleteMany({});

    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE expense
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    // Invalidate settlement plan
    await CompletedTransfer.deleteMany({});

    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
