export function slugify(name: string) {
  return name
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export const STANDARD_RULES = [
  {
    title: "Akreditasyon ve giriş listesi",
    body: "Sahada görev alacak tüm personelin adı, soyadı, T.C./pasaport no ve görevini 25 Ekim 2026'ya kadar iletiniz.",
    dueDate: "2026-10-25",
  },
  {
    title: "Stand / katkı teyidi",
    body: "Katkı türünüzü ve m² / elektrik / AV ihtiyaçlarını teyit ediniz.",
    dueDate: "2026-10-15",
  },
  {
    title: "Konuşmacı özgeçmişi ve fotoğraf",
    body: "Panelist ve moderatörlerin kısa özgeçmişi (TR/EN) ve fotoğrafını yükleyiniz.",
    dueDate: "2026-10-20",
  },
  {
    title: "Görsel kimlik ve materyal teslimi",
    body: "Video, pano ve dijital içerikler COP31 ve Sağlık Bakanlığı kimliğine uygun teslim edilir. Son teslim: 30 Ekim 2026.",
    dueDate: "2026-10-30",
  },
  {
    title: "Pavilion kullanım kuralları",
    body: "Sıfır atık ve tek kullanımlık plastik yasağına uyum zorunludur.",
    dueDate: "2026-10-10",
  },
  {
    title: "Teknik ihtiyaç formu",
    body: "Elektrik, internet, yayın ve sahne gereksinimlerini forma işleyiniz.",
    dueDate: "2026-10-18",
  },
];
