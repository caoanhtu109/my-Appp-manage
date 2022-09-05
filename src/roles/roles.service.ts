import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { SqlConnectService } from "../services/sql-connect/sql-connect.service";
import { CreateRolesDTO } from "./dto";
import { GetRoleDTO } from "./dto/get-role.dto";
import {
  EMPTY,
  lastValueFrom,
  map,
  mergeMap,
  of,
  tap,
  throwIfEmpty,
} from "rxjs";

@Injectable()
export class RolesService {
  constructor(private readonly sql: SqlConnectService) {}

  create(data: CreateRolesDTO) {
    const sqlQuery = this.sql.readFileSQL("roles/insertRole.sql");
    return this.sql.query1(sqlQuery, [data.name]).pipe(
      map((res) => ({
        status: "success",
        data: {
          id: res.rows[0].id,
          name: data.name,
        },
      })),
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

  findAll(page = 1, limit = 5, search = "") {
    const offset = (page - 1) * limit;
    const searchTxt = `%${search}%`;
    const sqlQuery = this.sql.readFileSQL("roles/searchRole.sql");
    const sqlQueryAll = this.sql.readFileSQL("roles/selectAll.sql");
    return this.sql.query1(sqlQuery, [searchTxt, offset, limit]).pipe(
      map((res) => res.rows),
      map(async (data) => {
        const totalCount = await lastValueFrom(
          this.sql.query1(sqlQueryAll).pipe(map((x) => x.rowCount)),
        );
        return {
          status: "success",
          message: "Get list successful",
          data,
          currentPage: +page,
          totalPage: Math.ceil(totalCount / limit),
          limit,
          totalCount,
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

  findOne(dto: GetRoleDTO) {
    const sqlQuery = this.sql.readFileSQL("roles/selectById.sql");
    return this.sql.query1(sqlQuery, [dto.id]).pipe(
      mergeMap((res) => (res.rows[0] ? of(res.rows[0]) : EMPTY)),
      throwIfEmpty(
        () => new NotFoundException(`Not Found role by id: ${dto.id}`),
      ),
      map((role) => ({
        status: "success",
        data: {
          id: role.id,
          name: role.name,
        },
      })),
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

  update(id: { id: string }, name: CreateRolesDTO) {
    const sqlQuery = this.sql.readFileSQL("roles/updateRole.sql");
    return this.sql.query1(sqlQuery, [name.name, id.id]).pipe(
      mergeMap((res) => (res.rowCount === 1 ? of(res.rowCount) : EMPTY)),
      throwIfEmpty(
        () => new NotFoundException(`Not found role by id:${id.id}`),
      ),
      map(() => ({
        status: "success",
        message: "Update role successfully",
      })),
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

  delete(id: { id: string }) {
    const sqlQuery = this.sql.readFileSQL("roles/deleteRole.sql");
    return this.sql.query1(sqlQuery, [id.id]).pipe(
      mergeMap((res) => (res.rowCount === 1 ? of(res.rowCount) : EMPTY)),
      throwIfEmpty(
        () => new NotFoundException(`Not Found Role by id: ${id.id}`),
      ),
      map(() => ({
        status: "success",
        message: "Delete role successfully",
      })),
      tap({
        error: (error) => {
          if (error.response) return error.response;
          if (error.code === "23505")
            throw new BadRequestException(error.detail);
          if (error.code === "23503")
            throw new ConflictException("Role is already in use");
          throw new InternalServerErrorException();
        },
      }),
    );
  }
}
