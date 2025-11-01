// services/openAIService.ts

const PROXY_API_URL = '/api/proxy';

/**
 * A helper function to call our server-side proxy.
 * @param type The type of request ('recognize' or 'feedback').
 * @param payload The data to send to the proxy.
 * @param apiKey The user's OpenAI API key.
 * @returns The content from the AI model.
 */
const callProxy = async (type: 'recognize' | 'feedback', payload: any, apiKey: string): Promise<string> => {
    console.log(`[CLIENT] Calling proxy for type: ${type}`);
    
    if (!apiKey) {
        console.error("[CLIENT] API Key is missing.");
        throw new Error("API 키가 제공되지 않았습니다. API 키를 입력하고 다시 시도해주세요.");
    }

    const response = await fetch(PROXY_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, payload, apiKey }),
    });

    console.log(`[CLIENT] Proxy response status: ${response.status}`);

    if (!response.ok) {
        const errorText = await response.text();
        console.error("[CLIENT] Proxy response was not OK. Raw response text:", errorText);
        try {
            const errorData = JSON.parse(errorText);
            console.error("[CLIENT] Parsed Proxy Error Data:", errorData);
            throw new Error(errorData.error || `API 요청에 실패했습니다. (Status: ${response.status})`);
        } catch (e) {
            // If parsing fails, the response was not valid JSON
             throw new Error(`API 서버로부터 유효하지 않은 응답을 받았습니다. Status: ${response.status}`);
        }
    }

    const data = await response.json();
    console.log("[CLIENT] Received data from proxy.");
    return data.content;
};


/**
 * Converts a handwritten math equation from an image to a LaTeX string using GPT-4o via the proxy.
 * @param imageDataUrl The base64-encoded image data URL (e.g., from a canvas).
 * @param apiKey The user's OpenAI API key.
 * @returns A promise that resolves to the recognized LaTeX string.
 */
export const recognizeHandwriting = async (imageDataUrl: string, apiKey: string): Promise<string> => {
  try {
     if (!imageDataUrl.startsWith('data:image/png;base64,')) {
      throw new Error("Invalid image data URL format. Must be a base64 PNG.");
    }
    const latex = await callProxy('recognize', { imageDataUrl }, apiKey);
    // In case the model still includes markdown fences, remove them.
    return latex.replace(/```latex|```/g, '').trim();
  } catch (error) {
    console.error("[CLIENT] Full error in recognizeHandwriting:", error);
    throw new Error(error instanceof Error ? error.message : "수식 인식 중 알 수 없는 오류가 발생했습니다.");
  }
};


/**
 * Gets AI-powered feedback for a given math problem and user solution using GPT-4o via the proxy.
 * @param problemLatex The math problem in LaTeX format.
 * @param userSolutionLatex The user's handwritten solution in LaTeX format.
 * @param userMemo The user's notes or solution attempt.
 * @param apiKey The user's OpenAI API key.
 * @returns A promise that resolves to the AI's feedback in Markdown format.
 */
export const getFeedback = async (problemLatex: string, userSolutionLatex: string, userMemo: string, apiKey: string): Promise<string> => {
  try {
    const feedback = await callProxy('feedback', { problemLatex, userSolutionLatex, userMemo }, apiKey);
    return feedback || '피드백을 생성할 수 없습니다.';
  } catch (error) {
    console.error("[CLIENT] Full error in getFeedback:", error);
    throw new Error(error instanceof Error ? error.message : "AI 피드백 생성 중 알 수 없는 오류가 발생했습니다.");
  }
};