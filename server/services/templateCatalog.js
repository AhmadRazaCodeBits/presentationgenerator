const TEMPLATE_CATALOG = [
  {
    template_id: 'business',
    export_template_id: 'business',
    template_name: 'Modern Business Premium',
    description: 'Corporate premium theme from 2Slides with clean lines and sharp executive style.',
    best_for: 'Corporate strategy, stakeholder presentations, quarterly updates',
    visual_style: 'Corporate premium, clean, executive',
    layout_pattern: {
      title_slide: 'full-bleed cover with left-aligned corporate title',
      content_slides: 'side-by-side text and modern visual grids',
      data_slides: 'focused stat-callouts with description cards',
      section_divider: 'bold color block with clean transition lines',
    },
    color_scheme: {
      primary: '#1E3A8A',
      secondary: '#3B82F6',
      accent: '#60A5FA',
      background: '#FFFFFF',
      text: '#1F2937',
    },
    font_style: {
      heading: 'Calibri',
      body: 'Calibri',
    },
    thumbnail_description: 'Royal blue accents with pristine corporate grids.',
    preview_image: 'https://images.pexels.com/photos/3182751/pexels-photo-3182751.jpeg?auto=compress&cs=tinysrgb&w=900',
    master_background_image: '',
  },
  {
    template_id: 'technology',
    export_template_id: 'technology',
    template_name: 'Vibrant Tech Premium',
    description: 'High-energy futuristic design for technology proposals, startup pitches, and modern platforms.',
    best_for: 'Tech startup pitch decks, product launches, developer tools',
    visual_style: 'Futuristic, high-energy, technology-led',
    layout_pattern: {
      title_slide: 'dark tech gradient hero cover',
      content_slides: 'grid structures and alternating visual components',
      data_slides: 'dark-themed charts with high-contrast data series',
      section_divider: 'vibrant tech gradient block',
    },
    color_scheme: {
      primary: '#6F42C1',
      secondary: '#D946EF',
      accent: '#00D2FF',
      background: '#0F0F23',
      text: '#E6E8F2',
    },
    font_style: {
      heading: 'Calibri',
      body: 'Calibri',
    },
    thumbnail_description: 'Deep purple background with neon cyan and magenta accents.',
    preview_image: 'https://images.pexels.com/photos/5716032/pexels-photo-5716032.jpeg?auto=compress&cs=tinysrgb&w=900',
    master_background_image: '',
  },
  {
    template_id: 'creative',
    export_template_id: 'creative',
    template_name: 'Creative Marketing Premium',
    description: 'Energetic and warm color scheme curated for advertising pitches, design agencies, and brand storytelling.',
    best_for: 'Ad campaigns, creative portfolios, brand strategy proposals',
    visual_style: 'Playful, warm, energetic',
    layout_pattern: {
      title_slide: 'warm energetic gradient cover',
      content_slides: 'storytelling layouts with text underneath visuals',
      data_slides: 'stat-callouts with vibrant highlighted values',
      section_divider: 'warm sunset transition block',
    },
    color_scheme: {
      primary: '#FF6B35',
      secondary: '#FF9F1C',
      accent: '#FFD166',
      background: '#FFFAF5',
      text: '#5C3A21',
    },
    font_style: {
      heading: 'Calibri',
      body: 'Calibri',
    },
    thumbnail_description: 'Warm coral and golden accents for expressive layouts.',
    preview_image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=900',
    master_background_image: '',
  },
  {
    template_id: 'minimal',
    export_template_id: 'minimal',
    template_name: 'Minimal Clean Premium',
    description: 'Whitespace-led editorial design focused on premium typography and high scannability.',
    best_for: 'Consulting proposals, design briefs, executive memos',
    visual_style: 'whitespace-heavy, editorial, clean minimal',
    layout_pattern: {
      title_slide: 'monochrome layout with premium focus spacing',
      content_slides: 'crisp vertical typography lists',
      data_slides: 'clean minimal tabular datasets',
      section_divider: 'single thin horizontal rule divider',
    },
    color_scheme: {
      primary: '#111827',
      secondary: '#4B5563',
      accent: '#9CA3AF',
      background: '#FFFFFF',
      text: '#374151',
    },
    font_style: {
      heading: 'Calibri',
      body: 'Calibri',
    },
    thumbnail_description: 'Crisp editorial spacing with strict monochrome borders.',
    preview_image: 'https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=900',
    master_background_image: '',
  },
  {
    template_id: 'professional',
    export_template_id: 'professional',
    template_name: 'Corporate Professional Premium',
    description: 'Balanced trust-based corporate palette for formal boardrooms and internal training programs.',
    best_for: 'Internal training, consulting pitches, operations reporting',
    visual_style: 'Balanced, authoritative, clean',
    layout_pattern: {
      title_slide: 'professional dual-tone background layout',
      content_slides: 'highly structured two-column grids',
      data_slides: 'fully labeled data visualizations',
      section_divider: 'dual-tone section card',
    },
    color_scheme: {
      primary: '#0D6EFD',
      secondary: '#6C757D',
      accent: '#E9ECEF',
      background: '#F8F9FA',
      text: '#212529',
    },
    font_style: {
      heading: 'Calibri',
      body: 'Calibri',
    },
    thumbnail_description: 'Authoritative blue accent lines on premium gray panels.',
    preview_image: 'https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=900',
    master_background_image: '',
  },
];

export function getTemplateCatalog() {
  return TEMPLATE_CATALOG;
}

export function getTemplateById(templateId) {
  return TEMPLATE_CATALOG.find(t => t.template_id === templateId) || null;
}
