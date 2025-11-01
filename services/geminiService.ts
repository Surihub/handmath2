import { GoogleGenAI } from "@google/genai";

// Per guidelines, assume process.env.API_KEY is available in the execution context.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This will now throw a more explicit error on the client side if the key isn't injected by the platform.
  throw new Error("API_KEY is not defined. Please ensure it is set in your environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Converts a handwritten math equation from an image to a LaTeX string using Gemini.
 * @param imageDataUrl The base64-encoded image data URL (e.g., from a canvas).
 * @returns A promise that resolves to the recognized LaTeX string.
 */
export const recognizeHandwriting = async (imageDataUrl: string): Promise<string> => {
  try {
    const base64Data = imageDataUrl.split(',')[1];
    if (!base64Data) {
        throw new Error('Invalid image data URL format.');
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: {
            parts: [
                {
                    text: "당신은 수학 손글씨 인식 전문가입니다. 주어진 수학 손글씨 이미지를 깔끔한 단일 LaTeX 문자열로 변환하는 것이 당신의 임무입니다. 중요: 당신의 출력은 오직 LaTeX 코드만 포함해야 합니다. 어떤 추가적인 설명이나 ```latex ... ```와 같은 마크다운 형식을 절대 포함하지 마세요. 만약 이미지에 인식할 수 있는 수학 수식이 없다면, 빈 문자열을 반환하세요.",
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
    // In case the model still includes markdown fences, remove them.
    return latex.replace(/```latex|```/g, '').trim();

  } catch (error) {
    console.error("Error recognizing handwriting:", error);
    throw new Error("수식 인식에 실패했습니다. 다시 시도해주세요.");
  }
};

/**
 * Gets AI-powered feedback for a given math problem, user solution, and user's memo.
 * @param problemLatex The math problem in LaTeX format.
 * @param userSolutionLatex The user's handwritten solution in LaTeX format.
 * @param userMemo The user's notes or solution attempt.
 * @returns A promise that resolves to the AI's feedback in Markdown format (max 3 sentences).
 */
export const getFeedback = async (problemLatex: string, userSolutionLatex: string, userMemo: string): Promise<string> => {
  try {
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
    
    return response.text;
  } catch (error) {
    console.error("Error getting AI feedback:", error);
    throw new Error("AI 피드백을 생성하는데 실패했습니다. 다시 시도해주세요.");
  }
};