import { Injectable, NotFoundException } from "@nestjs/common";
import {
  EMPTY,
  map,
  switchMap,
  mergeMap,
  Observable,
  of,
  throwIfEmpty,
  catchError,
  forkJoin,
  throwError,
} from "rxjs";
import { findAll, ResponseData } from "src/shared/types/response";
import { SqlConnectService } from "../services/sql-connect/sql-connect.service";
import { CreateOrder, UpdateOrder } from "./dto";
import { Order, OrderDetail } from "./interface";

@Injectable()
export class OrderService {
  constructor(private readonly sql: SqlConnectService) {}
  /**
   *
   * @param page
   * @param limit
   * @returns
   */
  findAll(page = 1, limit = 2): Observable<findAll<Order>> {
    const offset = (page - 1) * limit;
    const sqlSelectAllOrder = this.sql.readFileSQL(
      "order/select-all-order.sql",
    );
    const params = [offset, limit];
    const sqlTotalCount = this.sql.readFileSQL("order/count-order.sql");
    const a = {
      data: this.sql.query1(sqlSelectAllOrder, params),
      totalCount: this.sql.query1(sqlTotalCount),
    };
    return forkJoin(a).pipe(
      map(({ data, totalCount }) => {
        return {
          status: "success",
          message: "Get list successful",
          data: data.rows,
          currentPage: +page,
          limit: +limit,
          totalCount: +totalCount.rows[0].count,
        };
      }),
    );
  }
  /**
   *
   * @param order_id
   * @returns
   */
  findOne(order_id: number): Observable<ResponseData<Order>> {
    const sqlSelectOrder = this.sql.readFileSQL("order/select-order-by-id.sql");
    const params = [order_id];
    return this.sql.query1(sqlSelectOrder, params).pipe(
      mergeMap((res) => (res.rows[0] ? of(res.rows[0] as Order) : EMPTY)),
      throwIfEmpty(
        () => new NotFoundException(`Not found order by Id: ${order_id}`),
      ),
      map((data) => {
        return {
          status: "success",
          message: "Get order successfully",
          data,
        };
      }),
    );
  }

  /**
   *
   * @param dto
   * @returns
   */
  create(dto: CreateOrder): Observable<ResponseData<OrderDetail>> {
    let sqlSumTotalPrice = `SELECT sum(total_price) FROM (getPriceOfProduct) as total_prices;`;
    let getPriceOfProduct = ``;
    dto.product.forEach((id) => {
      getPriceOfProduct += ` SELECT price*${id.quantity} AS total_price FROM products where id = ${id.id} UNION ALL `;
    });
    sqlSumTotalPrice = sqlSumTotalPrice.replace(
      `getPriceOfProduct`,
      getPriceOfProduct.substring(0, getPriceOfProduct.length - 11),
    );
    return this.sql.query1(sqlSumTotalPrice).pipe(
      switchMap((sum) => {
        const sqlInsertOrder = this.sql.readFileSQL("order/insert-order.sql");
        const params = [dto.user_id, sum.rows[0].sum];
        let sqlInsertDetail = `insert into public.order_detail (order_id, product_id, quantity, price) 
        values getValuesDetail`;
        let getValuesDetail = ``;
        return this.sql.query1(sqlInsertOrder, params).pipe(
          map((res) => res.rows[0].id),
          switchMap((id) => {
            dto.product.forEach((e) => {
              getValuesDetail += ` (${id}, ${e.id}, ${e.quantity}, (select price from products where id = ${e.id}) ),`;
            });
            sqlInsertDetail = sqlInsertDetail.replace(
              `getValuesDetail`,
              getValuesDetail.substring(0, getValuesDetail.length - 1),
            );
            return this.sql.query1(sqlInsertDetail);
          }),
          switchMap(() => {
            return of({
              status: "success",
              message: "Created order detail successfully",
            });
          }),
          catchError((err) => {
            return throwError(() => new Error(err));
          }),
        );
      }),
    );
  }
  /**
   *
   * @param order_id
   * @param dto
   * @returns
   */
  updateOrder(order_id: number, dto: UpdateOrder) {
    const sqlStatus = this.sql.readFileSQL("order/select-status.sql");
    const sqlDeleteOrder = this.sql.readFileSQL(
      "order/delete-order-detail.sql",
    );
    const params = [order_id];
    const sqlUpdateOrder = this.sql.readFileSQL("order/update-order-price.sql");
    return this.sql.query1(sqlStatus, params).pipe(
      mergeMap((res) => (res.rowCount === 1 ? of(res) : EMPTY)),
      throwIfEmpty(
        () => new NotFoundException(`Not found order by id: ${order_id}`),
      ),
      switchMap((res) => {
        if (res.rows[0].status === "draft") {
          return this.sql.query1(sqlDeleteOrder, params).pipe(
            switchMap(() => {
              let sqlInsertDetail = `insert into public.order_detail (order_id, product_id, quantity, price)
              values getValuesDetail`;
              let getValuesDetail = ``;
              dto.product.forEach((e) => {
                if (e.quantity !== 0) {
                  getValuesDetail += ` (${order_id}, ${e.id}, ${e.quantity}, (select price from products where id = ${e.id}) ),`;
                }
              });
              sqlInsertDetail = sqlInsertDetail.replace(
                `getValuesDetail`,
                getValuesDetail.substring(0, getValuesDetail.length - 1),
              );
              return this.sql.query1(sqlInsertDetail).pipe(
                switchMap(() => {
                  return this.sql.query1(sqlUpdateOrder, params);
                }),
              );
            }),
            map(() => {
              return {
                status: "success",
                message: "update order successful",
              };
            }),
          );
        } else {
          return of({
            message: "Paid orders cannot be Update",
          });
        }
      }),
      catchError((err) => {
        if (err.code === "23503") {
          return `Not found product by id: ${order_id}`;
        }
        return throwError(() => new Error(err));
      }),
    );
  }

