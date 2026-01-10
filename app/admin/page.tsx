"use client";
import React from 'react';

export default function Admin() {
  return (
    <div style={{ background: '#0a0a0a', color: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#ff4500', fontSize: '40px', fontWeight: '900' }}>АДМИНКА РАБОТАЕТ</h1>
      <p style={{ opacity: 0.5 }}>Если ты это видишь, значит ошибка slice исчезла!</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', background: '#ff4500', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>ОБНОВИТЬ СТРАНИЦУ</button>
    </div>
  );
}