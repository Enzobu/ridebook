import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

interface HealthResponse {
  service: string;
  status: "ok";
}

@ApiTags("health")
@Controller()
export class AppController {
  @Get("health")
  @ApiOkResponse({ description: "Process liveness" })
  health(): HealthResponse {
    return { service: "api", status: "ok" };
  }

  @Get("ready")
  @ApiOkResponse({ description: "Readiness probe" })
  ready(): HealthResponse {
    return { service: "api", status: "ok" };
  }
}
