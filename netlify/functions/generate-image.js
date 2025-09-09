// No longer need to require 'node-fetch' as it's available in the modern Netlify runtime.

// Function to convert an image URL to base64
async function imageToMimeAndBase64(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image from ${url}: ${response.statusText}`);
    }
    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    return {
        base64: buffer.toString('base64'),
        mimeType: blob.type
    };
}

exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // --- DEBUGGING STEP ---
    // This check will tell us if the key is being read from Netlify's settings.
    if (!apiKey || apiKey.length < 10) {
        return { 
            statusCode: 500, 
            body: `API key is not configured correctly. The function found an API key with length: ${apiKey ? apiKey.length : 0}. Please verify it in your Netlify site settings.` 
        };
    }
    // --- END DEBUGGING STEP ---
    
    try {
        const { baseImageUrl } = JSON.parse(event.body);
        if (!baseImageUrl) {
            return { statusCode: 400, body: 'Missing baseImageUrl' };
        }
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;
        const artImageUrl = 'https://i.postimg.cc/N06mnCXX/IMG-2_AIzaSy.jpg';

        // Fetch and convert both images to base64
        const artImage = await imageToMimeAndBase64(artImageUrl);
        const hatImage = await imageToMimeAndBase64(baseImageUrl);

        const payload = {
            contents: [{
                parts: [
                    { text: "You are a master product photographer and mockup artist. Your primary goal is to make the turtle art the hero of the image. Place the turtle graphic from the first image onto the blank hat in the second image as a premium, vibrant, and photorealistic screenprinted transfer. The artwork should be the undeniable star of the final product shot. Position the design with precision in the absolute lower right corner of the hat's front panel, right where the panel meets the bill. The lighting must be flawless, making the art pop while casting realistic, subtle shadows on the hat's texture. The final image must be a high-end, commercial-quality product photo that showcases the stunning detail of the art on the hat." },
                    { inlineData: { mimeType: artImage.mimeType, data: artImage.base64 } },
                    { inlineData: { mimeType: hatImage.mimeType, data: hatImage.base64 } }
                ]
            }],
            generationConfig: {
                responseModalities: ['IMAGE']
            },
        };

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error('API Error:', errorBody);
            return { statusCode: apiResponse.status, body: `API request failed: ${errorBody}` };
        }

        const result = await apiResponse.json();
        
        // Return the result to the front-end
        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };

    } catch (error) {
        console.error('Function Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

