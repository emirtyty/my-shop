package com.raddell.app;

import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.util.Log;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private ApiService apiService;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Настраиваем edge-to-edge с прозрачным статус-баром
        setupEdgeToEdge();
        
        // Инициализируем API сервис
        apiService = new ApiService();
        
        // Тестируем API
        testApiConnection();
    }
    
    private void testApiConnection() {
        Log.d(TAG, "Testing API connection...");
        
        // Проверяем здоровье API
        apiService.checkHealth(new ApiService.ApiCallback<String>() {
            @Override
            public void onSuccess(String result) {
                Log.d(TAG, "API Health Check: " + result);
                // Загружаем товары
                loadProducts();
            }
            
            @Override
            public void onError(String error) {
                Log.e(TAG, "API Health Check Failed: " + error);
            }
        });
    }
    
    private void loadProducts() {
        Log.d(TAG, "Loading products...");
        
        apiService.getProducts(new ApiService.ApiCallback<List<ApiService.Product>>() {
            @Override
            public void onSuccess(List<ApiService.Product> products) {
                Log.d(TAG, "Products loaded successfully: " + products.size() + " items");
                
                // Выводим информацию о товарах
                for (ApiService.Product product : products) {
                    Log.d(TAG, String.format("Product: %s, Price: %.2f, Discount: %d%%", 
                        product.name, product.price, product.discount != null ? product.discount : 0));
                }
                
                // Загружаем истории
                loadStories();
            }
            
            @Override
            public void onError(String error) {
                Log.e(TAG, "Failed to load products: " + error);
            }
        });
    }
    
    private void loadStories() {
        Log.d(TAG, "Loading stories...");
        
        apiService.getStories(new ApiService.ApiCallback<List<ApiService.Story>>() {
            @Override
            public void onSuccess(List<ApiService.Story> stories) {
                Log.d(TAG, "Stories loaded successfully: " + stories.size() + " items");
                
                // Выводим информацию о историях
                for (ApiService.Story story : stories) {
                    Log.d(TAG, String.format("Story: %s, Link: %s", story.title, story.link));
                }
                
                // Загружаем продавцов
                loadSellers();
            }
            
            @Override
            public void onError(String error) {
                Log.e(TAG, "Failed to load stories: " + error);
            }
        });
    }
    
    private void loadSellers() {
        Log.d(TAG, "Loading sellers...");
        
        apiService.getSellers(new ApiService.ApiCallback<List<ApiService.Seller>>() {
            @Override
            public void onSuccess(List<ApiService.Seller> sellers) {
                Log.d(TAG, "Sellers loaded successfully: " + sellers.size() + " items");
                
                // Выводим информацию о продавцах
                for (ApiService.Seller seller : sellers) {
                    Log.d(TAG, String.format("Seller: %s, Telegram: %s", seller.name, seller.telegram_url));
                }
                
                // Тестируем поиск
                testSearch();
            }
            
            @Override
            public void onError(String error) {
                Log.e(TAG, "Failed to load sellers: " + error);
            }
        });
    }
    
    private void testSearch() {
        Log.d(TAG, "Testing search...");
        
        apiService.searchProducts("iPhone", new ApiService.ApiCallback<List<ApiService.Product>>() {
            @Override
            public void onSuccess(List<ApiService.Product> products) {
                Log.d(TAG, "Search results: " + products.size() + " items found");
                
                for (ApiService.Product product : products) {
                    Log.d(TAG, String.format("Found: %s, Price: %.2f", product.name, product.price));
                }
            }
            
            @Override
            public void onError(String error) {
                Log.e(TAG, "Search failed: " + error);
            }
        });
    }
    
    private void setupEdgeToEdge() {
        Window window = getWindow();
        
        // Включаем edge-to-edge режим
        WindowCompat.setDecorFitsSystemWindows(window, false);
        
        // Устанавливаем прозрачный статус-бар
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);
        
        // Настраиваем системные бары для современных Android
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            // Android 11+ - используем WindowInsetsController
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                // Показываем статус-бар и навигационную панель
                controller.show(WindowInsets.Type.systemBars());
                
                // Устанавливаем поведение системных баров
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_DEFAULT);
                
                // Автоматический стиль иконок в зависимости от контента
                controller.setSystemBarsAppearance(
                    0, // Не принудительно светлые или темные
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | 
                    WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                );
            }
        } else {
            // Android 10 и ниже - используем флаги
            int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                      View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                      View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN;
            
            window.getDecorView().setSystemUiVisibility(flags);
        }
        
        // Убираем флаг translucent
        window.clearFlags(
            WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS |
            WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION
        );
        
        // Добавляем флаг для отрисовки системных баров
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        
        System.out.println("=== EDGE-TO-EDGE SETUP COMPLETED ===");
        System.out.println("Status bar: TRANSPARENT");
        System.out.println("Navigation bar: TRANSPARENT");
        System.out.println("Edge-to-edge: ENABLED");
    }
    
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // НЕ скрываем системные бары - отключаем immersive mode
        // Пользователи должны видеть статус-бар и навигацию всегда
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        // Закрываем API сервис
        if (apiService != null) {
            apiService.shutdown();
        }
    }
}
