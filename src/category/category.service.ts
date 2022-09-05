import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import {
  catchError,
  EMPTY,
  lastValueFrom,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
  throwIfEmpty,
  tap,
} from "rxjs";
import { ResponseData } from "../shared/types/response";
import { SqlConnectService } from "../services/sql-connect/sql-connect.service";
import { Category } from "./interface";

@Injectable()
export class CategoryService {
  constructor(private readonly sql: SqlConnectService) {}

  findOne(id: number): Observable<ResponseData<Category>> {
    const sqlQuery = this.sql.readFileSQL("category/select-category-by-id.sql");
    const params = [id];

    return this.sql.query1(sqlQuery, params).pipe(
      mergeMap((res) => (res.rows[0] ? of(res.rows[0] as Category) : EMPTY)),
      throwIfEmpty(
        () => new NotFoundException(`Not found category by id: ${id}`),
      ),
      map((data) => {
        return {
          status: "success",
          message: "Get category successfully",
          data,
        };
      }),
    );
  }

  findAll(page, limit = 5, search = "") {
    if (!page) {
      const sqlQuery = this.sql.readFileSQL("category/select-category.sql");

      return this.sql.query1(sqlQuery).pipe(
        map((res) => ({
          status: "success",
          message: "Get list successfully",
          data: res.rows,
        })),
      );
    }

    const offset = (page - 1) * limit;
    const searchTxt = `%${search}%`;

    const sqlQuery = this.sql.readFileSQL(
      "category/search-category-by-name-pagination.sql",
    );
    const params = [searchTxt, offset, limit];

    return this.sql.query1(sqlQuery, params).pipe(
      map((res) => res.rows),
      map(async (data) => {
        const sqlQuery = this.sql.readFileSQL(
          "category/search-category-by-name.sql",
        );
        const params = [searchTxt];

        const num = await lastValueFrom(
          this.sql.query1(sqlQuery, params).pipe(map((res) => res.rowCount)),
        );

        return {
          status: "success",
          message: "Get list category successfully",
          data,
          currentPage: +page,
          totalPage: Math.ceil(num / limit),
          limit: +limit,
          totalCount: num,
        };
      }),
    );
  }

  create(name: string) {
    const sqlQuery = this.sql.readFileSQL("category/insert-category.sql");
    const params = [name];

    return this.sql.query1(sqlQuery, params).pipe(
      map((res) => {
        return {
          status: "success",
          message: "Created category successfully",
          data: {
            id: res.rows[0].id,
            name,
          },
        };
      }),
      tap({
        error: (error) => {
          if (error.code === "23505")
            throw new ConflictException("Name Category already exist");
          throw new InternalServerErrorException();
        },
      }),
    );
  }

  update(name: string, id: number) {
    const sqlQuery = this.sql.readFileSQL("category/update-category.sql");
    const params = [name, id];

    return this.sql.query1(sqlQuery, params).pipe(
      mergeMap((res) => (res.rowCount === 1 ? of(res) : EMPTY)),
      throwIfEmpty(
        () => new NotFoundException(`Not found category by id: ${id}`),
      ),
      map(() => ({
        status: "success",
        message: "Updated category successfully",
        data: {
          id,
          name,
        },
      })),
      catchError((err) => {
        if (err.response) return err.response;
        if (err.code === "23505")
          throw new ConflictException("Name Category already exists");
        throw new InternalServerErrorException();
      }),
    );
  }

  delete(id: number) {
    const sqlQuery = this.sql.readFileSQL(
      "product_category/select-product-category-by-category-id.sql",
    );
    const params = [id];

    return this.sql.query1(sqlQuery, params).pipe(
      map((res) => {
        if (res.rowCount !== 0)
          throw new ConflictException("Product category is already in use");
        return res;
      }),
      switchMap(async () => {
        const sqlQuery = this.sql.readFileSQL("category/delete-category.sql");
        const params = [id];

        return await lastValueFrom(
          this.sql.query1(sqlQuery, params).pipe(
            mergeMap((res) => (res.rowCount === 1 ? of(res) : EMPTY)),
            throwIfEmpty(
              () => new NotFoundException(`Not found category by id: ${id}`),
            ),
            map(() => ({
              status: "success",
              message: "Deleted category successfully",
            })),
          ),
        );
      }),
    );
  }
}
