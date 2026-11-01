// Regression: the homepage must not promise reliable or immediate emergency detection.
// Australian contact numbers: healthdirect.gov.au/healthcare-and-services/emergency-and-urgent-care/calling-triple-zero
// and poisonsinfo.nsw.gov.au/first-aid (read 2 November 2026).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
function check(html){
 const tile=html.match(/<div class="tile t-sos s5">([\s\S]*?)<\/div>\s*<\/div>/)?.[1];
 assert(tile,'Visible emergency contact tile required');
 const text=tile.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
 assert(!/Emergency questions get safety steps first|Straight away/i.test(text),'No unconditional urgency detection or timing promise');
 assert(/app can miss urgent warning signs/i.test(text),'Explain that urgent signs may be missed');
 assert(/In an emergency, call/i.test(text)&&/<a href="tel:000">000<\/a>/.test(tile),'Direct Australian emergency contact required');
 assert(/suspected poisoning/i.test(text)&&/<a href="tel:131126">13 11 26<\/a>/.test(tile),'Direct Australian poison contact required');
}
module.exports={check};
if(require.main===module){check(fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8'));console.log('PASS: homepage offers direct emergency contacts without promising reliable or instant detection.');}
