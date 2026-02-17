import { GoogleGenerativeAI } from '@google/generative-ai';
import { GOOGLE_API_KEY } from '$env/static/private';

if (!GOOGLE_API_KEY) {
	throw new Error('Missing GOOGLE_API_KEY in environment variables');
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

export const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
