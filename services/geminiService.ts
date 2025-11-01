
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Converts a handwritten math equation from an image to a LaTeX string.
 * @param imageDataUrl The base64-encoded image data URL (e.g., from a canvas).
 * @returns A promise that resolves to the recognized LaTeX string.
 */
export const recognizeHandwriting = async (imageDataUrl: string): Promise<string> => {
  try {
    const base64Data = imageDataUrl.split(',')[1];
    if (!base64Data) {
      throw new Error("Invalid image data URL format.");
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
    // A simple heuristic to clean up potential markdown fences that might still slip through
    return latex.replace(/```latex|```/g, '').trim();
  } catch (error) {
    console.error("Error recognizing handwriting:", error);
    throw new Error("Failed to recognize the equation. Please try again.");
  }
};

/**
 * Gets AI-powered feedback on a user's solution to a math problem.
 * @param problemLatex The math problem in LaTeX format.
 * @param userSolution The user's provided solution.
 * @returns A promise that resolves to the AI's feedback in Markdown format.
 */
export const getFeedback = async (problemLatex: string, userSolution: string): Promise<string> => {
  try {
    const systemInstruction = `당신은 중고등학생을 위한 전문적이고 친절한 수학 교사입니다. 학생의 문제 풀이 과정에 대해 건설적이고, 격려가 되며, 이해하기 쉬운 피드백을 제공하는 것이 목표입니다. 답변은 반드시 마크다운 형식으로 작성해야 합니다.`;
    
    const userPrompt = `다음 수학 문제와 학생의 풀이를 분석해주세요.

**문제 (LaTeX):**
${problemLatex}

**학생의 풀이:**
${userSolution}

다음과 같은 구조로 피드백을 제공해주세요:
1.  **총평:** 학생의 풀이에 대한 간결하고 격려가 되는 요약.
2.  **단계별 분석:** 구체적인 계산 실수나 논리적 오류를 지적해주세요. 풀이가 맞았다면, 정확하다고 확인해주고 칭찬해주세요.
3.  **다른 접근법:** 가능하다면, 문제를 풀 수 있는 다른 유효한 방법을 제안해주세요.
4.  **다음 도전 과제:** 학생의 이해를 돕기 위해, 유사한 새로운 연습 문제 하나를 (풀이 없이) 제공해주세요.
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
    throw new Error("Failed to get feedback from the AI. Please try again.");
  }
};
