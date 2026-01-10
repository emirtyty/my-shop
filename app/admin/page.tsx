"use client";

import React, { useState } from 'react';

export default function AdminPage() {
  const [tab, setTab] = useState('products');

  return (
    <div style={{ background: '#0a0a0a', color: 'white', minHeight: '100vh', padding: '40px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#ff4500', fontWeight: '900', fontSize: '32px' }}>ADMIN PANEL ACTIVE</h1>
      
      <div style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
        <button onClick={() => setTab('products')} style={{ padding: '10px 20px', background: tab === 'products' ? '#ff4500' : '#222', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '8px' }}>ТОВАРЫ</button>
        <button onClick={() => setTab('orders')} style={{ padding: '10px 20px', background: tab === 'orders' ? '#ff4500' : '#222', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '8px' }}>ЗАКАЗЫ</button>
      </div>

      {tab === 'products' ? (
        <div style={{ padding: '20px', border: '1px solid #333', borderRadius: '12px' }}>
          <h3>Список товаров</h3>
          <p style={{ opacity: 0.5 }}>ID: 0001 — Тестовый товар — 5000р</p>
        </div>
      ) : (
        <div style={{ padding: '20px', border: '1px solid #333', borderRadius: '12px' }}>
          <h3>Список заказов</h3>
          <p style={{ opacity: 0.5 }}>Заказов пока нет</p>
        </div>
      )}
    </div>
  );
}