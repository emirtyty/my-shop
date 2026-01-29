import React from 'react';

export default function IsolatedModal() {
  const modalContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: white;
        }
        .modal-content {
          max-width: 400px;
          margin: 0 auto;
        }
        .item {
          padding: 15px;
          margin: 10px 0;
          border-radius: 8px;
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          color: white;
        }
        h1 { color: #333; text-align: center; }
        h2 { margin: 10px 0; }
        p { margin: 5px 0; }
        .close-btn {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ff4444;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 16px;
          z-index: 1000;
        }
      </style>
    </head>
    <body>
      <button class="close-btn" onclick="window.parent.postMessage('close-modal', '*')">×</button>
      
      <div class="modal-content">
        <h1>🔥 ИЗОЛИРОВАННЫЙ МОДАЛ 🔥</h1>
        <p>Этот модал в iframe - полностью изолирован!</p>
        
        ${[...Array(30)].map((_, i) => `
          <div class="item">
            <h2>📦 Элемент ${i + 1}</h2>
            <p>Это полностью изолированный контент в iframe</p>
            <p>Если это скроллится - проблема в основной странице!</p>
          </div>
        `).join('')}
        
        <div style="background: #333; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2>🎉 КОНЕЦ КОНТЕНТА</h2>
          <p>Если вы видите это - скроллинг работает в изолированной среде!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999
    }}>
      <iframe
        srcDoc={modalContent}
        style={{
          width: '90%',
          height: '80%',
          maxWidth: '500px',
          border: 'none',
          borderRadius: '20px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
        }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
