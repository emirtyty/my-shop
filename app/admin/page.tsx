"use client";

import React, { useState } from 'react';

export default function AdminPage() {
  const [tab, setTab] = useState('products');

  const products = [
    { id: "1", name: "ТЕСТОВЫЙ ТОВАР", price: 5000 }
  ];

  return (
    <div style={{ background: '#0a0a0a', color: 'white', minHeight: '100-vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#ff4500' }}>ADMIN PANEL</h1>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setTab('products')} style={{ padding: '10px', background: tab === 'products' ? '#ff4500' : '#333', color: 'white', border: 'none', borderRadius: '8px' }}>
          ТОВАРЫ
        </button>
        <button onClick={() => setTab('orders')} style={{ padding: '10px', background: tab === 'orders' ? '#ff4500' : '#333', color: 'white', border: 'none', borderRadius: '8px' }}>
          ЗАКАЗЫ
        </button>
      </div>

      {tab === 'products' ? (
        <div>
          {products.map(p => (
            <div key={p.id} style={{ background: '#1a1a1a', padding: '15px', borderRadius: '12px', marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', opacity: 0.5 }}>ID: {p.id}</div>
              <div style={{ fontWeight: 'bold' }}>{p.name}</div>
              <div style={{ color: '#ff4500' }}>{p.price} ₽</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ opacity: 0.5 }}>Заказов пока нет</div>
      )}
    </div>
  );
}