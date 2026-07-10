#!/usr/bin/env node
import { main } from "../src/cli.js";

main(process.argv.slice(2)).catch((error) => {
  console.error(`aienvmap: ${error.message}`);
  process.exit(1);
});
