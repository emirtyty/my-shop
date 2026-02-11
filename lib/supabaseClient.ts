import { createClient } from "@supabase/supabase-js";

// Typed product model that matches the `products` table.
export interface Product {
  id: string;
  title: string;
  price: number;
  rating: number | null;
  discount: number | null;
  image_url: string | null;
  seller_telegram: string | null;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

// Shared browser client for public product reads.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Data access layer for product grid.
export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id,title,price,rating,discount,image_url,seller_telegram")
    .order("id", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Product[];
}

