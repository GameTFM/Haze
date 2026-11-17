var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/jose/dist/webapi/lib/buffer_utils.js
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var strictDecoder = new TextDecoder("utf-8", { fatal: true });
var UINT32_RANGE = 2 ** 32;
function concat(...buffers) {
  const size = buffers.reduce((acc, { length }) => acc + length, 0), buf = new Uint8Array(size);
  let i = 0;
  for (const buffer of buffers)
    buf.set(buffer, i), i += buffer.length;
  return buf;
}
var NON_ASCII = /[^\x00-\x7f]/;
function encode(string) {
  if (typeof string == "string" && string.length >= 128) {
    if (NON_ASCII.test(string))
      throw new TypeError("non-ASCII string encountered in encode()");
    return encoder.encode(string);
  }
  const bytes = new Uint8Array(string.length);
  for (let i = 0; i < string.length; i++) {
    const code = string.charCodeAt(i);
    if (code > 127)
      throw new TypeError("non-ASCII string encountered in encode()");
    bytes[i] = code;
  }
  return bytes;
}
function decodeBase64(encoded, url = false) {
  if (Uint8Array.fromBase64)
    return Uint8Array.fromBase64(encoded, { alphabet: url ? "base64url" : "base64" });
  if (url) {
    if (encoded.includes("+") || encoded.includes("/"))
      throw new TypeError("Invalid base64url");
    encoded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  }
  const binary = atob(encoded), bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++)
    bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// node_modules/jose/dist/webapi/util/errors.js
var errors_exports = {};
__export(errors_exports, {
  JOSEAlgNotAllowed: () => JOSEAlgNotAllowed,
  JOSEError: () => JOSEError,
  JOSENotSupported: () => JOSENotSupported,
  JWEDecryptionFailed: () => JWEDecryptionFailed,
  JWEInvalid: () => JWEInvalid,
  JWKInvalid: () => JWKInvalid,
  JWKSInvalid: () => JWKSInvalid,
  JWKSMultipleMatchingKeys: () => JWKSMultipleMatchingKeys,
  JWKSNoMatchingKey: () => JWKSNoMatchingKey,
  JWKSTimeout: () => JWKSTimeout,
  JWSInvalid: () => JWSInvalid,
  JWSSignatureVerificationFailed: () => JWSSignatureVerificationFailed,
  JWTClaimValidationFailed: () => JWTClaimValidationFailed,
  JWTExpired: () => JWTExpired,
  JWTInvalid: () => JWTInvalid
});
var JOSEError = class extends Error {
  static code = "ERR_JOSE_GENERIC";
  code = "ERR_JOSE_GENERIC";
  constructor(message2, options) {
    super(message2, options), this.name = this.constructor.name, Error.captureStackTrace?.(this, this.constructor);
  }
};
var JWTClaimValidationFailed = class extends JOSEError {
  static code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  claim;
  reason;
  payload;
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } }), this.claim = claim, this.reason = reason, this.payload = payload;
  }
};
var JWTExpired = class extends JOSEError {
  static code = "ERR_JWT_EXPIRED";
  code = "ERR_JWT_EXPIRED";
  claim;
  reason;
  payload;
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } }), this.claim = claim, this.reason = reason, this.payload = payload;
  }
};
var JOSEAlgNotAllowed = class extends JOSEError {
  static code = "ERR_JOSE_ALG_NOT_ALLOWED";
  code = "ERR_JOSE_ALG_NOT_ALLOWED";
};
var JOSENotSupported = class extends JOSEError {
  static code = "ERR_JOSE_NOT_SUPPORTED";
  code = "ERR_JOSE_NOT_SUPPORTED";
};
var JWEDecryptionFailed = class extends JOSEError {
  static code = "ERR_JWE_DECRYPTION_FAILED";
  code = "ERR_JWE_DECRYPTION_FAILED";
  constructor(message2 = "decryption operation failed", options) {
    super(message2, options);
  }
};
var JWEInvalid = class extends JOSEError {
  static code = "ERR_JWE_INVALID";
  code = "ERR_JWE_INVALID";
};
var JWSInvalid = class extends JOSEError {
  static code = "ERR_JWS_INVALID";
  code = "ERR_JWS_INVALID";
};
var JWTInvalid = class extends JOSEError {
  static code = "ERR_JWT_INVALID";
  code = "ERR_JWT_INVALID";
};
var JWKInvalid = class extends JOSEError {
  static code = "ERR_JWK_INVALID";
  code = "ERR_JWK_INVALID";
};
var JWKSInvalid = class extends JOSEError {
  static code = "ERR_JWKS_INVALID";
  code = "ERR_JWKS_INVALID";
};
var JWKSNoMatchingKey = class extends JOSEError {
  static code = "ERR_JWKS_NO_MATCHING_KEY";
  code = "ERR_JWKS_NO_MATCHING_KEY";
  constructor(message2 = "no applicable key found in the JSON Web Key Set", options) {
    super(message2, options);
  }
};
var JWKSMultipleMatchingKeys = class extends JOSEError {
  [Symbol.asyncIterator] = async function* () {
  };
  static code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  constructor(message2 = "multiple matching keys found in the JSON Web Key Set", options) {
    super(message2, options);
  }
};
var JWKSTimeout = class extends JOSEError {
  static code = "ERR_JWKS_TIMEOUT";
  code = "ERR_JWKS_TIMEOUT";
  constructor(message2 = "request timed out", options) {
    super(message2, options);
  }
};
var JWSSignatureVerificationFailed = class extends JOSEError {
  static code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  constructor(message2 = "signature verification failed", options) {
    super(message2, options);
  }
};

// node_modules/jose/dist/webapi/util/base64url.js
var invalid = "The input to be decoded is not correctly encoded.";
function decode(input) {
  try {
    return decodeBase64(typeof input == "string" ? input : decoder.decode(input), true);
  } catch (cause) {
    throw new TypeError(invalid, { cause });
  }
}

// node_modules/jose/dist/webapi/lib/validate.js
function isObject(input) {
  if (typeof input != "object" || input === null || Object.prototype.toString.call(input) !== "[object Object]")
    return false;
  const prototype = Object.getPrototypeOf(input);
  return prototype === null || Object.getPrototypeOf(prototype) === null;
}
function isJwkSet(input) {
  return isObject(input) && Array.isArray(input.keys) && Array.from(input.keys).every(isObject);
}
function isDisjoint(...headers) {
  const parameters = /* @__PURE__ */ new Set();
  for (const header of headers)
    if (header)
      for (const parameter of Object.keys(header)) {
        if (parameters.has(parameter))
          return false;
        parameters.add(parameter);
      }
  return true;
}
function decodeBase64url(value, label, ErrorClass) {
  try {
    return decode(value);
  } catch (cause) {
    throw new ErrorClass(`Failed to base64url decode the ${label}`, { cause });
  }
}
function encodeAsciiMember(value, label, ErrorClass) {
  try {
    return encode(value);
  } catch (cause) {
    throw new ErrorClass(`The ${label} is not a valid base64url string`, { cause });
  }
}
function parseJoseHeader(encodedProtectedHeader, ErrorClass, message2) {
  let parsed;
  try {
    parsed = JSON.parse(strictDecoder.decode(decode(encodedProtectedHeader)));
  } catch (cause) {
    throw new ErrorClass(message2, { cause });
  }
  if (!isObject(parsed))
    throw new ErrorClass(message2);
  return parsed;
}
var JWS_RECOGNIZED = { __proto__: null, b64: true };
function validateAlgorithms(option, algorithms) {
  if (algorithms !== void 0 && (!Array.isArray(algorithms) || algorithms.some((s) => typeof s != "string")))
    throw new TypeError(`"${option}" option must be an array of strings`);
  return algorithms === void 0 ? void 0 : new Set(algorithms);
}
function validateCrit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
  if (joseHeader.crit !== void 0 && protectedHeader?.crit === void 0)
    throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
  if (!protectedHeader || protectedHeader.crit === void 0)
    return [];
  if (!Array.isArray(protectedHeader.crit) || protectedHeader.crit.length === 0 || protectedHeader.crit.some((input) => typeof input != "string" || input.length === 0))
    throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  const recognized = recognizedOption === void 0 ? recognizedDefault : { __proto__: null, ...recognizedOption, ...recognizedDefault };
  for (const parameter of protectedHeader.crit) {
    if (!(parameter in recognized))
      throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
    if (!Object.hasOwn(joseHeader, parameter) || joseHeader[parameter] === void 0)
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    if (recognized[parameter] && (!Object.hasOwn(protectedHeader, parameter) || protectedHeader[parameter] === void 0))
      throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
  }
  return protectedHeader.crit;
}
function validateB64(protectedHeader, extensions) {
  if (extensions.includes("b64")) {
    const b64 = protectedHeader.b64;
    if (typeof b64 != "boolean")
      throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    return b64;
  }
  return true;
}

