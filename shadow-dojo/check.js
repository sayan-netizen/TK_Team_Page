const fs = require('fs');
try {
  const code = fs.readFileSync('script.js', 'utf8');
  console.log("Syntax is valid if this executes without parse error.");
} catch(e) {
  console.log(e);
}
