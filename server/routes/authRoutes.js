import express from 'express';
import { register, login, getProfile, updateProfile, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validateRegister, validateLogin } from '../middleware/validate.js';

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);

export default router;
