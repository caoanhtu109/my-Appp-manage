import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Request,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { paginationParams } from "../shared/types/paginationParams";
import { CreateUser } from "./dto";
import { UpdateUser } from "./dto";
import { JwtService } from "@nestjs/jwt";
import { SECRETKEY_ACCESS } from "../constants";

@Controller("user")
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly jwt: JwtService,
  ) {}

  @Get()
  getUsers(
    @Query("search") search: string,
    @Query("role") role_id: number[] | null,
    @Query() { page, limit }: paginationParams,
  ) {
    return this.userService.findAll(page, limit, search, role_id);
  }

  @Get("token")
  async getUserByToken(@Request() req) {
    let token = req.headers.authorization;
    token = token.replace("Bearer ", "");
    const payload = await this.jwt.verifyAsync(token, {
      secret: SECRETKEY_ACCESS,
    });
    return this.userService.findOne(payload.id);
  }

  @Get(":id")
  async getUser(@Param("id", ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Post()
  async postUser(@Body() dto: CreateUser) {
    return this.userService.create(dto);
  }

  @Put(":id")
  async putUser(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateUser,
  ) {
    return this.userService.update(id, dto);
  }

  @Delete(":id")
  async deleteUser(@Param("id", ParseIntPipe) id: number) {
    return this.userService.delete(id);
  }
}
