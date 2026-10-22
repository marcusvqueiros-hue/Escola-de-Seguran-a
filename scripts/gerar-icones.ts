// Gera os ícones do PWA a partir do logotipo oficial: bun run icones
import sharp from "sharp";

const origem = "src/assets/logo-cgb.png";
const simbolo = await sharp(origem).extract({ left: 0, top: 0, width: 398, height: 596 }).png().toBuffer();

async function icone(tam: number, proporcao: number, arquivo: string) {
  const altura = Math.round(tam * proporcao);
  const img = await sharp(simbolo).resize({ height: altura }).png().toBuffer();
  await sharp({ create: { width: tam, height: tam, channels: 4, background: "#ffffff" } })
    .composite([{ input: img, gravity: "center" }])
    .png()
    .toFile(`public/icons/${arquivo}`);
}

await icone(192, 0.72, "icon-192.png");
await icone(512, 0.72, "icon-512.png");
await icone(512, 0.55, "maskable-512.png"); // dentro da zona segura de ícones adaptativos
await icone(180, 0.72, "apple-touch-icon.png");
console.log("ícones gerados em public/icons");
