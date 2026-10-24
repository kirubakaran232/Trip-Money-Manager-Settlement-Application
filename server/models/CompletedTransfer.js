import mongoose from 'mongoose';

/**
 * Stores which settlement transfer keys have been marked complete.
 * transferKey format: "{fromId}__{toId}__{amountPaise}"
 * We store the full group's completed keys in a single document per "session".
 * A simple array of completed transfer key strings.
 */
const completedTransferSchema = new mongoose.Schema(
  {
    transferKey: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('CompletedTransfer', completedTransferSchema);
