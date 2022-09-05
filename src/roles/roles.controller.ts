import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  Query,
} from "@nestjs/common";
import { RolesService } from "./roles.service";
import { CreateRolesDTO } from "./dto";
import { GetRoleDTO } from "./dto/get-role.dto";
import { paginationParams } from "src/shared/types/paginationParams";

@Controller("roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  async CreateRoles(@Body() data: CreateRolesDTO) {
    return this.rolesService.create(data);
  }

  @Get()
  async findAll(
    @Query("search") search: string,
    @Query() { page, limit }: paginationParams,
  ) {
    return this.rolesService.findAll(page, limit, search);
  }

  @Get("/:id")
  async GetRole(@Param() dto: GetRoleDTO) {
    return this.rolesService.findOne(dto);
  }

  @Put("/:id")
  async PutRole(@Param() id: { id: string }, @Body() name: CreateRolesDTO) {
    return this.rolesService.update(id, name);
  }

  @Delete("/:id")
  async DeleteRole(@Param() id: { id: string }) {
    return this.rolesService.delete(id);
  }
}
