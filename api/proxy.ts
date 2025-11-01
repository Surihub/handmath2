// api/proxy.ts

// This is a Vercel Serverless Function that runs in a Node.js environment.

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const API_KEY = process.env.API_KEY;

// A generic handler for Vercel's serverless environment.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  if (!API_KEY) {
    console.error("API_KEY is not configured on the server.");
    return res.status(500).json({ error: 'API_KEY is not configured on the server.' });
  }

  try {
    const { type, payload } = req.body;
    let openAIPayload;

    if (type === 'recognize') {
        const { imageDataUrl } = payload;
        if (!imageDataUrl) {
            return res.status(400).json({ error: 'imageDataUrl is required for recognition.' });
        }
        openAIPayload = {
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
                            image_url: { url: imageDataUrl },
                        },
                    ],
                },
            ],
            max_tokens: 500,
        };
    } else if (type === 'feedback') {
        const { problemLatex, userSolution } = payload;
        if (!problemLatex || !userSolution) {
            return res.status(400).json({ error: 'problemLatex and userSolution are required for feedback.' });
        }
         const systemPrompt = `당신은 중고등학생을 위한 전문적이고 친절한 수학 교사입니다. 학생의 문제 풀이 과정에 대해 건설적이고, 격려가 되며, 이해하기 쉬운 피드백을 제공하는 것이 목표입니다. 답변은 반드시 마크다운 형식으로 작성해야 합니다.`;
         const userPrompt = `다음 수학 문제와 학생의 풀이를 분석해주세요.\n\n**문제 (LaTeX):**\n${problemLatex}\n\n**학생의 풀이:**\n${userSolution}\n\n다음과 같은 구조로 피드백을 제공해주세요:\n1.  **총평:** 학생의 풀이에 대한 간결하고 격려가 되는 요약.\n2.  **단계별 분석:** 구체적인 계산 실수나 논리적 오류를 지적해주세요. 풀이가 맞았다면, 정확하다고 확인해주고 칭찬해주세요.\n3.  **다른 접근법:** 가능하다면, 문제를 풀 수 있는 다른 유효한 방법을 제안해주세요.\n4.  **다음 도전 과제:** 학생의 이해를 돕기 위해, 유사한 새로운 연습 문제 하나를 (풀이 없이) 제공해주세요.\n`;

        openAIPayload = {
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ]
        };
    } else {
      return res.status(400).json({ error: 'Invalid request type.' });
    }

    const openAIResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(openAIPayload)
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      console.error("OpenAI API Error:", errorData);
      return res.status(openAIResponse.status).json({ error: `OpenAI API request failed: ${errorData.error?.message || openAIResponse.statusText}` });
    }

    const data = await openAIResponse.json();
    const content = data.choices?.[0]?.message?.content;

    if (content === undefined) {
      return res.status(500).json({ error: 'Invalid response structure from OpenAI API.' });
    }

    return res.status(200).json({ content });

  } catch (error: any) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: error.message || 'An internal server error occurred.' });
  }
}
