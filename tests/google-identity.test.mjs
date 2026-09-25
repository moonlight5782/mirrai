import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, SignJWT } from "jose";
import { verifyGoogleToken } from "../lib/google-identity.mjs";

test("Google identity requires trusted signature, audience, issuer, expiry, nonce and verified email", async () => {
  const {privateKey,publicKey} = await generateKeyPair("RS256");
  const claims = {iss:"https://accounts.google.com",aud:"client",sub:"google-user",nonce:"nonce",email:"Owner@example.com",email_verified:true,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300};
  const sign = (overrides = {}, key=privateKey) => new SignJWT({...claims,...overrides}).setProtectedHeader({alg:"RS256"}).sign(key);
  assert.deepEqual(await verifyGoogleToken(await sign(),publicKey,"client","nonce"),{subject:"google-user",email:"owner@example.com",name:""});
  for (const change of [{iss:"https://evil.invalid"},{aud:"another"},{nonce:"other"},{email_verified:false},{exp:1},{azp:"another"}]) await assert.rejects(verifyGoogleToken(await sign(change),publicKey,"client","nonce"));
  const other = await generateKeyPair("RS256");
  await assert.rejects(verifyGoogleToken(await sign({},other.privateKey),publicKey,"client","nonce"));
});
