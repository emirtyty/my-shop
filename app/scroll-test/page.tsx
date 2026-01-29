import React from 'react';

export default function ScrollTest() {
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '20px',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        maxWidth: '400px',
        width: '100%',
        height: '300px',
        overflow: 'scroll',
        border: '2px solid red',
        padding: '20px'
      }}>
        <h1 style={{ color: 'red', fontSize: '20px', marginBottom: '20px' }}>ТЕСТ СКРОЛЛИНГА</h1>
        
        {[...Array(50)].map((_, i) => (
          <div key={i} style={{
            padding: '10px',
            margin: '10px 0',
            backgroundColor: i % 2 === 0 ? '#ffeb3b' : '#4caf50',
            borderRadius: '8px',
            color: 'black'
          }}>
            <h3>Элемент {i + 1}</h3>
            <p>Прокрутите чтобы увидеть больше элементов</p>
            <p>Если видите это - скроллинг работает!</p>
          </div>
        ))}
        
        <div style={{
          padding: '20px',
          backgroundColor: '#f44336',
          color: 'white',
          textAlign: 'center',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h2>КОНЕЦ КОНТЕНТА</h2>
          <p>Если вы видите это - скроллинг точно работает!</p>
        </div>
      </div>
    </div>
  );
}
