import mongoose from 'mongoose';

const splitSchema = new mongoose.Schema(
  {
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
    share: { type: String, required: true }, // stored as string "300.00" to preserve formatting
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [80, 'Title cannot exceed 80 characters'],
    },
    amount: {
      type: String, // stored as string to preserve decimal precision
      required: [true, 'Amount is required'],
    },
    category: {
      type: String,
      enum: ['Travel', 'Food', 'Accommodation', 'Tickets', 'Other'],
      default: 'Other',
    },
    payerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Participant',
      required: [true, 'Payer is required'],
    },
    splitMethod: {
      type: String,
      enum: ['equal', 'custom'],
      default: 'equal',
    },
    splits: [splitSchema],
  },
  { timestamps: true }
);

export default mongoose.model('Expense', expenseSchema);
