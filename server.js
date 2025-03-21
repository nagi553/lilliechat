import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';
import express from 'express';
import { readFile } from 'fs/promises';

// Discordクライアント設定
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// キャラクター設定を読み込む関数
async function loadCharacterSettings() {
  try {
    const data = await readFile('./character.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('キャラクター設定の読み込みに失敗しました:', error);
    // デフォルト設定を返す
    return {
      system_prompt: "あなたは親切なAIアシスタントです。"
    };
  }
}

// Discord BOTがログインした際の処理
client.once('ready', () => {
  console.log(`${client.user.tag} としてログインしました`);
});

// メッセージ受信時の処理
client.on('messageCreate', async message => {
  // 自分自身や他のBOTには反応しない
  if (message.author.bot) return;

  // BOTへのメンションの場合のみ反応
  if (message.mentions.has(client.user)) {
    const userMessage = message.content.replace(/<@!?\d+>/g, '').trim();

    try {
      const reply = await message.channel.send('考え中...');
      
      // キャラクター設定を読み込む
      const character = await loadCharacterSettings();

      // OpenRouter APIへのリクエスト
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model: 'google/gemma-3-27b-it:free',
          messages: [
            { role: 'system', content: character.system_prompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 200
        })
      });

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      await reply.edit(aiResponse);
    } catch (error) {
      console.error('エラー:', error);
      message.channel.send('エラーが発生しました。もう一度試してください。');
    }
  }
});

// Discord BOTにログイン
client.login(process.env.DISCORD_BOT_TOKEN);

// 簡易Webサーバー設定（Render用）
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('BOT is running!');
});

app.listen(port, () => {
  console.log(`Web server is running on port ${port}`);
});
