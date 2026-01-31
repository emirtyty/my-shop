// IndexedDB для хранения избранных товаров

const DB_NAME = 'MarketplaceDB';
const DB_VERSION = 1;
const STORE_NAME = 'favorites';

export interface FavoriteItem {
  id: string;
  product_id: string;
  added_at: number;
}

class FavoritesDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('product_id', 'product_id', { unique: false });
          store.createIndex('added_at', 'added_at', { unique: false });
        }
      };
    });
  }

  async addToFavorites(productId: string): Promise<void> {
    if (!this.db) await this.init();
    
    const favoriteItem: FavoriteItem = {
      id: `fav_${productId}_${Date.now()}`,
      product_id: productId,
      added_at: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(favoriteItem);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromFavorites(productId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('product_id');
      const request = index.openCursor(IDBKeyRange.only(productId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async isFavorite(productId: string): Promise<boolean> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('product_id');
      const request = index.count(IDBKeyRange.only(productId));

      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => reject(request.error);
    });
  }

  async getFavoriteProductIds(): Promise<string[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const favorites = request.result as FavoriteItem[];
        resolve(favorites.map(fav => fav.product_id));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getFavoritesCount(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const favoritesDB = new FavoritesDB();
