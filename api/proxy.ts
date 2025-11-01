// api/proxy.ts

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export default async function handler(req: any, res: any) {
  console.log(`[PROXY] Received request: ${req.method}`);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { type, payload, apiKey } = req.body;
    console.log(`[PROXY] Request type: ${type}`);

    if (!apiKey) {
      console.error("[PROXY] API Key is missing in the request body.");
      return res.status(401).json({ error: "API 키가 요청에 포함되지 않았습니다." });
    }

    let requestBody;

    if (type === 'recognize') {
        const { imageDataUrl } = payload;
        if (!imageDataUrl) {
            return res.status(400).json({ error: 'imageDataUrl is required for recognition.' });
        }
        requestBody = {
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
                            image_url: { url: imageDataUrl },
                        }
                    ]
                }
            ],
            max_tokens: 500,
        };

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
        requestBody = {
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: userPrompt }
            ]
        };

    } else {
      return res.status(400).json({ error: 'Invalid request type.' });
    }

    console.log('[PROXY] Constructing OpenAI request...');
    const openAIResponse = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody)
    });

    console.log(`[PROXY] OpenAI response status: ${openAIResponse.status}`);
    if (!openAIResponse.ok) {
        const errorData = await openAIResponse.json();
        console.error('[PROXY] OpenAI API Error:', JSON.stringify(errorData, null, 2));
        const errorMessage = errorData.error?.message || 'OpenAI API로부터 오류가 발생했습니다.';
        return res.status(openAIResponse.status).json({ error: errorMessage });
    }

    const data = await openAIResponse.json();
    console.log('[PROXY] OpenAI response data received successfully.');
    const content = data.choices[0]?.message?.content || '';
    return res.status(200).json({ content });

  } catch (error: any) {
    console.error('[PROXY] Internal proxy error:', error);
    const errorMessage = error.message || 'An internal server error occurred.';
    return res.status(500).json({ error: `AI 서비스 요청 중 서버 내부 오류가 발생했습니다. (${errorMessage})` });
  }
}