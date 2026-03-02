import { GoogleGenAI } from '@google/genai';

let ai: GoogleGenAI | null = null;

function getAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      ai = new GoogleGenAI({ apiKey });
    }
  }
  return ai;
}

export async function summarizeText(text: string): Promise<string> {
  const aiInstance = getAI();
  if (!aiInstance) return "فشل التلخيص: الذكاء الاصطناعي غير متصل";
  
  try {
    const response = await aiInstance.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `لخص هذا المنشور المحلي في جملة واحدة قصيرة جداً ومفيدة. إذا كان المنشور يتعلق بخدمة أو مهارة، وضح الفائدة منها. المنشور: ${text}`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return response.text || text;
  } catch (e) {
    console.error("Summarization error:", e);
    return "فشل التلخيص";
  }
}

export async function translateText(text: string, targetLang: string = 'ar'): Promise<string> {
  const aiInstance = getAI();
  if (!aiInstance) return "فشل الترجمة: الذكاء الاصطناعي غير متصل";

  try {
    const response = await aiInstance.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate the following text to ${targetLang}. Only return the translation, no extra text. If there are technical terms, ensure they are translated accurately for a local community context: ${text}`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return response.text || text;
  } catch (e) {
    console.error("Translation error:", e);
    return "فشل الترجمة";
  }
}

export async function suggestCategory(text: string): Promise<'skill' | 'resource' | 'general'> {
  const aiInstance = getAI();
  if (!aiInstance) return 'general';

  try {
    const response = await aiInstance.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this community post and categorize it as exactly one of: 'skill' (if offering a service/expertise), 'resource' (if offering a physical item/tool), or 'general' (if it's just news or a question). 
      Post: "${text}"
      Return only the category name in English.`,
    });
    const category = response.text?.toLowerCase().trim();
    if (category?.includes('skill')) return 'skill';
    if (category?.includes('resource')) return 'resource';
    return 'general';
  } catch (e) {
    console.error("Categorization error:", e);
    return 'general';
  }
}
