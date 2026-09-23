#!/usr/bin/env node
// Recompute the CSP hashes for the inline <script> and <style> blocks in
// index.html and write them into the Content-Security-Policy meta tag.
//
//   node tools/csp-hash.js           rewrite index.html in place
//   node tools/csp-hash.js --check   exit 1 if the hashes are stale
//
// Run it after ANY edit to the <script> or <style> block: a stale hash makes
// the browser refuse to run the script or apply the styles.
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const file = path.join(__dirname, "..", "index.html");
// The HTML parser normalises CRLF to LF before hashing, so do the same:
// the hash then survives a Windows checkout with core.autocrlf.
const html = fs.readFileSync(file, "utf8").replace(/\r\n?/g, "\n");

function blockHash(tag) {
  const blocks = [...html.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g"))];
  if (blocks.length !== 1) {
    throw new Error(`Expected exactly one bare <${tag}> block, found ${blocks.length}.`);
  }
  return "sha256-" + crypto.createHash("sha256").update(blocks[0][1], "utf8").digest("base64");
}

const scriptHash = blockHash("script");
const styleHash = blockHash("style");

const updated = html
  .replace(/script-src '[^']*'/, `script-src '${scriptHash}'`)
  .replace(/style-src '[^']*'/, `style-src '${styleHash}'`);

if (process.argv.includes("--check")) {
  if (updated !== html) {
    console.error("CSP hashes in index.html are stale. Run: node tools/csp-hash.js");
    process.exit(1);
  }
  console.log("CSP hashes are current.");
} else {
  fs.writeFileSync(file, updated);
  console.log(`script-src '${scriptHash}'\nstyle-src  '${styleHash}'`);
}
