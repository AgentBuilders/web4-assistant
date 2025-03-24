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
      closeBundle: () => {
        const js = readFileSync("dist/main.js")
          .toString()
          .replace("https://rpc.mainnet.near.org", RPC_URL)
          .replace('"mainnet"', `"${NETWORK_ID}"`);

        const html = readFileSync("dist/index.html")
          .toString()
          .replace(
            /<script.*src="\.\/main\.js".*><\/script>/,
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
    },
  ],
};