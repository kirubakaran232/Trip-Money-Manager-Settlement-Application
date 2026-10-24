import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [40, 'Name cannot exceed 40 characters'],
    },
  },
  { timestamps: true }
);

export default mongoose.model('Participant', participantSchema);
