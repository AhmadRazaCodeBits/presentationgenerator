import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure env variables are loaded
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const apiKeys = [
  process.env.TWOSLIDES_API_KEY_1,
  process.env.TWOSLIDES_API_KEY_2
].filter(Boolean);

let activeKeyIndex = 0;

/**
 * Perform a 2Slides API request with automatic key rotation on exhaustion/failure.
 */
async function requestWithKeyRotation(config) {
  if (apiKeys.length === 0) {
    throw new Error('No 2Slides API keys configured. Please add TWOSLIDES_API_KEY_1 and TWOSLIDES_API_KEY_2 to your .env file.');
  }

  let attempts = 0;
  const maxAttempts = apiKeys.length;

  while (attempts < maxAttempts) {
    const apiKey = apiKeys[activeKeyIndex];
    const headers = {
      ...(config.headers || {}),
      'Authorization': `Bearer ${apiKey}`
    };

    try {
      const response = await axios({
        ...config,
        url: `https://2slides.com${config.path}`,
        headers
      });
      return response.data;
    } catch (error) {
      attempts++;
      const status = error.response?.status;
      console.warn(`⚠️ 2Slides request failed with API key index ${activeKeyIndex}. Status: ${status}. Error: ${error.message}`);

      // Rotate on rate limit (429), credit exhaustion (402), unauthorized (401), or server error (500)
      if (status === 401 || status === 402 || status === 429 || status >= 500) {
        activeKeyIndex = (activeKeyIndex + 1) % apiKeys.length;
        console.warn(`🔄 Rotating to 2Slides API key index ${activeKeyIndex}`);
      } else {
        throw error;
      }
    }
  }

  throw new Error(`All configured 2Slides API keys failed after ${attempts} attempts.`);
}

/**
 * Downloads and caches 5 premium templates from 2Slides themes into the server/templates folder.
 */
export async function downloadPremiumTemplates() {
  const templatesDir = path.resolve(__dirname, '..', 'templates');
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
    console.log(`📁 Created templates folder at ${templatesDir}`);
  }

  const keywords = ['business', 'technology', 'creative', 'minimal', 'professional'];
  for (const keyword of keywords) {
    const destPath = path.join(templatesDir, `${keyword}.pptx`);
    if (fs.existsSync(destPath)) {
      console.log(`✅ Premium Template "${keyword}.pptx" is already cached locally.`);
      continue;
    }

    try {
      console.log(`🔍 Searching 2Slides themes for: "${keyword}"`);
      const searchResult = await requestWithKeyRotation({
        method: 'GET',
        path: `/api/v1/themes/search?query=${encodeURIComponent(keyword)}&limit=1`
      });

      const theme = searchResult?.data?.themes?.[0];
      if (theme && theme.themeURL) {
        console.log(`📥 Downloading premium template "${theme.name}" from ${theme.themeURL}`);
        const downloadResponse = await axios.get(theme.themeURL, { responseType: 'arraybuffer', timeout: 20000 });
        fs.writeFileSync(destPath, Buffer.from(downloadResponse.data));
        console.log(`✅ Cached premium template to ${destPath}`);
      } else {
        console.warn(`⚠️ No premium theme found for query: "${keyword}"`);
      }
    } catch (err) {
      console.error(`❌ Failed to cache template for "${keyword}":`, err.message);
    }
  }
}

/**
 * Search themes on 2Slides API and map them to our internal Template Catalog schema.
 */
