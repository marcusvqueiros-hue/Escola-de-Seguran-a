// Copia public/ (manifestos, service worker e ícones) para a raiz de dist/.
require("fs").cpSync("public", "dist", { recursive: true });
console.log("public/ copiado para dist/");
