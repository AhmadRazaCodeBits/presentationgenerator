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
    const sanitizedTitle = (presentation.title || 'presentation').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
    const filename = `${sanitizedTitle || 'presentation'}.pptx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    
    return res.send(buffer);
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
    const sanitizedTitle = (presentation.title || 'presentation').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
    const filename = `${sanitizedTitle || 'presentation'}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    
    return res.send(buffer);
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

export const exportPublicPPTX = async (req, res, next) => {
  try {
    const {
      title,
      slides,
      language,
      template,
      description,
      templateData,
      pipelineVersion,
    } = req.body || {};

    if (!title || !Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({ error: 'title and slides are required' });
    }

    // Normalize slides to ensure all required properties exist
    const normalizedSlides = slides.map((slide) => ({
      heading: slide.heading || 'Untitled Slide',
      content: slide.content || '',
      bullets: Array.isArray(slide.bullets) ? slide.bullets.filter(b => b) : [],
      imageUrl: slide.imageUrl || '',
      imageQuery: slide.imageQuery || '',
      notes: slide.notes || '',
      layout: slide.layout || 'content',
      order: slide.order || 0,
      slide_type: slide.slide_type || (slide.layout === 'title' ? 'title' : 'content'),
    }));

    const deck = {
      title,
      slides: normalizedSlides,
      language: language || 'en',
      template: template || 'modern-gradient',
      description: description || '',
      templateData: templateData || null,
      pipelineVersion: Number(pipelineVersion) || 2,
    };

    const buffer = await exportService.generatePPTX(deck);
    const sanitizedTitle = (title || 'presentation').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
    const filename = `${sanitizedTitle || 'presentation'}.pptx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    
    return res.send(buffer);
  } catch (error) {
    console.error('❌ PPTX Export Error:', error.message, error.stack);
    next(error);
  }
};

export const exportPublicPDF = async (req, res, next) => {
  try {
    const {
      title,
      slides,
      language,
      template,
      description,
      templateData,
      pipelineVersion,
    } = req.body || {};

    if (!title || !Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({ error: 'title and slides are required' });
    }

    // Normalize slides to ensure all required properties exist
    const normalizedSlides = slides.map((slide) => ({
      heading: slide.heading || 'Untitled Slide',
      content: slide.content || '',
      bullets: Array.isArray(slide.bullets) ? slide.bullets.filter(b => b) : [],
      imageUrl: slide.imageUrl || '',
      imageQuery: slide.imageQuery || '',
      notes: slide.notes || '',
      layout: slide.layout || 'content',
      order: slide.order || 0,
      slide_type: slide.slide_type || (slide.layout === 'title' ? 'title' : 'content'),
    }));

    const deck = {
      title,
      slides: normalizedSlides,
      language: language || 'en',
      template: template || 'modern-gradient',
      description: description || '',
      templateData: templateData || null,
      pipelineVersion: Number(pipelineVersion) || 2,
    };

    const buffer = await exportService.generatePDF(deck);
    const sanitizedTitle = (title || 'presentation').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
    const filename = `${sanitizedTitle || 'presentation'}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    
    return res.send(buffer);
  } catch (error) {
    console.error('❌ PDF Export Error:', error.message, error.stack);
    next(error);
  }
};
