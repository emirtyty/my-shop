import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Токен твоего бота RaDell
const BOT_TOKEN = '8456475470:AAFVWRgbEmumHrYpDLPky7hq5ZDMCh-J854'
export async function POST(req: Request) {
  try {
    const { order_id, product_name, price, buyer_phone, seller_id } = await req.json();

    // 1. Получаем telegram_id конкретного продавца из таблицы 'sellers'
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('telegram_id')
      .eq('id', seller_id)
      .single();

    if (sellerError || !seller?.telegram_id) {
      console.error("Продавец не найден или не указал Telegram ID:", sellerError);
      return NextResponse.json({ error: 'Seller Telegram ID not found' }, { status: 404 });
    }

    const CHAT_ID = seller.telegram_id;

    // 2. Формируем текст сообщения
    const message = `🛍 *НОВЫЙ ЗАКАЗ # ${order_id}*\n\n` +
                    `📦 Товар: ${product_name}\n` +
                    `💰 Сумма: ${price} ₽\n` +
                    `📞 Тел: ${buyer_phone}`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "🚚 В ПУТИ", callback_data: `status_way_${order_id}` },
          { text: "✅ ЗАВЕРШИТЬ", callback_data: `status_completed_${order_id}` }
        ]
      ]
    };

    // 3. Отправка уведомления через Telegram API
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      })
    });

    if (!tgRes.ok) {
      const errorData = await tgRes.json();
      throw new Error(`Telegram API error: ${JSON.stringify(errorData)}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error("Ошибка в route.ts:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}