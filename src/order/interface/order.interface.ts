import { Product } from "src/product/interface";
import { Users } from "src/user/interface";

export interface Order {
  id: number;
  user_id: number;
  user_name: string;
  totalPrice: number;
  status: string;
}
export interface IOrder {
  id: string;
  user_id: string;
  totalPrice: number;
  users: Users[];
  products: Product[];
  status: string;
}

export interface OrderDetail {
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
}

export interface IItem {
  product_id: number;
  quantity: number;
  price: number;
  create_at: string;
  update_at: string;
}
export interface Items {
  product: IItem[];
  into_money: number;
}
