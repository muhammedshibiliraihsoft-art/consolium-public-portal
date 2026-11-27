const esbuild=require('D:/conso-public/node_modules/esbuild'); const path=require('node:path');
esbuild.buildSync({entryPoints:[path.join(__dirname,'entry.jsx')],outfile:path.join(__dirname,'scene-v11.js'),bundle:true,format:'esm',jsx:'transform',alias:{react:path.join(__dirname,'react-shim.js'),gsap:path.join(__dirname,'gsap-shim.js')},external:['/assets/*']});
