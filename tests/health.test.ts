import { describe,expect,it } from "vitest";import { GET } from "@/app/api/health/route";
describe("health route",()=>{it("returns an alive response",async()=>{const response=GET();expect(response.status).toBe(200);await expect(response.json()).resolves.toEqual({status:"ok",service:"lander-creators-web"});});});
