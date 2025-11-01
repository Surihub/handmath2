
const API_KEY = process.env.API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set. Please provide an OpenAI API key.");
}

/**
 * A helper function to perform requests to the OpenAI Chat Completions API.
 * @param payload The request body to send to the API.
 * @returns The content string from the API response.
 */
const performOpenAIRequest = async (payload: object): Promise<string> => {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("OpenAI API Error:", errorData);
    throw new Error(`OpenAI API request failed: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
    throw new Error("Invalid response structure from OpenAI API.");
  }

  return data.choices[0].message.content;
}


/**
 * Converts a handwritten math equation from an image to a LaTeX string using OpenAI GPT-4o.
 * @param imageDataUrl The base64-encoded image data URL (e.g., from a canvas).
 * @returns A promise that resolves to the recognized LaTeX string.
 */
export const recognizeHandwriting = async (imageDataUrl: string): Promise<string> => {
  try {
    if (!imageDataUrl.startsWith('data:image/png;base64,')) {
      throw new Error("Invalid image data URL format. Must be a base64 PNG.");
    }

    const payload = {
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "주어진 이미지의 수학 손글씨를 분석하여 깔끔한 단일 LaTeX 문자열로 변환해주세요. ```latex ... ``` 와 같은 마크다운 형식이나 다른 설명 없이, 오직 LaTeX 문자열만 출력해야 합니다. 만약 이미지에 인식할 수 있는 수학 수식이 없다면 빈 문자열을 반환하세요.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    };

    const latex = await performOpenAIRequest(payload);
    
    // Clean up potential markdown fences that might still slip through
    return latex.replace(/```latex|```/g, '').trim();
  } catch (error) {
    console.error("Error recognizing handwriting with OpenAI:", error);
    throw new Error("수식 인식에 실패했습니다. 다시 시도해주세요.");
  }
};

/**
 * Gets AI-powered feedback on a user's solution to a math problem using OpenAI GPT-4o.
 * @param problemLatex The math problem in LaTeX format.
 * @param userSolution The user's provided solution.
 * @returns A promise that resolves to the AI's feedback in Markdown format.
 */
export const getFeedback = async (problemLatex: string, userSolution: string): Promise<string> => {
  try {
    const systemPrompt = `당신은 중고등학생을 위한 전문적이고 친절한 수학 교사입니다. 학생의 문제 풀이 과정에 대해 건설적이고, 격려가 되며, 이해하기 쉬운 피드백을 제공하는 것이 목표입니다. 답변은 반드시 마크다운 형식으로 작성해야 합니다.`;
    
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

    const payload = {
        model: "gpt-4o",
        messages: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: userPrompt
            }
        ]
    };
    
    return await performOpenAIRequest(payload);
  } catch (error) {
    console.error("Error getting AI feedback from OpenAI:", error);
    throw new Error("AI로부터 피드백을 받는데 실패했습니다. 다시 시도해주세요.");
  }
};
