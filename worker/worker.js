// Cloudflare Worker - AI Chat Proxy
// 用于代理小米mimo-2.5 API调用，隐藏API密钥

export default {
  async fetch(request, env) {
    // 设置CORS头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 处理OPTIONS请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 只允许POST请求
    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      // 获取请求体
      const body = await request.json();
      const { message, history = [] } = body;

      if (!message) {
        return new Response(JSON.stringify({ error: 'Message is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 读取记忆文件
      const memoryContent = await env.MEMORY.get('memory.md');

      // 构建系统提示词
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

      // 构建消息数组
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message }
      ];

      // 调用小米mimo-2.5 API
      const apiResponse = await fetch('https://api.xiaomi.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.MIMO_API_KEY}`
        },
        body: JSON.stringify({
          model: 'mimo-2.5',
          messages: messages,
          max_tokens: 1024,
          temperature: 0.7
        })
      });

      // 检查API响应
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('API Error:', errorText);
        return new Response(JSON.stringify({ error: 'AI service temporarily unavailable' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 解析API响应
      const apiData = await apiResponse.json();
      const reply = apiData.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

      // 返回结果
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
