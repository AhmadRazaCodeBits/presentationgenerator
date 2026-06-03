import express from 'express';
import {
  getMyPresentations, getPresentation, updatePresentation,
  deletePresentation, importPresentation, exportPPTX, exportPDF, getTemplates,
  exportPublicPPTX, exportPublicPDF,
  previewExportPPTX,
  fetchSlideImage, exportToGoogle,
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
router.post('/:id/preview/export/pptx', protect, validateObjectId, previewExportPPTX);
router.post('/:id/slides/:index/fetch-image', protect, validateObjectId, fetchSlideImage);
router.post('/:id/export/google', protect, validateObjectId, exportToGoogle);

export default router;
