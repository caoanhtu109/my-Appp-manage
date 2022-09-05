import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Console } from "console";
import {
  catchError,
  EMPTY,
  from,
  lastValueFrom,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
  tap,
  throwIfEmpty,
} from "rxjs";
import {
  findAll,
  getAllProduct,
  ResponseData,
} from "src/shared/types/response";
import { URL_IMAGE } from "../constants";
import { SqlConnectService } from "../services/sql-connect/sql-connect.service";
import { DeleteImageFile } from "../utils/deleteImageFile";
import { CreateProduct, UpdateProduct } from "./dto";
import { Product } from "./interface";

@Injectable()
export class ProductService {
  constructor(private readonly sql: SqlConnectService) {}

  findAll(
    page = 1,
    limit = 5,
    search = "",
    category_id,
  ): Observable<findAll<Product> | getAllProduct[]> {
    if (page <= 0) {
      page = 1;
    }
    const offset = (page - 1) * limit;
    const searchTxt = `%${search}%`;

    if (JSON.parse(`${category_id}`).length !== 0) {
      const sqlQuery = this.sql.readFileSQL(
        "product/select-product-with-name-and-categoryid.sql",
      );
      try {
        category_id = JSON.parse(`${category_id}`);
      } catch (error) {
        throw new BadRequestException(error.detail);
      }
      const params = [category_id, searchTxt, offset, limit];
      return this.sql.query1(sqlQuery, params).pipe(
        mergeMap((res) => {
          const sqlQuery = this.sql.readFileSQL(
            "product/select-id-with-name-and-categoryid.sql",
          );
          const params = [category_id, searchTxt];

          return this.sql.query1(sqlQuery, params).pipe(
            map((x) => {
              return {
                status: "success",
                message: "Get list product successfully",
                data: res.rows,
                currentPage: +page,
                totalPage: Math.ceil(x.rowCount / limit),
                limit: +limit,
                totalCount: x.rowCount,
              };
            }),
          );
        }),
        tap({
          error: (error) => {
            if (error.response) return error.response;
            if (error.code === "23505")
              throw new BadRequestException(error.detail);
            throw new InternalServerErrorException();
          },
        }),
      );
    } else {
      const sqlQuery = this.sql.readFileSQL(
        "product/select-product-with-name.sql",
      );
      const params = [searchTxt, offset, limit];
      return this.sql.query1(sqlQuery, params).pipe(
        mergeMap((res) => {
          const sqlQuery = this.sql.readFileSQL(
            "product/select-id-with-name.sql",
          );
          const params = [searchTxt];

          return this.sql.query1(sqlQuery, params).pipe(
            map((x) => {
              return {
                status: "success",
                message: "Get list product successfully",
                data: res.rows,
                currentPage: +page,
                totalPage: Math.ceil(x.rowCount / limit),
                limit: +limit,
                totalCount: x.rowCount,
              };
            }),
            tap({
              error: (error) => {
                if (error.response) return error.response;
                if (error.code === "23505")
                  throw new BadRequestException(error.detail);
                throw new InternalServerErrorException();
              },
            }),
          );
        }),
      );
    }
  }

  findOne(id: number): Observable<ResponseData<Product>> {
    const sqlQuery = this.sql.readFileSQL("product/select-product-by-id.sql");
    const params = [id];

    return this.sql.query1(sqlQuery, params).pipe(
      mergeMap((res) => {
        return res.rows[0] ? of(res.rows[0] as Product) : EMPTY;
      }),
      throwIfEmpty(
        () => new NotFoundException(`Not found product by id: ${id}`),
      ),
      map((data) => {
        // console.log(data);
        return {
          status: "success",
          message: "Get product successfully",
          data: data,
        };
      }),
      tap({
        error: (error) => {
          if (error.response) return error.response;
          if (error.code === "23505")
            throw new BadRequestException(error.detail);
          throw new InternalServerErrorException();
        },
      }),
    );
  }

