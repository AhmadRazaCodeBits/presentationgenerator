import { body, param, validationResult } from 'express-validator';

// Run validation and return errors
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => e.msg);
    return res.status(400).json({ error: messages[0], errors: messages });
  }
  next();
};

export const validateRegister = [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 50 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 50 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidation,
];

export const validateLogin = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation,
];

export const validateContact = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 5000 }),
  handleValidation,
];

export const validateObjectId = [
  param('id').isMongoId().withMessage('Invalid ID'),
  handleValidation,
];

export const validatePresentation = [
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 chars'),
  body('slides').optional().isArray().withMessage('Slides must be an array'),
  body('slides').optional().custom((slides) => {
    if (!Array.isArray(slides)) return true; // other validator will fail
    if (slides.length < 1 || slides.length > 20) {
      throw new Error('Slides must contain between 1 and 20 items');
    }
    return true;
  }),
  handleValidation,
];