  /**
   *
   * @param order_id
   * @param page
   * @param limit
   * @returns
   */
  findAllDetailOfOrder(
    order_id: number,
    page = 1,
    limit = 2,
  ): Observable<findAll<Order>> {
    const offset = (page - 1) * limit;
    const sqlSelectAllDetails = this.sql.readFileSQL(
      "order/select-all-details-of-order.sql",
    );
    const paramsSelectAllDetails = [order_id, offset, limit];

    const sqlTotalCount = this.sql.readFileSQL("order/count-order-detail.sql");
    const paramsTotalCount = [order_id];
    const a = {
      data: this.sql.query1(sqlSelectAllDetails, paramsSelectAllDetails),
      totalCount: this.sql.query1(sqlTotalCount, paramsTotalCount),
    };

    return forkJoin(a).pipe(
      map(({ data, totalCount }) => {
        return {
          status: "success",
          message:
            "Get list of list of order: " + `${order_id}` + " successful",
          data: data.rows,
          currentPage: +page,
          limit: +limit,
          totalCount: +totalCount.rows[0].count,
        };
      }),
      catchError((err) => {
        return throwError(() => new Error(err));
      }),
    );
  }

  /**
   *
   * @param order_id
   * @returns
   */
  updatePaying(order_id: number) {
    const sqlUpdateStatus = this.sql.readFileSQL("order/update-status.sql");
    const params = [order_id];
    return this.sql.query1(sqlUpdateStatus, params).pipe(
      mergeMap((res) => (res.rowCount === 1 ? of(res) : EMPTY)),
      throwIfEmpty(
        () => new NotFoundException(`Not found user by id: ${order_id}`),
      ),
      map(() => {
        return {
          status: "success",
          message: "The order has been paid",
        };
      }),
    );
  }

  /**
   *
   * @param order_id
   * @returns
   */
  deleteOrder(order_id: number) {
    const sqlStatus = this.sql.readFileSQL("order/select-status.sql");
    const sqlDeleteDetail = this.sql.readFileSQL(
      "order/delete-order-detail.sql",
    );
    const sqlDeleteOrder = this.sql.readFileSQL("order/delete-order.sql");
    const params = [order_id];
    return this.sql.query1(sqlStatus, params).pipe(
      mergeMap((res) => (res.rowCount === 1 ? of(res) : EMPTY)),
      throwIfEmpty(
        () => new NotFoundException(`Not found order by id: ${order_id}`),
      ),
      switchMap((res) => {
        if (res.rows[0].status === "draft") {
          return this.sql.query1(sqlDeleteDetail, params).pipe(
            map(() => {
              return this.sql.query1(sqlDeleteOrder, params);
            }),
            switchMap(() => {
              return of({
                status: "success",
                message: "Deleted successful",
              });
            }),
          );
        } else {
          return of({
            message: "Paid orders cannot be deleted",
          });
        }
      }),
      catchError((err) => {
        return throwError(() => new Error(err));
      }),
    );
  }
}
