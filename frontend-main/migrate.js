const fs = require('fs');
const path = require('path');
const pnpmYaml = fs.readFileSync('pnpm-workspace.yaml', 'utf8');

const catalog = {};
let inCatalog = false;
pnpmYaml.split('\n').forEach(line => {
  if (line.match(/^catalog:/)) {
    inCatalog = true; return;
  }
  if (inCatalog) {
    if (line.match(/^\w/)) { inCatalog = false; return; }
    // Match 'xxx': yyy or "xxx": yyy or xxx: yyy
    const match = line.match(/^\s+['"]?([^'":]+)['"]?:\s+(.+)$/);
    if (match) {
      catalog[match[1].trim()] = match[2].trim();
    }
  }
});
console.log('Catalog entries:', catalog);

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
  let changed = false;
  const data = JSON.parse(text);
  ['dependencies', 'devDependencies', 'peerDependencies'].forEach(depType => {
    if (data[depType]) {
      for (const [key, val] of Object.entries(data[depType])) {
         if (val === 'catalog:') {
           if (catalog[key]) {
             data[depType][key] = catalog[key];
             changed = true;
           } else {
             // fallback
             data[depType][key] = 'latest';
             changed = true;
           }
         }
      }
    }
  });

  if (pk === 'package.json' || pk === '.\\\\package.json') {
     data.workspaces = ['artifacts/*', 'lib/*', 'lib/integrations/*', 'scripts'];
     data.scripts.dev = 'concurrently "npm run dev -w @workspace/api-server" "npm run dev -w @workspace/contentguard"';
     data.scripts.build = 'npm run typecheck && npm run build --workspaces --if-present';
     data.scripts.typecheck = 'npm run typecheck:libs && npm run typecheck --workspaces --if-present';
     changed = true;
  }

  if (changed) {
    fs.writeFileSync(pk, JSON.stringify(data, null, 2));
    console.log('Fixed', pk);
  }
});

// Remove pnpm stuff safely
if (fs.existsSync('pnpm-lock.yaml')) fs.unlinkSync('pnpm-lock.yaml');
if (fs.existsSync('pnpm-workspace.yaml')) fs.unlinkSync('pnpm-workspace.yaml');
