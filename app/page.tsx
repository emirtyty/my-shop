export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-purple-900 to-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">🛍️ Маркетплейс</h1>
        <p className="text-xl mb-8">Сайт работает!</p>
        <div className="space-y-4">
          <a
            href="/admin"
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 mr-4"
          >
            🛠️ Админ-панель
          </a>
          <a
            href="/auth"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            🔐 Авторизация
          </a>
        </div>
      </div>
    </div>
  );
}
