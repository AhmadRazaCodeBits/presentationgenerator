import PptxGenJS from 'pptxgenjs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import axios from 'axios';
import fs from 'fs';
import { getTemplateCatalog } from './templateCatalog.js';

// ============================================================================
// PROFESSIONAL TEMPLATES — Rich presentation designs
// ============================================================================
const TEMPLATES = {
  'modern-gradient': {
    name: 'Modern Gradient',
    titleBg: { fill: { type: 'solid', color: '6C63FF' } },
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
  },
  'dark-professional': {
    name: 'Dark Professional',
    titleBg: { fill: { type: 'solid', color: '1a1a2e' } },
    titleBgGrad: { color1: '1a1a2e', color2: '16213e', angle: 135 },
    contentBg: '0f0f23',
    headingColor: 'FFFFFF',
    textColor: 'a0a0c0',
    accentColor: 'e94560',
    accent2: 'ff6b81',
    footerBg: '0a0a18',
    bulletIcon: '▸',
    fontHeading: 'Calibri',
    fontBody: 'Calibri',
  },
  'ocean-breeze': {
    name: 'Ocean Breeze',
    titleBg: { fill: { type: 'solid', color: '0077b6' } },
    titleBgGrad: { color1: '0077b6', color2: '00b4d8', angle: 135 },
    contentBg: 'f0f9ff',
    headingColor: '023e8a',
    textColor: '444444',
    accentColor: '0077b6',
    accent2: '00b4d8',
    footerBg: 'e3f2fd',
    bulletIcon: '◆',
    fontHeading: 'Calibri',
    fontBody: 'Calibri',
  },
  'sunset-warm': {
    name: 'Sunset Warm',
    titleBg: { fill: { type: 'solid', color: 'ff6b35' } },
    titleBgGrad: { color1: 'ff6b35', color2: 'ff9f1c', angle: 135 },
    contentBg: 'fffaf5',
    headingColor: 'c44900',
    textColor: '555555',
    accentColor: 'ff6b35',
    accent2: 'ff9f1c',
    footerBg: 'fff0e0',
    bulletIcon: '✦',
    fontHeading: 'Calibri',
    fontBody: 'Calibri',
  },
  'emerald-nature': {
    name: 'Emerald Nature',
    titleBg: { fill: { type: 'solid', color: '2d6a4f' } },
    titleBgGrad: { color1: '2d6a4f', color2: '52b788', angle: 135 },
    contentBg: 'f0faf4',
    headingColor: '1b4332',
    textColor: '444444',
    accentColor: '2d6a4f',
    accent2: '52b788',
    footerBg: 'e8f5ec',
    bulletIcon: '●',
    fontHeading: 'Calibri',
    fontBody: 'Calibri',
  },
  'minimal-clean': {
    name: 'Minimal Clean',
    titleBg: { fill: { type: 'solid', color: '0d6efd' } },
    titleBgGrad: { color1: '0d6efd', color2: '6f42c1', angle: 135 },
    contentBg: 'FFFFFF',
    headingColor: '212529',
    textColor: '6c757d',
    accentColor: '0d6efd',
    accent2: '6f42c1',
    footerBg: 'f8f9fa',
    bulletIcon: '—',
    fontHeading: 'Calibri',
    fontBody: 'Calibri',
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
      bulletIcon: '●',
      fontHeading: templateData?.font_style?.heading || 'Calibri',
      fontBody: templateData?.font_style?.body || 'Calibri',
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
          const b64 = Buffer.from(resp.data).toString('base64');
          const mime = resp.headers['content-type'] || 'image/jpeg';
          masterBackgroundDataUri = `data:${mime};base64,${b64}`;
          console.log('✅ Fetched Freepik premium background for PPTX export');
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
            const b64 = Buffer.from(resp.data).toString('base64');
            const mime = resp.headers['content-type'] || 'image/jpeg';
            imageDataUri = `data:${mime};base64,${b64}`;
          } catch { /* skip image if download fails */ }
        }

        // Route to the right builder based on layout/slide_type
        const sType = slideData.slide_type || slideData.layout;
        try {
          if (sType === 'title' || slideData.layout === 'title' || slideData.layout === 'full-bleed-image') {
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

  // --- Title Slide ---
  _buildTitleSlide(slide, data, t, font, bodyFont, isUrdu, imgDataUri, pptx, masterBgDataUri) {
    if (masterBgDataUri) {
      slide.background = { data: masterBgDataUri };
    } else {
      const bgColor = t?.titleBgGrad?.color1 || '6C63FF';
      slide.background = { fill: { type: 'solid', color: bgColor } };
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
      fontSize: 44, fontFace: font,
      color: 'FFFFFF', bold: true,
      align: isUrdu ? 'right' : 'left',
      rtlMode: isUrdu,
      valign: 'bottom',
      shadow: { type: 'outer', blur: 6, offset: 2, color: '000000', opacity: 0.3 },
    });

    // Subtitle / content
    if (data.content) {
      slide.addText(data.content, {
        x: 1.2, y: 4.5, w: 10.9, h: 1.2,
        fontSize: 20, fontFace: bodyFont,
        color: 'DDDDEE', align: isUrdu ? 'right' : 'left',
        rtlMode: isUrdu,
      });
    }

    // Bottom accent line
    const lineColor = t?.accent2 || 'FF6B6B';
    slide.addShape(pptx.ShapeType.rect, {
      x: 1.2, y: 4.2, w: 2.5, h: 0.06,
      fill: { type: 'solid', color: lineColor },
    });

    // "Powered by" label
    slide.addText('Powered by SlideEdge AI', {
      x: 0, y: 6.8, w: '100%', h: 0.4,
      fontSize: 9, fontFace: bodyFont,
      color: 'AAAACC', align: 'center',
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

    // Top accent bar
    const accentColor = t?.accentColor || '6C63FF';
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 0.06,
      fill: { type: 'solid', color: accentColor },
    });

    // Left accent strip
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.08, h: '100%',
      fill: { type: 'solid', color: accentColor },
    });

    // Decorative corner shape (top-right)
    slide.addShape(pptx.ShapeType.rect, {
      x: 12.2, y: 0, w: 1.2, h: 0.8,
      fill: { type: 'solid', color: accentColor, transparency: 90 },
      rectRadius: 0,
    });

    const hasImage = imgDataUri && (data.layout === 'image-right' || data.layout === 'image-left' || data.layout === 'content');
    const textAreaWidth = hasImage ? 7.2 : 11.5;
    const textAreaX = 0.8;

    // Heading with accent underline
    const headingColor = t?.headingColor || '1E1E2E';
    slide.addText(data.heading, {
      x: textAreaX, y: 0.4, w: textAreaWidth, h: 0.9,
      fontSize: 30, fontFace: font,
      color: headingColor, bold: true,
      rtlMode: isUrdu,
      align: isUrdu ? 'right' : 'left',
    });

    // Heading underline
    const underlineColor = t?.accentColor || '6C63FF';
    slide.addShape(pptx.ShapeType.rect, {
      x: textAreaX, y: 1.25, w: 1.8, h: 0.05,
      fill: { type: 'solid', color: underlineColor },
    });

    // Content paragraph
    let bulletStartY = 1.6;
    if (data.content) {
      const textColor = t?.textColor || '555555';
      slide.addText(data.content, {
        x: textAreaX, y: 1.5, w: textAreaWidth, h: 1.0,
        fontSize: 14, fontFace: bodyFont,
        color: textColor,
        rtlMode: isUrdu,
        align: isUrdu ? 'right' : 'left',
        lineSpacingMultiple: 1.4,
      });
      bulletStartY = 2.6;
    }

    // Bullet points — styled with icons
    if (data.bullets && data.bullets.length > 0) {
      const bulletIcon = t?.bulletIcon || '●';
      const bulletAccentColor = t?.accentColor || '6C63FF';
      const bulletTextColor = t?.textColor || '555555';
      const bulletRows = data.bullets.map((b, idx) => ([
        {
          text: `${bulletIcon} `,
          options: {
            fontSize: 15, fontFace: bodyFont,
            color: bulletAccentColor, bold: true,
          },
        },
        {
          text: b,
          options: {
            fontSize: 15, fontFace: bodyFont,
            color: bulletTextColor, breakLine: true,
          },
        },
      ]));

      slide.addText(bulletRows, {
        x: textAreaX + 0.2, y: bulletStartY, w: textAreaWidth - 0.4, h: 4.2,
        valign: 'top',
        rtlMode: isUrdu,
        lineSpacingMultiple: 1.8,
        paraSpaceAfter: 8,
      });
    }

    // Image on the right side
    if (hasImage && imgDataUri) {
      try {
        slide.addImage({
          data: imgDataUri,
          x: 8.4, y: 0.6, w: 4.5, h: 3.4,
          rounding: true,
          sizing: { type: 'cover' },
          shadow: { type: 'outer', blur: 8, offset: 3, color: '000000', opacity: 0.15 },
        });
        // Accent border for image
        const imgBorderColor = t?.accentColor || '6C63FF';
        slide.addShape(pptx.ShapeType.rect, {
          x: 8.35, y: 0.55, w: 4.6, h: 3.5,
          line: { color: imgBorderColor, width: 1.5 },
          fill: { type: 'none' },
          rectRadius: 0.15,
        });
      } catch { /* skip broken images */ }
    }

    // Footer bar
    const footerBg = t?.footerBg || 'F0F0FF';
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 7.0, w: '100%', h: 0.5,
      fill: { type: 'solid', color: footerBg },
    });

    // Slide number
    const footerAccentColor = t?.accentColor || '6C63FF';
    slide.addText(`${slideNum} / ${totalSlides}`, {
      x: 11.8, y: 7.05, w: 1.3, h: 0.4,
      fontSize: 10, fontFace: bodyFont,
      color: footerAccentColor, align: 'right',
      bold: true,
    });

    // Footer branding
    slide.addText('SlideEdge AI', {
      x: 0.5, y: 7.05, w: 3, h: 0.4,
      fontSize: 9, fontFace: bodyFont,
      color: t.textColor, align: 'left',
      italic: true,
    });
  }

  // --- Section Divider Slide ---
  _buildSectionDivider(slide, data, t, font, bodyFont, isUrdu, pptx, masterBgDataUri) {
    if (masterBgDataUri) {
      slide.background = { data: masterBgDataUri };
    } else {
      const bgColor = t?.accentColor || '6C63FF';
      slide.background = { fill: { type: 'solid', color: bgColor } };
    }

    // Gradient overlay
    const overlayColor = t?.accent2 || 'FF6B6B';
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: '100%',
      fill: { type: 'solid', color: overlayColor, transparency: 70 },
    });

    // Decorative shapes
    slide.addShape(pptx.ShapeType.ellipse, {
      x: -2, y: -2, w: 6, h: 6,
      fill: { type: 'solid', color: 'FFFFFF', transparency: 92 },
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 10, y: 4, w: 5, h: 5,
      fill: { type: 'solid', color: 'FFFFFF', transparency: 92 },
    });

    // Section title
    slide.addText(data.heading, {
      x: 1.5, y: 2.4, w: 10.3, h: 2,
      fontSize: 40, fontFace: font,
      color: 'FFFFFF', bold: true,
      align: isUrdu ? 'right' : 'center',
      rtlMode: isUrdu,
      shadow: { type: 'outer', blur: 6, offset: 2, color: '000000', opacity: 0.2 },
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
      const bulletRows = data.bullets.map(b => ([
        { text: `${t.bulletIcon} `, options: { fontSize: 14, fontFace: bodyFont, color: t.accentColor, bold: true } },
        { text: b, options: { fontSize: 14, fontFace: bodyFont, color: t.textColor, breakLine: true } },
      ]));
      slide.addText(bulletRows, {
        x: 1.0, y: 5.0, w: 11.3, h: 1.8,
        valign: 'top', rtlMode: isUrdu,
        lineSpacingMultiple: 1.6,
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
