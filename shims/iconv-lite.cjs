// Substituto mínimo do iconv-lite para o Cloudflare Workers.
//
// O iconv-lite original quebra no bundle do Workers: o package.json dele manda ignorar ./streams
// ("browser" field) e o código chama require("./streams")(iconv) mesmo assim.
// Quem usa o iconv-lite aqui é o express.json() / express.urlencoded() (body-parser -> raw-body),
// e eles só precisam de um decodificador. Na prática chega só UTF-8, e o TextDecoder do runtime resolve.

function decoderFor(encoding) {
  try {
    return new TextDecoder(encoding);
  } catch {
    // Mesma mensagem do iconv-lite: o raw-body a reconhece e responde 415 em vez de erro 500.
    throw new Error('Encoding not recognized: ' + encoding);
  }
}

function getDecoder(encoding) {
  const decoder = decoderFor(encoding);
  return {
    write: (chunk) => decoder.decode(chunk, { stream: true }),
    end: () => decoder.decode(),
  };
}

function encodingExists(encoding) {
  try {
    new TextDecoder(encoding);
    return true;
  } catch {
    return false;
  }
}

function decode(buffer, encoding = 'utf-8') {
  return decoderFor(encoding).decode(buffer);
}

function encode(text) {
  return Buffer.from(String(text), 'utf8');
}

module.exports = { getDecoder, encodingExists, decode, encode };