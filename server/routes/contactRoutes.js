import express from 'express';
import { submitContact } from '../controllers/contactController.js';
import { validateContact } from '../middleware/validate.js';

const router = express.Router();

router.post('/', validateContact, submitContact);

export default router;
