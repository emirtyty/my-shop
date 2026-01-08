import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Прямое создание клиента без лишних символов
const supabase = createClient(
  'https://mnzsmbqwvlrmoahtosux.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcm9mZmlsZSI6InJlZmx1Zml6Im1uenNteWJ3OWhaHRvc3V4Iiwicm9sZSI6ImFub20iLCJpYXQiOjE3MzYxMDEzNjksImV4cCI6MjA1MTY3NzM2OX0.u-Tf-P6iXFhG0YVzXj-N2f6_9Y5_5S_L-8_1_5' 
);

const TELEGRAM_TOKEN = '8456475470:AAFVWRgbEmumHrYpDLPky7hq5ZDMCh-J854';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.callback_query) {
      const callbackData = body.callback_query.data;
      const chatId = body.callback_query.message.chat.id;
      const messageId = body.callback_query.message.message_id;
      const oldText = body.callback_query.message.text;

      const [action, type, orderId] = callbackData.split('_');
      const newStatus = type === 'way' ? 'В пути' : 'Завершен';

      // 1. Обновляем статус в базе
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // 2. Обновляем сообщение в боте
      const newText = `${oldText}\n\n✅ СТАТУС ИЗМЕНЕН: ${newStatus.toUpperCase()}`;
      
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: newText,
          parse_mode: 'Markdown'
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('ошибка:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}