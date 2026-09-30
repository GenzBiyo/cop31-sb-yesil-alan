"use client";

import { useI18n } from "@/components/I18nProvider";

export default function SpacePage() {
  const { tx } = useI18n();
  return (
    <div className="space-y-4">
      <div className="flex justify-between flex-wrap gap-3">
        <div>
          <h1 className="display text-4xl">{tx("Alan planı")}</h1>
          <p className="text-[#57534e]">
            {tx("T.C. Sağlık Bakanlığı fuar standı. 16.000 mm × 5.000 mm, yükseklik 3.200 mm. Üstte ön görünüş, altta plan ve yan görünüşler.")}
          </p>
        </div>
        <a className="btn" href="/api/pdf/alan-plani">{tx("Alan planı PDF")}</a>
      </div>
      <div className="card p-3 overflow-auto bg-white">
        <img
          src="/brand/fuar-standi.jpg"
          alt="T.C. Sağlık Bakanlığı fuar standı tasarımı, ön görünüş ve plan"
          className="w-full h-auto min-w-[720px]"
        />
      </div>
      <div className="card p-4 text-sm text-[#1c1917] space-y-2">
        <p>
          <strong>{tx("Eşantiyon dağıtımı")}</strong>{" "}
          {tx("bilgilendirme standından (12) ve resepsiyon masasından (2) yapılır. Yalnızca Uygun kararı alan ürünler bu noktalardan çıkar. Geçiş alanına ve stand dışına ürün konmaz.")}
        </p>
        <p>
          <a className="text-[#0077C2] underline" href="/esantiyon">{tx("Eşantiyon ve İkram")}</a>
        </p>
      </div>
    </div>
  );
}
