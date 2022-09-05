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
import { Observable } from "rxjs";
import { paginationParams } from "../shared/types/paginationParams";
import { CreateOrder, UpdateOrder } from "./dto";
import { OrderService } from "./order.service";

@Controller("orders")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  getAllOrder(@Query() { page, limit }: paginationParams) {
    return this.orderService.findAll(page, limit);
  }
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.orderService.findOne(id);
  }

  @Get(":id/detail")
  findDetailOfOrder(@Param("id", ParseIntPipe) id: number) {
    return this.orderService.findAllDetailOfOrder(id);
  }

  @Post()
  createOrder(@Body() dto: CreateOrder): Observable<unknown> {
    return this.orderService.create(dto);
  }

  @Put(":id")
  updateOrderDetail(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateOrder,
  ) {
    return this.orderService.updateOrder(id, dto);
  }

  @Put("/paying/:id")
  updateOrder(@Param("id", ParseIntPipe) id: number) {
    return this.orderService.updatePaying(id);
  }

  @Delete(":id")
  async deleteOrder(@Param("id", ParseIntPipe) id: number) {
    return this.orderService.deleteOrder(id);
  }
}
