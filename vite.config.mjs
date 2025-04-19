/* eslint-disable no-undef */
import { defineConfig } from "vite";
import path from 'path';

export default defineConfig({
    base: "./",
    server: {
        port: 3000,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@@": path.resolve(__dirname, "."),
        }
    }
})