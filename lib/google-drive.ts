import { google } from 'googleapis';
import { Readable } from 'stream';

// Initialize Google Drive client
const getGoogleDriveClient = () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return google.drive({ version: 'v3', auth });
};

export async function uploadToGoogleDrive(
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string = 'application/pdf'
) {
  try {
    const drive = getGoogleDriveClient();
    
    // Convert buffer to stream
    const stream = Readable.from(fileBuffer);
    
    // Create file metadata
    const fileMetadata = {
      name: fileName,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
    };
    
    // Upload file
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, name, webViewLink',
    });
    
    return {
      success: true,
      fileId: response.data.id,
      fileName: response.data.name,
      webViewLink: response.data.webViewLink,
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function createEmployeeFolder(employeeName: string) {
  try {
    const drive = getGoogleDriveClient();
    
    const fileMetadata = {
      name: `${employeeName} - ${new Date().getFullYear()}`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
    };
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });
    
    return response.data.id;
  } catch (error) {
    console.error('Error creating folder:', error);
    return null;
  }
}