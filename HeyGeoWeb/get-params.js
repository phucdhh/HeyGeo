const https = require('https');
https.get('https://wiki.geogebra.org/en/Reference:GeoGebra_App_Parameters', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    const list = data.match(/<li>(.*?)<\/li>/g) || [];
    console.log(list.filter(item => item.toLowerCase().includes('3d')).join('\n'));
  });
}).on("error", (err) => { console.log("Error: " + err.message); });
