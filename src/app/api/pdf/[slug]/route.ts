import { pdfProgram, pdfEvents, pdfSpace, pdfCompanyKit } from "@/lib/pdf";
import { jsonError, withUser } from "@/lib/api";

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
  } else if (slug === "alan-plani") {
    buf = await pdfSpace();
    name = "COP31-SB-alan-plani";
  } else if (slug === "firma-dokuman") {
    buf = await pdfCompanyKit(user.companyId || undefined);
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
