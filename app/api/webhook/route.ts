import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BOT_TOKEN = '8456475470:AAFVWRgbEmumHrYpDLPky7hq5ZDMCh-J854';

export async function POST(req: Request) {
  try {
    // 1. Инициализируем Supabase ТОЛЬКО при вызове функции
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();

    if (body.callback_query) {
      const data = body.callback_query.data;
      const chatId = body.callback_query.message.chat.id;
      const messageId = body.callback_query.message.message_id;
      const oldText = body.callback_query.message.text;

      const parts = data.split('_');
      const action = parts[1]; // way или completed
      const orderId = parts[2];

      const newStatus = action === 'way' ? 'В пути' : 'Завершен';
      const statusIcon = action === 'way' ? '🚚' : '✅';

      // 2. Обновляем статус в Supabase
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // 3. Редактируем сообщение в Telegram
      const newText = `${oldText}\n\n${statusIcon} **СТАТУС: ${newStatus.toUpperCase()}**`;
      
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: newText,
          parse_mode: 'Markdown',
          reply_markup: action === 'way' ? body.callback_query.message.reply_markup : { inline_keyboard: [] }
        })
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Webhook Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}