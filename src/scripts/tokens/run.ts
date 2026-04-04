#!/usr/bin/env ts-node
// Entry point for `npm run build:tokens`. Delegates to the exported function
// so that build-tokens.ts can be imported as a pure module by the CLI.
import { runTokenBuild } from './build-tokens.js';

runTokenBuild();
