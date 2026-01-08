import { NextResponse } from 'next/server';

const TELEGRAM_TOKEN = '8456475470:AAFVWRgbEmumHrYpDLPky7hq5ZDMCh-J854';
const MY_CHAT_ID = 'ТВОЙ_ID_ТУТ'; // ЗАМЕНИ ЭТО НА СВОЙ ID (который дал @userinfobot)

export async function POST(req: Request) {
  try {
    const { product_name, price, buyer_phone, order_id } = await req.json();

    const message = `
📦 *НОВЫЙ ЗАКАЗ # ${order_id}*
━━━━━━━━━━━━━━
🛍 Товар: ${product_name}
💰 Сумма: ${price} ₽
📞 Тел: ${buyer_phone}
━━━━━━━━━━━━━━
Выбери статус заказа:
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "🚚 В ПУТИ", callback_data: `status_way_${order_id}` },
          { text: "✅ ЗАВЕРШИТЬ", callback_data: `status_done_${order_id}` }
        ]
      ]
    };

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: MY_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}