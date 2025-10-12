// services/image-resizer.ts
import sharp from 'sharp';

export const handler = async (event: any) => {
  const imageUrl = event.queryStringParameters?.url;
  const width = parseInt(event.queryStringParameters?.w || '400', 10);
  const qualityParam = parseInt(event.queryStringParameters?.q || '85', 10);
  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
  const webpQuality = clamp(isNaN(qualityParam) ? 85 : qualityParam, 50, 95);

  if (!imageUrl) {
    return {
      statusCode: 400,
      body: 'Missing image URL'
    };
  }
  let requestedUrl = imageUrl;
  const siteBase = process.env.SITE_BASE_URL;
  if (siteBase && requestedUrl.startsWith('/')) {
    requestedUrl = siteBase.replace(/\/+$/, '') + requestedUrl;
  }
  if (siteBase && requestedUrl.startsWith('://')) {
    requestedUrl = `https:${requestedUrl}`;
  }

  const allowedHosts = (process.env.ALLOWED_IMAGE_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  if (!allowedHosts.length) {
    allowedHosts.push('airtableusercontent.com');
  }

  let hostname = '';
  try {
    hostname = new URL(requestedUrl).hostname.toLowerCase();
  } catch {
    return {
      statusCode: 400,
      body: 'Invalid image URL'
    };
  }

  const hostAllowed = allowedHosts.some((allowed) =>
    hostname === allowed || hostname.endsWith(`.${allowed}`)
  );

  if (!hostAllowed) {
    return {
      statusCode: 403,
      body: 'Image host not permitted'
    };
  }

  try {
    const response = await fetch(requestedUrl);
    if (!response.ok) throw new Error(`Failed to fetch image`);

    // ⬇️ Standard Fetch API: use arrayBuffer() instead of buffer()
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pipeline = sharp(buffer, { failOn: 'none' }).rotate();

    if (Number.isFinite(width) && width > 0) {
      pipeline.resize(width); // keep existing behaviour
    }

    const resized = await pipeline
      .toFormat('webp', { quality: webpQuality })       // ensure consistent output type
      .toBuffer();

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
