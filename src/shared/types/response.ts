export interface ResponseData<T> {
  status: string;
  message: string;
  data?: T;
}
export interface findAll<T> {
  status: string;
  message: string;
  data: T[];
  currentPage: number;
  limit: number;
  totalCount: number;
}

export interface getAllUser {
  lastname: string;
  firstname: string;
  id: number;
}

export interface getAllProduct {
  name: string;
  id: number;
  price: number;
}
