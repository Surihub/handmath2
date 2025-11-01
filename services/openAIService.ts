/**
 * A helper function to call our internal API proxy.
 * @param type The type of request ('recognize' or 'feedback').
 * @param payload The data for the request.
 * @returns The content string from the API response.
 */
const callProxy = async (type: 'recognize' | 'feedback', payload: object): Promise<string> => {
  const response = await fetch('/api/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, payload }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Proxy API Error:", errorData);
    // Use the error message from our proxy, or a default one.
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.content;
};

/**
 * Converts a handwritten math equation from an image to a LaTeX string using our backend proxy.
 * @param imageDataUrl The base64-encoded image data URL (e.g., from a canvas).
 * @returns A promise that resolves to the recognized LaTeX string.
 */
export const recognizeHandwriting = async (imageDataUrl: string): Promise<string> => {
  try {
    if (!imageDataUrl.startsWith('data:image/png;base64,')) {
      throw new Error("Invalid image data URL format. Must be a base64 PNG.");
    }

    const latex = await callProxy('recognize', { imageDataUrl });
    
    // The proxy should return the final string, but cleaning here as a fallback is fine.
    return latex.replace(/```latex|```/g, '').trim();
  } catch (error) {
    console.error("Error recognizing handwriting via proxy:", error);
    // Re-throw a user-friendly message
    throw new Error("수식 인식에 실패했습니다. 다시 시도해주세요.");
  }
};

/**
 * Gets AI-powered feedback on a user's solution via our backend proxy.
 * @param problemLatex The math problem in LaTeX format.
 * @param userSolution The user's provided solution.
 * @returns A promise that resolves to the AI's feedback in Markdown format.
 */
export const getFeedback = async (problemLatex: string, userSolution: string): Promise<string> => {
  try {
    return await callProxy('feedback', { problemLatex, userSolution });
  } catch (error) {
    console.error("Error getting AI feedback from proxy:", error);
    throw new Error("AI로부터 피드백을 받는데 실패했습니다. 다시 시도해주세요.");
  }
};
