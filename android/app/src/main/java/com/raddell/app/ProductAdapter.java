package com.raddell.app;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import java.util.List;

public class ProductAdapter extends RecyclerView.Adapter<ProductAdapter.ProductViewHolder> {
    private List<ApiService.Product> products;
    private Context context;
    private OnProductClickListener listener;
    
    public interface OnProductClickListener {
        void onProductClick(ApiService.Product product);
    }
    
    public ProductAdapter(Context context, List<ApiService.Product> products, OnProductClickListener listener) {
        this.context = context;
        this.products = products;
        this.listener = listener;
    }
    
    @NonNull
    @Override
    public ProductViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(android.R.layout.simple_list_item_2, parent, false);
        return new ProductViewHolder(view);
    }
    
    @Override
    public void onBindViewHolder(@NonNull ProductViewHolder holder, int position) {
        ApiService.Product product = products.get(position);
        
        // Основная информация о товаре
        String title = product.name;
        if (product.discount != null && product.discount > 0) {
            double discountedPrice = product.price * (1 - product.discount / 100.0);
            title += String.format(" (%.0f%% OFF - %.2f₽)", product.discount, discountedPrice);
        } else {
            title += String.format(" - %.2f₽", product.price);
        }
        
        holder.titleText.setText(title);
        
        // Дополнительная информация
        String subtitle = "";
        if (!product.category.isEmpty()) {
            subtitle += "Категория: " + product.category;
        }
        if (product.stock_quantity != null && product.stock_quantity > 0) {
            if (!subtitle.isEmpty()) subtitle += " | ";
            subtitle += "В наличии: " + product.stock_quantity + " шт.";
        }
        
        holder.subtitleText.setText(subtitle);
        
        // Загрузка изображения (если понадобится добавить ImageView)
        // Для простоты пока пропускаем загрузку изображений
        // Picasso.get().load(product.image_url).into(holder.productImage);
        
        // Обработчик клика
        holder.itemView.setOnClickListener(v -> {
            if (listener != null) {
                listener.onProductClick(product);
            }
        });
    }
    
    @Override
    public int getItemCount() {
        return products.size();
    }
    
    public void updateProducts(List<ApiService.Product> newProducts) {
        this.products = newProducts;
        notifyDataSetChanged();
    }
    
    static class ProductViewHolder extends RecyclerView.ViewHolder {
        TextView titleText;
        TextView subtitleText;
        // ImageView productImage; // Можно добавить если нужно
        
        public ProductViewHolder(@NonNull View itemView) {
            super(itemView);
            titleText = itemView.findViewById(android.R.id.text1);
            subtitleText = itemView.findViewById(android.R.id.text2);
            // productImage = itemView.findViewById(R.id.productImage); // Добавить в layout
        }
    }
}