// node_modules/jose/dist/webapi/lib/key.js
var tag = (key) => key[Symbol.toStringTag];
var jwkMatchesOp = (entry, key, usage) => {
  const { alg } = entry;
  if (key.use !== void 0) {
    const expected = usage === "sign" || usage === "verify" ? "sig" : "enc";
    if (key.use !== expected)
      throw new TypeError(`Invalid key for this operation, its "use" must be "${expected}" when present`);
  }
  if (key.alg !== void 0 && key.alg !== alg)
    throw new TypeError(`Invalid key for this operation, its "alg" must be "${alg}" when present`);
  if (Array.isArray(key.key_ops)) {
    const expectedKeyOp = usage === "encrypt" || usage === "decrypt" ? entry.ops?.[usage === "encrypt" ? 0 : 1] : usage;
    if (expectedKeyOp && !key.key_ops.includes(expectedKeyOp))
      throw new TypeError(`Invalid key for this operation, its "key_ops" must include "${expectedKeyOp}" when present`);
  }
};
async function prepareKey(entry, key, usage) {
  const { alg, secret } = entry, requiresPrivateKey = usage === "decrypt" || usage === "sign";
  if (secret && key instanceof Uint8Array)
    return key;
  let normalized, keyObject;
  if (isObject(key)) {
    if (normalized = normalizeJwk(key), typeof normalized.kty != "string")
      throw invalidKeyType(alg, key, secret);
    if (!(secret ? normalized.kty === "oct" && typeof normalized.k == "string" : normalized.kty !== "oct" && (requiresPrivateKey ? normalized.kty === "AKP" && typeof normalized.priv == "string" || typeof normalized.d == "string" : normalized.d === void 0 && normalized.priv === void 0)))
      throw new TypeError(secret ? 'JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present' : `JSON Web Key for this operation must be a ${requiresPrivateKey ? "private" : "public"} JWK`);
    if (jwkMatchesOp(entry, normalized, usage), normalized.kty === "oct")
      return decode(normalized.k);
    if (!Object.isFrozen(key)) {
      const { key_ops } = key;
      Array.isArray(key_ops) && Object.freeze(key_ops), Object.freeze(key);
    }
  } else {
    if (!isKeyLike(key))
      throw invalidKeyType(alg, key, secret);
    const expectedType = secret ? "secret" : requiresPrivateKey ? "private" : "public";
    if (key.type !== expectedType && (secret || ["secret", "public", "private"].includes(key.type)))
      throw new TypeError(`${tag(key)} instances must be of type "${expectedType}" for the ${alg} algorithm`);
    if (isCryptoKey(key))
      return key;
    if (keyObject = key, keyObject.type === "secret")
      return keyObject.export();
  }
  cache ||= /* @__PURE__ */ new WeakMap();
  const cacheKey = key;
  let cached = cache.get(cacheKey);
  if (cached?.[alg])
    return cached[alg];
  if (cached || cache.set(cacheKey, cached = {}), keyObject && typeof keyObject.toCryptoKey == "function") {
    const isPublic = keyObject.type === "public", crv = nist[keyObject.asymmetricKeyDetails?.namedCurve], params = entry.resolve?.({ crv, asymmetricKeyType: keyObject.asymmetricKeyType }) ?? entry.subtle;
    return cached[alg] = keyObject.toCryptoKey(params, isPublic, entry.usages[isPublic ? 0 : 1]);
  }
  return normalized ??= keyObject.export({ format: "jwk" }), normalized.alg = alg, cached[alg] = await jwkToKey(entry, normalized);
}
var cache;
var nist = {
  __proto__: null,
  prime256v1: "P-256",
  secp384r1: "P-384",
  secp521r1: "P-521"
};
var isCryptoKey = (key) => {
  if (key?.[Symbol.toStringTag] === "CryptoKey")
    return true;
  try {
    return key instanceof CryptoKey;
  } catch {
    return false;
  }
};
var isKeyObject = (key) => key?.[Symbol.toStringTag] === "KeyObject";
var isKeyLike = (key) => isCryptoKey(key) || isKeyObject(key);
function message(msg, actual, ...types) {
  if (types.length > 2) {
    const last = types.pop();
    msg += `one of type ${types.join(", ")}, or ${last}.`;
  } else types.length === 2 ? msg += `one of type ${types[0]} or ${types[1]}.` : msg += `of type ${types[0]}.`;
  return actual == null ? msg += ` Received ${actual}` : typeof actual == "function" && actual.name ? msg += ` Received function ${actual.name}` : typeof actual == "object" && actual != null && actual.constructor?.name && (msg += ` Received an instance of ${actual.constructor.name}`), msg;
}
function invalidKeyType(alg, actual, secret) {
  const types = ["CryptoKey", "KeyObject", "JSON Web Key"];
  return secret && types.push("Uint8Array"), new TypeError(message(`Key for the ${alg} algorithm must be `, actual, ...types));
}
var unusable = (name, prop = "algorithm.name") => new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`);
function checkUsage(key, usage) {
  if (usage && !key.usages.includes(usage))
    throw new TypeError(`CryptoKey does not support this operation, its usages must include ${usage}.`);
}
function checkModulusLength(alg, key) {
  const { modulusLength } = key.algorithm;
  if (typeof modulusLength != "number" || modulusLength < 2048)
    throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
}
function checkCryptoKey(key, expected, usage) {
  const algorithm = key.algorithm;
  if (algorithm.name !== expected.name)
    throw unusable(expected.name);
  if (expected.hash && algorithm.hash?.name !== expected.hash)
    throw unusable(expected.hash, "algorithm.hash");
  if (expected.namedCurve && algorithm.namedCurve !== expected.namedCurve)
    throw unusable(expected.namedCurve, "algorithm.namedCurve");
  if (expected.length !== void 0 && algorithm.length !== expected.length)
    throw unusable(expected.length, "algorithm.length");
  checkUsage(key, usage);
}
function snapshotJwk(jwk) {
  return { __proto__: null, ...jwk };
}
function normalizeJwk(jwk) {
  const normalized = snapshotJwk(jwk);
  if (normalized.ext !== void 0 && typeof normalized.ext != "boolean")
    throw new TypeError('"ext" (Extractable) Parameter must be a boolean');
  if (normalized.key_ops !== void 0) {
    const value = normalized.key_ops, keyOps = Array.isArray(value) ? [...value] : void 0;
    if (!keyOps || keyOps.some((operation) => typeof operation != "string") || new Set(keyOps).size !== keyOps.length)
      throw new TypeError('"key_ops" (Key Operations) Parameter must be an array of unique strings');
    normalized.key_ops = keyOps;
  }
  return normalized;
}
async function jwkToKey(entry, jwk, extractable) {
  if (!entry.kty.includes(jwk.kty))
    throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
  const algorithm = entry.resolve?.({ kty: jwk.kty, crv: jwk.crv }) ?? entry.subtle, isPrivate = !!(jwk.d || jwk.priv), keyData = { ...jwk, ext: extractable ?? jwk.ext };
  return keyData.kty !== "AKP" && delete keyData.alg, delete keyData.use, crypto.subtle.importKey("jwk", keyData, algorithm, keyData.ext ?? !isPrivate, jwk.key_ops ?? entry.usages[isPrivate ? 1 : 0]);
}
async function rawKey(key, expected, usage, extractable = false) {
  return key instanceof Uint8Array && (key = await crypto.subtle.importKey("raw", key, expected, extractable, [usage])), checkCryptoKey(key, expected, usage), key;
}

// node_modules/jose/dist/webapi/lib/key_descriptor.js
function table(entries) {
  const out = { __proto__: null };
  for (const alg in entries)
    out[alg] = { ...entries[alg], alg };
  return out;
}

// node_modules/jose/dist/webapi/lib/jws_algorithms.js
var sig = [["verify"], ["sign"]];
function hmac(bits) {
  const subtle = { name: "HMAC", hash: `SHA-${bits}` };
  return { kty: ["oct"], secret: true, subtle, signing: subtle, usages: sig };
}
function rsa(bits, saltLength) {
  const subtle = { name: saltLength ? "RSA-PSS" : "RSASSA-PKCS1-v1_5", hash: `SHA-${bits}` };
  return {
    kty: ["RSA"],
    subtle,
    signing: saltLength ? { ...subtle, saltLength } : subtle,
    usages: sig,
    minRsaBits: 2048
  };
}
function ecdsa(crv, bits) {
  return {
    kty: ["EC"],
    crv,
    subtle: { name: "ECDSA", namedCurve: crv },
    signing: { name: "ECDSA", hash: `SHA-${bits}` },
    usages: sig
  };
}
function eddsa() {
  const subtle = { name: "Ed25519" };
  return {
    kty: ["OKP"],
    crv: "Ed25519",
    subtle,
    signing: subtle,
    usages: sig
  };
}
function mldsa(parameterSet) {
  const subtle = { name: `ML-DSA-${parameterSet}` };
  return {
    kty: ["AKP"],
    subtle,
    signing: subtle,
    usages: sig
  };
}
var JWS = table({
  HS256: hmac(256),
  HS384: hmac(384),
  HS512: hmac(512),
  RS256: rsa(256),
  RS384: rsa(384),
  RS512: rsa(512),
  PS256: rsa(256, 32),
  PS384: rsa(384, 48),
  PS512: rsa(512, 64),
  ES256: ecdsa("P-256", 256),
  ES384: ecdsa("P-384", 384),
  ES512: ecdsa("P-521", 512),
  EdDSA: eddsa(),
  Ed25519: eddsa(),
  "ML-DSA-44": mldsa(44),
  "ML-DSA-65": mldsa(65),
  "ML-DSA-87": mldsa(87)
});
function jwsAlgorithm(alg) {
  const entry = typeof alg == "string" ? JWS[alg] : void 0;
  if (!entry)
    throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  return entry;
}

// node_modules/jose/dist/webapi/lib/jws_verify.js
function prepareVerify(options) {
  return [options && validateAlgorithms("algorithms", options.algorithms), options?.crit];
}
function parseProtectedHeader(encodedProtectedHeader) {
  return encodedProtectedHeader === void 0 ? {} : parseJoseHeader(encodedProtectedHeader, JWSInvalid, "JWS Protected Header is invalid");
}
function encodeCompactUnencodedPayload(payload) {
  try {
    return encode(payload);
  } catch (cause) {
    throw new JWSInvalid("JWS Compact Serialization payload must use only ASCII characters", {
      cause
    });
  }
}
async function verifySignature(jws, shared, key, encodeUnencodedPayload, parsedProtected) {
  const { protected: encodedProtectedHeader, header, payload: inputPayload } = jws, protectedHeader = parsedProtected ?? parseProtectedHeader(encodedProtectedHeader);
  if (!isDisjoint(protectedHeader, header))
    throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  const joseHeader = { ...protectedHeader, ...header }, b64 = validateB64(protectedHeader, validateCrit(JWSInvalid, JWS_RECOGNIZED, shared[1], protectedHeader, joseHeader)), { alg } = joseHeader;
  if (typeof alg != "string" || !alg)
    throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  if (shared[0] && !shared[0].has(alg))
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
  if (b64) {
    if (typeof inputPayload != "string")
      throw new JWSInvalid("JWS Payload must be a string");
  } else if (typeof inputPayload != "string" && !(inputPayload instanceof Uint8Array))
    throw new JWSInvalid("JWS Payload must be a string or an Uint8Array instance");
  const signingPayload = b64 || typeof inputPayload != "string" ? inputPayload : encodeUnencodedPayload(inputPayload);
  let resolvedKey = false;
  typeof key == "function" && (key = await key(protectedHeader, jws), resolvedKey = true);
  const entry = jwsAlgorithm(alg), signingInput = concat(encodedProtectedHeader !== void 0 ? encode(encodedProtectedHeader) : new Uint8Array(), encode("."), typeof signingPayload == "string" ? shared[2] ??= encodeAsciiMember(signingPayload, "payload", JWSInvalid) : signingPayload), signature = decodeBase64url(jws.signature, "signature", JWSInvalid), verificationKey = await prepareKey(entry, key, "verify"), cryptoKey = await rawKey(verificationKey, entry.subtle, "verify");
  entry.minRsaBits && checkModulusLength(entry.alg, cryptoKey);
  let verified = false;
  try {
    verified = await crypto.subtle.verify(entry.signing, cryptoKey, signature, signingInput);
  } catch (cause) {
    throw new JWSSignatureVerificationFailed(void 0, { cause });
  }
  if (!verified)
    throw new JWSSignatureVerificationFailed();
  const result = { payload: typeof signingPayload == "string" ? decodeBase64url(signingPayload, "payload", JWSInvalid) : signingPayload };
  return encodedProtectedHeader !== void 0 && (result.protectedHeader = protectedHeader), header !== void 0 && (result.unprotectedHeader = header), resolvedKey ? [{ ...result, key: verificationKey }, b64] : [result, b64];
}
async function verifyCompact(jws, shared, key) {
  if (jws instanceof Uint8Array && (jws = decoder.decode(jws)), typeof jws != "string")
    throw new JWSInvalid("Compact JWS must be a string or Uint8Array");
  const { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split(".");
  if (length !== 3)
    throw new JWSInvalid("Invalid Compact JWS");
  return verifySignature({ payload, protected: protectedHeader, signature }, shared, key, encodeCompactUnencodedPayload);
}

// node_modules/jose/dist/webapi/lib/jwt_claims_set.js
var epoch = (date) => Math.floor(date.getTime() / 1e3);
var multipliers = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
  y: 31557600
};
var REGEX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
var checkFailed = "check_failed";
function invalidDuration() {
  throw new TypeError("Invalid time period format");
}
function secs(str) {
  typeof str != "string" && invalidDuration();
  const matched = REGEX.exec(str);
  (!matched || matched[4] && matched[1]) && invalidDuration();
  const value = parseFloat(matched[2]), durationSeconds = Math.round(value * multipliers[matched[3][0].toLowerCase()]);
  return Number.isFinite(durationSeconds) || invalidDuration(), matched[1] === "-" || matched[4] === "ago" ? -durationSeconds : durationSeconds;
}
function validateInput(label, input) {
  if (!Number.isFinite(input))
    throw new TypeError(`Invalid ${label} input`);
  return input;
}
var normalizeTyp = (value) => {
  const normalized = value.toLowerCase();
  return value.includes("/") ? normalized : `application/${normalized}`;
};
var checkAudiencePresence = (audPayload, audOption) => typeof audPayload == "string" ? audOption.includes(audPayload) : Array.isArray(audPayload) ? audOption.some((aud) => audPayload.includes(aud)) : false;
function validateNumericDate(claimsSet, claim, required = false) {
  const value = claimsSet[claim];
  if (!(value === void 0 && !required)) {
    if (typeof value != "number")
      throw new JWTClaimValidationFailed(`"${claim}" claim must be a number`, claimsSet, claim, "invalid");
    return value;
  }
}
function unexpectedClaim(claimsSet, claim) {
  throw new JWTClaimValidationFailed(`unexpected "${claim}" claim value`, claimsSet, claim, checkFailed);
}
function validateClaimsSet(protectedHeader, claimsSetBytes, options = {}) {
  let claimsSet;
  try {
    claimsSet = JSON.parse(strictDecoder.decode(claimsSetBytes));
  } catch (cause) {
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object", { cause });
  }
  if (!isObject(claimsSet))
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  const { typ } = options;
  if (typ !== void 0 && (typeof protectedHeader.typ != "string" || normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ)))
    throw new JWTClaimValidationFailed('unexpected "typ" JWT header value', claimsSet, "typ", checkFailed);
  const { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options, presenceCheck = [...requiredClaims];
  maxTokenAge !== void 0 && presenceCheck.push("iat"), audience !== void 0 && presenceCheck.push("aud"), subject !== void 0 && presenceCheck.push("sub"), issuer !== void 0 && presenceCheck.push("iss");
  for (const claim of new Set(presenceCheck.reverse()))
    if (!Object.hasOwn(claimsSet, claim))
      throw new JWTClaimValidationFailed(`missing required "${claim}" claim`, claimsSet, claim, "missing");
  issuer !== void 0 && !(Array.isArray(issuer) ? issuer : [issuer]).includes(claimsSet.iss) && unexpectedClaim(claimsSet, "iss"), subject !== void 0 && claimsSet.sub !== subject && unexpectedClaim(claimsSet, "sub"), audience !== void 0 && !checkAudiencePresence(claimsSet.aud, typeof audience == "string" ? [audience] : audience) && unexpectedClaim(claimsSet, "aud");
  const { clockTolerance } = options;
  let tolerance = 0;
  if (typeof clockTolerance == "string")
    tolerance = secs(clockTolerance);
  else if (clockTolerance !== void 0) {
    if (typeof clockTolerance != "number")
      throw new TypeError("Invalid clockTolerance option type");
    tolerance = clockTolerance;
  }
  if (validateInput("clockTolerance option", tolerance), tolerance < 0)
    throw new TypeError("Invalid clockTolerance option input");
  const { currentDate } = options, now = validateInput("currentDate option", epoch(currentDate === void 0 ? /* @__PURE__ */ new Date() : currentDate)), iat = validateNumericDate(claimsSet, "iat", maxTokenAge !== void 0), nbf = validateNumericDate(claimsSet, "nbf");
  if (nbf !== void 0 && nbf > now + tolerance)
    throw new JWTClaimValidationFailed('"nbf" claim timestamp check failed', claimsSet, "nbf", checkFailed);
  const exp = validateNumericDate(claimsSet, "exp");
  if (exp !== void 0 && exp <= now - tolerance)
    throw new JWTExpired('"exp" claim timestamp check failed', claimsSet, "exp", checkFailed);
  if (maxTokenAge !== void 0) {
    const age = now - iat, max = validateInput("maxTokenAge option", typeof maxTokenAge == "number" ? maxTokenAge : secs(maxTokenAge));
    if (max < 0)
      throw new TypeError("Invalid maxTokenAge option input");
    if (age - tolerance > max)
      throw new JWTExpired('"iat" claim timestamp check failed (too far in the past)', claimsSet, "iat", checkFailed);
    if (age < -tolerance)
      throw new JWTClaimValidationFailed('"iat" claim timestamp check failed (it should be in the past)', claimsSet, "iat", checkFailed);
  }
  return claimsSet;
}

// node_modules/jose/dist/webapi/jwt/verify.js
async function jwtVerify(jwt, key, options) {
  const [verified, b64] = await verifyCompact(jwt, prepareVerify(options), key);
  if (!b64)
    throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
  const payload = validateClaimsSet(verified.protectedHeader, verified.payload, options);
  return { ...verified, payload };
}

// node_modules/jose/dist/webapi/jwks/local.js
function isUsableJWK(jwk, entry, alg, kid) {
  const { kty, key_ops: keyOps, ext, kid: jwkKid, alg: jwkAlg, use, crv } = jwk;
  return (ext === void 0 || typeof ext == "boolean") && (keyOps === void 0 || Array.isArray(keyOps) && keyOps.every((operation, index) => typeof operation == "string" && keyOps.indexOf(operation) === index) && keyOps.includes("verify")) && entry.kty.includes(kty) && (kid === void 0 || typeof kid == "string" && kid === jwkKid) && (jwkAlg === void 0 ? kty !== "AKP" : alg === jwkAlg) && (use === void 0 || use === "sig") && (!entry.crv || crv === entry.crv);
}
async function importWithAlgCache(cache2, jwk, entry) {
  const cached = cache2.get(jwk) || cache2.set(jwk, {}).get(jwk), { alg } = entry;
  if (cached[alg] === void 0) {
    const pending = jwkToKey(entry, jwk, true).then((key) => {
      if (key.type !== "public")
        throw new JWKSInvalid("JSON Web Key Set members must be public keys");
      return cached[alg] = key, key;
    }).catch((error) => {
      throw cached[alg] === pending && delete cached[alg], error;
    });
    cached[alg] = pending;
  }
  return cached[alg];
}
function createLocalJWKSet(jwks) {
  let snapshot;
  try {
    snapshot = structuredClone(jwks);
  } catch (cause) {
    throw new JWKSInvalid("JSON Web Key Set malformed", { cause });
  }
  if (!isJwkSet(snapshot))
    throw new JWKSInvalid("JSON Web Key Set malformed");
  const metadata = snapshot.keys.map((jwk) => {
    const normalized = snapshotJwk(jwk);
    return Array.isArray(normalized.key_ops) && (normalized.key_ops = [...normalized.key_ops]), normalized;
  }), cached = /* @__PURE__ */ new WeakMap();
  return Object.defineProperty(async (protectedHeader, token) => {
    const { alg, kid } = { ...protectedHeader, ...token?.header }, entry = typeof alg == "string" ? JWS[alg] : void 0;
    if (!entry || entry.secret)
      throw new JOSENotSupported('Unsupported "alg" value for a JSON Web Key Set');
    const candidates = snapshot.keys.filter((_, index) => isUsableJWK(metadata[index], entry, alg, kid)), { 0: jwk, length } = candidates;
    if (!length)
      throw new JWKSNoMatchingKey();
    if (length !== 1) {
      const error = new JWKSMultipleMatchingKeys();
      throw error[Symbol.asyncIterator] = async function* () {
        for (const jwk2 of candidates)
          try {
            yield await importWithAlgCache(cached, jwk2, entry);
          } catch {
          }
      }, error;
    }
    return importWithAlgCache(cached, jwk, entry);
  }, "jwks", {
    value: () => structuredClone(snapshot)
  });
}

// node_modules/jose/dist/webapi/jwks/remote.js
function isCloudflareWorkers() {
  return typeof WebSocketPair < "u" || typeof navigator < "u" && navigator.userAgent === "Cloudflare-Workers" || typeof EdgeRuntime < "u" && EdgeRuntime === "vercel";
}
var USER_AGENT;
(typeof navigator > "u" || !navigator.userAgent?.startsWith?.("Mozilla/5.0 ")) && (USER_AGENT = "jose/v6.2.17");
var customFetch = /* @__PURE__ */ Symbol();
async function fetchJwks(url, headers, signal, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    method: "GET",
    signal,
    redirect: "manual",
    headers
  }).catch((err) => {
    throw err.name === "TimeoutError" ? new JWKSTimeout(void 0, { cause: err }) : err;
  });
  if (response.status !== 200)
    throw new JOSEError("Expected 200 OK from the JSON Web Key Set HTTP response");
  try {
    return await response.json();
  } catch (cause) {
    throw new JOSEError("Failed to parse the JSON Web Key Set HTTP response as JSON", { cause });
  }
}
var jwksCache = /* @__PURE__ */ Symbol();
function isFreshFor(timestamp, duration) {
  return Number.isFinite(timestamp) && Date.now() < timestamp + duration;
}
function validateDuration(value, fallback, option) {
  if (Number.isNaN(value))
    throw new TypeError(`"${option}" option must not be NaN`);
  if (typeof value == "number" && value < 0)
    throw new TypeError(`"${option}" option must not be negative`);
  return typeof value == "number" ? value : fallback;
}
function createRemoteJWKSet(url, options) {
  if (!(url instanceof URL))
    throw new TypeError("url must be an instance of URL");
  const href = new URL(url.href).href, opts = options ?? {}, timeoutOption = opts.timeoutDuration;
  if (typeof timeoutOption == "number" && (!Number.isInteger(timeoutOption) || timeoutOption < 0))
    throw new TypeError('"timeoutDuration" option must be a non-negative integer');
  const timeoutDuration = typeof timeoutOption == "number" ? timeoutOption : 5e3, cooldownDuration = validateDuration(opts.cooldownDuration, 3e4, "cooldownDuration"), cacheMaxAge = validateDuration(opts.cacheMaxAge, 6e5, "cacheMaxAge"), headers = new Headers(opts.headers);
  USER_AGENT && !headers.has("User-Agent") && headers.set("User-Agent", USER_AGENT), headers.has("accept") || headers.set("accept", "application/json, application/jwk-set+json");
  const fetchImpl = opts[customFetch], cache2 = opts[jwksCache];
  let jwksTimestamp, pendingFetch, reloadSequence = 0, appliedSequence = 0, local;
  if (cache2 && typeof cache2 == "object") {
    const { uat, jwks } = cache2;
    isFreshFor(uat, cacheMaxAge) && isJwkSet(jwks) && (jwksTimestamp = uat, local = createLocalJWKSet(jwks));
  }
  const reload = async () => {
    if (pendingFetch && isCloudflareWorkers() && (pendingFetch = void 0), !pendingFetch) {
      const sequence = ++reloadSequence, current = pendingFetch = fetchJwks(href, headers, AbortSignal.timeout(timeoutDuration), fetchImpl).then((json3) => {
        const next = createLocalJWKSet(json3);
        if (sequence <= appliedSequence)
          return;
        local = next;
        const updatedAt = Date.now();
        cache2 && (cache2.uat = updatedAt, cache2.jwks = json3), jwksTimestamp = updatedAt, appliedSequence = sequence;
      }).finally(() => {
        pendingFetch === current && (pendingFetch = void 0);
      });
    }
    await pendingFetch;
  };
  return Object.defineProperties(async (protectedHeader, token) => {
    (!local || !isFreshFor(jwksTimestamp, cacheMaxAge)) && await reload();
    try {
      return await local(protectedHeader, token);
    } catch (err) {
      if (err instanceof JWKSNoMatchingKey && !isFreshFor(jwksTimestamp, cooldownDuration))
        return await reload(), local(protectedHeader, token);
      throw err;
    }
  }, {
    coolingDown: {
      get: () => isFreshFor(jwksTimestamp, cooldownDuration),
      enumerable: true
    },
    fresh: {
      get: () => isFreshFor(jwksTimestamp, cacheMaxAge),
      enumerable: true
    },
    reload: {
      value: reload,
      enumerable: true
    },
    reloading: {
      get: () => !!pendingFetch,
      enumerable: true
    },
    jwks: {
      value: () => local?.jwks(),
      enumerable: true
    }
  });
}

// node_modules/@freebuff/auth/dist/index.js
var DEFAULT_ISSUER = "https://freebuff.com/oidc";
var AUTH_ROUTE_PREFIX = "/auth/freebuff";
var TRANSACTION_TTL = 600;
var SESSION_COOKIE_TTL = 30 * 86400;
var REFRESH_SKEW_SECONDS = 30;
var MAX_COOKIE_LENGTH = 4e3;
var FETCH_TIMEOUT_MS = 8e3;
var LOOPBACK = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "[::1]"]);
var ALL_SCOPES = ["openid", "email", "profile"];
var PROMPTS = /* @__PURE__ */ new Set(["login", "consent", "select_account"]);
var NO_STORE = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff"
};
function checkedUrl(value, allowLoopback, what) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${what} must be an absolute URL.`);
  }
  const loopbackHttp = allowLoopback && LOOPBACK.has(url.hostname) && url.protocol === "http:";
  if (url.protocol !== "https:" && !loopbackHttp || url.username || url.password || url.search || url.hash) {
    throw new Error(`${what} must be an https URL without credentials, query or fragment (http is allowed only for localhost with allowInsecureLocalhost).`);
  }
  return url;
}
function base64url(bytes) {
  let binary = "";
  for (const byte of bytes)
    binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function randomToken() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}
