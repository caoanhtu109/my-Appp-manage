import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import {
  EMPTY,
  lastValueFrom,
  map,
  mergeMap,
  Observable,
  of,
  tap,
  throwIfEmpty,
  switchMap,
  from,
  catchError,
} from "rxjs";
import { IUser, User } from "./interface";
import { Roles } from "../roles/interface";
import { SqlConnectService } from "../services/sql-connect/sql-connect.service";
import { CreateUser } from "./dto/create-user.dto";
import { UpdateUser } from "./dto/update-user.dto";
import { findAll, getAllProduct, ResponseData } from "../shared/types/response";

@Injectable()
export class UserService {
  constructor(private readonly sql: SqlConnectService) {}

  findAll(
    page = 1,
    limit = 2,
    search = "",
    role_id,
  ): Observable<findAll<IUser> | getAllProduct[]> {
    if (page <= 0) {
      page = 1;
    }
    const offset = (page - 1) * limit;
    const searchTxt = `%${search}%`;
    console.log(JSON.parse(`${role_id}`));
    if (JSON.parse(`${role_id}`).length !== 0) {
      try {
        role_id = JSON.parse(`${role_id}`);
      } catch (error) {
        throw new BadRequestException(error.detail);
      }
      const params = [role_id, searchTxt, offset, limit];
      const sqlQuery = this.sql.readFileSQL(
        "user/select-user-with-name-and-roleid.sql",
      );
      return this.sql.query1(sqlQuery, params).pipe(
        mergeMap((res) => {
          return this.sql
            .query1(
              this.sql.readFileSQL("user/select-id-with-name-and-roleid.sql"),
              [searchTxt, role_id],
            )
            .pipe(
              map((x) => {
                return {
                  status: "success",
                  message: "Get list successful",
                  data: res.rows,
                  currentPage: +page,
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
      const sqlQuery = this.sql.readFileSQL("user/select-user-with-name.sql");
      const params = [searchTxt, offset, limit];
      return this.sql.query1(sqlQuery, params).pipe(
        mergeMap((res) => {
          return this.sql
            .query1(this.sql.readFileSQL("user/select-id-with-name.sql"), [
              searchTxt,
            ])
            .pipe(
              map((x) => {
                return {
                  status: "success",
                  message: "Get list successful",
                  data: res.rows,
                  currentPage: +page,
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
    }
  }

  findOne(id: number) {
    const sqlQuery = this.sql.readFileSQL("user/selectUserById.sql");
    const params = [id];

    return this.sql.query1(sqlQuery, params).pipe(
      mergeMap((res) => (res.rows[0] ? of(res.rows[0] as User) : EMPTY)),
      throwIfEmpty(() => new NotFoundException(`Not found user by id: ${id}`)),
      map((data) => {
        return {
          status: "success",
          message: "Get user successfully",
          data,
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

  create(dto: CreateUser) {
    //password = 123456789
    const password =
      "$2a$10$8W2wBqiUJjeHQeZ09agZ.e8e4PYfy9XQPSvBF6r9/w4OpoGyRNduO";
    const sqlInsertProfile = this.sql.readFileSQL("profile/insert-profile.sql");
    const paramsProfile = [dto.firstname, dto.lastname, dto.phone, dto.address];
    const role_id = dto.roles;
    let idTemp;
    let idProfile;

    return this.sql.query1(sqlInsertProfile, paramsProfile).pipe(
      map((res) => res.rows[0].id),
      switchMap((id_profile) => {
        idProfile = id_profile;
        const sqlInsertUser = this.sql.readFileSQL("user/insertUser.sql");
        const paramsUser = [dto.email, password, id_profile];
        return this.sql.query1(sqlInsertUser, paramsUser).pipe(
          map((res) => res.rows[0].id),
          switchMap((id_user) => {
            idTemp = id_user;
            const sqlInserUser_Role = this.sql.readFileSQL(
              "user_role/insertUser_Role.sql",
            );
            if (role_id.length !== 0) {
              return from(role_id).pipe(
                switchMap((role) => {
                  const paramsUser_Role = [id_user, role];
                  return this.sql.query1(sqlInserUser_Role, paramsUser_Role);
                }),
              );
            }
          }),
          switchMap(() => {
            return this.findOne(idTemp).pipe(
              map((res) => res.data),
              map((data) => {
                return {
                  status: "success",
                  message: "Created user successfully",
                  data,
                };
              }),
            );
          }),
        );
      }),
      catchError((error) => {
        if (error.code === "23505") {
          const sqlDeleteProfile = this.sql.readFileSQL(
            "profile/delete-profile.sql",
          );
          this.sql.query1(sqlDeleteProfile, [idProfile]);
          throw new ConflictException("Email already exits");
        }
        throw new InternalServerErrorException();
      }),
    );
  }

  update(id: number, dto: UpdateUser) {
    const sqlUpdateUser = this.sql.readFileSQL("user/updateUser.sql");
    const paramsUser = [dto.email, id];

    return this.sql.query1(sqlUpdateUser, paramsUser).pipe(
      mergeMap((res) => (res.rowCount === 1 ? of(res) : EMPTY)),
      throwIfEmpty(() => new NotFoundException(`Not found user by id: ${id}`)),
      map((res) => res.rows[0].profile_id),
      switchMap((profile_id) => {
        const sqlUpdateProfile = this.sql.readFileSQL(
          "profile/update-profile.sql",
        );
        const paramsProfile = [
          dto.firstname,
          dto.lastname,
          dto.phone,
          dto.address,
          profile_id,
        ];
        return this.sql.query1(sqlUpdateProfile, paramsProfile);
      }),
      switchMap(() => {
        const sqlDeleteUser_Role = this.sql.readFileSQL(
          "user_role/deleteUser_RoleById.sql",
        );
        const paramDetele = [id];
        return this.sql.query1(sqlDeleteUser_Role, paramDetele);
      }),
      switchMap(() => {
        const sqlInsertUser_Role = this.sql.readFileSQL(
          "user_role/insertUser_Role.sql",
        );
        return from(dto.roles).pipe(
          switchMap((role) => {
            const paramsInsert = [id, role];
            return this.sql.query1(sqlInsertUser_Role, paramsInsert);
          }),
        );
      }),
      map(() => {
        return {
          status: "success",
          message: "Updated User successfully",
        };
      }),
      tap({
        error: (error) => {
          if (error.response) return error.response;
          if (error.code === "23505")
            throw new ConflictException("Email already exits");
          throw new InternalServerErrorException();
        },
      }),
    );
  }

  delete(id: number) {
    const sqlDeleteUser_Role = this.sql.readFileSQL(
      "user_role/deleteUser_RoleById.sql",
    );
    const params = [id];

    return this.sql.query1(sqlDeleteUser_Role, params).pipe(
      switchMap(() => {
        const sqlDeleteUser = this.sql.readFileSQL("user/deleteUserById.sql");
        return this.sql.query1(sqlDeleteUser, params).pipe(
          mergeMap((res) => (res.rowCount === 1 ? of(res) : EMPTY)),
          throwIfEmpty(
            () => new NotFoundException(`Not found user by id: ${id}`),
          ),
          map((res) => res.rows[0].profile_id),
          switchMap((profile_id) => {
            const sqlDeleteProfile = this.sql.readFileSQL(
              "profile/delete-profile.sql",
            );
            return this.sql.query1(sqlDeleteProfile, [profile_id]);
          }),
        );
      }),
      map(() => {
        return {
          status: "success",
          message: "Deleted successful",
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
}
