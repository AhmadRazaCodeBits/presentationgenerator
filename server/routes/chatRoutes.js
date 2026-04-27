import express from 'express';
import {
  generateSlides, chatMessage, getChatHistory, getChatById, upload,
  enhanceTopic, suggestTemplates, generatePipelineSlides,
} from '../controllers/chatController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Legacy single-step
router.post('/generate', optionalAuth, upload.single('file'), generateSlides);
router.post('/message', optionalAuth, chatMessage);
router.get('/history', protect, getChatHistory);
router.get('/history/:id', protect, getChatById);

// Pipeline multi-step
router.post('/enhance', optionalAuth, enhanceTopic);
router.post('/suggest-templates', optionalAuth, suggestTemplates);
router.post('/generate-pipeline', optionalAuth, generatePipelineSlides);

export default router;
