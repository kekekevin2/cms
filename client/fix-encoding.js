const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/features/faculty/my-profile/my-profile.html');

console.log('Reading file:', filePath);
let content = fs.readFileSync(filePath, 'utf8');

console.log('Replacing corrupted characters...');
// Replace the corrupted "—" character
content = content.replace(/â€"/g, '—');

console.log('Writing fixed content...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Done! Fixed all encoding issues.');
