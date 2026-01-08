import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Используем заглушки, чтобы билд не падал, если переменные еще не подгрузились
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Твой актуальный токен
const BOT_TOKEN = '8456475470:AAFVWRgbEmumHrYpDLPky7hq5ZDMCh-J854';

export async function POST(req: Request) {
  try {
    const { order_id, product_name, price, buyer_phone, seller_id } = await req.json();

    // Поиск Telegram ID продавца
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('telegram_id')
      .eq('id', seller_id)
      .single();

    if (sellerError || !seller?.telegram_id) {
      console.error("Seller not found:", sellerError);
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    const CHAT_ID = seller.telegram_id;

    const message = `🛍 **НОВЫЙ ЗАКАЗ #${order_id}**\n---\n📦 **Товар:** ${product_name}\n💰 **Сумма:** ${price} ₽\n📞 **Клиент:** ${buyer_phone}`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "🚚 В ПУТИ", callback_data: `status_way_${order_id}` },
          { text: "✅ ЗАВЕРШИТЬ", callback_data: `status_completed_${order_id}` }
        ]
      ]
    };

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      })
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Order API Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}