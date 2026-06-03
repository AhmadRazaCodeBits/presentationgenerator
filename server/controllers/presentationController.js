import Presentation from '../models/Presentation.js';
import exportService from '../services/exportService.js';
import googleSlidesService from '../services/googleSlidesService.js';
import presentationPipeline from '../services/presentationPipeline.js';
import fs from 'fs';
import path from 'path';

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
    const { title, slides, template, templateData, language, description } = req.body;
    const presentation = await Presentation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title, slides, template, templateData, language, description, status: 'completed' },
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
    const { title, slides, language, template, templateData } = req.body;
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
      templateData: templateData || null,
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

    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedTitle = (presentation.title || 'presentation')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase()
      .substring(0, 80);
    const filename = `${sanitizedTitle || 'presentation'}_${timestamp}.pptx`;

    if (presentation.twoslidesFileLocalPath && presentation.twoslidesFileLocalPath.endsWith('.pptx') && fs.existsSync(presentation.twoslidesFileLocalPath)) {
      const buffer = fs.readFileSync(presentation.twoslidesFileLocalPath);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      return res.send(buffer);
    }

    const buffer = await exportService.generatePPTX(presentation);
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

    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedTitle = (presentation.title || 'presentation')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase()
      .substring(0, 80);
    const filename = `${sanitizedTitle || 'presentation'}_${timestamp}.pdf`;

    if (presentation.twoslidesFileLocalPath && fs.existsSync(presentation.twoslidesFileLocalPath)) {
      const buffer = fs.readFileSync(presentation.twoslidesFileLocalPath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      return res.send(buffer);
    }

    const buffer = await exportService.generatePDF(presentation);
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

    if (slides.length > 20) {
      return res.status(413).json({ error: 'Presentation too large: maximum 20 slides allowed' });
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
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedTitle = (title || 'presentation')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase()
      .substring(0, 80);
    const filename = `${sanitizedTitle || 'presentation'}_${timestamp}.pptx`;
    
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

    if (slides.length > 20) {
      return res.status(413).json({ error: 'Presentation too large: maximum 20 slides allowed' });
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
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedTitle = (title || 'presentation')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase()
      .substring(0, 80);
    const filename = `${sanitizedTitle || 'presentation'}_${timestamp}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    
    return res.send(buffer);
  } catch (error) {
    console.error('❌ PDF Export Error:', error.message, error.stack);
    next(error);
  }
};

export const previewExportPPTX = async (req, res, next) => {
  try {
    const presentation = await Presentation.findOne({ _id: req.params.id, userId: req.user._id });
    if (!presentation) return res.status(404).json({ error: 'Presentation not found' });

    const { templateData } = req.body || {};

    const deck = {
      title: presentation.title || 'presentation',
      slides: presentation.slides || [],
      language: presentation.language || 'en',
      template: presentation.template || 'modern-gradient',
      description: presentation.description || '',
      templateData: templateData || presentation.templateData || null,
      pipelineVersion: presentation.pipelineVersion || 2,
    };

    const buffer = await exportService.generatePPTX(deck);
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedTitle = (presentation.title || 'presentation')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase()
      .substring(0, 80);
    const filename = `${sanitizedTitle || 'presentation'}_preview_${timestamp}.pptx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);

    return res.send(buffer);
  } catch (error) {
    console.error('❌ Preview PPTX Export Error:', error.message, error.stack);
    next(error);
  }
};

export const exportToGoogle = async (req, res, next) => {
  try {
    const presentation = await Presentation.findOne({ _id: req.params.id, userId: req.user._id });
    if (!presentation) return res.status(404).json({ error: 'Presentation not found' });

    const buffer = await exportService.generatePPTX(presentation);
    const filename = `${(presentation.title || 'presentation').replace(/[^a-zA-Z0-9]/g, '_')}.pptx`;

    const result = await googleSlidesService.uploadPptxAsGoogleSlides(buffer, filename);
    res.json({ success: true, google: result });
  } catch (error) {
    console.error('❌ Export to Google failed:', error.message);
    res.status(500).json({ error: `Export failed: ${error.message}` });
  }
};

export const fetchSlideImage = async (req, res, next) => {
  try {
    const { id, index } = req.params;
    const slideIdx = Number(index) - 1;
    const presentation = await Presentation.findOne({ _id: id, userId: req.user._id });
    if (!presentation) return res.status(404).json({ error: 'Presentation not found' });
    if (!presentation.slides || !presentation.slides[slideIdx]) return res.status(404).json({ error: 'Slide not found' });

    const slide = presentation.slides[slideIdx];
    // Prepare a minimal slide object for the pipeline
    const slideInput = [{
      slideNumber: slide.order || slideIdx + 1,
      layout: slide.layout || 'content',
      imageQuery: slide.imageQuery || slide.image_prompt || '',
      image_prompt: slide.image_prompt || slide.imageQuery || '',
      image_position: slide.image_position || 'right',
    }];

    const [resultSlide] = await presentationPipeline.generateSlideImages(slideInput);

    // Update presentation slide with returned imageUrl and refined prompt
    presentation.slides[slideIdx].imageUrl = resultSlide.imageUrl || presentation.slides[slideIdx].imageUrl;
    presentation.slides[slideIdx].imageQuery = resultSlide.image_prompt || presentation.slides[slideIdx].imageQuery || resultSlide.refined_image_prompt || '';
    presentation.slides[slideIdx].image_prompt = resultSlide.image_prompt || presentation.slides[slideIdx].image_prompt || resultSlide.refined_image_prompt || '';
    presentation.slides[slideIdx].image_alt = resultSlide.image_alt || presentation.slides[slideIdx].image_alt || '';

    await presentation.save();

    res.json({ success: true, slide: presentation.slides[slideIdx] });
  } catch (error) {
    console.error('❌ Fetch slide image failed:', error.message);
    next(error);
  }
};
