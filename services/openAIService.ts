// services/openAIService.ts

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Gets the OpenAI API key from environment variables.
 * Throws an error if the key is not defined.
 */
const getApiKey = (): string => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY가 정의되지 않았습니다. 환경 변수에 OpenAI API 키를 설정해주세요.");
  }
  return apiKey;
};


/**
 * Converts a handwritten math equation from an image to a LaTeX string using GPT-4o.
 * @param imageDataUrl The base64-encoded image data URL (e.g., from a canvas).
 * @returns A promise that resolves to the recognized LaTeX string.
 */
export const recognizeHandwriting = async (imageDataUrl: string): Promise<string> => {
  try {
    const apiKey = getApiKey();
    
    if (!imageDataUrl.startsWith('data:image/png;base64,')) {
      throw new Error("Invalid image data URL format. Must be a base64 PNG.");
    }

    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: "당신은 수학 손글씨 인식 전문가입니다. 주어진 수학 손글씨 이미지를 깔끔한 단일 LaTeX 문자열로 변환하는 것이 당신의 임무입니다. 중요: 당신의 출력은 오직 LaTeX 코드만 포함해야 합니다. 어떤 추가적인 설명이나 ```latex ... ```와 같은 마크다운 형식을 절대 포함하지 마세요. 만약 이미지에 인식할 수 있는 수학 수식이 없다면, 빈 문자열을 반환하세요."
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageDataUrl,
                            },
                        }
                    ]
                }
            ],
            max_tokens: 500,
        }),
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenAI API Error:", errorData);
        throw new Error(errorData.error?.message || `수식 인식에 실패했습니다. (Status: ${response.status})`);
    }

    const data = await response.json();
    const latex = data.choices[0]?.message?.content || '';
    
    // In case the model still includes markdown fences, remove them.
    return latex.replace(/```latex|```/g, '').trim();

  } catch (error) {
    console.error("Error recognizing handwriting:", error);
    throw new Error(error instanceof Error ? error.message : "수식 인식 중 알 수 없는 오류가 발생했습니다.");
  }
};


/**
 * Gets AI-powered feedback for a given math problem and user solution using GPT-4o.
 * @param problemLatex The math problem in LaTeX format.
 * @param userSolutionLatex The user's handwritten solution in LaTeX format.
 * @param userMemo The user's notes or solution attempt.
 * @returns A promise that resolves to the AI's feedback in Markdown format (max 3 sentences).
 */
export const getFeedback = async (problemLatex: string, userSolutionLatex: string, userMemo: string): Promise<string> => {
  try {
    const apiKey = getApiKey();
    const systemInstruction = `당신은 중고등학생을 위한 친절한 수학 튜터입니다. 학생이 제시한 수학 문제에 대한 학생의 풀이와 생각을 바탕으로, 핵심을 짚어주는 간결한 피드백을 제공해야 합니다. 답변은 반드시 한국어와 마크다운 형식으로, 세 문장 이내로 작성해야 합니다.`;
    
    const userPrompt = `다음 수학 문제에 대한 저의 풀이와 생각입니다. 피드백해주세요.

**문제 (LaTeX):**
${problemLatex}

**나의 풀이 (LaTeX):**
${userSolutionLatex}

**나의 생각 / 질문:**
${userMemo}
`;

    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: userPrompt }
            ]
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenAI API Error:", errorData);
        throw new Error(errorData.error?.message || `AI 피드백 생성에 실패했습니다. (Status: ${response.status})`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '피드백을 생성할 수 없습니다.';
    
  } catch (error) {
    console.error("Error getting AI feedback:", error);
    throw new Error(error instanceof Error ? error.message : "AI 피드백 생성 중 알 수 없는 오류가 발생했습니다.");
  }
};
