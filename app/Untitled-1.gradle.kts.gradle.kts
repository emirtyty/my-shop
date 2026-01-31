<script>
    // Настройки для твоего конкретного магазина
    const STORE_ID = '12402'; 
    const PROXY_URL = 'https://api.allorigins.win/get?url=';
    const API_URL = https://offers.pyaterochka.ru/api/v2/stores/${STORE_ID}/promotions/?limit=100;

    let allProducts = [];

    async function loadStoreData() {
        const container = document.getElementById('promo-container');
        const statusText = document.getElementById('status');
        
        try {
            const response = await fetch(PROXY_URL + encodeURIComponent(API_URL));
            const data = await response.json();
            const json = JSON.parse(data.contents);

            allProducts = json.results.map(item => ({
                name: item.name,
                image: item.image_url,
                oldPrice: item.regular_price,
                newPrice: item.discount_price,
                discount: item.discount_percent ? -${item.discount_percent}% : 'Акция'
            }));

            statusText.innerText = "Актуально на сегодня";
            statusText.style.color = "#28a745";
            renderProducts(allProducts);

        } catch (error) {
            console.error('Ошибка:', error);
            container.innerHTML = 
                <div class="loader">
                    Не удалось загрузить товары автоматически.<br>
                    <small>Попробуйте обновить страницу через минуту.</small>
                </div>;
            statusText.innerText = "Ошибка обновления";
            statusText.style.color = "#e21a1a";
        }
    }

    function renderProducts(items) {
        const container = document.getElementById('promo-container');
        if (items.length === 0) {
            container.innerHTML = '<div class="loader">В данный момент активных акций не найдено.</div>';
            return;
        }

        container.innerHTML = items.map(item => 
            <div class="product-card">
                <div class="badge">${item.discount}</div>
                <img src="${item.image}" alt="${item.name}" class="product-image" loading="lazy" onerror="this.src='https://via.placeholder.com/150?text=Фото+скоро+будет'">
                <div class="product-name">${item.name}</div>
                <div class="price-container">
                    <span class="old-price">${item.oldPrice} ₽</span>
                    <span class="new-price">${item.newPrice} ₽</span>
                </div>
            </div>
        ).join('');
    }

    // Живой поиск по товарам
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allProducts.filter(p => p.name.toLowerCase().includes(query));
        renderProducts(filtered);
    });

    window.onload = loadStoreData;
</script>

</body>
</html>