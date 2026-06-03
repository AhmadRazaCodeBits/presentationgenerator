import PptxGenJS from 'pptxgenjs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { getTemplateCatalog } from './templateCatalog.js';

// ============================================================================
// PROFESSIONAL TEMPLATES — Rich presentation designs (IMPROVED)
// ============================================================================
const TEMPLATES = {
  'business': {
    name: 'Modern Business Premium',
    titleBg: { fill: { type: 'solid', color: '1E3A8A' } },
    titleBgGrad: { color1: '1E3A8A', color2: '3B82F6', angle: 135 },
    contentBg: 'FFFFFF',
    headingColor: '1E3A8A',
    textColor: '1F2937',
    accentColor: '1E3A8A',
    accent2: '3B82F6',
    footerBg: 'F3F4F6',
    bulletIcon: '▸',
    fontHeading: 'Arial',
    fontBody: 'Segoe UI',
    headingSize: 40,
    bodySize: 13,
    lineHeight: 1.5,
    padding: 0.6,
  },
  'technology': {
    name: 'Vibrant Tech Premium',
    titleBg: { fill: { type: 'solid', color: '0F0F23' } },
    titleBgGrad: { color1: '0F0F23', color2: '6F42C1', angle: 135 },
    contentBg: '0F0F23',
    headingColor: 'FFFFFF',
    textColor: 'E6E8F2',
    accentColor: '6F42C1',
    accent2: 'D946EF',
    footerBg: '16213E',
    bulletIcon: '▹',
    fontHeading: 'Arial',
    fontBody: 'Segoe UI',
    headingSize: 40,
    bodySize: 13,
    lineHeight: 1.5,
    padding: 0.6,
  },
  'creative': {
    name: 'Creative Marketing Premium',
    titleBg: { fill: { type: 'solid', color: 'FF6B35' } },
    titleBgGrad: { color1: 'FF6B35', color2: 'FF9F1C', angle: 135 },
    contentBg: 'FFFAF5',
    headingColor: '5C3A21',
    textColor: '5C3A21',
    accentColor: 'FF6B35',
    accent2: 'FF9F1C',
    footerBg: 'FFFAF5',
    bulletIcon: '▸',
    fontHeading: 'Arial',
    fontBody: 'Segoe UI',
    headingSize: 40,
    bodySize: 13,
    lineHeight: 1.5,
    padding: 0.6,
  },
  'minimal': {
    name: 'Minimal Clean Premium',
    titleBg: { fill: { type: 'solid', color: 'FFFFFF' } },
    titleBgGrad: { color1: 'FFFFFF', color2: 'F3F4F6', angle: 135 },
    contentBg: 'FFFFFF',
    headingColor: '111827',
    textColor: '374151',
    accentColor: '111827',
    accent2: '4B5563',
    footerBg: 'F9FAFB',
    bulletIcon: '▸',
    fontHeading: 'Arial',
    fontBody: 'Segoe UI',
    headingSize: 40,
    bodySize: 13,
    lineHeight: 1.5,
    padding: 0.6,
  },
  'professional': {
    name: 'Corporate Professional Premium',
    titleBg: { fill: { type: 'solid', color: 'F8F9FA' } },
    titleBgGrad: { color1: '0D6EFD', color2: '6C757D', angle: 135 },
    contentBg: 'F8F9FA',
    headingColor: '212529',
    textColor: '212529',
    accentColor: '0D6EFD',
    accent2: '6C757D',
    footerBg: 'E9ECEF',
    bulletIcon: '▸',
    fontHeading: 'Arial',
    fontBody: 'Segoe UI',
    headingSize: 40,
    bodySize: 13,
    lineHeight: 1.5,
    padding: 0.6,
  },
};

class ExportService {
  getTemplates() {
    const catalogMap = new Map(getTemplateCatalog().map(t => [t.export_template_id || t.template_id, t]));

    return Object.entries(TEMPLATES).map(([key, val]) => {
      const catalogTemplate = catalogMap.get(key);
      return {
        id: key,
        name: val.name,
        description: catalogTemplate?.description || '',
        best_for: catalogTemplate?.best_for || '',
        preview_image: catalogTemplate?.preview_image || '',
        thumbnail_description: catalogTemplate?.thumbnail_description || '',
        colors: {
          primary: `#${val.accentColor}`,
          secondary: `#${val.accent2}`,
          bg: `#${val.contentBg}`,
          heading: `#${val.headingColor}`,
        },
      };
    });
  }

