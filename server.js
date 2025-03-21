const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');

// Discordクライアント設定
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ボットがログインした際の処理
client.on('ready', () => {
  console.log(`${client.user.tag} としてログインしました`);
});

// メッセージ受信時の処理
client.on('messageCreate', async message => {
  // 自分自身やBOTからのメッセージには反応しない
  if (message.author.bot) return;

  // BOTへのメンションの場合のみ反応
  if (message.mentions.has(client.user)) {
    const userMessage = message.content.replace(/<@!?\d+>/g, '').trim(); // メンション部分を除去

    try {
      const reply = await message.channel.send('考え中...');

      // OpenRouter APIへのリクエスト
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model: 'openai/gpt-3.5-turbo', // 使用するモデル名
          messages: [
            { role: 'system', content: 'あなたは親切なAIアシスタントです。' },
            { role: 'user', content: userMessage }
          ]
        })
      });

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      // AIからの応答を送信
      await reply.edit(aiResponse);
    } catch (error) {
      console.error('エラー:', error);
      message.channel.send('エラーが発生しました。もう一度試してください。');
    }
  }
});

// Discord BOTにログイン
client.login(process.env.DISCORD_BOT_TOKEN);
