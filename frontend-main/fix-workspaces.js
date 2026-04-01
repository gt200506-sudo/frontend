const fs = require('fs');
const path = require('path');

const findAllPackageJsons = (dir, list = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory() && file !== 'node_modules') {
      findAllPackageJsons(fullPath, list);
    } else if (file === 'package.json') {
      list.push(fullPath);
    }
  }
  return list;
};

const packageJsons = findAllPackageJsons('.');
packageJsons.forEach(pk => {
  if(pk.includes('node_modules')) return;
  let text = fs.readFileSync(pk, 'utf8');
  if (text.includes('workspace:*')) {
    text = text.replace(/"workspace:\*"/g, '"*"');
    fs.writeFileSync(pk, text);
    console.log('Fixed workspace linking in', pk);
  }
});
