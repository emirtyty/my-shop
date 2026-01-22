'use client';

import React, { useState, useEffect } from 'react';

export default function Test() {
  const [message, setMessage] = useState('Загрузка...');

  useEffect(() => {
    setTimeout(() => {
      setMessage('React работает! Время: ' + new Date().toLocaleTimeString());
    }, 1000);
  }, []);

  return (
    <div style={{ 
      padding: '50px', 
      background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)', 
      color: 'white', 
      fontSize: '32px',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div>
        <h1>🚀 ТЕСТОВАЯ СТРАНИЦА 🚀</h1>
        <p style={{ fontSize: '18px', marginTop: '20px' }}>{message}</p>
        <p style={{ fontSize: '14px', marginTop: '10px', opacity: 0.8 }}>
          Если вы видите это, React и Next.js работают правильно!
        </p>
      </div>
    </div>
  );
}
