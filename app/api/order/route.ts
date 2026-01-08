import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Твой актуальный токен
const BOT_TOKEN = '8456475470:AAFVWRgbEmumHrYpDLPky7hq5ZDMCh-J854';

export async function POST(req: Request) {
  try {
    // Создаем клиент ВНУТРИ функции, чтобы билд не падал
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { order_id, product_name, price, buyer_phone, seller_id } = await req.json();

    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('telegram_id')
      .eq('id', seller_id)
      .single();

    if (sellerError || !seller?.telegram_id) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    const message = `🛍 **НОВЫЙ ЗАКАЗ #${order_id}**\n---\n📦 **Товар:** ${product_name}\n💰 **Сумма:** ${price} ₽\n📞 **Клиент:** ${buyer_phone}`;

    const keyboard = {
      inline_keyboard: [[
        { text: "🚚 В ПУТИ", callback_data: `status_way_${order_id}` },
        { text: "✅ ЗАВЕРШИТЬ", callback_data: `status_completed_${order_id}` }
      ]]
    };

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: seller.telegram_id,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      })
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}