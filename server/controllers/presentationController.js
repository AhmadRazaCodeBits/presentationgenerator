import Presentation from '../models/Presentation.js';
import exportService from '../services/exportService.js';

export const getMyPresentations = async (req, res, next) => {
  try {
    const presentations = await Presentation.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .select('title language template status createdAt updatedAt slides');
    res.json({ presentations });
  } catch (error) {
    next(error);
  }
};

export const getPresentation = async (req, res, next) => {
  try {
    const presentation = await Presentation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!presentation) {
      return res.status(404).json({ error: 'Presentation not found' });
    }
    res.json({ presentation });
  } catch (error) {
    next(error);
  }
};

export const updatePresentation = async (req, res, next) => {
  try {
    const { title, slides, template, language, description } = req.body;
    const presentation = await Presentation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title, slides, template, language, description, status: 'completed' },
      { new: true, runValidators: true }
    );
    if (!presentation) {
      return res.status(404).json({ error: 'Presentation not found' });
    }
    res.json({ presentation });
  } catch (error) {
    next(error);
  }
};

export const deletePresentation = async (req, res, next) => {
  try {
    const presentation = await Presentation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!presentation) {
      return res.status(404).json({ error: 'Presentation not found' });
    }
    res.json({ message: 'Presentation deleted' });
  } catch (error) {
    next(error);
  }
};

export const importPresentation = async (req, res, next) => {
  try {
    const { title, slides, language, template } = req.body;
    if (!title || !slides || !Array.isArray(slides)) {
      return res.status(400).json({ error: 'Title and slides array are required' });
    }
    const presentation = await Presentation.create({
      userId: req.user._id,
      title,
      slides: slides.map((s, i) => ({
        order: s.order || i + 1,
        heading: s.heading || `Slide ${i + 1}`,
        content: s.content || '',
        bullets: s.bullets || [],
        notes: s.notes || '',
        imageUrl: s.imageUrl || '',
        imageQuery: s.imageQuery || '',
        layout: s.layout || 'content',
      })),
      language: language || 'en',
      template: template || 'modern-gradient',
      status: 'completed',
    });
    res.status(201).json({ presentation });
  } catch (error) {
    next(error);
  }
};

export const exportPPTX = async (req, res, next) => {
  try {
    const presentation = await Presentation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!presentation) {
      return res.status(404).json({ error: 'Presentation not found' });
    }
    const buffer = await exportService.generatePPTX(presentation);
    const filename = `${presentation.title.replace(/[^a-zA-Z0-9]/g, '_')}.pptx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
};

export const exportPDF = async (req, res, next) => {
  try {
    const presentation = await Presentation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!presentation) {
      return res.status(404).json({ error: 'Presentation not found' });
    }
    const buffer = await exportService.generatePDF(presentation);
    const filename = `${presentation.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
};

export const getTemplates = async (req, res, next) => {
  try {
    const templates = exportService.getTemplates();
    res.json({ templates });
  } catch (error) {
    next(error);
  }
};
