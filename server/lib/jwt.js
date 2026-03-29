import * as jose from 'jose';

export async function signAccessToken(payload, secret) {
  const key = new TextEncoder().encode(secret);
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(key);
}

export async function verifyAccessToken(token, secret) {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jose.jwtVerify(token, key, { algorithms: ['HS256'] });
  return payload;
}