  // Build template config from pipeline v2 templateData
  _buildDynamicTemplate(templateData) {
    const cs = templateData?.color_scheme || {};
    const strip = (hex) => (hex || '').replace('#', '');
    return {
      name: templateData?.template_name || 'Custom',
      titleBg: { fill: { type: 'solid', color: strip(cs.primary) || '6C63FF' } },
      titleBgGrad: { color1: strip(cs.primary) || '6C63FF', color2: strip(cs.secondary) || 'FF6B6B', angle: 135 },
      contentBg: strip(cs.background) || 'FFFFFF',
      headingColor: strip(cs.text) || '1E1E2E',
      textColor: strip(cs.text) || '555555',
      accentColor: strip(cs.primary) || '6C63FF',
      accent2: strip(cs.accent) || strip(cs.secondary) || 'FF6B6B',
      footerBg: strip(cs.background) || 'F0F0FF',
      bulletIcon: '▸',
      fontHeading: templateData?.font_style?.heading || 'Arial',
      fontBody: templateData?.font_style?.body || 'Segoe UI',
      headingSize: 40,
      bodySize: 13,
      lineHeight: 1.5,
      padding: 0.6,
    };
  }

  // ============================================================================
  // PPTX GENERATION — Professional PowerPoint
  // ============================================================================
  async generatePPTX(presentation) {
    try {
      const pptx = new PptxGenJS();

      // Validate presentation data
      if (!presentation.slides || !Array.isArray(presentation.slides)) {
        throw new Error('Invalid presentation: slides must be an array');
      }
      if (presentation.slides.length === 0) {
        throw new Error('Invalid presentation: at least one slide is required');
      }

      // Prefer real preset PPTX templates; only use dynamic template when preset id is unknown.
      let t;
      if (presentation.template && TEMPLATES[presentation.template]) {
        t = TEMPLATES[presentation.template];
      } else if (presentation.pipelineVersion === 2 && presentation.templateData) {
        t = this._buildDynamicTemplate(presentation.templateData);
      } else {
        t = TEMPLATES[presentation.template] || TEMPLATES['modern-gradient'];
      }

      // Validate template object
      if (!t || typeof t !== 'object') {
        console.warn('⚠️ Invalid template object, falling back to default');
        t = TEMPLATES['modern-gradient'];
      }

      // Ensure template has required properties with defaults
      t = {
        titleBgGrad: { color1: '6C63FF', color2: 'FF6B6B', angle: 135 },
        contentBg: 'FFFFFF',
        headingColor: '1E1E2E',
        textColor: '555555',
        accentColor: '6C63FF',
        accent2: 'FF6B6B',
        footerBg: 'F0F0FF',
        bulletIcon: '●',
        fontHeading: 'Calibri',
        fontBody: 'Calibri',
        ...t, // Override defaults with actual template values
      };

      const isUrdu = presentation.language === 'ur';
      const font = isUrdu ? 'Arial' : (t.fontHeading || 'Calibri');
      const bodyFont = isUrdu ? 'Arial' : (t.fontBody || 'Calibri');

      pptx.author = 'SlideEdge AI';
      pptx.title = presentation.title || 'Presentation';
      pptx.subject = presentation.description || 'AI Generated Presentation';
      pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches (16:9)

      let masterBackgroundDataUri = null;
      if (t.master_background_image) {
        try {
          const resp = await axios.get(t.master_background_image, { responseType: 'arraybuffer', timeout: 8000 });
          // Optimize master background image
          const optimizedBuffer = await this._optimizeImageBuffer(resp.data);
          const b64 = optimizedBuffer.toString('base64');
          masterBackgroundDataUri = `data:image/jpeg;base64,${b64}`;
          console.log('✅ Fetched and optimized Freepik premium background for PPTX export');
        } catch (err) {
          console.warn('⚠️ Failed to fetch master background image:', err.message);
        }
      }

      for (let i = 0; i < presentation.slides.length; i++) {
        const slideData = presentation.slides[i];
        if (!slideData || typeof slideData !== 'object') {
          console.warn(`⚠️ Skipping invalid slide ${i}: not an object`);
          continue;
        }

        const slide = pptx.addSlide();

        // Fetch image bytes if available (for embedding)
        let imageDataUri = null;
        if (slideData.imageUrl && slideData.imageUrl.startsWith('data:')) {
          imageDataUri = slideData.imageUrl;
        } else if (slideData.imageUrl && slideData.imageUrl.startsWith('http')) {
          try {
            const resp = await axios.get(slideData.imageUrl, { responseType: 'arraybuffer', timeout: 8000 });
            // Optimize image for PPTX: resize, convert to JPEG, compress
            const optimizedBuffer = await this._optimizeImageBuffer(resp.data);
            const b64 = optimizedBuffer.toString('base64');
            imageDataUri = `data:image/jpeg;base64,${b64}`;
          } catch { /* skip image if download fails */ }
        } else if (slideData.imageUrl && slideData.imageUrl.startsWith('/uploads/')) {
          try {
            const localPath = path.join(process.cwd(), 'server', slideData.imageUrl.replace(/^\//, ''));
            if (fs.existsSync(localPath)) {
              const fileBuffer = fs.readFileSync(localPath);
              const optimizedBuffer = await this._optimizeImageBuffer(fileBuffer);
              const b64 = optimizedBuffer.toString('base64');
              imageDataUri = `data:image/jpeg;base64,${b64}`;
            }
          } catch (err) {
            console.warn('⚠️ Failed to read local upload for PPTX:', err.message);
          }
        }

        // Route to the right builder based on layout/slide_type
        const sType = slideData.slide_type || slideData.layout;
        try {
          if (slideData.layout === 'full-bleed-image') {
            this._buildFullBleedImageSlide(slide, imageDataUri);
          } else if (sType === 'title' || slideData.layout === 'title') {
            this._buildTitleSlide(slide, slideData, t, font, bodyFont, isUrdu, imageDataUri, pptx, masterBackgroundDataUri);
          } else if (sType === 'section-divider' || slideData.layout === 'section-divider') {
            this._buildSectionDivider(slide, slideData, t, font, bodyFont, isUrdu, pptx, masterBackgroundDataUri);
          } else if (sType === 'data' || slideData.layout === 'chart-left-text-right' || slideData.layout === 'split-stats') {
            this._buildDataSlide(slide, slideData, t, font, bodyFont, isUrdu, imageDataUri, pptx, i + 1, presentation.slides.length, masterBackgroundDataUri);
          } else {
            this._buildContentSlide(slide, slideData, t, font, bodyFont, isUrdu, imageDataUri, pptx, i + 1, presentation.slides.length, masterBackgroundDataUri);
          }
        } catch (slideErr) {
          console.error(`❌ Error building slide ${i}:`, slideErr.message);
          throw slideErr; // Re-throw to fail the entire export
        }

        if (slideData.notes) {
          slide.addNotes(slideData.notes);
        }
      }

      return await pptx.write({ outputType: 'nodebuffer' });
    } catch (err) {
      console.error('❌ PPTX Generation Error:', err.message);
      throw err; // Re-throw for controller to handle
    }
  }

  // Optimize image with sharp: resize, convert to JPEG, compress
  async _optimizeImageBuffer(buffer) {
    try {
      // Resize to max 1920×1080, convert to JPEG with 85% quality
      const optimized = await sharp(buffer)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
      return optimized;
    } catch (err) {
      console.warn('⚠️ Image optimization failed, using original:', err.message);
      return buffer; // Fall back to original on error
    }
  }

  _addBulletList(slide, bullets, opts) {
    const cleanBullets = (Array.isArray(bullets) ? bullets : [])
      .map(item => String(item || '').trim())
      .filter(Boolean);
    if (cleanBullets.length === 0) return;

    const {
      x, y, w, h, fontFace, fontSize, textColor, accentColor,
      bulletIcon, isUrdu, lineSpacing = 0.55,
    } = opts;
    const rowHeight = Math.min(lineSpacing, h / Math.max(cleanBullets.length, 1));

    cleanBullets.forEach((bullet, idx) => {
      const text = isUrdu ? `${bullet} ${bulletIcon}` : `${bulletIcon} ${bullet}`;
      slide.addText(text, {
        x,
        y: y + idx * rowHeight,
        w,
        h: rowHeight,
        fontSize,
        fontFace,
        color: textColor,
        rtlMode: isUrdu,
        align: isUrdu ? 'right' : 'left',
        fit: 'shrink',
        margin: 0.04,
        breakLine: false,
      });
    });
  }

  _buildFullBleedImageSlide(slide, imgDataUri) {
    if (imgDataUri) {
      try {
        slide.addImage({
          data: imgDataUri,
          x: 0, y: 0, w: '100%', h: '100%',
          sizing: { type: 'cover' },
        });
      } catch (err) {
        console.warn('⚠️ Failed to add full-bleed image to slide:', err.message);
      }
    }
  }

  // --- Title Slide ---
  _buildTitleSlide(slide, data, t, font, bodyFont, isUrdu, imgDataUri, pptx, masterBgDataUri) {
    if (masterBgDataUri) {
      slide.background = { data: masterBgDataUri };
    } else {
      const bgColor = t?.titleBgGrad?.color1 || '6C63FF';
      slide.background = { color: bgColor };
    }

    // Gradient overlay shape (full slide)
    const overlayColor = t?.titleBgGrad?.color2 || 'FF6B6B';
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: '100%',
      fill: { type: 'solid', color: overlayColor, transparency: 60 },
    });

    // Background image if available
    if (imgDataUri) {
      try {
        slide.addImage({
          data: imgDataUri,
          x: 0, y: 0, w: '100%', h: '100%',
          sizing: { type: 'cover' },
          transparency: 70,
        });
      } catch { /* skip broken images */ }
      // Dark overlay for readability
      const darkOverlay = t?.titleBgGrad?.color1 || '6C63FF';
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: '100%', h: '100%',
        fill: { type: 'solid', color: darkOverlay, transparency: 40 },
      });
    }

    // Decorative accent circle (top-right)
    const accentColor2 = t?.accent2 || 'FF6B6B';
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 10.5, y: -1.5, w: 4, h: 4,
      fill: { type: 'solid', color: accentColor2, transparency: 80 },
    });
    // Decorative accent circle (bottom-left)
    slide.addShape(pptx.ShapeType.ellipse, {
      x: -1, y: 5.5, w: 3, h: 3,
      fill: { type: 'solid', color: t.accentColor, transparency: 80 },
    });

    // Main title
    slide.addText(data.heading, {
      x: 1.2, y: 1.8, w: 10.9, h: 2.5,
      fontSize: t?.headingSize || 48, fontFace: font,
      color: 'FFFFFF', bold: true,
      align: isUrdu ? 'right' : 'left',
      rtlMode: isUrdu,
      valign: 'bottom',
      shadow: { type: 'outer', blur: 8, offset: 2, color: '000000', opacity: 0.4 },
      lineSpacingMultiple: 1.2,
    });

    // Subtitle / content
    if (data.content) {
      slide.addText(data.content, {
        x: 1.2, y: 4.5, w: 10.9, h: 1.2,
        fontSize: t?.bodySize || 18, fontFace: bodyFont,
        color: 'E5E7EB', align: isUrdu ? 'right' : 'left',
        rtlMode: isUrdu,
        lineSpacingMultiple: 1.3,
      });
    }

    // Bottom accent line
    const lineColor = t?.accent2 || 'FF6B6B';
    slide.addShape(pptx.ShapeType.rect, {
      x: 1.2, y: 4.2, w: 3, h: 0.08,
      fill: { type: 'solid', color: lineColor },
    });

    // "Powered by" label
    slide.addText('Powered by SlideEdge AI', {
      x: 0, y: 6.8, w: '100%', h: 0.4,
      fontSize: 10, fontFace: bodyFont,
      color: 'C4C7CB', align: 'center',
    });
  }

  // --- Content Slide ---
  _buildContentSlide(slide, data, t, font, bodyFont, isUrdu, imgDataUri, pptx, slideNum, totalSlides, masterBgDataUri) {
    // White/light background
    if (masterBgDataUri) {
      slide.background = { data: masterBgDataUri };
    } else {
      const bgColor = t?.contentBg || 'FFFFFF';
      slide.background = { color: bgColor };
    }

    // Top accent bar (thicker, more prominent)
    const accentColor = t?.accentColor || '6C63FF';
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 0.08,
      fill: { type: 'solid', color: accentColor },
    });

    // Left accent strip (bolder)
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.12, h: '100%',
      fill: { type: 'solid', color: accentColor },
    });

    // Decorative corner shape (top-right) - more visible
    slide.addShape(pptx.ShapeType.rect, {
      x: 12.2, y: 0, w: 1.2, h: 1.0,
      fill: { type: 'solid', color: accentColor, transparency: 85 },
    });

    const normalizedLayout = String(data.layout || '').toLowerCase();
    const isSideBySideLayout = [
      'two column layout',
      'image left layout',
      'image right layout',
      'image-left',
      'image-right',
      'text-left-image-right',
      'image-left-text-right',
      'chart-left-text-right',
      'split-stats',
      'content',
    ].includes(normalizedLayout);
    const imageOnLeft = ['image left layout', 'image-left', 'image-left-text-right'].includes(normalizedLayout);
    const hasImage = !!imgDataUri && isSideBySideLayout;
    const textAreaWidth = hasImage ? 5.8 : 11.2;
    const textAreaX = hasImage && imageOnLeft ? 6.85 : 0.9;

    // Heading with better spacing
    const headingColor = t?.headingColor || '1E1E2E';
    slide.addText(data.heading, {
      x: textAreaX, y: 0.5, w: textAreaWidth, h: 1.0,
      fontSize: t?.headingSize || 32, fontFace: font,
      color: headingColor, bold: true,
      rtlMode: isUrdu,
      align: isUrdu ? 'right' : 'left',
      lineSpacingMultiple: 1.1,
    });

    // Improved heading underline (wider, bolder)
    const underlineColor = t?.accent2 || t?.accentColor || '6C63FF';
    slide.addShape(pptx.ShapeType.rect, {
      x: textAreaX, y: 1.6, w: 2.5, h: 0.08,
      fill: { type: 'solid', color: underlineColor },
    });

    if (hasImage && imgDataUri) {
      const imageX = imageOnLeft ? 0.95 : 8.2;
      const imageBorderX = imageOnLeft ? 1.1 : 8.35;
      const imageText = imageOnLeft ? 6.85 : 0.9;
      const imageTextWidth = imageOnLeft ? 5.8 : 5.8;

      // Content paragraph with better sizing
      let bulletStartY = 2.0;
      if (data.content) {
        const textColor = t?.textColor || '555555';
        slide.addText(data.content, {
          x: imageText, y: 1.8, w: imageTextWidth, h: 0.9,
          fontSize: t?.bodySize || 14, fontFace: bodyFont,
          color: textColor,
          rtlMode: isUrdu,
          align: isUrdu ? 'right' : 'left',
          lineSpacingMultiple: t?.lineHeight || 1.5,
        });
        bulletStartY = 2.9;
      }

      // Bullet points — styled with better spacing
      if (data.bullets && data.bullets.length > 0) {
        const bulletIcon = t?.bulletIcon || '▸';
        const bulletAccentColor = t?.accent2 || t?.accentColor || '6C63FF';
        const bulletTextColor = t?.textColor || '555555';
        this._addBulletList(slide, data.bullets, {
          x: imageText + 0.3, y: bulletStartY, w: imageTextWidth - 0.5, h: 3.8,
          fontFace: bodyFont,
          fontSize: t?.bodySize || 14,
          textColor: bulletTextColor,
          accentColor: bulletAccentColor,
          bulletIcon,
          isUrdu,
        });
      }

      try {
        slide.addImage({
          data: imgDataUri,
          x: imageX, y: 0.8, w: 4.7, h: 3.5,
          rounding: true,
          sizing: { type: 'cover' },
          shadow: { type: 'outer', blur: 10, offset: 3, color: '000000', opacity: 0.2 },
        });
        // Accent border for image (thicker)
        const imgBorderColor = t?.accentColor || '6C63FF';
        slide.addShape(pptx.ShapeType.rect, {
          x: imageBorderX, y: 0.55, w: 4.6, h: 3.5,
          line: { color: imgBorderColor, width: 1.5 },
          fill: { type: 'none' },
          rectRadius: 0.15,
        });
      } catch { /* skip broken images */ }
    } else {
      // Content paragraph with better sizing
      let bulletStartY = 2.0;
      if (data.content) {
        const textColor = t?.textColor || '555555';
        slide.addText(data.content, {
          x: textAreaX, y: 1.8, w: textAreaWidth, h: 0.9,
          fontSize: t?.bodySize || 14, fontFace: bodyFont,
          color: textColor,
          rtlMode: isUrdu,
          align: isUrdu ? 'right' : 'left',
          lineSpacingMultiple: t?.lineHeight || 1.5,
        });
        bulletStartY = 2.9;
      }

      // Bullet points — styled with better spacing
      if (data.bullets && data.bullets.length > 0) {
        const bulletIcon = t?.bulletIcon || '▸';
        const bulletAccentColor = t?.accent2 || t?.accentColor || '6C63FF';
        const bulletTextColor = t?.textColor || '555555';
        this._addBulletList(slide, data.bullets, {
          x: textAreaX + 0.3, y: bulletStartY, w: textAreaWidth - 0.5, h: 3.8,
          fontFace: bodyFont,
          fontSize: t?.bodySize || 14,
          textColor: bulletTextColor,
          accentColor: bulletAccentColor,
          bulletIcon,
          isUrdu,
        });
      }
    }

    // Footer bar
    const footerBg = t?.footerBg || 'F0F0FF';
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 7.0, w: '100%', h: 0.5,
      fill: { type: 'solid', color: footerBg },
    });

    // Slide number with better color
    const footerAccentColor = t?.accent2 || t?.accentColor || '6C63FF';
    slide.addText(`${slideNum} / ${totalSlides}`, {
      x: 11.8, y: 7.05, w: 1.3, h: 0.4,
      fontSize: 11, fontFace: bodyFont,
      color: footerAccentColor, align: 'right',
      bold: true,
    });

    // Footer branding with better styling
    slide.addText('SlideEdge AI', {
      x: 0.5, y: 7.05, w: 3, h: 0.4,
      fontSize: 10, fontFace: bodyFont,
      color: t.headingColor, align: 'left',
      italic: true,
    });
  }

  // --- Section Divider Slide ---
  _buildSectionDivider(slide, data, t, font, bodyFont, isUrdu, pptx, masterBgDataUri) {
    if (masterBgDataUri) {
      slide.background = { data: masterBgDataUri };
    } else {
      const bgColor = t?.accentColor || '6C63FF';
      slide.background = { color: bgColor };
    }

    // Gradient overlay (more subtle)
    const overlayColor = t?.accent2 || 'FF6B6B';
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: '100%',
      fill: { type: 'solid', color: overlayColor, transparency: 65 },
    });

    // Decorative shapes (improved positioning)
    slide.addShape(pptx.ShapeType.ellipse, {
      x: -1.5, y: -1.5, w: 5.5, h: 5.5,
      fill: { type: 'solid', color: 'FFFFFF', transparency: 88 },
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 10.2, y: 4.2, w: 5, h: 5,
      fill: { type: 'solid', color: 'FFFFFF', transparency: 88 },
    });

    // Section title (improved)
    slide.addText(data.heading, {
      x: 1.5, y: 2.2, w: 10.3, h: 2.2,
      fontSize: t?.headingSize || 44, fontFace: font,
      color: 'FFFFFF', bold: true,
      align: isUrdu ? 'right' : 'center',
      rtlMode: isUrdu,
      shadow: { type: 'outer', blur: 8, offset: 2, color: '000000', opacity: 0.3 },
      lineSpacingMultiple: 1.1,
    });

    // Subtitle line
    if (data.subtitle || data.content) {
      slide.addText(data.subtitle || data.content, {
        x: 2, y: 4.5, w: 9.3, h: 1,
        fontSize: 18, fontFace: bodyFont,
        color: 'DDDDEE',
        align: isUrdu ? 'right' : 'center',
        rtlMode: isUrdu,
      });
    }

    // Accent line
    slide.addShape(pptx.ShapeType.rect, {
      x: 5.5, y: 4.2, w: 2.3, h: 0.06,
      fill: { type: 'solid', color: 'FFFFFF', transparency: 40 },
    });
  }

  // --- Data / Stats Slide ---
  _buildDataSlide(slide, data, t, font, bodyFont, isUrdu, imgDataUri, pptx, slideNum, totalSlides, masterBgDataUri) {
    if (masterBgDataUri) {
      slide.background = { data: masterBgDataUri };
    } else {
      const bgColor = t?.contentBg || 'FFFFFF';
      slide.background = { color: bgColor };
    }

    // Top accent bar
    const accentColor = t?.accentColor || '6C63FF';
    const headingColor = t?.headingColor || '1E1E2E';
    
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 0.06,
      fill: { type: 'solid', color: accentColor },
    });

    // Heading
    slide.addText(data.heading, {
      x: 0.8, y: 0.4, w: 11.5, h: 0.9,
      fontSize: 28, fontFace: font,
      color: headingColor, bold: true,
      rtlMode: isUrdu,
      align: isUrdu ? 'right' : 'left',
    });

    // Heading underline
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: 1.25, w: 1.8, h: 0.05,
      fill: { type: 'solid', color: accentColor },
    });

    // Data visual area (left side) or stat callouts
    const dv = data.data_visual || {};
    if (dv.type === 'stat-callout' && dv.data) {
      // Render stat callout boxes
      const stats = Object.entries(dv.data);
      const boxWidth = Math.min(2.8, 11 / Math.max(stats.length, 1));
      stats.forEach(([key, value], idx) => {
        const xPos = 0.8 + idx * (boxWidth + 0.3);
        // Stat box background
        slide.addShape(pptx.ShapeType.rect, {
          x: xPos, y: 1.8, w: boxWidth, h: 2.2,
          fill: { type: 'solid', color: accentColor, transparency: 92 },
          rectRadius: 0.15,
        });
        // Stat value
        slide.addText(String(value), {
          x: xPos, y: 2.0, w: boxWidth, h: 1.2,
          fontSize: 36, fontFace: font,
          color: t.accentColor, bold: true,
          align: 'center', valign: 'middle',
        });
        // Stat label
        slide.addText(key, {
          x: xPos, y: 3.1, w: boxWidth, h: 0.6,
          fontSize: 12, fontFace: bodyFont,
          color: t.textColor, align: 'center',
        });
      });
    }

    // Insight label
    if (dv.insight_label) {
      slide.addText(`💡 ${dv.insight_label}`, {
        x: 0.8, y: 4.3, w: 11.5, h: 0.7,
        fontSize: 14, fontFace: bodyFont,
        color: t.accentColor, italic: true,
        align: isUrdu ? 'right' : 'left',
      });
    }

    // Bullet points below
    if (data.bullets && data.bullets.length > 0) {
      this._addBulletList(slide, data.bullets, {
        x: 1.0, y: 5.0, w: 11.3, h: 1.8,
        fontFace: bodyFont,
        fontSize: 14,
        textColor: t.textColor,
        accentColor: t.accentColor,
        bulletIcon: t.bulletIcon,
        isUrdu,
        lineSpacing: 0.42,
      });
    }

    // Footer
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 7.0, w: '100%', h: 0.5,
      fill: { type: 'solid', color: t.footerBg },
    });
    slide.addText(`${slideNum} / ${totalSlides}`, {
      x: 11.8, y: 7.05, w: 1.3, h: 0.4,
      fontSize: 10, fontFace: bodyFont,
      color: t.accentColor, align: 'right', bold: true,
    });
    slide.addText('SlideEdge AI', {
      x: 0.5, y: 7.05, w: 3, h: 0.4,
      fontSize: 9, fontFace: bodyFont,
      color: t.textColor, align: 'left', italic: true,
    });
  }

  // ============================================================================
  // PDF GENERATION — Professional PDF Export
  // ============================================================================
  async generatePDF(presentation) {
    const pdfDoc = await PDFDocument.create();
    let t;
    if (presentation.pipelineVersion === 2 && presentation.templateData) {
      t = this._buildDynamicTemplate(presentation.templateData);
    } else {
      t = TEMPLATES[presentation.template] || TEMPLATES['modern-gradient'];
    }
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return rgb(r, g, b);
    };

    for (let i = 0; i < presentation.slides.length; i++) {
      const slideData = presentation.slides[i];
      const page = pdfDoc.addPage([960, 540]); // 16:9
      const { width, height } = page.getSize();

      if (slideData.layout === 'title') {
        // Background
        page.drawRectangle({ x: 0, y: 0, width, height, color: hexToRgb(t.titleBgGrad.color1) });
        // Semi-transparent overlay
        page.drawRectangle({ x: 0, y: 0, width, height, color: hexToRgb(t.titleBgGrad.color2), opacity: 0.3 });

        // Decorative circle
        page.drawCircle({ x: width - 80, y: height - 60, size: 120, color: hexToRgb(t.accent2), opacity: 0.15 });
        page.drawCircle({ x: 60, y: 60, size: 80, color: hexToRgb(t.accentColor), opacity: 0.15 });

        // Title
        const titleSize = 36;
        const titleLines = this._wrapText(slideData.heading, boldFont, titleSize, width - 120);
        let yPos = height / 2 + (titleLines.length * titleSize * 0.6) / 2;
        for (const line of titleLines) {
          const tw = boldFont.widthOfTextAtSize(line, titleSize);
          page.drawText(line, {
            x: 60, y: yPos, size: titleSize, font: boldFont, color: rgb(1, 1, 1),
          });
          yPos -= titleSize * 1.3;
        }

        // Accent underline
        page.drawRectangle({ x: 60, y: yPos + 5, width: 100, height: 4, color: hexToRgb(t.accent2) });

        // Subtitle
        if (slideData.content) {
          const subLines = this._wrapText(slideData.content, font, 16, width - 120);
          yPos -= 20;
          for (const line of subLines) {
            page.drawText(line, { x: 60, y: yPos, size: 16, font, color: rgb(0.85, 0.85, 0.9) });
            yPos -= 22;
          }
        }

        // Footer
        page.drawText('Powered by SlideEdge AI', {
          x: width / 2 - 60, y: 20, size: 8, font, color: rgb(0.65, 0.65, 0.7),
        });
      } else {
        // Content slide
        page.drawRectangle({ x: 0, y: 0, width, height, color: hexToRgb(t.contentBg) });

        // Top accent bar
        page.drawRectangle({ x: 0, y: height - 4, width, height: 4, color: hexToRgb(t.accentColor) });
        // Left accent strip
        page.drawRectangle({ x: 0, y: 0, width: 5, height, color: hexToRgb(t.accentColor) });

        // Heading
        const headingSize = 24;
        page.drawText(slideData.heading, {
          x: 40, y: height - 55, size: headingSize, font: boldFont, color: hexToRgb(t.headingColor),
        });

        // Heading underline
        page.drawRectangle({ x: 40, y: height - 65, width: 80, height: 3, color: hexToRgb(t.accentColor) });

        // Content
        let yPos = height - 100;
        if (slideData.content) {
          const contentLines = this._wrapText(slideData.content, font, 13, width - 100);
          for (const line of contentLines) {
            page.drawText(line, { x: 40, y: yPos, size: 13, font, color: hexToRgb(t.textColor) });
            yPos -= 20;
          }
          yPos -= 10;
        }

        // Bullets
        if (slideData.bullets) {
          for (const bullet of slideData.bullets) {
            if (yPos < 50) break;
            // Bullet icon
            page.drawText(t.bulletIcon, {
              x: 50, y: yPos, size: 12, font: boldFont, color: hexToRgb(t.accentColor),
            });
            // Bullet text
            const bulletLines = this._wrapText(bullet, font, 14, width - 120);
            for (const bLine of bulletLines) {
              page.drawText(bLine, { x: 70, y: yPos, size: 14, font, color: hexToRgb(t.textColor) });
              yPos -= 24;
            }
            yPos -= 4;
          }
        }

        // Footer bar
        page.drawRectangle({ x: 0, y: 0, width, height: 28, color: hexToRgb(t.footerBg) });

        // Slide number
        const numStr = `${i + 1} / ${presentation.slides.length}`;
        const numW = font.widthOfTextAtSize(numStr, 9);
        page.drawText(numStr, {
          x: width - numW - 20, y: 10, size: 9, font: boldFont, color: hexToRgb(t.accentColor),
        });

        // Footer branding
        page.drawText('SlideEdge AI', {
          x: 20, y: 10, size: 8, font, color: hexToRgb(t.textColor),
        });
      }
    }

    return await pdfDoc.save();
  }

  _wrapText(text, font, size, maxWidth) {
    if (!text) return [];
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      try {
        const testWidth = font.widthOfTextAtSize(testLine, size);
        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      } catch {
        // If character not supported by font, skip
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }
}

export default new ExportService();
export { TEMPLATES };
