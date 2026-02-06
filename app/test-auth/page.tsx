'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function TestAuthPage() {
  const [result, setResult] = useState<string>('');

  const testSupabase = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      setResult(`URL: ${supabaseUrl ? '✅' : '❌'}\nKey: ${supabaseKey ? '✅' : '❌'}`);
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase.from('products').select('count');
        
        setResult(`URL: ✅\nKey: ✅\nSupabase: ${error ? '❌ ' + error.message : '✅ Connected'}`);
      }
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Тест аутентификации</h1>
        
        <button
          onClick={testSupabase}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Проверить Supabase
        </button>
        
        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </div>
        )}
        
        <div className="mt-6 text-sm text-gray-600">
          <p>Эта страница проверяет:</p>
          <ul className="list-disc list-inside mt-2">
            <li>Наличие переменных окружения</li>
            <li>Подключение к Supabase</li>
            <li>Доступ к базе данных</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
