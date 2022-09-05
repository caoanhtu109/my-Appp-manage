import { Test, TestingModule } from "@nestjs/testing";
import { RolesService } from "./roles.service";

describe("RolesService", () => {
  let provider: RolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesService],
    }).compile();

    provider = module.get<RolesService>(RolesService);
  });

  it("should be defined", () => {
    expect(provider).toBeDefined();
  });
});
