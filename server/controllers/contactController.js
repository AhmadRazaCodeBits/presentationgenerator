import Contact from '../models/Contact.js';

export const submitContact = async (req, res, next) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const contact = await Contact.create({ name, email, message });
    res.status(201).json({ message: 'Message sent successfully', id: contact._id });
  } catch (error) {
    next(error);
  }
};
