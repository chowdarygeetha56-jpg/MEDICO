import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
const privateKeyValue = (await exportPKCS8(privateKey)).trimEnd().replace(/\n/g, " ");
const jwksValue = JSON.stringify({ keys: [{ use: "sig", ...(await exportJWK(publicKey)) }] });

process.stdout.write(`JWT_PRIVATE_KEY="${privateKeyValue}"\nJWKS='${jwksValue}'\n`);