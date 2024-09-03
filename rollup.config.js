import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import scss from 'rollup-plugin-scss';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/bundle.esm.js',
      format: 'es',
      sourcemap: true
    },
    {
      file: 'dist/bundle.cjs.js',
      format: 'cjs',
      sourcemap: true
    }
  ],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      module: 'esnext',
    }),
    resolve(),
    commonjs(),
    scss({
      output: async function(styles, styleNodes) {
        // console.log('SCSS Output:', styles);
        // console.log('SCSS Nodes:', styleNodes);
        try {
          await writeFile(join(__dirname, 'dist', 'styles.css'), styles);
          console.log('Successfully wrote styles.css');
        } catch (error) {
          console.error('Error writing styles.css:', error);
        }
      },
      include: ['**/*.scss'],
      exclude: ['node_modules/**/*.scss'],
      outputStyle: 'compressed',
      processor: () => postcss([autoprefixer(), cssnano()]),
      watch: 'src',
      failOnError: true,
      importer: (id, prev, done) => {
        // console.log(`Trying to import ${id} from ${prev}`);
        if (id.startsWith('.') && prev !== 'stdin') {
          const resolvedPath = join(dirname(prev), id);
          // console.log(`Resolved path: ${resolvedPath}`);
          return { file: resolvedPath };
        }
        return { file: id };
      }
    }),
    terser()
  ]
};