import mongoose from 'mongoose';

const dataVisualSchema = new mongoose.Schema({
  type: { type: String, enum: ['bar-chart', 'pie-chart', 'line-chart', 'stat-callout', 'comparison-table', 'none'], default: 'none' },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  insight_label: { type: String, default: '' },
}, { _id: false });

const designNotesSchema = new mongoose.Schema({
  background_color: { type: String, default: '' },
  text_color: { type: String, default: '' },
  emphasis_word: { type: String, default: '' },
}, { _id: false });

const slideSchema = new mongoose.Schema({
  order: { type: Number, required: true },
  heading: { type: String, required: true },
  content: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  bullets: [{ type: String }],
  notes: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  imageQuery: { type: String, default: '' },
  image_alt: { type: String, default: '' },
  image_position: { type: String, enum: ['left', 'right', 'top', 'bottom', 'background', 'none'], default: 'none' },
  slide_type: { type: String, enum: ['title', 'content', 'data', 'image-focus', 'quote', 'section-divider', 'closing'], default: 'content' },
  layout: {
    type: String,
    enum: [
      'title', 'content', 'image-left', 'image-right', 'two-column', 'bullets', 'quote', 'blank',
      'full-bleed-image', 'image-left-text-right', 'text-left-image-right',
      'top-image-bottom-text', 'icon-grid', 'full-text',
      'chart-left-text-right', 'split-stats', 'section-divider',
    ],
    default: 'content',
  },
  data_visual: { type: dataVisualSchema, default: () => ({}) },
  design_notes: { type: designNotesSchema, default: () => ({}) },
});

function normalizeLayout(layout) {
  if (!layout) return 'content';
  const l = String(layout).toLowerCase().trim();
  const validLayouts = [
    'title', 'content', 'image-left', 'image-right', 'two-column', 'bullets', 'quote', 'blank',
    'full-bleed-image', 'image-left-text-right', 'text-left-image-right',
    'top-image-bottom-text', 'icon-grid', 'full-text',
    'chart-left-text-right', 'split-stats', 'section-divider',
  ];
  if (validLayouts.includes(l)) return l;
  
  if (l === 'title slide') return 'title';
  if (l === 'conclusion layout' || l === 'conclusion' || l === 'closing') return 'content';
  if (l === 'feature grid' || l === 'icon grid') return 'icon-grid';

  const hyphenated = l.replace(/\s+/g, '-');
  if (validLayouts.includes(hyphenated)) return hyphenated;

  const withoutLayoutSuffix = hyphenated.replace(/-layout$/, '').replace(/layout$/, '');
  if (validLayouts.includes(withoutLayoutSuffix)) return withoutLayoutSuffix;

  if (withoutLayoutSuffix === 'two-column') return 'two-column';
  if (withoutLayoutSuffix === 'image-left') return 'image-left';
  if (withoutLayoutSuffix === 'image-right') return 'image-right';
  if (withoutLayoutSuffix === 'statistics') return 'split-stats';
  if (withoutLayoutSuffix === 'comparison') return 'two-column';
  if (withoutLayoutSuffix === 'process-flow') return 'content';
  if (withoutLayoutSuffix === 'swot') return 'icon-grid';
  if (withoutLayoutSuffix === 'pyramid') return 'content';
  if (withoutLayoutSuffix === 'roadmap') return 'content';
  if (withoutLayoutSuffix === 'full-data') return 'full-text';

  return 'content';
}

slideSchema.pre('validate', function(next) {
  if (this.layout) {
    this.layout = normalizeLayout(this.layout);
  }
  next();
});


const templateSchemaObj = new mongoose.Schema({
  template_id: String,
  export_template_id: String,
  template_name: String,
  description: String,
  best_for: String,
  visual_style: String,
  preview_image: String,
  master_background_image: String,
  thumbnail_description: String,
  layout_pattern: { type: mongoose.Schema.Types.Mixed, default: {} },
  color_scheme: {
    primary: { type: String, default: '#6C63FF' },
    secondary: { type: String, default: '#FF6B6B' },
    accent: { type: String, default: '#00D2FF' },
    background: { type: String, default: '#FFFFFF' },
    text: { type: String, default: '#333333' },
  },
  font_style: {
    heading: { type: String, default: 'Calibri' },
    body: { type: String, default: 'Calibri' },
  },
}, { _id: false });

const presentationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  language: { type: String, enum: ['en', 'ur', 'mixed'], default: 'en' },
  template: { type: String, default: 'modern-gradient' },
  templateData: { type: templateSchemaObj, default: null },
  enhancedBrief: { type: mongoose.Schema.Types.Mixed, default: null },
  slides: [slideSchema],
  tags: [{ type: String }],
  isPublic: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'completed', 'archived'], default: 'draft' },
  pipelineVersion: { type: Number, default: 2 },
  twoslidesJobId: { type: String, default: '' },
  twoslidesDownloadUrl: { type: String, default: '' },
  twoslidesFileLocalPath: { type: String, default: '' },
}, { timestamps: true });

// Index for faster queries
presentationSchema.index({ userId: 1, createdAt: -1 });
presentationSchema.index({ title: 'text', tags: 'text' });

export default mongoose.model('Presentation', presentationSchema);
