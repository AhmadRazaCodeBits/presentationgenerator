import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const chatHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  presentationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Presentation' },
  title: { type: String, default: 'New Chat' },
  messages: [messageSchema],
}, { timestamps: true });

chatHistorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('ChatHistory', chatHistorySchema);
