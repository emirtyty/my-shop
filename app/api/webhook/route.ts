import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BOT_TOKEN = '7611738981:AAGXgYvVbT04wK0f-N8p27M82G7L6R4Wcl8';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Если это нажатие на кнопку (callback_query)
    if (body.callback_query) {
      const data = body.callback_query.data; // например, status_way_123
      const chatId = body.callback_query.message.chat.id;
      const messageId = body.callback_query.message.message_id;
      const oldText = body.callback_query.message.text;

      const parts = data.split('_');
      const action = parts[1]; // way или completed
      const orderId = parts[2];

      const newStatus = action === 'way' ? 'В пути' : 'Завершен';
      const statusIcon = action === 'way' ? '🚚' : '✅';

      // 1. Обновляем статус в Supabase
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // 2. Редактируем сообщение в Telegram, чтобы продавец видел результат
      const newText = `${oldText}\n\n${statusIcon} **СТАТУС: ${newStatus.toUpperCase()}**`;
      
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: newText,
          parse_mode: 'Markdown',
          // Убираем кнопки после завершения, если нужно
          reply_markup: action === 'way' ? body.callback_query.message.reply_markup : { inline_keyboard: [] }
        })
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Webhook Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}