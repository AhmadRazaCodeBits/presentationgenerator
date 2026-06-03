import mongoose from 'mongoose';

const generationStatSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD
  total: { type: Number, default: 0 },
  templateCounts: { type: Map, of: Number, default: {} },
}, { timestamps: true });

export default mongoose.model('GenerationStat', generationStatSchema);
