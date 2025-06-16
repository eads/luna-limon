// services/image-resizer.ts
import sharp from 'sharp';
import fetch from 'node-fetch';

export const handler = async (event: any) => {
  const imageUrl = event.queryStringParameters?.url;
  const width = parseInt(event.queryStringParameters?.w || '400', 10);
  
  if (!imageUrl) {
    return {
      statusCode: 400,
      body: 'Missing image URL'
    };
  }
  
  // Security: Only allow Airtable URLs
  if (!imageUrl.includes('airtableusercontent.com')) {
    return {
      statusCode: 403,
      body: 'Only Airtable images are allowed'
    };
  }
  
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image`);
    
    const buffer = await response.buffer();
    const resized = await sharp(buffer).resize(width).toBuffer();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000'
      },
      body: resized.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: 'Image processing error'
    };
  }
};