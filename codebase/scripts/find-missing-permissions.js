const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '../backend');
const MIGRATION_DIR = path.join(BACKEND_DIR, 'authentication-service/src/main/resources/db/migration');

// Gateway route prefixes and rewrite rules from api-gateway application.yml
const SERVICE_ROUTES = {
  'authentication-service': { prefix: '/auth', rewrite: (p) => p },
  'account-service': { prefix: '/account', rewrite: (p) => p.replace(/^\/api/, '') },
  'expense-service': { prefix: '/expense', rewrite: (p) => p.replace(/^\/api/, '') },
  'meal-service': { prefix: '/meal', rewrite: (p) => p.replace(/^\/api/, '') },
  'task-service': { prefix: '/task', rewrite: (p) => p.replace(/^\/api/, '') },
  'baby-service': { prefix: '/baby', rewrite: (p) => p.replace(/^\/api/, '') },
  'shopping-service': { prefix: '/shopping', rewrite: (p) => p.replace(/^\/api/, '') },
  'insight-service': { prefix: '/insight', rewrite: (p) => p.replace(/^\/api/, '') },
  'file-service': { prefix: '/file', rewrite: (p) => p.replace(/^\/api/, '') },
  'ai-service': { prefix: '/ai', rewrite: (p) => p.replace(/^\/api/, '') },
  'notification-service': { prefix: '/notification/api', rewrite: (p) => p.replace(/^\/api/, '') },
  'finance-service': { prefix: '/finance', rewrite: (p) => p },
  'todo-service': { prefix: '/todo', rewrite: (p) => p }
};

// 1. Read existing permissions from SQL migrations
function getRegisteredPermissions() {
  const registered = new Set();
  const files = fs.readdirSync(MIGRATION_DIR).filter(f => f.endsWith('.sql'));

  files.forEach(file => {
    const content = fs.readFileSync(path.join(MIGRATION_DIR, file), 'utf8');
    // Extract registered API permissions by method and path patterns
    // e.g., 'GET', '/auth/roles/workspace' or similar SQL inserts
    const regex = /'API'\s*,\s*'([A-Z]+)'\s*,\s*'([^']+)'/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const method = match[1];
      const apiPath = normalizePath(match[2]);
      registered.add(`${method}:${apiPath}`);
    }

    // Also parse other common insert formats if any
    const regexAlt = /api_method\s*,\s*api_path\s*\)\s*VALUES\s*\(\s*'([^']+)'\s*,\s*'([^']+)'/gi;
    let matchAlt;
    while ((matchAlt = regexAlt.exec(content)) !== null) {
      const method = matchAlt[1].toUpperCase();
      const apiPath = normalizePath(matchAlt[2]);
      registered.add(`${method}:${apiPath}`);
    }
    
    // Quick regex for any custom inserts
    const regexGeneric = /INSERT\s+INTO\s+tbl_permission.*'([A-Z]+)'\s*,\s*'(\/[^']+)'/gi;
    let matchGen;
    while ((matchGen = regexGeneric.exec(content)) !== null) {
      const method = matchGen[1].toUpperCase();
      const apiPath = normalizePath(matchGen[2]);
      registered.add(`${method}:${apiPath}`);
    }
  });

  return registered;
}

function normalizePath(p) {
  if (!p) return '';
  let normalized = p.trim().replace(/\/+/g, '/');
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

// 2. Scan Java Controller files
function findControllerFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findControllerFiles(filePath, files);
    } else if (file.endsWith('Controller.java')) {
      files.push(filePath);
    }
  });
  return files;
}

