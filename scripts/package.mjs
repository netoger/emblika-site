import {cpSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {basename} from 'node:path';
// Секреты и рабочая база никогда не попадают в архив публикации.
cpSync('server','dist',{recursive:true,filter:p=>!['.env','data'].includes(basename(p))});
mkdirSync('dist/admin',{recursive:true});
writeFileSync('dist/admin/index.html',readFileSync('dist/index.html','utf8').replace('<title>Эмблика — время для себя · Брянск</title>','<title>Кабинет студии — Эмблика</title>'));
console.log('Сайт, API и кабинет собраны. Секреты и база исключены.');