export async function searchThemes(query, limit = 4) {
  try {
    console.log(`🔍 Querying 2Slides theme search API for: "${query}" (limit: ${limit})`);
    const searchResult = await requestWithKeyRotation({
      method: 'GET',
      path: `/api/v1/themes/search?query=${encodeURIComponent(query)}&limit=${limit}`
    });

    const themes = searchResult?.data?.themes || searchResult?.themes || [];
    if (!Array.isArray(themes) || themes.length === 0) {
      console.log(`⚠️ No themes returned from 2Slides API for query: "${query}"`);
      return [];
    }

    return themes.map(theme => {
      // Safely resolve primary and secondary colors, or fall back to beautiful gradients
      const primaryColor = theme.colors?.primary || theme.primaryColor || '#6F42C1';
      const secondaryColor = theme.colors?.secondary || theme.secondaryColor || '#D946EF';
      const accentColor = theme.colors?.accent || theme.accentColor || '#00D2FF';
      const backgroundColor = theme.colors?.background || theme.backgroundColor || '#0F0F23';
      const textColor = theme.colors?.text || theme.textColor || '#E6E8F2';

      return {
        template_id: `twoslides_${theme.id || theme.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        export_template_id: theme.id || 'business',
        template_name: theme.name || '2Slides Premium Template',
        description: theme.description || `Premium styled layout "${theme.name}" professionally tailored by 2Slides.`,
        best_for: theme.best_for || `Presentations focusing on "${query}" or similar high-impact topics.`,
        visual_style: theme.visual_style || 'Premium, dynamic, sleek',
        layout_pattern: {
          title_slide: 'full-bleed cover layout',
          content_slides: 'dynamic responsive content grids',
          data_slides: 'focused data tables and charts',
          section_divider: 'bold solid color block transitions',
        },
        color_scheme: {
          primary: primaryColor,
          secondary: secondaryColor,
          accent: accentColor,
          background: backgroundColor,
          text: textColor,
        },
        font_style: {
          heading: theme.fonts?.heading || 'Calibri',
          body: theme.fonts?.body || 'Calibri',
        },
        thumbnail_description: theme.thumbnail_description || `${theme.name} premium theme preset.`,
        preview_image: theme.previewImage || theme.preview_image || theme.thumbnailURL || 'https://images.pexels.com/photos/3182751/pexels-photo-3182751.jpeg?auto=compress&cs=tinysrgb&w=900',
        master_background_image: '',
        twoslides_theme_id: theme.id || theme.name
      };
    });
  } catch (error) {
    console.error('❌ Failed to search themes from 2Slides:', error.message);
    return [];
  }
}


/**
 * Main slide generator method calling 2Slides create-pdf-slides endpoint, unzipping pages, and parsing slides.
 */
export async function generateSlides(userInput, chatHistory = [], file = null, options = {}) {
  const slideCount = Number(options.slideCount) || 8;
  const language = String(options.targetLanguage || 'Auto');
  const uploadsDir = path.resolve(__dirname, '..', 'uploads');

  console.log(`🚀 Initiating 2Slides presentation generation for prompt: "${userInput}"`);

  // Enhance prompt matching the chosen visual theme if specified
  let enhancedUserInput = userInput;
  if (options.themeName) {
    enhancedUserInput += `\n\n[Design Style Request: Please style this entire presentation using the visual design, typography, colors, and layout structure of the theme "${options.themeName}".]`;
  }

  // Step 1: Request slide generation job (uses Fast PPT /generate if themeId is provided, otherwise Nano Banana Pro)
  const hasThemeId = !!options.themeId;
  const apiPath = hasThemeId ? '/api/v1/slides/generate' : '/api/v1/slides/create-pdf-slides';

  console.log(`Using 2Slides endpoint: ${apiPath} with themeId: ${options.themeId || 'none'}`);

  const jobResponse = await requestWithKeyRotation({
    method: 'POST',
    path: apiPath,
    data: {
      userInput: enhancedUserInput,
      responseLanguage: language,
      page: slideCount,
      mode: slideCount > 10 ? 'async' : 'sync',
      aspectRatio: '16:9',
      resolution: '2K',
      contentDetail: 'standard',
      themeId: options.themeId || undefined
    }
  });

  if (!jobResponse.success) {
    throw new Error('Failed to create slide generation job on 2Slides.');
  }

  let { jobId, status, downloadUrl } = jobResponse.data || jobResponse;

  // Step 2: Poll job status if processing/pending
  if (status === 'processing' || status === 'pending') {
    console.log(`⏳ Slide generation in progress on 2Slides (Job ID: ${jobId}). Polling status...`);
    const startTime = Date.now();
    const timeoutMs = 180000; // 3 minutes

    while (Date.now() - startTime < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 8000));
      const pollResponse = await requestWithKeyRotation({
        method: 'GET',
        path: `/api/v1/jobs/${jobId}`
      });

      if (pollResponse?.data?.status === 'success') {
        downloadUrl = pollResponse.data.downloadUrl;
        status = 'success';
        console.log(`✅ 2Slides generation job ${jobId} completed successfully.`);
        break;
      } else if (pollResponse?.data?.status === 'failed') {
        throw new Error(`2Slides job ${jobId} failed on the remote server.`);
      }
    }

    if (status !== 'success') {
      throw new Error(`2Slides generation timed out after 3 minutes.`);
    }
  }

  // Step 3: Get the download URL for slide images and transcript ZIP
  console.log(`📥 Requesting ZIP download containing slide pages for job ${jobId}...`);
  const zipResponse = await requestWithKeyRotation({
    method: 'POST',
    path: '/api/v1/slides/download-slides-pages-voices',
    data: { jobId }
  });

  if (!zipResponse.success || !zipResponse.data?.downloadUrl) {
    throw new Error('Failed to retrieve slide pages ZIP download URL from 2Slides.');
  }

  const zipDownloadUrl = zipResponse.data.downloadUrl;

  // Download ZIP locally
  const tempZipPath = path.join(uploadsDir, `twoslides_${jobId}.zip`);
  console.log(`📥 Downloading slide pages ZIP file to ${tempZipPath}...`);
  const zipBuffer = await axios.get(zipDownloadUrl, { responseType: 'arraybuffer', timeout: 30000 });
  fs.writeFileSync(tempZipPath, Buffer.from(zipBuffer.data));

  // Download final PDF locally (the high quality pre-rendered slides file)
  const localPresFilename = `twoslides_${jobId}.pdf`;
  const localPresPath = path.join(uploadsDir, localPresFilename);
  console.log(`📥 Downloading final premium presentation PDF to ${localPresPath}...`);
  const presBuffer = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 30000 });
  fs.writeFileSync(localPresPath, Buffer.from(presBuffer.data));

  // Step 4: Extract ZIP file using PowerShell Expand-Archive
  const destDir = path.join(uploadsDir, `twoslides_${jobId}_extracted`);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  console.log(`📦 Unzipping slide pages to ${destDir}...`);
  const psCommand = `powershell -Command "Expand-Archive -Path '${tempZipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force"`;
  await execPromise(psCommand);

  // Remove temporary ZIP file
  try { fs.unlinkSync(tempZipPath); } catch {}

  // Step 5: Read extracted slide images and transcript
  const pagesDir = path.join(destDir, 'pages');
  let slideImages = [];
  if (fs.existsSync(pagesDir)) {
    slideImages = fs.readdirSync(pagesDir)
      .filter(file => file.endsWith('.png') || file.endsWith('.jpg'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }

  if (slideImages.length === 0) {
    throw new Error('No slide images found in extracted 2Slides ZIP file.');
  }

  // Check if transcript.txt is present
  const transcriptPath = path.join(destDir, 'transcript.txt');
  let speakerNotes = [];
  if (fs.existsSync(transcriptPath)) {
    const rawTranscript = fs.readFileSync(transcriptPath, 'utf-8');
    speakerNotes = rawTranscript.split(/\r?\n\r?\n/).filter(Boolean);
  }

  // Step 6: Map slide images to presentation format
  const slides = slideImages.map((imgName, idx) => {
    return {
      order: idx + 1,
      heading: idx === 0 ? 'Title Slide' : `Slide ${idx + 1}`,
      content: idx === 0 ? userInput : '',
      bullets: [],
      notes: speakerNotes[idx] || '',
      imageUrl: `/uploads/twoslides_${jobId}_extracted/pages/${imgName}`,
      imageQuery: '',
      image_alt: `Rendered presentation slide page ${idx + 1}`,
      image_position: 'background',
      slide_type: idx === 0 ? 'title' : (idx === slideImages.length - 1 ? 'closing' : 'content'),
      layout: 'full-bleed-image',
      data_visual: { type: 'none', data: {}, insight_label: '' },
      design_notes: { background_color: '', text_color: '', emphasis_word: '' }
    };
  });

  return {
    success: true,
    provider: 'twoslides',
    twoslidesJobId: jobId,
    twoslidesFileLocalPath: localPresPath,
    data: {
      title: userInput.substring(0, 50) || '2Slides Presentation',
      language: language === 'ur' ? 'ur' : 'en',
      slides
    }
  };
}

export default {
  generateSlides,
  downloadPremiumTemplates,
  searchThemes
};

