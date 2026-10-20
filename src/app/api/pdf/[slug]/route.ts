import fs from "fs";
import path from "path";
import { pdfProgram, pdfEvents, pdfCompanyKit } from "@/lib/pdf";
import { jsonError, withUser } from "@/lib/api";

function uploadedPrep() {
  const file = path.join(process.cwd(), "public", "uploads", "docs", "firma-hazirlik.pdf");
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { user, error } = await withUser();
  if (error || !user) return error!;
  const { slug } = await ctx.params;
  let buf: Buffer;
  let name = slug;
  if (slug === "program") {
    buf = await pdfProgram();
    name = "COP31-SB-program";
  } else if (slug === "etkinlikler") {
    buf = await pdfEvents();
    name = "COP31-SB-etkinlikler";
  } else if (slug === "firma-dokuman") {
    buf = uploadedPrep() || (await pdfCompanyKit(user.companyId || undefined));
    name = "COP31-SB-firma-hazirlik";
  } else {
    return jsonError("Bilinmeyen döküman", 404);
  }
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}.pdf"`,
    },
  });
}
