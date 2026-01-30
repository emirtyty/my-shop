package com.raddell.app;

import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Настраиваем edge-to-edge с прозрачным статус-баром
        setupEdgeToEdge();
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
}
