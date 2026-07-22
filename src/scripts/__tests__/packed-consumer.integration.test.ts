/**
 * @jest-environment node
 */

import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = process.cwd();
const COMMAND_ENV = { ...process.env, CI: 'true', FORCE_COLOR: '0' };

function runInteractiveCli(
  cliPath: string,
  args: string[],
  cwd: string,
  answers: Array<{ prompt: string; input: string }>
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd,
      env: COMMAND_ENV,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let nextAnswer = 0;
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Installed CLI timed out: zebkit ${args.join(' ')}`));
    }, 60000);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      const answer = answers[nextAnswer];
      if (answer && stdout.includes(answer.prompt)) {
        nextAnswer += 1;
        child.stdin.write(answer.input);
        if (nextAnswer === answers.length) {
          setTimeout(() => child.stdin.end(), 100);
        }
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`zebkit ${args.join(' ')} exited ${code}\n${stdout}\n${stderr}`));
    });
  });
}

describe('packed consumer workflow', () => {
  jest.setTimeout(360000);

  it('installs the tarball and runs init, pull, primitive overrides, and strict exports', async () => {
    const packDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-dtcg-pack-'));
    const consumerRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'zebkit-dtcg-consumer-'));
    const consumerDir = path.join(consumerRoot, 'packed-consumer');

    try {
      await fs.ensureDir(consumerDir);
      await execFileAsync('npm', ['pack', '--pack-destination', packDir], {
        cwd: PROJECT_ROOT,
        env: COMMAND_ENV,
        maxBuffer: 20 * 1024 * 1024,
      });
      const tarballs = (await fs.readdir(packDir)).filter((file) => file.endsWith('.tgz'));
      expect(tarballs).toHaveLength(1);
      const tarballPath = path.join(packDir, tarballs[0]);

      await fs.writeJson(path.join(consumerDir, 'package.json'), {
        name: 'zebkit-packed-consumer',
        private: true,
        version: '1.0.0',
      });
      await execFileAsync(
        'npm',
        [
          'install',
          '--ignore-scripts',
          '--package-lock=false',
          '--no-audit',
          '--no-fund',
          tarballPath,
        ],
        {
          cwd: consumerDir,
          env: COMMAND_ENV,
          maxBuffer: 20 * 1024 * 1024,
        }
      );

      const packageRoot = path.join(consumerDir, 'node_modules', 'zebkit');
      const cliPath = path.join(packageRoot, 'dist', 'cli', 'zebkit.mjs');
      for (const relativePath of [
        'dist/cli/defaults/manifest.json',
        'dist/cli/defaults/component-tokens.json',
        'dist/cli/presets/manifest.json',
        'dist/cli/context/llms.txt',
        'dist/editor/schemas/zbk-color.schema.json',
        'dist/editor/schemas/zebkit.config.schema.json',
        'dist/editor/zebkit.css-data.json',
        'dist/cli/zebkit.mjs',
        'dist/components/zebkit.js',
        'dist/components/zebkit.js.map',
      ]) {
        expect(await fs.pathExists(path.join(packageRoot, relativePath))).toBe(true);
      }
      expect(await fs.pathExists(path.join(packageRoot, 'src', 'scripts'))).toBe(false);

      const presetManifest = await fs.readJson(
        path.join(packageRoot, 'dist', 'cli', 'presets', 'manifest.json')
      ) as { themes: string[] };
      for (const theme of presetManifest.themes) {
        expect(
          await fs.pathExists(
            path.join(packageRoot, 'dist', 'cli', 'presets', theme, 'manifest.json')
          )
        ).toBe(true);
      }

      const init = await runInteractiveCli(cliPath, ['init', '--quick'], consumerDir, [
        { prompt: 'Output directory for compiled CSS:', input: '\n' },
        { prompt: 'Asset URL path (used for CSS asset references):', input: '\n' },
        { prompt: 'Starting theme:', input: '\n' },
        { prompt: 'Project name (used for output filename):', input: '\n' },
        { prompt: 'Copy default token files to ./tokens/ for customization?', input: '\n' },
      ]);
      expect(init.stdout).toContain('Created zebkit.config.json');
      expect(await fs.pathExists(path.join(consumerDir, 'tokens', 'zbk-color.tokens.json'))).toBe(true);
      expect(await fs.pathExists(path.join(consumerDir, 'zebkit', 'context', 'llms.txt'))).toBe(true);

      const runCli = (args: string[]) =>
        execFileAsync(process.execPath, [cliPath, ...args], {
          cwd: consumerDir,
          env: COMMAND_ENV,
          maxBuffer: 20 * 1024 * 1024,
        });
      await runCli(['build']);
      await runCli(['pull']);
      await runCli(['build']);

      const configPath = path.join(consumerDir, 'zebkit.config.json');
      const config = await fs.readJson(configPath);
      const themeName = config.tokens.themeName as string;
      const palettePath = path.join(consumerDir, 'tokens', 'zbk-color.tokens.json');
      const palette = await fs.readJson(palettePath);
      palette['red-500'].$value = {
        colorSpace: 'srgb',
        components: [0.070588, 0.203922, 0.337255],
        hex: '#123456',
      };
      await fs.writeJson(palettePath, palette, { spaces: 2 });
      Object.assign(config.tokens, {
        exportTokens: true,
        exportStrict: true,
        outputFormats: ['JSON'],
        splitMode: 'combined',
        writeVariantRegistry: false,
      });
      await fs.writeJson(configPath, config, { spaces: 2 });

      await runCli(['build']);
      const destinationPath = path.resolve(consumerDir, config.tokens.destinationPath);
      const css = await fs.readFile(
        path.join(destinationPath, `zbk-${themeName}.min.css`),
        'utf8'
      );
      const declarations = [...css.matchAll(/--zbk-color-red-500:([^;}]+)/g)];
      expect(declarations).toHaveLength(2);
      expect(declarations[1][1]).toContain('#123456');
      expect(await fs.pathExists(path.join(destinationPath, `${themeName}-tokens.json`))).toBe(true);
      expect(
        await fs.pathExists(path.join(destinationPath, `${themeName}-tokens.strict.json`))
      ).toBe(true);
      expect(await fs.pathExists(path.join(destinationPath, `${themeName}.drop-manifest.json`))).toBe(true);

      config.tokens.splitMode = 'per-module';
      await fs.writeJson(configPath, config, { spaces: 2 });
      await runCli(['build']);
      expect(await fs.pathExists(path.join(destinationPath, 'zbk-color.tokens.json'))).toBe(true);
      expect(
        await fs.pathExists(path.join(destinationPath, `${themeName}-tokens.strict.json`))
      ).toBe(true);
      expect(await fs.pathExists(path.join(destinationPath, 'zbk-color.strict.tokens.json'))).toBe(false);
    } finally {
      await fs.remove(packDir);
      await fs.remove(consumerRoot);
    }
  });
});
