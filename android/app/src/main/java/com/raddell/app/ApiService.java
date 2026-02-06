package com.raddell.app;

import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ApiService {
    private static final String BASE_URL = "https://peterka.netlify.app/api";
    private static final String TAG = "ApiService";
    private ExecutorService executor;
    
    public interface ApiCallback<T> {
        void onSuccess(T result);
        void onError(String error);
    }
    
    public ApiService() {
        executor = Executors.newFixedThreadPool(4);
    }
    
    // Модель данных для товара
    public static class Product {
        public String id;
        public String name;
        public String image_url;
        public double price;
        public Integer discount;
        public String category;
        public Integer stock_quantity;
        public String description;
        public String seller_id;
        
        public Product(JSONObject json) {
            try {
                this.id = json.getString("id");
                this.name = json.getString("name");
                this.image_url = json.getString("image_url");
                this.price = json.getDouble("price");
                this.discount = json.optInt("discount", 0);
                this.category = json.optString("category", "");
                this.stock_quantity = json.optInt("stock_quantity", 0);
                this.description = json.optString("description", "");
                this.seller_id = json.optString("seller_id", "");
            } catch (Exception e) {
                Log.e(TAG, "Error parsing product", e);
            }
        }
    }
    
    // Модель данных для истории
    public static class Story {
        public String id;
        public String title;
        public String image_url;
        public String link;
        public String seller_id;
        public String created_at;
        
        public Story(JSONObject json) {
            try {
                this.id = json.getString("id");
                this.title = json.getString("title");
                this.image_url = json.getString("image_url");
                this.link = json.optString("link", "");
                this.seller_id = json.optString("seller_id", "");
                this.created_at = json.optString("created_at", "");
            } catch (Exception e) {
                Log.e(TAG, "Error parsing story", e);
            }
        }
    }
    
    // Модель данных для продавца
    public static class Seller {
        public String id;
        public String name;
        public String avatar_url;
        public String telegram_url;
        public String vk_url;
        public String whatsapp_url;
        public String instagram_url;
        
        public Seller(JSONObject json) {
            try {
                this.id = json.getString("id");
                this.name = json.getString("name");
                this.avatar_url = json.optString("avatar_url", "");
                this.telegram_url = json.optString("telegram_url", "");
                this.vk_url = json.optString("vk_url", "");
                this.whatsapp_url = json.optString("whatsapp_url", "");
                this.instagram_url = json.optString("instagram_url", "");
            } catch (Exception e) {
                Log.e(TAG, "Error parsing seller", e);
            }
        }
    }
    
    // Получить все товары
    public void getProducts(ApiCallback<List<Product>> callback) {
        executor.execute(() -> {
            try {
                String response = makeHttpRequest(BASE_URL + "/products");
                JSONObject json = new JSONObject(response);
                
                if (json.getBoolean("success")) {
                    JSONArray productsArray = json.getJSONArray("data");
                    List<Product> products = new ArrayList<>();
                    
                    for (int i = 0; i < productsArray.length(); i++) {
                        products.add(new Product(productsArray.getJSONObject(i)));
                    }
                    
                    callback.onSuccess(products);
                } else {
                    callback.onError("API returned error: " + json.optString("error"));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error getting products", e);
                callback.onError("Error: " + e.getMessage());
            }
        });
    }
    
    // Поиск товаров
    public void searchProducts(String query, ApiCallback<List<Product>> callback) {
        executor.execute(() -> {
            try {
                String url = BASE_URL + "/search?q=" + java.net.URLEncoder.encode(query, "UTF-8");
                String response = makeHttpRequest(url);
                JSONObject json = new JSONObject(response);
                
                if (json.getBoolean("success")) {
                    JSONArray productsArray = json.getJSONArray("data");
                    List<Product> products = new ArrayList<>();
                    
                    for (int i = 0; i < productsArray.length(); i++) {
                        products.add(new Product(productsArray.getJSONObject(i)));
                    }
                    
                    callback.onSuccess(products);
                } else {
                    callback.onError("API returned error: " + json.optString("error"));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error searching products", e);
                callback.onError("Error: " + e.getMessage());
            }
        });
    }
    
    // Получить истории
    public void getStories(ApiCallback<List<Story>> callback) {
        executor.execute(() -> {
            try {
                String response = makeHttpRequest(BASE_URL + "/stories");
                JSONObject json = new JSONObject(response);
                
                if (json.getBoolean("success")) {
                    JSONArray storiesArray = json.getJSONArray("data");
                    List<Story> stories = new ArrayList<>();
                    
                    for (int i = 0; i < storiesArray.length(); i++) {
                        stories.add(new Story(storiesArray.getJSONObject(i)));
                    }
                    
                    callback.onSuccess(stories);
                } else {
                    callback.onError("API returned error: " + json.optString("error"));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error getting stories", e);
                callback.onError("Error: " + e.getMessage());
            }
        });
    }
    
    // Получить продавцов
    public void getSellers(ApiCallback<List<Seller>> callback) {
        executor.execute(() -> {
            try {
                String response = makeHttpRequest(BASE_URL + "/sellers");
                JSONObject json = new JSONObject(response);
                
                if (json.getBoolean("success")) {
                    JSONArray sellersArray = json.getJSONArray("data");
                    List<Seller> sellers = new ArrayList<>();
                    
                    for (int i = 0; i < sellersArray.length(); i++) {
                        sellers.add(new Seller(sellersArray.getJSONObject(i)));
                    }
                    
                    callback.onSuccess(sellers);
                } else {
                    callback.onError("API returned error: " + json.optString("error"));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error getting sellers", e);
                callback.onError("Error: " + e.getMessage());
            }
        });
    }
    
    // Проверка здоровья API
    public void checkHealth(ApiCallback<String> callback) {
        executor.execute(() -> {
            try {
                String response = makeHttpRequest(BASE_URL + "/health");
                JSONObject json = new JSONObject(response);
                
                if (json.getBoolean("success")) {
                    callback.onSuccess(json.getString("message"));
                } else {
                    callback.onError("API health check failed");
                }
            } catch (Exception e) {
                Log.e(TAG, "Error checking health", e);
                callback.onError("Error: " + e.getMessage());
            }
        });
    }
    
    // HTTP запрос
    private String makeHttpRequest(String urlString) throws Exception {
        URL url = new URL(urlString);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        
        connection.setRequestMethod("GET");
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("Accept", "application/json");
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(10000);
        
        int responseCode = connection.getResponseCode();
        Log.d(TAG, "HTTP Response Code: " + responseCode + " for URL: " + urlString);
        
        if (responseCode == HttpURLConnection.HTTP_OK) {
            BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
            StringBuilder response = new StringBuilder();
            String line;
            
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            reader.close();
            
            return response.toString();
        } else {
            throw new Exception("HTTP error code: " + responseCode);
        }
    }
    
    public void shutdown() {
        if (executor != null) {
            executor.shutdown();
        }
    }
}
