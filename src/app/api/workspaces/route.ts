import { z } from "zod";
import { parseEnv } from "@/server/config/env";
import { createDatabaseClient } from "@/server/db/client";
import { apiErrorResponse, requireAuthenticatedUser } from "@/server/http/api";
import {
  createWorkspace,
  listUserWorkspaces
} from "@/server/workspace/workspace-service";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(["LABEL", "MANAGEMENT", "COMPANY", "AGENCY", "INTERNAL"]),
  idempotencyKey: z.string().min(8).max(128)
});

export async function GET(request: Request) {
  const env = parseEnv(process.env);
  const { client } = createDatabaseClient(env.DATABASE_URL);
  try {
    const user = await requireAuthenticatedUser(request);
    const workspaces = await listUserWorkspaces(client, user.id);
    return Response.json({ workspaces });
  } catch (error) {
    return apiErrorResponse(error);
  } finally {
    await client.end();
  }
}

export async function POST(request: Request) {
  const env = parseEnv(process.env);
  const { client } = createDatabaseClient(env.DATABASE_URL);
  try {
    const user = await requireAuthenticatedUser(request);
    const body = createSchema.parse(await request.json());
    const workspace = await createWorkspace(client, { userId: user.id, ...body });
    return Response.json({ workspace }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  } finally {
    await client.end();
  }
}
