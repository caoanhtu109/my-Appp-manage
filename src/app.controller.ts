import { Controller, Get, Param, Res } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Get("uploads/:imgpath")
  getHello(@Param("imgpath") image, @Res() res) {
    return res.sendFile(image, { root: "./uploads" });
  }
}
