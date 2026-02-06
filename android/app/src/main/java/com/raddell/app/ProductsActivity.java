package com.raddell.app;

import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import java.util.ArrayList;
import java.util.List;

public class ProductsActivity extends AppCompatActivity {
    private static final String TAG = "ProductsActivity";
    private RecyclerView recyclerView;
    private ProgressBar progressBar;
    private ProductAdapter productAdapter;
    private ApiService apiService;
    private List<ApiService.Product> products;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Создаем простой layout программно
        recyclerView = new RecyclerView(this);
        progressBar = new ProgressBar(this);
        
        // Настраиваем RecyclerView
        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        
        // Создаем основной контейнер
        android.widget.FrameLayout mainLayout = new android.widget.FrameLayout(this);
        mainLayout.addView(progressBar);
        mainLayout.addView(recyclerView);
        
        // Настраиваем параметры для ProgressBar
        android.widget.FrameLayout.LayoutParams progressParams = 
            new android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.WRAP_CONTENT,
                android.widget.FrameLayout.LayoutParams.WRAP_CONTENT
            );
        progressParams.gravity = android.view.Gravity.CENTER;
        progressBar.setLayoutParams(progressParams);
        
        // Настраиваем параметры для RecyclerView
        android.widget.FrameLayout.LayoutParams recyclerParams = 
            new android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT
            );
        recyclerView.setLayoutParams(recyclerParams);
        
        setContentView(mainLayout);
        
        // Инициализируем
        apiService = new ApiService();
        products = new ArrayList<>();
        productAdapter = new ProductAdapter(this, products, this::onProductClick);
        recyclerView.setAdapter(productAdapter);
        
        // Загружаем товары
        loadProducts();
    }
    
    private void loadProducts() {
        showLoading(true);
        
        apiService.getProducts(new ApiService.ApiCallback<List<ApiService.Product>>() {
            @Override
            public void onSuccess(List<ApiService.Product> result) {
                runOnUiThread(() -> {
                    showLoading(false);
                    products.clear();
                    products.addAll(result);
                    productAdapter.updateProducts(products);
                    
                    Toast.makeText(ProductsActivity.this, 
                        "Загружено " + result.size() + " товаров", 
                        Toast.LENGTH_SHORT).show();
                });
            }
            
            @Override
            public void onError(String error) {
                runOnUiThread(() -> {
                    showLoading(false);
                    Toast.makeText(ProductsActivity.this, 
                        "Ошибка загрузки: " + error, 
                        Toast.LENGTH_LONG).show();
                });
            }
        });
    }
    
    private void showLoading(boolean show) {
        progressBar.setVisibility(show ? View.VISIBLE : View.GONE);
        recyclerView.setVisibility(show ? View.GONE : View.VISIBLE);
    }
    
    private void onProductClick(ApiService.Product product) {
        Log.d(TAG, "Clicked product: " + product.name);
        
        // Показываем детальную информацию о товаре
        String message = String.format(
            "%s\n\nЦена: %.2f₽%s\nКатегория: %s\nВ наличии: %d шт.\n\n%s",
            product.name,
            product.price,
            product.discount != null && product.discount > 0 
                ? String.format("\nСкидка: %d%%\nЦена со скидкой: %.2f₽", 
                    product.discount, 
                    product.price * (1 - product.discount / 100.0))
                : "",
            product.category,
            product.stock_quantity != null ? product.stock_quantity : 0,
            product.description != null && !product.description.isEmpty() 
                ? "Описание: " + product.description 
                : "Описание отсутствует"
        );
        
        new androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle(product.name)
            .setMessage(message)
            .setPositiveButton("OK", null)
            .show();
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (apiService != null) {
            apiService.shutdown();
        }
    }
}
