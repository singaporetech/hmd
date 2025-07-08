/**
 * This is the Vite configuration file for the project.
 * - this `mts` filename ext is to explicitly indicate it should be processed as
 *   a ECMAScript module (and not a CommonJS module)
 */

/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
    test: {
        reporters: ['verbose'],
        setupFiles: ['./vitest.setup.ts'],
        environment: 'jsdom',
        deps: {
            optimizer: {
                web: {
                    include: ['vitest-canvas-mock'],
                }
            }
        },
        environmentOptions: {
            jsdom: {
                resources: 'usable',
            },
        },
        testTimeout: 60000,
    },
    base: './',
    build: {
        outDir: 'docs'
    },
    publicDir: 'public',
});
