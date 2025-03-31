import { rollupPluginHTML as html } from "@web/rollup-plugin-html";
import terser from "@rollup/plugin-terser";
import { readFileSync, writeFileSync } from "fs";

const RPC_URL = process.env.RPC_URL || "https://rpc.mainnet.near.org";
const NETWORK_ID = process.env.NETWORK_ID || "mainnet";

export default {
  input: "./index.html",
  output: { dir: "dist" },
  plugins: [
    html({ minify: true }),
    terser(),
    {
        name: "inline-js",
        generateBundle(_, bundle) {
            const jsFileName = Object.keys(bundle).find((f) => f.endsWith(".js"));
            const htmlFileName = Object.keys(bundle).find((f) => f.endsWith(".html"));

            if (!jsFileName || !htmlFileName) {
            throw new Error("Missing expected output files");
            }

            const js = bundle[jsFileName].code
            .replace("https://rpc.mainnet.near.org", RPC_URL)
            .replace('"mainnet"', `"${NETWORK_ID}"`);

            const html = bundle[htmlFileName].source.toString().replace(
            /<script.*src="\.\/.*\.js".*><\/script>/,
            `<script type="module">${js}</script>`
            );

            writeFileSync(
            "web4.js",
            `
        export function web4_get() {
        env.value_return(JSON.stringify({
            contentType: 'text/html; charset=UTF-8',
            body: '${Buffer.from(html).toString("base64")}'
        }));
        }
            `.trim()
            );
        },
    }
  ],
};