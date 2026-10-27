import { spawn } from "child_process";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk, withUser } from "@/lib/api";

export const dynamic = "force-dynamic";

const APP = "/var/www/cop31";
const SCRIPT = `${APP}/scripts/deploy-from-admin.sh`;
const LOCK = "/tmp/cop31-admin-update.lock";
const LOG = "/tmp/cop31-admin-deploy.log";

function updateRunning() {
  if (!fs.existsSync(LOCK)) return false;
  const ageMs = Date.now() - fs.statSync(LOCK).mtimeMs;
  return ageMs < 45 * 60 * 1000;
}

export async function POST() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (user.role !== "ADMIN") return jsonError("Yetkiniz yok", 403);
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true, accountStatus: true, email: true },
  });
  if (!row || row.role !== "ADMIN" || row.accountStatus !== "Onaylandı") {
    return jsonError("Yetkiniz yok", 403);
  }
  if (process.platform !== "linux" || !fs.existsSync(SCRIPT)) {
    return jsonError("Bu düğme yalnızca canlı sitede çalışır.");
  }
  if (updateRunning()) return jsonError("Güncelleme zaten sürüyor.", 409);

  fs.appendFileSync(LOG, `${new Date().toISOString()} ${row.email}\n`);
  const child = spawn("bash", [SCRIPT], {
    cwd: APP,
    detached: true,
    stdio: "ignore",
  });
  child.on("error", () => undefined);
  child.unref();

  return jsonOk({
    ok: true,
    message: "Güncelleme başladı. Site birkaç dakika içinde yenilenir.",
  });
}
