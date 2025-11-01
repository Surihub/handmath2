// api/proxy.ts

import { GoogleGenAI } from "@google/genai";

// This is a Vercel Serverless Function that runs in a Node.js environment.
const API_KEY = process.env.API_KEY;

// Check for API key at startup.
if (!API_KEY) {
  // This log is for the server-side Vercel logs.
  console.error("API_KEY is not configured on the server.");
  // Throwing an error will prevent the function from being deployed/run without a key.
  throw new Error("API_KEY is not configured on the server.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// A generic handler for Vercel's serverless environment.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { type, payload } = req.body;

    if (type === 'recognize') {
        const { imageDataUrl } = payload;
        if (!imageDataUrl) {
            return res.status(400).json({ error: 'imageDataUrl is required for recognition.' });
        }
        const base64Data = imageDataUrl.split(',')[1];
        if (!base64Data) {
            return res.status(400).json({ error: 'Invalid image data URL format.' });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    {
                        text: "주어진 이미지의 수학 손글씨를 분석하여 깔끔한 단일 LaTeX 문자열로 변환해주세요. ```latex ... ``` 와 같은 마크다운 형식이나 다른 설명 없이, 오직 LaTeX 문자열만 출력해야 합니다. 만약 이미지에 인식할 수 있는 수학 수식이 없다면 빈 문자열을 반환하세요.",
                    },
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: base64Data,
                        },
                    },
                ],
            },
        });
        
        const latex = response.text.trim();
        const content = latex.replace(/```latex|```/g, '').trim();
        return res.status(200).json({ content });

    } else if (type === 'feedback') {
        const { problemLatex, userSolutionLatex, userMemo } = payload;
        if (problemLatex === undefined || userSolutionLatex === undefined || userMemo === undefined) {
            return res.status(400).json({ error: 'problemLatex, userSolutionLatex and userMemo are required for feedback.' });
        }
        
        const systemInstruction = `당신은 중고등학생을 위한 친절한 수학 튜터입니다. 학생이 제시한 수학 문제에 대한 학생의 풀이와 생각을 바탕으로, 핵심을 짚어주는 간결한 피드백을 제공해야 합니다. 답변은 반드시 한국어와 마크다운 형식으로, 세 문장 이내로 작성해야 합니다.`;
    
        const userPrompt = `다음 수학 문제에 대한 저의 풀이와 생각입니다. 피드백해주세요.

**문제 (LaTeX):**
${problemLatex}

**나의 풀이 (LaTeX):**
${userSolutionLatex}

**나의 생각 / 질문:**
${userMemo}
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
            },
        });
        
        const content = response.text;
        return res.status(200).json({ content });

    } else {
      return res.status(400).json({ error: 'Invalid request type.' });
    }

  } catch (error: any) {
    console.error('Proxy error:', error);
    const errorMessage = error.message || 'An internal server error occurred.';
    return res.status(500).json({ error: `AI 서비스 요청에 실패했습니다. (${errorMessage})` });
  }
}