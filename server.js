import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on('ready', () => {
  console.log(`${client.user.tag} としてログインしました`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.mentions.has(client.user)) {
    const userMessage = message.content.replace(/<@!?\d+>/g, '').trim();

    try {
      const reply = await message.channel.send('考え中...');

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model: 'openrouter/google/gemma-3-27b-it:free', // 正しいモデル名
          messages: [
            { role: 'system', content: 'あなたはDiscordサーバー内で役立つ情報を提供する親切なAIアシスタントです。簡潔で自然な回答を心がけてください。' },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7, // 応答のランダム性を調整
          max_tokens: 200 // 応答文字数制限
        })
      });

      const data = await response.json();

      // エラーチェックと安全なレスポンス処理
      if (data && data.choices && data.choices.length > 0) {
        const aiResponse = data.choices[0].message.content;
        await reply.edit(aiResponse);
      } else {
        await reply.edit('AIから適切な応答を得られませんでした。もう一度試してください。');
      }
    } catch (error) {
      console.error('エラー:', error);
      message.channel.send('エラーが発生しました。もう一度試してください。');
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
