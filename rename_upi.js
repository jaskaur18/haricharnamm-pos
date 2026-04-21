const fs = require('fs');
const glob = require('glob'); // Not native in Node.js without package.json, wait I should use fs.readdirSync recursively
const path = require('path');

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = dir + '/' + file;
    if (fs.statSync(name).isDirectory()) {
      if (!name.includes('node_modules') && !name.includes('.next') && !name.includes('dist') && !name.includes('.convex')) {
        getFiles(name, files);
      }
    } else {
      if (name.endsWith('.ts') || name.endsWith('.tsx')) {
        files.push(name);
      }
    }
  }
  return files;
}

const filesToProcess = getFiles('.');
let replacedFiles = 0;
for (const file of filesToProcess) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('upi_mock')) {
    content = content.replace(/upi_mock/g, 'upi');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
    replacedFiles++;
  }
}
console.log('Total files updated:', replacedFiles);
