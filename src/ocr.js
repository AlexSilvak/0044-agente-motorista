// OCR em JavaScript (tesseract.js): funciona igual no navegador, Android e iOS.
// Carregado só quando o usuário escolhe um print, para não pesar a abertura do app.
// Na primeira leitura ele baixa o motor e o idioma da internet; depois o navegador guarda em cache.

export async function recognizeImage(file, onProgress) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (onProgress && m.status === "recognizing text") onProgress(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return data.text || "";
  } finally {
    await worker.terminate();
  }
}
