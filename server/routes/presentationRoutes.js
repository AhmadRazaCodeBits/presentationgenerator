import express from 'express';
import {
  getMyPresentations, getPresentation, updatePresentation,
  deletePresentation, importPresentation, exportPPTX, exportPDF, getTemplates,
  exportPublicPPTX, exportPublicPDF,
} from '../controllers/presentationController.js';
import { protect } from '../middleware/auth.js';
import { validateObjectId, validatePresentation } from '../middleware/validate.js';

const router = express.Router();

router.get('/templates', getTemplates);
router.post('/export/public/pptx', exportPublicPPTX);
router.post('/export/public/pdf', exportPublicPDF);
router.get('/', protect, getMyPresentations);
router.get('/:id', protect, validateObjectId, getPresentation);
router.put('/:id', protect, validateObjectId, validatePresentation, updatePresentation);
router.delete('/:id', protect, validateObjectId, deletePresentation);
router.post('/import', protect, validatePresentation, importPresentation);
router.get('/:id/export/pptx', protect, exportPPTX);
router.get('/:id/export/pdf', protect, exportPDF);

export default router;
