import { Roles } from "../../roles/interface/index";

export interface User {
  id: number;
  fisrtname: string;
  lastname: string;
  email: string;
  password: number;
  phone: string;
  address: string;
}

export interface IUser {
  id: number;
  fisrtname: string;
  lastname: string;
  email: string;
  password?: number;
  phone: string;
  address: string;
  roles: Roles[];
}

export interface Users {
  id: number;
  name: string;
}
