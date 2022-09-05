import { Test, TestingModule } from "@nestjs/testing";
import { SqlConnectService } from "./sql-connect.service";

describe("SqlConnectService", () => {
  let service: SqlConnectService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SqlConnectService],
    }).compile();

    service = module.get<SqlConnectService>(SqlConnectService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
