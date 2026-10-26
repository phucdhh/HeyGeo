const https = require('https');
https.get('https://wiki.geogebra.org/en/Reference:GeoGebra_App_Parameters', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    // extract all list items
    const list = data.match(/<li>(.*?)<\/li>/g) || [];
    console.log(list.filter(item => /layout|drag|divider|split|pane/i.test(item)).join('\n'));
  });
}).on("error", (err) => { console.log("Error: " + err.message); });