function parseControllers() {
  const apis = [];
  const serviceDirs = fs.readdirSync(BACKEND_DIR).filter(d => {
    return fs.statSync(path.join(BACKEND_DIR, d)).isDirectory() && SERVICE_ROUTES[d];
  });

  serviceDirs.forEach(service => {
    const serviceDir = path.join(BACKEND_DIR, service);
    const controllers = findControllerFiles(path.join(serviceDir, 'src/main/java'));
    const routeConfig = SERVICE_ROUTES[service];

    controllers.forEach(controller => {
      const content = fs.readFileSync(controller, 'utf8');
      
      // Get Class-level RequestMapping
      let classMapping = '';
      const classMappingMatch = content.match(/@RequestMapping\((?:value\s*=\s*)?"([^"]+)"\)/);
      if (classMappingMatch) {
        classMapping = classMappingMatch[1];
      }

      // Read lines to parse method mapping annotations
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        let method = '';
        let subPath = '';

        const getMatch = line.match(/@GetMapping\((?:value\s*=\s*)?"([^"]*)"\)/) || line.match(/@GetMapping/);
        const postMatch = line.match(/@PostMapping\((?:value\s*=\s*)?"([^"]*)"\)/) || line.match(/@PostMapping/);
        const putMatch = line.match(/@PutMapping\((?:value\s*=\s*)?"([^"]*)"\)/) || line.match(/@PutMapping/);
        const deleteMatch = line.match(/@DeleteMapping\((?:value\s*=\s*)?"([^"]*)"\)/) || line.match(/@DeleteMapping/);
        const patchMatch = line.match(/@PatchMapping\((?:value\s*=\s*)?"([^"]*)"\)/) || line.match(/@PatchMapping/);
        const requestMatch = line.match(/@RequestMapping\((?:value\s*=\s*)?"([^"]*)"\s*,\s*method\s*=\s*RequestMethod\.([A-Z]+)\)/);

        if (getMatch) {
          method = 'GET';
          subPath = getMatch[1] || '';
        } else if (postMatch) {
          method = 'POST';
          subPath = postMatch[1] || '';
        } else if (putMatch) {
          method = 'PUT';
          subPath = putMatch[1] || '';
        } else if (deleteMatch) {
          method = 'DELETE';
          subPath = deleteMatch[1] || '';
        } else if (patchMatch) {
          method = 'PATCH';
          subPath = patchMatch[1] || '';
        } else if (requestMatch) {
          method = requestMatch[2];
          subPath = requestMatch[1] || '';
        }

        if (method) {
          // Combine class mapping and method mapping
          const internalPath = normalizePath(classMapping + '/' + subPath);
          // Apply gateway routing prefix and rewrite rules
          const gatewayPath = normalizePath(routeConfig.prefix + '/' + routeConfig.rewrite(internalPath));
          apis.push({
            service,
            method,
            path: gatewayPath,
            controller: path.basename(controller)
          });
        }
      }
    });
  });

  return apis;
}

function main() {
  console.log('--- SCANNING REGISTERED PERMISSIONS FROM SQL MIGRATIONS ---');
  const registered = getRegisteredPermissions();
  console.log(`Found ${registered.size} registered API permissions in DB migrations.`);

  console.log('\n--- SCANNING BACKEND CONTROLLERS ---');
  const controllerApis = parseControllers();
  console.log(`Found ${controllerApis.length} API endpoints in codebase.`);

  console.log('\n--- COMPARING AND DETECTING UNREGISTERED APIS ---');
  const unregistered = [];
  const seen = new Set();

  controllerApis.forEach(api => {
    const key = `${api.method}:${api.path}`;
    if (!registered.has(key) && !seen.has(key)) {
      seen.add(key);
      unregistered.push(api);
    }
  });

  console.log(`Detected ${unregistered.length} unregistered API permissions:\n`);
  
  // Group by service
  const grouped = {};
  unregistered.forEach(api => {
    if (!grouped[api.service]) grouped[api.service] = [];
    grouped[api.service].push(api);
  });

  Object.keys(grouped).forEach(service => {
    console.log(`[Service: ${service}]`);
    grouped[service].forEach(api => {
      console.log(`  - ${api.method} ${api.path} (${api.controller})`);
    });
  });

  // Generate SQL insert statements for the unregistered permissions
  console.log('\n--- SUGGESTED SQL MIGRATION INSERTS ---');
  let currentId = 500; // Arbitrary safe start ID or omit ID if using auto-increment
  
  const inserts = [];
  const roleAssignments = [];

  unregistered.forEach(api => {
    const suggestedName = `API:${api.method}:${api.path.replace(/\{[^}]+\}/g, 'PARAM').replace(/[^A-Za-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toUpperCase()}`;
    const description = `Auto generated for ${api.service} - ${api.method} ${api.path}`;
    
    inserts.push(
      `INSERT INTO tbl_permission (name, description, type, api_method, api_path)\n` +
      `SELECT '${suggestedName}', '${description}', 'API', '${api.method}', '${api.path}'\n` +
      `WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = '${suggestedName}');`
    );

    roleAssignments.push(`'${suggestedName}'`);
  });

  if (inserts.length > 0) {
    console.log(inserts.join('\n\n'));
    console.log('\n--- SUGGESTED ROLE ASSIGNMENT ---');
    console.log(
      `INSERT INTO tbl_role_has_permission (role_id, permission_id)\n` +
      `SELECT r.id, p.id\n` +
      `FROM tbl_role r\n` +
      `JOIN tbl_permission p\n` +
      `  ON p.name IN (\n` +
      `      ${roleAssignments.join(',\n      ')}\n` +
      `  )\n` +
      `WHERE r.name IN ('ADMIN', 'OWNER')\n` +
      `AND NOT EXISTS (\n` +
      `    SELECT 1\n` +
      `    FROM tbl_role_has_permission rhp\n` +
      `    WHERE rhp.role_id = r.id\n` +
      `      AND rhp.permission_id = p.id\n` +
      `);`
    );
  } else {
    console.log('No missing permissions found!');
  }
}

main();