  create(dto: CreateProduct, path: string) {
    const sqlQuery = this.sql.readFileSQL("product/insert-product.sql");
    const params = [
      dto.name,
      dto.description,
      +dto.price,
      `${URL_IMAGE}${path}`,
    ];
    let idProduct;
    return this.sql.query1(sqlQuery, params).pipe(
      map((res) => res.rows[0].id),
      switchMap((id) => {
        idProduct = id;
        const arrCate = dto.category.split(",").map((e) => +e);
        const sqlInsert =
          "insert into product_category(product_id, category_id) values ";
        let sqlValue = "";
        arrCate.forEach((category_id) => {
          sqlValue += ` (${id}, ${category_id}),`;
        });
        sqlValue = sqlValue.substring(0, sqlValue.length - 1);
        return this.sql.query1(sqlInsert + sqlValue);
      }),
      switchMap(() => {
        return this.findOne(idProduct).pipe(
          map((res) => res.data),
          map((data) => {
            return {
              status: "success",
              message: "Created product successfully",
              data,
            };
          }),
        );
      }),
      tap({
        error: (error) => {
          if (error.response) return error.response;
          if (error.code === "23505")
            throw new ConflictException("Name already exits");
          throw new InternalServerErrorException();
        },
      }),
    );
  }

  update(id: number, dto: UpdateProduct, path?: string) {
    return this.findOne(id).pipe(
      map((res) => res.data),
      mergeMap((data) => {
        const url = data.image;
        const paths = "uploads" + url.split("uploads")[1];
        const sqlQuery = this.sql.readFileSQL("product/update-product.sql");
        const params = [
          dto.name,
          dto.description,
          +dto.price,
          path ? `${URL_IMAGE}${path}` : url,
          id,
        ];
        return this.sql.query1(sqlQuery, params).pipe(
          mergeMap((res) => (res.rowCount === 1 ? of(res) : EMPTY)),
          throwIfEmpty(
            () => new NotFoundException(`Not found user by id: ${id}`),
          ),
          switchMap(() => {
            if (path && url !== "") DeleteImageFile(paths);
            const sqlQueryDel = this.sql.readFileSQL(
              "product_category/delete-product-category-by-product-id.sql",
            );
            const params = [id];
            return this.sql.query1(sqlQueryDel, params).pipe(
              switchMap(() => {
                const sqlQueryIns = this.sql.readFileSQL(
                  "product_category/insert-product-category.sql",
                );
                const newCategory = dto.category.split(",").map((e) => +e);
                return from(newCategory).pipe(
                  switchMap((cate) => {
                    const params = [id, cate];
                    return this.sql.query1(sqlQueryIns, params);
                  }),
                );
              }),
              map(() => {
                return {
                  status: "success",
                  message: "Updated product successfully",
                };
              }),
            );
          }),
        );
      }),
      tap({
        error: (error) => {
          if (path) DeleteImageFile(path);
          if (error.response) return error.response;
          if (error.code === "23505")
            throw new ConflictException("Name product already exits");
          throw new InternalServerErrorException();
        },
      }),
    );
  }

  delete(id: number) {
    return this.findOne(id).pipe(
      map((res) => res.data),
      switchMap((data) => {
        const sqlQuery = this.sql.readFileSQL(
          "product_category/delete-product-category-by-product-id.sql",
        );
        const params = [data.id];

        return this.sql.query1(sqlQuery, params).pipe(
          switchMap(() => {
            const sqlQuery = this.sql.readFileSQL(
              "product/delete-product-by-id.sql",
            );
            const params = [id];
            return this.sql.query1(sqlQuery, params).pipe(
              mergeMap((res) => (res.rowCount === 1 ? of(res) : EMPTY)),
              throwIfEmpty(
                () => new NotFoundException(`Not found user by id: ${id}`),
              ),
              map(() => {
                const url = data.image;
                const paths = "uploads" + url.split("uploads")[1];
                if (url) {
                  DeleteImageFile(paths);
                }
                return {
                  status: "success",
                  message: "Deleted product successfully",
                };
              }),
            );
          }),
          tap({
            error: (error) => {
              if (error.response) return error.response;
              if (error.code === "23505")
                throw new BadRequestException(error.detail);
              throw new InternalServerErrorException();
            },
          }),
        );
      }),
    );
  }
}
