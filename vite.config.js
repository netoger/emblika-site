import {defineConfig} from 'vite';
export default defineConfig({
 server:{proxy:{'/api':{target:'http://127.0.0.1:8092',changeOrigin:true}}},
 // Файлы не встраиваются в CSS как data:, иначе заголовок CSP (font-src 'self') блокирует мелкие шрифты.
 build:{assetsInlineLimit:0,rollupOptions:{onwarn(warning,warn){if(warning.code==='MODULE_LEVEL_DIRECTIVE')return;warn(warning);}}}
});
