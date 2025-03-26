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

// リーリエ関連のキーワードリスト
const lillieKeywords = [
  'リーリエ', 'りーりえ', 'リリエ', 'りりえ', // 名前のバリエーション
  'コスモッグ', 'ネッビー', 'ほしぐも', // ポケモン関連
  'アローラ', 'エーテル', 'ハナソノ', 'メレメレ', // 地名
  'ルザミーネ', 'グラジオ', 'ククイ', // 人物
  'ウルトラホール', 'ウルトラビースト', // 設定関連
  'サンムーン', 'ポケットモンスター', 'ポケモン', // ゲーム関連
  '三つ編み', '白い帽子', '白いドレス' // 外見
];

// 質問パターンを検出する関数
function isQuestion(text) {
  return text.includes('？') || 
         text.includes('?') || 
         text.includes('ですか') || 
         text.includes('ますか') ||
         text.includes('のか') ||
         text.includes('かな') || 
         text.includes('何') ||
         text.includes('誰') ||
         text.includes('どう') ||
         text.includes('いつ') ||
         text.includes('どこ') ||
         text.includes('教えて');
}

// AIレスポンスを取得する関数（処理を統一するため関数化）
async function getAIResponse(message, triggerType) {
  try {
    const reply = await message.channel.send('リーリエが入力中...');
    
    // 直近のメッセージを50件取得
    const messages = await message.channel.messages.fetch({ limit: 50 });
    
    // 古い順に並べ替え
    const recentMessages = Array.from(messages.values()).reverse();
    
    // 会話履歴を構築
    const conversationHistory = [];
    
    for (const msg of recentMessages) {
      if (msg.author.id === client.user.id) {
        if (msg.content !== 'リーリエが入力中...') {
          conversationHistory.push({ role: 'assistant', content: msg.content });
        }
      } else {
        let content = msg.content.replace(/<@!?\d+>/g, '').trim();
        let displayName = msg.member?.displayName || msg.author.username;
        let userMessage = `${displayName}: ${content}`;
        conversationHistory.push({ role: 'user', content: userMessage });
      }
    }
    
    // キャラクター設定を読み込む
    const character = await loadCharacterSettings();
    
    // トリガータイプに応じたプロンプト追加
    let systemPrompt = character.system_prompt + "\n\n複数のユーザーと会話する場合は、各メッセージの冒頭にあるユーザー名を確認し、誰が話しているか区別してください。";
    
    if (triggerType === 'keyword') {
      systemPrompt += "\n\n会話の中であなたの名前（リーリエ）や関連するキーワードが出たので、自然に会話に参加してください。";
    } else if (triggerType === 'question') {
      systemPrompt += "\n\nあなたに関する質問があったので、丁寧に答えてください。";
    }
    
    const messages_for_ai = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory
    ];

    // OpenRouter APIへのリクエスト
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: 'google/gemma-3-27b-it:free',
        messages: messages_for_ai,
        temperature: 0.7,
        max_tokens: 300
      })
    });

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    await reply.edit(aiResponse);
    return true;
  } catch (error) {
    console.error('エラー:', error);
    message.channel.send('エラーが発生しました。もう一度試してください。');
    return false;
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

  // メンションされた場合は必ず応答
  if (message.mentions.has(client.user)) {
    await getAIResponse(message, 'mention');
    return;
  }
  
  // メンションがない場合の処理
  const content = message.content.toLowerCase();
  
  // リーリエ関連キーワードを含むか確認
  const containsLillieKeyword = lillieKeywords.some(keyword => 
    content.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (containsLillieKeyword) {
    // キーワードを含む質問なら高確率で応答
    if (isQuestion(content)) {
      if (Math.random() < 1.0) { // 100%の確率で応答
        await getAIResponse(message, 'question');
      }
    } 
    // キーワードのみなら中確率で応答
    else if (Math.random() < 0.6) { // 60%の確率で応答
      await getAIResponse(message, 'keyword');
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
