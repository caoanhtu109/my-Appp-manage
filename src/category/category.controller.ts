import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { paginationParams } from "src/shared/types/paginationParams";
import { CategoryService } from "./category.service";
import { CreateCategory, UpdateCategory } from "./dto";

@Controller("categories")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  findAll(
    @Query("search") search: string,
    @Query() { page, limit }: paginationParams,
  ) {
    return this.categoryService.findAll(page, limit, search);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.categoryService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCategory) {
    return this.categoryService.create(dto.name);
  }

  @Put(":id")
  update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateCategory) {
    return this.categoryService.update(dto.name, id);
  }

  @Delete(":id")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.categoryService.delete(id);
  }
}
