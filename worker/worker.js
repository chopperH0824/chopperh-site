// Cloudflare Worker - AI Chat + TTS Proxy
// 用于代理小米 MiMo API 调用，隐藏 API 密钥，支持流式输出和 TTS

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // TTS 端点
    if (path === '/tts' && request.method === 'POST') {
      return this.handleTTS(request, env, corsHeaders);
    }

    // LLM 端点（默认 / 或 /chat）
    if ((path === '/' || path === '/chat') && request.method === 'POST') {
      return this.handleChat(request, env, corsHeaders);
    }

    // 健康检查
    if (path === '/ping') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  },

  // ─── TTS 处理 ─────────────────────────────────────
  async handleTTS(request, env, corsHeaders) {
    try {
      const { text, voice = '冰糖', model = 'mimo-v2.5-tts', style } = await request.json();

      if (!text) {
        return new Response(JSON.stringify({ error: 'text is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const messages = [];
      if (style) {
        messages.push({ role: 'user', content: style });
      }
      messages.push({ role: 'assistant', content: text });

      const apiResponse = await fetch('https://api.xiaomimimo.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': env.MIMO_API_KEY
        },
        body: JSON.stringify({
          model,
          messages,
          audio: { format: 'wav', voice }
        })
      });

      if (!apiResponse.ok) {
        const err = await apiResponse.text();
        console.error('MiMo TTS Error:', err);
        return new Response(JSON.stringify({ error: 'TTS service error' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const data = await apiResponse.json();
      const audioBase64 = data.choices?.[0]?.message?.audio?.data;

      if (!audioBase64) {
        return new Response(JSON.stringify({ error: 'No audio in response' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 解码 base64 音频并返回
      const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));

      return new Response(audioBytes, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'audio/wav',
          'Cache-Control': 'no-cache'
        }
      });

    } catch (error) {
      console.error('TTS Worker Error:', error);
      return new Response(JSON.stringify({ error: 'TTS internal error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },

  // ─── LLM 对话处理 ────────────────────────────────
  async handleChat(request, env, corsHeaders) {
    try {
      const { message, history = [], stream = false } = await request.json();

      if (!message) {
        return new Response(JSON.stringify({ error: 'Message is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let memoryContent = null;
      if (env.MEMORY) {
        try {
          memoryContent = await env.MEMORY.get('memory.md');
        } catch (kvError) {
          console.error('KV get error:', kvError);
        }
      }

      if (!memoryContent) {
        memoryContent = `# 胡强斌 AI 助手记忆文件

## 基本信息
- **姓名**：胡强斌（Hu Qiangbin），英文名：Chopper
- **职位**：AI 玩具 / 硬件产品经理
- **现公司**：乐漾 JOYIN 集团 · Play-Act 品牌
- **教育**：桂林理工大学 · 网络工程（计算机类）· 全日制本科
- **认证**：讯飞/微软 AI Prompt 工程师

## 核心能力
- **AI 产品全链路**：从调研、竞品拆解、原型设计、原厂对接，到方案商管理、技术评估、量产落地及上市。
- **AI 工具链**：PickFu、Perplexity、Codex/Qoder（构建网页交互模拟器）、Lovart、ElevenLabs、Suno、Claude/GPT、Hermes Agent（自建 NAS 知识库）、Claude Code 等。
- **技术选型**：主导 ASR/TTS/LLM 全链路选型，对比 5+ 主流大模型，设计多模型混合架构。

## 工作经历
- **乐漾 JOYIN (2025.10 - 至今)**：作为新品类开拓者，负责 Play-Act 品牌全线下电子 / AI 玩具，同步推进 8-9 个面向 Amazon US 市场的在研项目。受邀作为百度 Create 2026 VIP 嘉宾。
- **火火兔 (2024.04 - 2025.10)**：主导传统早教机向 AI 玩具转型，落地 5 个项目，销量百万级，登顶京东类目 TOP 1，参与制作《2025 AI 玩具白皮书》，技术获评价「国内领先」。
- **亿道信息 (2023.02 - 2024.03)**：项目工程师，负责 28 个量产项目和 3 个研发项目。
- **颜小芋奶茶 (2020.11 - 2022.07)**：校园创业项目创始人。

## 核心项目
- **AI 贴纸打印机**：公司转型关键项目，首个 AI 玩具产品，半个 CTO + PM 角色，无需 APP 轻松操作。
- **AI 智能体 DIY 平台**：行业首个品牌方硬件 AI 智能体 DIY 小程序。
- **离线数学学习玩具**：面向 Amazon US 市场的 LCD 段码屏极客数学玩具。
- **儿童 DJ 混音器**：独创 8 音色 + 3 推子无限组合玩法。

## 注意事项
- 这是公开信息，可以自由分享，但不要透露身份证号、详细住址等个人敏感隐私项目。
- 保持友好、专业、简练的回答语气。`;
      }

      const systemPrompt = `你是胡强斌的AI助手，用于帮助访客了解胡强斌的信息。

## 记忆文件
${memoryContent}

## 回答规则
1. 只基于记忆文件中的信息回答，不要编造
2. 如果记忆文件中没有相关信息，礼貌地告诉用户你不知道
3. 保持友好、专业的语气
4. 回答要简洁，适合聊天场景
5. 不要透露个人隐私信息
6. 不要体现项目号和价格，只体现产品方向
7. 如果用户想了解更多，可以引导他们访问网站或联系胡强斌

## 联系方式
- 邮箱：18476393224@163.com
- 电话：18476393224
- 个人网站：https://me.chopperh.me`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message }
      ];

      const apiResponse = await fetch('https://token-plan-cn.xiaomimimo.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.MIMO_API_KEY}`
        },
        body: JSON.stringify({
          model: 'mimo-v2.5',
          messages: messages,
          max_tokens: 1024,
          temperature: 0.7,
          stream: stream
        })
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('API Error:', errorText);
        return new Response(JSON.stringify({ error: 'AI service temporarily unavailable' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 流式输出
      if (stream) {
        const readable = new ReadableStream({
          async start(controller) {
            const reader = apiResponse.body.getReader();
            const decoder = new TextDecoder();
            let fullReply = '';
            let buffer = '';

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  if (buffer.trim()) {
                    const lines = buffer.split('\n');
                    for (const line of lines) {
                      const trimmed = line.trim();
                      if (trimmed.startsWith('data: ')) {
                        const data = trimmed.slice(6).trim();
                        if (data && data !== '[DONE]') {
                          try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content || '';
                            if (content) {
                              fullReply += content;
                              controller.enqueue(`data: ${JSON.stringify({ content, done: false })}\n\n`);
                            }
                          } catch (e) {}
                        }
                      }
                    }
                  }
                  break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed) continue;
                  if (trimmed.startsWith('data: ')) {
                    const data = trimmed.slice(6).trim();
                    if (data === '[DONE]') {
                      controller.enqueue(`data: ${JSON.stringify({ done: true, fullReply })}\n\n`);
                      break;
                    }
                    try {
                      const parsed = JSON.parse(data);
                      const content = parsed.choices?.[0]?.delta?.content || '';
                      if (content) {
                        fullReply += content;
                        controller.enqueue(`data: ${JSON.stringify({ content, done: false })}\n\n`);
                      }
                    } catch (e) {}
                  }
                }
              }
            } catch (e) {
              console.error('Stream error:', e);
            }
            controller.close();
          }
        });

        return new Response(readable, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        });
      }

      // 非流式输出
      const apiData = await apiResponse.json();
      const reply = apiData.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

      return new Response(JSON.stringify({
        reply,
        history: [...history, { role: 'user', content: message }, { role: 'assistant', content: reply }]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Worker Error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