async function pkceChallenge(verifier) {
  const bytes = new TextEncoder().encode(verifier);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)));
}
function isSameOriginRequest(request, origin) {
  const header = request.headers.get("origin");
  if (header && header !== "null")
    return header === origin;
  return request.headers.get("sec-fetch-site") === "same-origin";
}
function timingSafeEqual(left, right) {
  if (left.length !== right.length)
    return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++)
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
function readCookie(header, name) {
  const values = (header ?? "").split(";").map((part) => part.trim()).filter((part) => part.startsWith(`${name}=`));
  if (values.length !== 1)
    return null;
  const value = values[0].slice(name.length + 1);
  return value && value.length <= MAX_COOKIE_LENGTH ? value : null;
}
function safeReturnTo(value) {
  if (!value || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return "/";
  }
  const base = "https://return-to.invalid";
  let url;
  try {
    url = new URL(value, base);
  } catch {
    return "/";
  }
  if (url.origin !== base || url.pathname === AUTH_ROUTE_PREFIX || url.pathname.startsWith(`${AUTH_ROUTE_PREFIX}/`)) {
    return "/";
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
function userFrom(claims, scopes) {
  if (typeof claims.sub !== "string" || !claims.sub || claims.sub.length > 255)
    return null;
  const user = { sub: claims.sub };
  if (scopes.includes("email")) {
    if (typeof claims.email === "string" && claims.email.length <= 320)
      user.email = claims.email;
    if (typeof claims.email_verified === "boolean")
      user.email_verified = claims.email_verified;
  }
  if (scopes.includes("profile")) {
    if (typeof claims.name === "string" && claims.name.length <= 200)
      user.name = claims.name;
    if (typeof claims.picture === "string" && claims.picture.startsWith("https://") && claims.picture.length <= 1024) {
      user.picture = claims.picture;
    }
  }
  return user;
}
function json(body, status = 200, cookies = []) {
  const headers = new Headers({ ...NO_STORE, "Content-Type": "application/json; charset=utf-8" });
  for (const cookie of cookies)
    headers.append("Set-Cookie", cookie);
  return new Response(JSON.stringify(body), { status, headers });
}
function redirect(location, cookies = []) {
  const headers = new Headers({ ...NO_STORE, Location: location });
  for (const cookie of cookies)
    headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}
function problem(status, message2, cookies = []) {
  const headers = new Headers({ ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" });
  for (const cookie of cookies)
    headers.append("Set-Cookie", cookie);
  return new Response(message2, { status, headers });
}
async function readJson(response) {
  const text = await response.text();
  if (text.length > 65536)
    throw new Error("Freebuff response too large");
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Unexpected Freebuff response");
  return value;
}
function createFreebuffAuth(options) {
  const allowLoopback = options.allowInsecureLocalhost === true;
  const issuer = (options.issuer ?? DEFAULT_ISSUER).replace(/\/$/, "");
  const issuerUrl = checkedUrl(issuer, allowLoopback, "issuer");
  const base = checkedUrl(options.baseUrl, allowLoopback, "baseUrl");
  if (base.pathname !== "/")
    throw new Error("baseUrl must be an origin, without a path.");
  const origin = base.origin;
  const clientId = options.clientId;
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(clientId ?? "")) {
    throw new Error("clientId is missing or malformed; use the ID from Freebuff provisioning.");
  }
  const scopes = ALL_SCOPES.filter((scope) => scope === "openid" || (options.scopes ?? ALL_SCOPES).includes(scope));
  const now = options.now ?? Date.now;
  const fetcher = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const secure = base.protocol === "https:";
  const cookiePrefix = secure ? "__Host-" : "";
  const sessionCookie = `${cookiePrefix}freebuff_session`;
  const transactionCookie = (state) => `${cookiePrefix}freebuff_txn-${state.slice(0, 16)}`;
  const callbackUrl = `${origin}${AUTH_ROUTE_PREFIX}/callback`;
  const setCookie = (name, value, maxAge) => `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
  const clearCookie = (name) => setCookie(name, "", 0);
  const sessionCookieFor = (session) => {
    const value = `v1~${session.accessToken}~${session.refreshToken}`;
    if (value.length > MAX_COOKIE_LENGTH)
      throw new Error("Freebuff session is too large for a cookie");
    return setCookie(sessionCookie, value, SESSION_COOKIE_TTL);
  };
  async function freebuffFetch(input, init = {}) {
    const response = await fetcher(input, {
      ...init,
      // Workers rejects redirect: 'error'. Never follow redirects carrying codes
      // or refresh tokens; reject them explicitly on every provider request.
      redirect: "manual",
      credentials: "omit",
      signal: init.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      throw new Error("Freebuff endpoint returned a redirect");
    }
    return response;
  }
  let discovery;
  function endpoints() {
    discovery ??= (async () => {
      const response = await freebuffFetch(`${issuer}/.well-known/openid-configuration`, {
        headers: { accept: "application/json" }
      });
      if (!response.ok)
        throw new Error(`Freebuff discovery failed: ${response.status}`);
      const document = await readJson(response);
      if (document.issuer !== issuer)
        throw new Error("Freebuff discovery named a different issuer");
      const endpoint = (name, required = true) => {
        const value = document[name];
        if (typeof value !== "string") {
          if (required)
            throw new Error(`Freebuff discovery is missing ${name}`);
          return null;
        }
        const url = checkedUrl(value, allowLoopback, name);
        if (url.origin !== issuerUrl.origin)
          throw new Error(`Freebuff ${name} left the issuer origin`);
        return url.href;
      };
      return {
        authorization: endpoint("authorization_endpoint"),
        token: endpoint("token_endpoint"),
        revocation: endpoint("revocation_endpoint", false),
        keys: createRemoteJWKSet(new URL(endpoint("jwks_uri")), {
          [customFetch]: (url, init) => freebuffFetch(url, init),
          timeoutDuration: FETCH_TIMEOUT_MS
        })
      };
    })().catch((error) => {
      discovery = void 0;
      throw error;
    });
    return discovery;
  }
  function readSession(request) {
    const value = readCookie(request.headers.get("cookie"), sessionCookie);
    const match = value ? /^v1~([A-Za-z0-9._-]+)~(fbrt_[A-Za-z0-9_-]+)$/.exec(value) : null;
    return match ? { accessToken: match[1], refreshToken: match[2] } : null;
  }
  async function verifyAccessToken(token) {
    try {
      const { payload } = await jwtVerify(token, (await endpoints()).keys, {
        issuer,
        audience: clientId,
        algorithms: ["RS256"],
        typ: "at+jwt",
        requiredClaims: ["sub", "exp", "iat", "client_id"],
        clockTolerance: 5,
        currentDate: new Date(now())
      });
      if (payload.client_id !== clientId)
        return null;
      const user = userFrom(payload, scopes);
      if (!user)
        return null;
      if (payload.exp <= Math.floor(now() / 1e3) + REFRESH_SKEW_SECONDS)
        return "expired";
      return { user, expiresAt: payload.exp };
    } catch (error) {
      return error instanceof errors_exports.JWTExpired ? "expired" : null;
    }
  }
  async function refresh(refreshToken) {
    let response;
    try {
      response = await freebuffFetch((await endpoints()).token, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
        body: new URLSearchParams({ grant_type: "refresh_token", client_id: clientId, refresh_token: refreshToken })
      });
    } catch {
      return "unavailable";
    }
    const body = await readJson(response).catch(() => null);
    if (!response.ok) {
      return body?.error === "invalid_grant" || body?.error === "invalid_client" ? "invalid" : "unavailable";
    }
    if (typeof body?.access_token !== "string" || typeof body.refresh_token !== "string")
      return "unavailable";
    const verified = await verifyAccessToken(body.access_token);
    if (!verified || verified === "expired")
      return "unavailable";
    return { accessToken: body.access_token, refreshToken: body.refresh_token, user: verified.user };
  }
  async function authenticate(request) {
    const session = readSession(request);
    if (!session)
      return { user: null, cookies: [] };
    const verified = await verifyAccessToken(session.accessToken);
    if (verified && verified !== "expired")
      return { user: verified.user, cookies: [] };
    if (verified === null) {
      return { user: null, cookies: [] };
    }
    const refreshed = await refresh(session.refreshToken);
    if (refreshed === "invalid")
      return { user: null, cookies: [clearCookie(sessionCookie)] };
    if (refreshed === "unavailable")
      return { user: null, cookies: [] };
    return { user: refreshed.user, cookies: [sessionCookieFor(refreshed)] };
  }
  const contexts = /* @__PURE__ */ new WeakMap();
  async function getUser(request) {
    const context = contexts.get(request);
    if (context) {
      context.result ??= authenticate(request);
      return (await context.result).user;
    }
    const session = readSession(request);
    if (!session)
      return null;
    const verified = await verifyAccessToken(session.accessToken);
    return verified && verified !== "expired" ? verified.user : null;
  }
  async function signIn(url) {
    let authorization;
    try {
      authorization = (await endpoints()).authorization;
    } catch {
      return problem(503, "Sign in with Freebuff is temporarily unavailable. Please try again.");
    }
    const state = randomToken();
    const nonce = randomToken();
    const verifier = randomToken();
    const target = new URL(authorization);
    target.search = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: scopes.join(" "),
      state,
      nonce,
      code_challenge: await pkceChallenge(verifier),
      code_challenge_method: "S256"
    }).toString();
    const prompt = url.searchParams.get("prompt");
    if (prompt && PROMPTS.has(prompt))
      target.searchParams.set("prompt", prompt);
    const transaction = base64url(new TextEncoder().encode(JSON.stringify({ s: state, n: nonce, v: verifier, r: safeReturnTo(url.searchParams.get("returnTo")) })));
    return redirect(target.href, [setCookie(transactionCookie(state), transaction, TRANSACTION_TTL)]);
  }
  function readTransaction(request, state) {
    const raw = readCookie(request.headers.get("cookie"), transactionCookie(state));
    if (!raw)
      return null;
    try {
      const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))));
      if (typeof decoded.s !== "string" || typeof decoded.n !== "string" || typeof decoded.v !== "string" || !timingSafeEqual(decoded.s, state)) {
        return null;
      }
      return { nonce: decoded.n, verifier: decoded.v, returnTo: safeReturnTo(typeof decoded.r === "string" ? decoded.r : "/") };
    } catch {
      return null;
    }
  }
  async function callback(request, url) {
    const params = url.searchParams;
    const state = params.get("state") ?? "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(state) || [...params.keys()].some((key) => params.getAll(key).length > 1)) {
      return problem(400, "This sign-in link is invalid. Please sign in again.");
    }
    const transaction = readTransaction(request, state);
    const clearTransaction = clearCookie(transactionCookie(state));
    if (!transaction) {
      return problem(400, "This sign-in expired or was started in another browser. Please sign in again.", [clearTransaction]);
    }
    if (params.get("iss") !== issuer) {
      return problem(400, "Sign-in response came from an unexpected issuer.", [clearTransaction]);
    }
    const error = params.get("error");
    if (error) {
      if (error === "access_denied")
        return redirect(transaction.returnTo, [clearTransaction]);
      return problem(400, "Sign in with Freebuff did not complete. Please try again.", [clearTransaction]);
    }
    const code = params.get("code");
    if (!code || code.length > 512) {
      return problem(400, "This sign-in link is invalid. Please sign in again.", [clearTransaction]);
    }
    try {
      const { token, keys } = await endpoints();
      const response = await freebuffFetch(token, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          code,
          redirect_uri: callbackUrl,
          code_verifier: transaction.verifier
        })
      });
      const tokens = await readJson(response);
      if (!response.ok || typeof tokens.id_token !== "string" || typeof tokens.access_token !== "string" || typeof tokens.refresh_token !== "string") {
        throw new Error("token exchange failed");
      }
      const { payload } = await jwtVerify(tokens.id_token, keys, {
        issuer,
        audience: clientId,
        algorithms: ["RS256"],
        requiredClaims: ["sub", "exp", "iat", "nonce"],
        maxTokenAge: TRANSACTION_TTL,
        clockTolerance: 5,
        currentDate: new Date(now())
      });
      if (typeof payload.nonce !== "string" || !timingSafeEqual(payload.nonce, transaction.nonce) || payload.azp !== void 0 && payload.azp !== clientId) {
        throw new Error("ID token is not bound to this sign-in");
      }
      const access = await verifyAccessToken(tokens.access_token);
      if (!access || access === "expired" || access.user.sub !== payload.sub) {
        throw new Error("access token does not match the ID token");
      }
      return redirect(transaction.returnTo, [
        sessionCookieFor({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token }),
        clearTransaction
      ]);
    } catch {
      return problem(400, "Sign in with Freebuff could not be completed. Please try again.", [clearTransaction]);
    }
  }
  async function signOut(request, url) {
    if (!isSameOriginRequest(request, origin)) {
      return problem(403, "Sign-out must be submitted from this site.");
    }
    const session = readSession(request);
    if (session) {
      try {
        const { revocation } = await endpoints();
        if (revocation) {
          await freebuffFetch(revocation, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ client_id: clientId, token: session.refreshToken, token_type_hint: "refresh_token" })
          });
        }
      } catch {
      }
    }
    let returnTo = url.searchParams.get("returnTo");
    const type = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (!returnTo && type === "application/x-www-form-urlencoded") {
      const text = await request.text().catch(() => "");
      if (text.length <= 4096)
        returnTo = new URLSearchParams(text).get("returnTo");
    }
    return redirect(safeReturnTo(returnTo), [clearCookie(sessionCookie)]);
  }
  async function handle(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(`${AUTH_ROUTE_PREFIX}/`))
      return null;
    const route = url.pathname.slice(AUTH_ROUTE_PREFIX.length);
    const method = request.method;
    switch (route) {
      case "/signin":
        return method === "GET" ? signIn(url) : problem(405, "Use GET.");
      case "/callback":
        return method === "GET" ? callback(request, url) : problem(405, "Use GET.");
      case "/signout":
        return method === "POST" ? signOut(request, url) : problem(405, "Use POST.");
      case "/session": {
        if (method !== "GET")
          return problem(405, "Use GET.");
        const { user, cookies } = await authenticate(request);
        return json({ user }, 200, cookies);
      }
      default:
        return null;
    }
  }
  function wrap(handler) {
    return async (request, ...rest) => {
      const own = await handle(request);
      if (own)
        return own;
      const context = {};
      contexts.set(request, context);
      const response = await handler(request, ...rest);
      const cookies = context.result ? (await context.result).cookies : [];
      if (cookies.length === 0 || response.status === 101)
        return response;
      const headers = new Headers(response.headers);
      for (const cookie of cookies)
        headers.append("Set-Cookie", cookie);
      headers.set("Cache-Control", "private, no-store");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    };
  }
  return { issuer, clientId, handle, authenticate, getUser, wrap };
}

// worker.js
import { connect } from "cloudflare:sockets";
var UA = "haze/1.0";
var MUSIC_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
async function fetchJson(url, timeoutMs = 8e3, ua = UA) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": ua, Accept: "application/json" }
  });
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  return r.json();
}
var norm = (s) => String(s || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, " ").trim();
async function musicSearch(q, limit = 24) {
  limit = Math.min(Math.max(parseInt(limit) || 24, 1), 40);
  const itunes = fetchJson(
    `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=${Math.ceil(limit / 2)}`,
    8e3,
    MUSIC_UA
  ).then(
    (data) => (data.results || []).map((t) => ({
      title: String(t.trackName || ""),
      artist: String(t.artistName || ""),
      album: String(t.collectionName || ""),
      cover: String(t.artworkUrl100 || "").replace("100x100", "600x600"),
      duration: Math.round((t.trackTimeMillis || 0) / 1e3),
      preview: String(t.previewUrl || ""),
      spotify: `https://open.spotify.com/search/${encodeURIComponent(`${t.artistName || ""} ${t.trackName || ""}`)}`
    }))
  ).catch(() => []);
  const deezer = fetchJson(
    `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    8e3,
    MUSIC_UA
  ).then(
    (data) => (data.data || []).slice().sort((a2, b2) => (b2.rank || 0) - (a2.rank || 0)).map((t) => ({
      title: String(t.title || ""),
      artist: String(t.artist?.name || ""),
      album: String(t.album?.title || ""),
      cover: String(t.album?.cover_medium || t.album?.cover_small || ""),
      duration: Number(t.duration) || 0,
      preview: String(t.preview || ""),
      spotify: `https://open.spotify.com/search/${encodeURIComponent(`${t.artist?.name || ""} ${t.title || ""}`)}`
    }))
  ).catch(() => []);
  const [a, b] = await Promise.all([itunes, deezer]);
  if (!a.length && !b.length) throw new Error("neither catalog was reachable");
  const seen = /* @__PURE__ */ new Set();
  const merged = [];
  for (const t of [...a, ...b]) {
    if (!t.title || !t.artist) continue;
    const key = `${norm(t.artist)}|${norm(t.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(t);
    if (merged.length >= limit) break;
  }
  return merged;
}
var YT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
function ytExtractInitialData(html) {
  const marker = "ytInitialData";
  let idx = html.indexOf(marker);
  while (idx !== -1) {
    const brace = html.indexOf("{", idx + marker.length);
    const close = html.indexOf("</script>", brace);
    if (brace !== -1 && close !== -1) {
      let depth = 0, inStr = false, esc = false, end = -1;
      for (let i = brace; i <= close && i < html.length; i++) {
        const ch = html[i];
        if (inStr) {
          if (esc) esc = false;
          else if (ch === "\\") esc = true;
          else if (ch === '"') inStr = false;
          continue;
        }
        if (ch === '"') inStr = true;
        else if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) {
            end = i + 1;
            break;
          }
        }
      }
      if (end !== -1) {
        try {
          return JSON.parse(html.slice(brace, end));
        } catch {
        }
      }
    }
    idx = html.indexOf(marker, idx + 1);
  }
  throw new Error("couldn't parse YouTube results");
}
function ytCollect(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const x of node) ytCollect(x, out);
    return out;
  }
  const vr = node.videoRenderer;
  if (vr && typeof vr.videoId === "string") {
    const owner = vr.ownerText?.runs?.[0]?.text || vr.longBylineText?.runs?.[0]?.text || "";
    out.push({ videoId: vr.videoId, owner: String(owner) });
  }
  for (const v of Object.values(node)) ytCollect(v, out);
  return out;
}
async function youtubeResolve(q) {
  const r = await fetch(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%3D%3D`,
    { signal: AbortSignal.timeout(8e3), headers: { "User-Agent": YT_UA, "Accept-Language": "en-US,en;q=0.9" } }
  );
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  const vids = ytCollect(ytExtractInitialData(await r.text()));
  for (const v of vids) {
    if (v.owner.toLowerCase().includes("vevo")) continue;
    return v.videoId;
  }
  return null;
}
var GAMES_MIRROR = "https://cdn.jsdelivr.net/gh/freebuisness";
var GAMES_FILE_RE = /^[a-z0-9_-]+\.html$/i;
async function gamesZonesText() {
  const r = await fetch(`${GAMES_MIRROR}/assets@main/zones.json`, {
    signal: AbortSignal.timeout(12e3),
    headers: { "User-Agent": UA }
  });
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  return r.text();
}
var users = /* @__PURE__ */ new Map();
var guests = /* @__PURE__ */ new Map();
var messages = [];
var typing = /* @__PURE__ */ new Map();
var reacts = /* @__PURE__ */ new Map();
var REACT_EMOJIS = ["\u2764\uFE0F", "\u{1F602}", "\u{1F44D}", "\u{1F525}", "\u{1F632}"];
var SECRET = typeof process !== "undefined" && process.env?.CHAT_SECRET || "haze-serverless-dev-secret";
var enc = new TextEncoder();
function b64url(bytes) {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
async function hmacSign(value) {
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
}
async function pbkdfHash(password, saltB64) {
  const key = await crypto.subtle.importKey("raw", enc.encode(String(password)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: unb64url(saltB64), iterations: 1e5 },
    key,
    256
  );
  return b64url(bits);
}
function randHex(n) {
  return [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
var chatNameRe = /^[a-zA-Z0-9_\-.]{3,16}$/;
async function chatMakeToken(userId) {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1e3;
  const body = `${userId}.${exp}`;
  return `${body}.${await hmacSign(body)}`;
}
async function chatVerifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [uid, expStr, sig2] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const want = await hmacSign(`${uid}.${expStr}`);
  if (sig2 !== want) return null;
  if (uid.startsWith("g_")) {
    const g = guests.get(uid);
    return g ? { userId: uid, name: g.name, guest: true } : null;
  }
  const u = users.get(uid);
  return u ? { userId: uid, name: u.name, guest: false } : null;
}
function chatUserFromAuthHeader(header) {
  const h = String(header || "");
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}
var chatStore = { users, guests, messages, typing, reacts, REACT_EMOJIS, randHex, pbkdfHash, b64url };
var ONLINE_MS = 15e3;
var json2 = (data, status = 200, headers = {}) => Response.json(data, { status, headers });
async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
var routes = {
  // ---- vercel ai gateway relay (one key, ~500 models across every vendor) ----
  // The key never reaches the browser: it lives in Sites → Secrets as
  // AI_GATEWAY_API_KEY and is swapped in here.
  async gwModels(request, env) {
    const key = String(env && env.AI_GATEWAY_API_KEY || "").trim();
    if (!key) return json2({ error: "AI Gateway key is not set (Sites \u2192 Secrets \u2192 AI_GATEWAY_API_KEY)." }, 501);
    try {
      const r = await fetch("https://ai-gateway.vercel.sh/v1/models", {
        headers: { Authorization: "Bearer " + key },
        signal: AbortSignal.timeout(15e3)
      });
      return new Response(await r.text().catch(() => ""), {
        status: r.status,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
      });
    } catch (e) {
      return json2({ error: String(e?.message || e) }, 502);
    }
  },
  async gwChat(request, env) {
    if (request.method !== "POST") return json2({ error: "POST only." }, 405);
    const key = String(env && env.AI_GATEWAY_API_KEY || "").trim();
    if (!key) return json2({ error: "Vercel AI Gateway is not configured on this deployment yet (add AI_GATEWAY_API_KEY in Sites \u2192 Secrets)." }, 501);
    const body = await readBody(request);
    const model = String(body && body.model || "");
    const messages2 = body && body.messages;
    if (!Array.isArray(messages2) || !messages2.length) return json2({ error: "messages required" }, 400);
    if (!/^[a-z0-9][a-z0-9._-]{0,40}\/[a-z0-9][a-z0-9._:-]{0,80}$/.test(model)) return json2({ error: "bad model id" }, 400);
    try {
      const r = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({ model, messages: messages2, stream: true }),
        signal: AbortSignal.timeout(12e4)
      });
      if (!r.ok) {
        const raw = await r.text().catch(() => "");
        let msg = raw.slice(0, 300);
        try {
          const j = JSON.parse(raw);
          if (j && j.error && j.error.message) msg = j.error.message;
        } catch {
        }
        if (r.status === 403 && /credit card|customer_verification_required/i.test(raw)) {
          msg = "The Vercel AI Gateway key is valid, but the account has no card on file yet, so it will not serve requests. Add one at vercel.com \u2192 AI (free credits), then send again.";
        }
        return json2({ error: msg }, r.status);
      }
      return new Response(r.body, {
        status: 200,
        headers: { "Content-Type": r.headers.get("content-type") || "text/event-stream", "Cache-Control": "no-store" }
      });
    } catch (e) {
      return json2({ error: String(e?.message || e) }, 502);
    }
  },
  // ---- airforce relay (api.airforce, OpenAI-compatible; hosts claude-fable-5.1 etc.) ----
  // The browser sends its locally-stored key in the x-airforce-key header;
  // we swap it into Authorization upstream and stream the answer straight back.
  async afModels(request, env) {
    const key = afKey(request, env);
    if (!key) return json2({ error: "Add your airforce key in Models \u2192 Airforce." }, 401);
    try {
      const r = await fetch("https://api.airforce/v1/models", {
        headers: { Authorization: "Bearer " + key },
        signal: AbortSignal.timeout(15e3)
      });
      if (!r.ok) return new Response(await r.text().catch(() => ""), { status: r.status });
      return new Response(await r.text(), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
    } catch (e) {
      return json2({ error: String(e?.message || e) }, 502);
    }
  },
  async afChat(request, env) {
    if (request.method !== "POST") return json2({ error: "POST only." }, 405);
    const key = afKey(request, env);
    if (!key) return json2({ error: "Add your airforce key in Models \u2192 Airforce." }, 401);
    const body = await readBody(request);
    const { model, messages: messages2 } = body || {};
    if (!Array.isArray(messages2) || !messages2.length) return json2({ error: "messages required" }, 400);
    const modelId = typeof model === "string" && /^[\w.:-]{1,96}$/.test(model) ? model : "claude-fable-5.1";
    try {
      const r = await fetch("https://api.airforce/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({ model: modelId, messages: messages2, stream: true }),
        signal: AbortSignal.timeout(12e4)
      });
      if (!r.ok) return new Response(await r.text().catch(() => ""), { status: r.status });
      return new Response(r.body, {
        status: 200,
        headers: { "Content-Type": r.headers.get("content-type") || "text/event-stream", "Cache-Control": "no-store" }
      });
    } catch (e) {
      return json2({ error: String(e?.message || e) }, 502);
    }
  },
  // ---- openrouter relay (free NVIDIA Nemotron models) ----
  // Browser-sent key wins (x-openrouter-key), then the owner's server secret.
  async orChat(request, env) {
    if (request.method !== "POST") return json2({ error: "POST only." }, 405);
    const h = String(request.headers.get("x-openrouter-key") || "").trim();
    const key = /^[\w.-]{10,256}$/.test(h) ? h : String(env && env.OPENROUTER_API_KEY || "").trim();
    if (!key) return json2({ error: "Create a free key at openrouter.ai/settings/keys, then paste it in Models \u2192 OpenRouter (it stays in your browser)." }, 401);
    const body = await readBody(request);
    const { model, messages: messages2 } = body || {};
    if (!Array.isArray(messages2) || !messages2.length) return json2({ error: "messages required" }, 400);
    const modelId = /^(nvidia\/nemotron-3-ultra-550b-a55b|nvidia\/nemotron-3\.5-super-vl|google\/gemma-4-26b-a4b-it|openai\/gpt-oss-120b|openai\/gpt-oss-20b)$/.test(model) ? model : "openai/gpt-oss-20b";
    try {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({ model: modelId, messages: messages2, stream: true }),
        signal: AbortSignal.timeout(12e4)
      });
      if (!r.ok) return new Response(await r.text().catch(() => ""), { status: r.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
      return new Response(r.body, {
        status: 200,
        headers: { "Content-Type": r.headers.get("content-type") || "text/event-stream", "Cache-Control": "no-store" }
      });
    } catch (e) {
      return json2({ error: String(e?.message || e) }, 502);
    }
  },
  // ---- gemini relay (Google Generative Language; the key is a server secret) ----
  // Google SSE is translated to OpenAI-style chunks so the page parses one format.
  async gmChat(request, env) {
    if (request.method !== "POST") return json2({ error: "POST only." }, 405);
    const key = String(env && env.GEMINI_API_KEY || "").trim();
    if (!key) return json2({ error: "Gemini is not configured on this site." }, 401);
    const body = await readBody(request);
    const { model, messages: gmMsgs } = body || {};
    if (!Array.isArray(gmMsgs) || !gmMsgs.length) return json2({ error: "messages required" }, 400);
    const modelId = /^[a-z0-9][a-z0-9.-]{2,60}$/i.test(String(model || "")) ? String(model) : "gemini-3.5-flash";
    const sys = gmMsgs.filter((m) => m.role === "system").map((m) => String(m.content || "")).join("\n").trim();
    const contents = gmMsgs.filter((m) => m.role !== "system").map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "") }]
    }));
    const payload = { contents, generationConfig: { thinkingConfig: { includeThoughts: true } } };
    if (sys) payload.systemInstruction = { parts: [{ text: sys }] };
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(modelId) + ":streamGenerateContent?alt=sse", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12e4)
      });
      if (!r.ok) return new Response(await r.text().catch(() => ""), { status: r.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
      const dec = new TextDecoder();
      const enc2 = new TextEncoder();
      let buf = "";
      const out = new TransformStream({
        transform(chunk, ctrl) {
          buf += dec.decode(chunk, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop();
          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data) continue;
            let j;
            try {
              j = JSON.parse(data);
            } catch {
              continue;
            }
            const cand = j.candidates && j.candidates[0];
            const parts = cand && cand.content && cand.content.parts || [];
            for (const p of parts) {
              const text = typeof p.text === "string" ? p.text : "";
              if (!text) continue;
              const delta = p.thought ? { reasoning: text } : { content: text };
              ctrl.enqueue(enc2.encode("data: " + JSON.stringify({ choices: [{ delta }] }) + "\n\n"));
            }
          }
        },
        flush(ctrl) {
          ctrl.enqueue(enc2.encode("data: [DONE]\n\n"));
        }
      });
      return new Response(r.body.pipeThrough(out), { status: 200, headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" } });
    } catch (e) {
      return json2({ error: String(e?.message || e) }, 502);
    }
  },
  // ---- groq relay (free-tier groq models: llama, gpt-oss, kimi, qwen, gemma) ----
  // Browser-sent key wins (x-groq-key, free at console.groq.com/keys), then server secret.
  async gqChat(request, env) {
    if (request.method !== "POST") return json2({ error: "POST only." }, 405);
    const h = String(request.headers.get("x-groq-key") || "").trim();
    const key = /^[\w.-]{10,256}$/.test(h) ? h : String(env && env.GROQ_API_KEY || "").trim();
    if (!key) return json2({ error: "Create a free key at console.groq.com/keys, then paste it in Models \u2192 Groq (it stays in your browser)." }, 401);
    const body = await readBody(request);
    const { model, messages: messages3 } = body || {};
    if (!Array.isArray(messages3) || !messages3.length) return json2({ error: "messages required" }, 400);
    const modelId = /^(openai\/gpt-oss-120b|openai\/gpt-oss-20b|qwen\/qwen3\.8-27b|allam-2-7b)$/.test(model) ? model : "openai/gpt-oss-20b";
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({ model: modelId, messages: messages3, stream: true }),
        signal: AbortSignal.timeout(12e4)
      });
      if (!r.ok) return new Response(await r.text().catch(() => ""), { status: r.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
      return new Response(r.body, {
        status: 200,
        headers: { "Content-Type": r.headers.get("content-type") || "text/event-stream", "Cache-Control": "no-store" }
      });
    } catch (e) {
      return json2({ error: String(e?.message || e) }, 502);
    }
  },
  // ---- deepseek relay (Anthropic-compatible endpoint; deepseek-flash + deepseek-v4-pro) ----
  // Browser-sent key wins (x-deepseek-key, from platform.deepseek.com/api_keys), then server secret.
  async dsChat(request, env) {
    if (request.method !== "POST") return json2({ error: "POST only." }, 405);
    const h = String(request.headers.get("x-deepseek-key") || "").trim();
    const key = /^[\w.-]{10,256}$/.test(h) ? h : String(env && env.DEEPSEEK_API_KEY || "").trim();
    if (!key) return json2({ error: "Add a DeepSeek API key: get one at platform.deepseek.com/api_keys, then paste it in Models \u2192 DeepSeek (it stays in your browser)." }, 401);
    const body = await readBody(request);
    const { model, messages: messages4 } = body || {};
    if (!Array.isArray(messages4) || !messages4.length) return json2({ error: "messages required" }, 400);
    const modelId = model === "deepseek-flash" || model === "deepseek-v4-pro" ? model : /^claude-opus/.test(model || "") ? "deepseek-v4-pro" : "deepseek-flash";
    try {
      const r = await fetch("https://api.deepseek.com/anthropic/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: modelId, max_tokens: 2048, messages: messages4, stream: true }),
        signal: AbortSignal.timeout(12e4)
      });
      if (!r.ok) return new Response(await r.text().catch(() => ""), { status: r.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
      return new Response(r.body, {
        status: 200,
        headers: { "Content-Type": r.headers.get("content-type") || "text/event-stream", "Cache-Control": "no-store" }
      });
    } catch (e) {
      return json2({ error: String(e?.message || e) }, 502);
    }
  },
  // ---- ollama cloud relay (OpenAI-compatible; free-plan models verified live) ----
  // Browser-sent key wins (x-ollama-key, from ollama.com/settings/keys), then server secret.
  async olChat(request, env) {
    if (request.method !== "POST") return json2({ error: "POST only." }, 405);
    const h = String(request.headers.get("x-ollama-key") || "").trim();
    const key = /^[\w._-]{10,256}$/.test(h) ? h : String(env && env.OLLAMA_API_KEY || "").trim();
    if (!key) return json2({ error: "Add an Ollama API key: get one at ollama.com/settings/keys, then paste it in Models \u2192 Ollama (it stays in your browser)." }, 401);
    const body = await readBody(request);
    const { model, messages: messages5 } = body || {};
    if (!Array.isArray(messages5) || !messages5.length) return json2({ error: "messages required" }, 400);
    const modelId = /^(gemma4:31b|gpt-oss:20b|beam|nemotron-3-nano:30b|nemotron-3-super)$/.test(model) ? model : "gemma4:31b";
    try {
      const r = await fetch("https://ollama.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({ model: modelId, messages: messages5, stream: true }),
        signal: AbortSignal.timeout(12e4)
      });
      if (!r.ok) return new Response(await r.text().catch(() => ""), { status: r.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
      return new Response(r.body, {
        status: 200,
        headers: { "Content-Type": r.headers.get("content-type") || "text/event-stream", "Cache-Control": "no-store" }
      });
    } catch (e) {
      return json2({ error: String(e?.message || e) }, 502);
    }
  },
  // ---- music ----
  async musicSearch(url) {
    const q = String(url.searchParams.get("q") || "").trim();
    if (!q) return json2({ error: "Type a song name to search." }, 400);
    try {
      const results = await musicSearch(q, url.searchParams.get("limit"));
      return json2(
        { total: results.length, results },
        200,
        { "Cache-Control": "no-store" }
      );
    } catch {
      return json2({ error: "Search failed \u2014 try again." }, 502);
    }
  },
  async musicYt(url) {
    const q = String(url.searchParams.get("q") || "").trim().slice(0, 200);
    if (!q) return json2({ error: "Missing q." }, 400);
    try {
      const videoId = await youtubeResolve(q);
      return json2({ videoId }, 200, { "Cache-Control": "no-store" });
    } catch {
      return json2({ error: "YouTube search failed." }, 502);
    }
  },
  // ---- chat ----
  async chatAuth(request) {
    if (request.method !== "POST") return json2({ error: "POST only." }, 405);
    const body = await readBody(request);
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    if (!chatNameRe.test(name))
      return json2({ error: "Name must be 3-16 letters, numbers, _ - or ." }, 400);
    if (password.length < 4)
      return json2({ error: "Password needs at least 4 characters." }, 400);
    const key = name.toLowerCase();
    let user = chatStore.users.get(key);
    if (user) {
      if (await chatStore.pbkdfHash(password, user.salt) !== user.hash)
        return json2({ error: "That name is taken and the password doesn't match." }, 401);
    } else {
      const salt = chatStore.b64url(crypto.getRandomValues(new Uint8Array(16)));
      user = {
        id: chatStore.randHex(8),
        name,
        salt,
        hash: await chatStore.pbkdfHash(password, salt),
        createdAt: Date.now()
      };
      chatStore.users.set(key, user);
    }
    return json2({
      token: await chatMakeToken(key),
      user: { id: user.id, name: user.name, createdAt: user.createdAt }
    });
  },
  async chatGuest(request) {
    if (request.method !== "POST") return json2({ error: "POST only." }, 405);
    const body = await readBody(request);
    const taken = (n) => chatStore.users.has(n.toLowerCase()) || [...chatStore.guests.values()].some(
      (g) => g.name.toLowerCase() === n.toLowerCase()
    );
    const wanted = String(body.name || "").trim();
    let name;
    if (chatNameRe.test(wanted) && !taken(wanted)) name = wanted;
    else {
      let c = `Guest-${Math.floor(1e3 + Math.random() * 9e3)}`, guard = 0;
      while (taken(c) && guard++ < 20)
        c = `Guest-${Math.floor(1e3 + Math.random() * 9e3)}`;
      name = c;
    }
    const id = `g_${chatStore.randHex(6)}`;
    const now = Date.now();
    chatStore.guests.set(id, { id, name, createdAt: now });
    return json2({
      token: await chatMakeToken(id),
      user: { id, name, createdAt: now, guest: true }
    });
  },
  async chatMessages(request, url) {
    const token = chatUserFromAuthHeader(request.headers.get("authorization"));
    const user = token ? await chatVerifyToken(token) : null;
    if (!user) return json2({ error: "Log in to read the room." }, 401);
    const now = Date.now();
    const self = user.userId.startsWith("g_") ? chatStore.guests.get(user.userId) : chatStore.users.get(user.userId);
    if (self) self.lastSeen = now;
    if (request.method === "GET") {
      for (const [id, t] of chatStore.typing)
        if (now - t.at > 4e3) chatStore.typing.delete(id);
      const online = [
        ...[...chatStore.users.values()].filter((u) => u.lastSeen && now - u.lastSeen <= ONLINE_MS).map((u) => u.name),
        ...[...chatStore.guests.values()].filter((g) => g.lastSeen && now - g.lastSeen <= ONLINE_MS).map((g) => g.name)
      ];
      const typers = [...chatStore.typing.values()].filter((t) => t.name !== user.name).map((t) => t.name);
      const since = Math.max(parseInt(url.searchParams.get("since") || "") || 0, 0);
      const list = chatStore.messages;
      let start = 0;
      if (since > 0) while (start < list.length && list[start].t <= since) start++;
      else start = Math.max(list.length - 80, 0);
      const out = [];
      for (let i = start; i < list.length; i++) {
        const m = list[i];
        const rx = chatStore.reacts.get(m.id);
        if (!rx) {
          out.push(m);
          continue;
        }
        const r = {};
        const mine = [];
        for (const [emoji, who] of rx) {
          if (!who.size) continue;
          r[emoji] = who.size;
          if (who.has(user.userId)) mine.push(emoji);
        }
        if (mine.length) out.push({ ...m, r, mine });
        else if (Object.keys(r).length) out.push({ ...m, r });
        else out.push(m);
      }
      const reacted = [];
      const ra = Math.max(list.length - 200, 0);
      for (let i = ra; i < list.length; i++) {
        const m = list[i];
        const rx = chatStore.reacts.get(m.id);
        if (!rx) continue;
        const r = {};
        const mine = [];
        for (const [emoji, who] of rx)
          if (who.size) {
            r[emoji] = who.size;
            if (who.has(user.userId)) mine.push(emoji);
          }
        if (Object.keys(r).length) reacted.push({ id: m.id, r, mine });
      }
      return json2(
        { now, online, typers, messages: out, reacted },
        200,
        { "Cache-Control": "no-store" }
      );
    }
    if (request.method === "POST") {
      const body = await readBody(request);
      const text = String(body.text || "").trim();
      if (body.typing === true && !text) {
        chatStore.typing.set(user.userId, { name: user.name, at: now });
        return json2({ ok: true });
      }
      if (!text) return json2({ error: "Type a message first." }, 400);
      if (text.length > 500)
        return json2({ error: "Message too long (500 max)." }, 400);
      chatStore.typing.delete(user.userId);
      const msg = { id: chatStore.randHex(6), u: user.name, text, t: Date.now() };
      if (user.guest) msg.g = true;
      chatStore.messages.push(msg);
      return json2({ ok: true, message: msg });
    }
    return json2({ error: "GET or POST only." }, 405);
  },
  // ---- chat reactions ----
  // POST { id, emoji } toggles the caller's reaction on that message.
  // Only message authors can react to their own message? No - anyone reacts
  // to anything; guests and accounts alike.
  async chatReact(request) {
    if (request.method !== "POST") return json2({ error: "POST only." }, 405);
    const token = chatUserFromAuthHeader(request.headers.get("authorization"));
    const user = token ? await chatVerifyToken(token) : null;
    if (!user) return json2({ error: "Log in first." }, 401);
    const body = await readBody(request);
    const id = String(body.id || "");
    const emoji = String(body.emoji || "");
    if (!chatStore.REACT_EMOJIS.includes(emoji))
      return json2({ error: "Unknown reaction." }, 400);
    const msg = chatStore.messages.find((m) => m.id === id);
    if (!msg) return json2({ error: "Message no longer exists." }, 404);
    let rx = chatStore.reacts.get(id);
    if (!rx) {
      rx = /* @__PURE__ */ new Map();
      chatStore.reacts.set(id, rx);
    }
    let who = rx.get(emoji);
    if (!who) {
      who = /* @__PURE__ */ new Set();
      rx.set(emoji, who);
    }
    let on;
    if (who.has(user.userId)) {
      who.delete(user.userId);
      on = false;
    } else {
      who.add(user.userId);
      on = true;
    }
    if (!who.size) rx.delete(emoji);
    if (!rx.size) chatStore.reacts.delete(id);
    const r = {};
    const rx2 = chatStore.reacts.get(id);
    const mine = [];
    if (rx2) {
      for (const [e2, who2] of rx2) if (who2.size) {
        r[e2] = who2.size;
        if (who2.has(user.userId)) mine.push(e2);
      }
    }
    return json2({ ok: true, id, r, mine, on });
  },
  // ---- games ----
  async gamesZones() {
    try {
      const text = await gamesZonesText();
      return new Response(text, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=300"
        }
      });
    } catch {
      return json2({ error: "Couldn't fetch the games catalog." }, 502);
    }
  },
  async gamesPlay(file) {
    const f = String(file || "").toLowerCase();
    if (!GAMES_FILE_RE.test(f)) return new Response("bad game file", { status: 400 });
    try {
      const r = await fetch(`${GAMES_MIRROR}/html@main/${encodeURIComponent(f)}`, {
        signal: AbortSignal.timeout(12e3),
        headers: { "User-Agent": "haze/1.0" }
      });
      if (!r.ok) throw new Error(`upstream ${r.status}`);
      return new Response(await r.text(), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300"
        }
      });
    } catch {
      return new Response("Couldn't load that game \u2014 try again.", { status: 502 });
    }
  },
  // ---- AI relay ----
  async aiRelay(request) {
    if (request.method !== "POST") return json2({ error: "POST only." }, 405);
    const body = await readBody(request);
    const { model, messages: messages2 } = body || {};
    if (!Array.isArray(messages2) || !messages2.length)
      return json2({ error: "messages required" }, 400);
    const wanted = typeof model === "string" && /^[\w.-]{1,64}$/.test(model) ? model : "openai-fast";
    const rawToken = typeof body.token === "string" ? body.token.trim() : "";
    const token = /^[A-Za-z0-9._~-]{20,256}$/.test(rawToken) ? rawToken : "";
    const callUpstream = (m) => fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: token ? { "Content-Type": "application/json", Authorization: "Bearer " + token } : { "Content-Type": "application/json" },
      body: JSON.stringify({ model: m, messages: messages2, stream: true, referrer: "haze" }),
      signal: AbortSignal.timeout(6e4)
    });
    try {
      let upstream = await callUpstream(wanted);
      if (!upstream.ok && !token && [402, 403, 404].includes(upstream.status) && wanted !== "openai-fast")
        upstream = await callUpstream("openai-fast");
      if (!upstream.ok)
        return new Response(await upstream.text().catch(() => ""), {
          status: upstream.status
        });
      return new Response(upstream.body, {
        status: 200,
        headers: {
          "Content-Type": upstream.headers.get("content-type") || "text/event-stream"
        }
      });
    } catch (e) {
      return json2({ error: String(e?.message || e) }, 502);
    }
  },
  // ---- search suggestions (duckduckgo autocomplete, straight back) ----
  async suggest(url) {
    const q = String(url.searchParams.get("q") || "").slice(0, 128);
    if (!q) return json2({ suggestions: [] }, 200, { "Cache-Control": "no-store" });
    try {
      const r = await fetch("https://duckduckgo.com/ac/?q=" + encodeURIComponent(q) + "&type=list", {
        signal: AbortSignal.timeout(8e3),
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      if (!r.ok) return json2({ suggestions: [] }, 200, { "Cache-Control": "no-store" });
      const data = await r.json().catch(() => null);
      const list = Array.isArray(data) && Array.isArray(data[1]) ? data[1].slice(0, 8) : [];
      return json2({ suggestions: list }, 200, { "Cache-Control": "no-store" });
    } catch {
      return json2({ suggestions: [] }, 200, { "Cache-Control": "no-store" });
    }
  },
  // ---- online presence (heartbeat count) ----
  async onlineBeat(url) {
    const cid = String(url.searchParams.get("cid") || "").replace(/[^\w-]/g, "").slice(0, 64);
    const now = Date.now();
    if (cid) onlineCid.set(cid, now);
    for (const [k, t] of onlineCid) if (now - t > ONLINE_TTL) onlineCid.delete(k);
    return json2({ online: onlineCid.size, now }, 200, { "Cache-Control": "no-store" });
  }
};
function afKey(request, env) {
  const h = String(request.headers.get("x-airforce-key") || "").trim();
  if (/^[\w.-]{10,256}$/.test(h)) return h;
  const s = String(env && env.AIRFORCE_API_KEY || "").trim();
  return /^[\w.-]{10,256}$/.test(s) ? s : "";
}
var ONLINE_TTL = 75e3;
var onlineCid = /* @__PURE__ */ new Map();
var WISP_TD = new TextDecoder();
var WISP_TC = new TextEncoder();
function wispFrame(type, streamId, payload) {
  var p = payload || new Uint8Array(0);
  var out = new Uint8Array(5 + p.length);
  var view = new DataView(out.buffer);
  view.setUint8(0, type);
  view.setUint32(1, streamId, true);
  out.set(p, 5);
  return out;
}
function wispParse(bytes) {
  var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  var type = view.getUint8(0);
  var streamId = view.getUint32(1, true);
  var pkt = { type, streamId, streamType: 0, port: 0, host: "" };
  if (type === 1 && bytes.length >= 8) {
    pkt.streamType = view.getUint8(5);
    pkt.port = view.getUint16(6, true);
    pkt.host = WISP_TD.decode(bytes.subarray(8)).trim();
  }
  return pkt;
}
function wispGrant(n) {
  var p = new Uint8Array(4);
  new DataView(p.buffer).setUint32(0, n, true);
  return p;
}
var WispProxy = class {
  logFrame(bytes) {
    if (bytes.length < 5) return;
    var t = bytes[0], id = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(1, true);
    var names = { 1: "CONNECT", 2: "DATA", 3: "CONTINUE", 4: "CLOSE", 5: "INFO" };
    if (t === 1 && bytes.length >= 8) {
      var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      console.log("[wisp] CONNECT stream", id, "->", WISP_TD.decode(bytes.subarray(8)).trim() + ":" + dv.getUint16(6, true), "streamType", dv.getUint8(5));
    } else {
      console.log("[wisp]", names[t] || t, "stream", id);
    }
  }
  constructor(ws) {
    this.ws = ws;
    this.streams = /* @__PURE__ */ new Map();
    this.opening = /* @__PURE__ */ new Map();
    this.received = 0;
    this.granted = false;
    ws.addEventListener("message", (event) => {
      this.onFrame(event.data).catch((e) => console.log("[wisp] msg err", e?.message || e));
    });
    ws.addEventListener("close", () => this.cleanup());
    ws.addEventListener("error", () => this.cleanup());
  }
  async onFrame(data) {
    try {
      var arr;
      if (typeof data === "string") {
        arr = WISP_TC.encode(data);
      } else if (data instanceof Blob) {
        arr = new Uint8Array(await data.arrayBuffer());
      } else {
        arr = new Uint8Array(data);
        if (arr.length === 0 && data && data.size) arr = new Uint8Array(await data.arrayBuffer());
      }
      if (!arr || !arr.length) return;
      this.logFrame(arr);
      this.route(arr);
    } catch (e) {
      console.log("[wisp] parse err", e?.message || e);
    }
  }
  grant(id, n) {
    this.send(3, id, wispGrant(n));
  }
  send(type, id, payload) {
    try {
      this.ws.send(wispFrame(type, id, payload));
    } catch (e) {
    }
  }
  cleanup() {
    for (var [id, s] of [...this.streams.entries()]) {
      this.streams.delete(id);
      try {
        s.close();
      } catch (e) {
      }
    }
    for (var id of [...this.opening.keys()]) this.opening.delete(id);
    try {
      this.ws.close(1e3);
    } catch (e) {
    }
  }
  closeStream(id, reason) {
    var s = this.streams.get(id);
    this.streams.delete(id);
    this.opening.delete(id);
    try {
      s.close();
    } catch (e) {
    }
    if (reason != null) this.send(4, id, new Uint8Array([reason]));
  }
  route(bytes) {
    if (bytes.length < 5) return;
    var pkt = wispParse(bytes);
    if (pkt.type === 5) {
      this.send(5, 0, new Uint8Array([2, 0]));
      return;
    }
    if (!this.granted) {
      this.granted = true;
      this.grant(0, 128);
    }
    if (pkt.type === 1) {
      if (pkt.streamType !== 1) {
        this.closeStream(pkt.streamId, 65);
        return;
      }
      this.openStream(pkt.streamId, pkt.host, pkt.port);
      return;
    }
    if (pkt.type === 2) {
      var s = this.streams.get(pkt.streamId);
      if (!s) {
        var pend = this.opening.get(pkt.streamId);
        if (pend) pend.push(bytes.subarray(5));
        else this.closeStream(pkt.streamId, 67);
        return;
      }
      s.received++;
      if (s.received % 64 === 0) this.grant(pkt.streamId, 128);
      Promise.resolve(s.writer.write(bytes.subarray(5))).catch(() => this.closeStream(pkt.streamId, 3));
      return;
    }
    if (pkt.type === 4) {
      this.closeStream(pkt.streamId, null);
      return;
    }
  }
  async openStream(id, host, port) {
    console.log("[wisp] openStream", id, host + ":" + port);
    if (this.streams.has(id) || this.opening.has(id)) return;
    var pend = [];
    this.opening.set(id, pend);
    var socket;
    var writer;
    try {
      socket = connect({ hostname: host, port: Number(port) || 80 });
      await Promise.race([
        socket.opened,
        new Promise((_, reject) => setTimeout(() => reject(new Error("connect timeout")), 8e3))
      ]);
      writer = socket.writable.getWriter();
      console.log("[wisp] openStream ready", id);
    } catch (e) {
      console.log("[wisp] openStream failed", id, e?.message || e);
      this.opening.delete(id);
      this.closeStream(id, 66);
      return;
    }
    if (!this.streams.has(id)) {
      var entry = { socket, writer, received: 0, close: () => {
        try {
          socket.close();
        } catch (e) {
        }
      } };
      this.streams.set(id, entry);
    }
    this.opening.delete(id);
    if (pend.length) {
      for (var chunk of pend) {
        try {
          await writer.write(chunk);
        } catch (e) {
          this.closeStream(id, 3);
          return;
        }
      }
    }
    (async () => {
      try {
        var reader = socket.readable.getReader();
        while (true) {
          var { done, value } = await reader.read();
          if (done) break;
          if (!this.streams.has(id)) break;
          this.send(2, id, value);
        }
        this.closeStream(id, null);
      } catch (e) {
        this.closeStream(id, 3);
      }
      try {
        writer.releaseLock();
      } catch (e) {
      }
    })();
  }
};
async function handleWisp(request, ctx) {
  if ((request.headers.get("Upgrade") || "").toLowerCase() !== "websocket") {
    return new Response("Expected websocket upgrade", { status: 426 });
  }
  var pair = new WebSocketPair();
  var [client, server] = Object.values(pair);
  server.accept();
  var proxy = new WispProxy(server);
  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(new Promise((resolve) => {
      server.addEventListener("close", resolve);
      server.addEventListener("error", resolve);
    }));
  }
  return new Response(null, { status: 101, webSocket: client });
}
var authClient = null;
var authHandler = null;
var accountSchemaReady = false;
var ACCOUNT_NO_STORE = { "Cache-Control": "private, no-store" };
function setupAuth(env) {
  if (!authHandler) {
    const origin = String(env.APP_ORIGIN || "");
    const local = /^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(origin);
    authClient = createFreebuffAuth({
      clientId: env.FREEBUFF_CLIENT_ID,
      issuer: env.FREEBUFF_ISSUER,
      baseUrl: origin,
      allowInsecureLocalhost: local
    });
    authHandler = authClient.wrap((request, env2, ctx2) => worker_default.fetch(request, env2, ctx2));
  }
  return authHandler;
}
async function ensureAccountSchema(env) {
  if (!env.DB) return false;
  if (!accountSchemaReady) {
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS haze_accounts (sub TEXT PRIMARY KEY, email TEXT, name TEXT, picture TEXT, data TEXT NOT NULL, updated_at INTEGER NOT NULL)"
    ).run();
    accountSchemaReady = true;
  }
  return true;
}
async function accountMe(request, env) {
  if (request.method !== "GET") return json2({ error: "GET only." }, 405, ACCOUNT_NO_STORE);
  if (!authClient) return json2({ error: "Accounts are not configured." }, 503, ACCOUNT_NO_STORE);
  const user = await authClient.getUser(request);
  if (!user) return json2({ error: "Sign in required." }, 401, ACCOUNT_NO_STORE);
  let storage = false;
  try {
    storage = await ensureAccountSchema(env);
  } catch (e) {
    console.error("haze account schema:", e?.message || e);
  }
  if (!storage) return json2({ user, data: null, updatedAt: null, storage: false }, 200, ACCOUNT_NO_STORE);
  let row = null;
  try {
    row = await env.DB.prepare("SELECT data, updated_at FROM haze_accounts WHERE sub = ?").bind(user.sub).first();
  } catch (e) {
    console.error("haze account read:", e?.message || e);
    return json2({ error: "Account storage is unavailable." }, 503, ACCOUNT_NO_STORE);
  }
  let data = null;
  if (row && row.data) {
    try {
      data = JSON.parse(row.data);
    } catch {
    }
  }
  return json2({ user, data, updatedAt: row?.updated_at || null, storage: true }, 200, ACCOUNT_NO_STORE);
}
async function accountSave(request, env) {
  if (request.method !== "PUT") return json2({ error: "PUT only." }, 405, ACCOUNT_NO_STORE);
  if (!authClient) return json2({ error: "Accounts are not configured." }, 503, ACCOUNT_NO_STORE);
  if (!isSameOriginRequest(request, env.APP_ORIGIN)) {
    return json2({ error: "Cross-origin request refused." }, 403, ACCOUNT_NO_STORE);
  }
  const user = await authClient.getUser(request);
  if (!user) return json2({ error: "Sign in required." }, 401, ACCOUNT_NO_STORE);
  const body = await readBody(request);
  const data = body && body.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return json2({ error: "Expected a data object." }, 400, ACCOUNT_NO_STORE);
  }
  let encoded;
  try {
    encoded = JSON.stringify(data);
  } catch {
  }
  if (!encoded || encoded.length > 12e4) {
    return json2({ error: "Saved data is too large." }, 413, ACCOUNT_NO_STORE);
  }
  if (!env.DB) return json2({ error: "Account storage is unavailable." }, 503, ACCOUNT_NO_STORE);
  try {
    await ensureAccountSchema(env);
    const now = Date.now();
    await env.DB.prepare(
      "INSERT INTO haze_accounts (sub, email, name, picture, data, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(sub) DO UPDATE SET email=excluded.email, name=excluded.name, picture=excluded.picture, data=excluded.data, updated_at=excluded.updated_at"
    ).bind(user.sub, user.email || null, user.name || null, user.picture || null, encoded, now).run();
    return json2({ ok: true, updatedAt: now }, 200, ACCOUNT_NO_STORE);
  } catch (e) {
    console.error("haze account write:", e?.message || e);
    return json2({ error: "Account storage is unavailable." }, 503, ACCOUNT_NO_STORE);
  }
}
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (p === "/music/search") return routes.musicSearch(url);
    if (p === "/search/suggest") return routes.suggest(url);
    if (p === "/music/yt") return routes.musicYt(url);
    if (p === "/chat/auth") return routes.chatAuth(request);
    if (p === "/chat/guest") return routes.chatGuest(request);
    if (p === "/chat/messages") return routes.chatMessages(request, url);
    if (p === "/chat/react") return routes.chatReact(request);
    if (p === "/games/zones.json") return routes.gamesZones();
    if (p.startsWith("/games/play/"))
      return routes.gamesPlay(decodeURIComponent(p.slice("/games/play/".length).split("/")[0]));
    if (p === "/ai/relay") return routes.aiRelay(request);
    if (p === "/ai/airforce/models") return routes.afModels(request, env);
    if (p === "/ai/airforce") return routes.afChat(request, env);
    if (p === "/ai/openrouter") return routes.orChat(request, env);
    if (p === "/ai/gemini") return routes.gmChat(request, env);
    if (p === "/ai/groq") return routes.gqChat(request, env);
    if (p === "/ai/deepseek") return routes.dsChat(request, env);
    if (p === "/ai/ollama") return routes.olChat(request, env);
    if (p === "/ai/gateway/models") return routes.gwModels(request, env);
    if (p === "/ai/gateway") return routes.gwChat(request, env);
    if (p === "/api/online") return routes.onlineBeat(url);
    if (p === "/api/account/me") return accountMe(request, env);
    if (p === "/api/account/data") return accountSave(request, env);
    if (p === "/wisp/" || p.startsWith("/wisp/"))
      return handleWisp(request, ctx);
    return env.ASSETS.fetch(request);
  }
};
var worker_default2 = {
  async fetch(request, env, ctx) {
    if (!env.FREEBUFF_CLIENT_ID || !env.APP_ORIGIN) {
      return worker_default.fetch(request, env, ctx);
    }
    try {
      return await setupAuth(env)(request, env, ctx);
    } catch (e) {
      console.error("haze auth unavailable:", e?.message || e);
      return worker_default.fetch(request, env, ctx);
    }
  }
};
export {
  worker_default2 as default
};
