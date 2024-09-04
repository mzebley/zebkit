import inquirer from 'inquirer';
import { rollup } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { babel } from '@rollup/plugin-babel';
import dts from 'rollup-plugin-dts';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import sass from 'sass';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

const log = {
    info: (msg) => console.log(chalk.blue(msg)),
    success: (msg) => console.log(chalk.green(msg)),
    error: (msg) => console.error(chalk.red(msg)),
    warn: (msg) => console.warn(chalk.yellow(msg)),
    debug: (msg) => console.log(chalk.gray(msg))
};

async function getComponents() {
    const componentsDir = path.join(process.cwd(), 'src', 'components');
    try {
        const items = await fs.readdir(componentsDir, { withFileTypes: true });
        const components = items
            .filter(item => item.isDirectory() && !item.name.startsWith('.'))
            .map(item => item.name);
        return components;
    } catch (error) {
        console.warn('No components directory found or error reading it:', error);
        return [];
    }
}


async function compileSass(scssFiles, cssOutput) {
    const srcDir = path.join(process.cwd(), 'src');
    let result = '';

    for (const file of scssFiles) {
        const compiled = sass.compile(file, {
            includePaths: [srcDir],
        });
        result += compiled.css;
    }

    // Process with PostCSS (autoprefixer and cssnano)
    const postCssResult = await postcss([autoprefixer(), cssnano()]).process(result, { from: undefined });

    // Write the final CSS to the output file
    await fs.writeFile(cssOutput, postCssResult.css);
}

async function generateConfigs(selectedComponents, jsOutput) {
    const srcDir = path.join(process.cwd(), 'src');
    const coreDir = path.join(srcDir, 'core');
    const componentsDir = path.join(srcDir, 'components');

    // Function to convert hyphenated names to camelCase
    const toCamelCase = (str) => str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

    // Create a virtual entry point that re-exports everything
    const virtualEntryContent = `
import * as core from '${path.join(coreDir, 'index.ts')}';
${selectedComponents.map(component => `import * as ${toCamelCase(component)}Module from '${path.join(componentsDir, component, 'index.ts')}';`).join('\n')}

export { core };
${selectedComponents.map(component => `
export const ${toCamelCase(component)} = ${toCamelCase(component)}Module;
export * from '${path.join(componentsDir, component, 'index.ts')}';
`).join('\n')}
`;

    // SCSS files
    const scssFiles = [
        path.join(coreDir, 'styles.scss'),
        ...selectedComponents.map(component => 
            path.join(componentsDir, component, 'styles.scss')
        )
    ];

    const mainConfig = {
        input: 'virtual-entry.js',
        output: {
            file: jsOutput,
            format: 'esm',
            sourcemap: true,
        },
        plugins: [
            {
                name: 'virtual-entry',
                resolveId(source) {
                    if (source === 'virtual-entry.js') {
                        return source;
                    }
                    return null;
                },
                load(id) {
                    if (id === 'virtual-entry.js') {
                        return virtualEntryContent;
                    }
                    return null;
                },
            },
            resolve({ extensions: ['.js', '.ts'] }),
            commonjs(),
            typescript({
                tsconfig: './tsconfig.json',
                outDir: path.dirname(jsOutput),
            }),
            babel({
                babelHelpers: 'bundled',
                presets: [
                    ['@babel/preset-env', {
                        useBuiltIns: 'usage',
                        corejs: 3,
                        targets: "> 0.25%, not dead"
                    }]
                ],
                exclude: 'node_modules/**'
            }),
            terser()
        ],
    };

    const dtsConfig = {
        input: 'virtual-entry.js',
        output: {
            file: jsOutput.replace('.js', '.d.ts'),
            format: 'es'
        },
        plugins: [
            {
                name: 'virtual-entry',
                resolveId(source) {
                    if (source === 'virtual-entry.js') {
                        return source;
                    }
                    return null;
                },
                load(id) {
                    if (id === 'virtual-entry.js') {
                        return virtualEntryContent;
                    }
                    return null;
                },
            },
            dts()
        ]
    };

    return [mainConfig, dtsConfig, scssFiles];
}

async function main() {
    try {
        log.info('Starting build process...');

        const components = await getComponents();

        let selectedComponents = [];
        if (components.length > 0) {
            const answers = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'selectedComponents',
                    message: 'Select the components you want to include:',
                    choices: components,
                },
            ]);
            selectedComponents = answers.selectedComponents;
        } else {
            log.info('No components found. Proceeding with core only.');
        }

        const { jsOutput, cssOutput } = await inquirer.prompt([
            {
                type: 'input',
                name: 'jsOutput',
                message: 'Enter the path for the JavaScript output file:',
                default: 'zebkit.js',
            },
            {
                type: 'input',
                name: 'cssOutput',
                message: 'Enter the path for the CSS output file:',
                default: 'zebkit.css',
            },
        ]);

        log.info(`Selected components: ${selectedComponents.join(', ') || 'None'}`);
        log.info(`JavaScript output: ${jsOutput}`);
        log.info(`CSS output: ${cssOutput}`);

        const [mainConfig, dtsConfig, scssFiles] = await generateConfigs(selectedComponents, jsOutput);

        log.info('Starting build process...');

        // Build main bundle
        const mainBundle = await rollup(mainConfig);
        await mainBundle.write(mainConfig.output);
        await mainBundle.close();

        // Compile SCSS
        await compileSass(scssFiles, cssOutput);

        // Build declaration bundle
        const dtsBundle = await rollup(dtsConfig);
        await dtsBundle.write(dtsConfig.output);
        await dtsBundle.close();

        log.success('Build completed successfully!');
        log.success(`JavaScript bundle: ${jsOutput}`);
        log.success(`CSS bundle: ${cssOutput}`);
        log.success(`Source map: ${jsOutput}.map`);
        log.success(`TypeScript declarations: ${jsOutput.replace('.js', '.d.ts')}`);
    } catch (error) {
        log.error(`Build failed: ${error.message}`);
        if (error.frame) {
            log.error('Error details:');
            log.error(error.frame);
        }
        if (error.stack) {
            log.debug('Stack trace:');
            log.debug(error.stack);
        }
        process.exit(1);
    }
}

main();