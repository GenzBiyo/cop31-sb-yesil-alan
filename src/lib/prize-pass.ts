export const PAVILION_QR_PATH = "/hediye";
export const PRIZE_MESSAGE = "Sağlık Bakanlığı Pavilyonuna Git, Ekranı Göster, Hediyeni Al!";

export function prizePassPath(spinId: string) {
  return `/hediye/p/${spinId}`;
}
