/* eslint-disable no-undef */
import { resolve } from 'path';
import { defineConfig } from "vite"; import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
    base: "./",
    server: {
        port: 3000,
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
            "@@": resolve(__dirname, "."),
        }
    },
    plugins: [basicSsl()]
})