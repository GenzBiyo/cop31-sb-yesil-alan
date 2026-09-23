import { canManage } from "@/lib/auth";
import { jsonError, withUser } from "@/lib/api";
import { exportTodosWorkbook } from "@/lib/sheets";

export async function GET() {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  if (!canManage(user.role)) return jsonError("Yetkiniz yok", 403);
  const buf = await exportTodosWorkbook();
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="COP31-SB-kontrol-listesi.xlsx"',
    },
  });
}
