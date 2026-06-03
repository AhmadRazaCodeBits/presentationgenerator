import { google } from 'googleapis';
import stream from 'stream';

function _getAuthClient() {
  // Accept either full service account JSON via GOOGLE_SERVICE_ACCOUNT_KEY
  // or individual env vars GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY
  let key = null;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    } catch (err) {
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY JSON');
    }
  } else if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    key = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  if (!key || !key.client_email || !key.private_key) {
    throw new Error('Google service account credentials not configured in environment');
  }

  const jwt = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
  });
  return jwt;
}

async function uploadPptxAsGoogleSlides(buffer, filename = 'presentation.pptx') {
  const auth = _getAuthClient();
  await auth.authorize();
  const drive = google.drive({ version: 'v3', auth });

  // Convert buffer to a readable stream
  const bufferStream = new stream.PassThrough();
  bufferStream.end(Buffer.from(buffer));

  try {
    const res = await drive.files.create({
      requestBody: {
        name: filename.replace(/\.[^.]+$/, '') || 'presentation',
        mimeType: 'application/vnd.google-apps.presentation',
      },
      media: {
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        body: bufferStream,
      },
      supportsAllDrives: true,
      fields: 'id, webViewLink, webContentLink',
    });

    return { id: res.data.id, webViewLink: res.data.webViewLink, webContentLink: res.data.webContentLink };
  } catch (err) {
    throw new Error(`Google Drive upload failed: ${err.message}`);
  }
}

export default { uploadPptxAsGoogleSlides };
