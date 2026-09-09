const TOKEN_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generateAccessToken(length = 10): string {
  const randomValues = new Uint32Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    for (let i = 0; i < length; i += 1) {
      randomValues[i] = Math.floor(Math.random() * 0xffffffff);
    }
  }

  let token = "";
  for (let i = 0; i < length; i += 1) {
    token += TOKEN_ALPHABET[randomValues[i] % TOKEN_ALPHABET.length];
  }
  return token;
}
