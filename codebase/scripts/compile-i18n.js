/**
 * Script compile-i18n.js
 * Tự động quét các file JSON i18n được chia nhỏ theo route thư mục
 * và thực hiện deep-merge vào các file JSON tổng vi.json và en.json.
 */

const fs = require('fs');
const path = require('path');

// Định vị thư mục public/i18n dựa vào vị trí script
const i18nDir = path.resolve(__dirname, '../frontend/public/i18n');

console.log('=== KHỞI ĐỘNG BIÊN DỊCH I18N ===');
console.log(`Thư mục i18n: ${i18nDir}`);

if (!fs.existsSync(i18nDir)) {
  console.error(`Lỗi: Thư mục không tồn tại: ${i18nDir}`);
  process.exit(1);
}

// Helper: Kiểm tra một item có phải object thực sự (không phải array hay null)
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// Helper: Deep merge source object vào target object
function deepMerge(target, source) {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

// Helper: Gán giá trị vào object theo chuỗi key phân cách bởi dấu chấm (ví dụ: "app.settings")
function setDeep(obj, pathStr, value) {
  const keys = pathStr.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) {
      current[key] = {};
    } else if (!isObject(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }
  const lastKey = keys[keys.length - 1];
  
  if (isObject(current[lastKey]) && isObject(value)) {
    current[lastKey] = deepMerge(current[lastKey], value);
  } else {
    current[lastKey] = value;
  }
}

// Hàm quét đệ quy các file json trong thư mục
function getAllJsonFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getAllJsonFiles(filePath, fileList);
    } else if (stat.isFile() && path.extname(file) === '.json') {
      fileList.push(filePath);
    }
  });
  return fileList;
}

try {
  const allFiles = getAllJsonFiles(i18nDir);
  const translationsByLang = {};

  console.log(`Đang phân tích các file dịch thuật...`);

  allFiles.forEach((filePath) => {
    const relativePath = path.relative(i18nDir, filePath);
    const normalizedPath = relativePath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');
    
    // Nếu file nằm trực tiếp trong thư mục public/i18n, bỏ qua (đây là file cha)
    if (parts.length <= 1) {
      return;
    }

    const fileName = parts.pop();
    const lang = path.basename(fileName, '.json');
    const routePath = parts.join('.'); // ví dụ "app.settings"

    console.log(`  Found: [${lang}] tại route "${routePath}" (${relativePath})`);

    // Đọc nội dung file con
    let fileContent;
    try {
      const rawData = fs.readFileSync(filePath, 'utf8');
      fileContent = JSON.parse(rawData);
    } catch (e) {
      console.error(`  ⚠️ Lỗi đọc/parse file ${relativePath}: ${e.message}`);
      return;
    }

    if (!translationsByLang[lang]) {
      translationsByLang[lang] = {};
    }

    setDeep(translationsByLang[lang], routePath, fileContent);
  });

  // Thực hiện merge vào file cha gốc và ghi lại
  const languages = Object.keys(translationsByLang);
  if (languages.length === 0) {
    console.log('Không tìm thấy file i18n con nào ở các thư mục con.');
    process.exit(0);
  }

  languages.forEach((lang) => {
    const parentFilePath = path.join(i18nDir, `${lang}.json`);
    let parentContent = {};

    if (fs.existsSync(parentFilePath)) {
      try {
        const rawParent = fs.readFileSync(parentFilePath, 'utf8');
        parentContent = JSON.parse(rawParent);
        
        // Backup file cha để đảm bảo an toàn
        const backupPath = `${parentFilePath}.bak`;
        fs.writeFileSync(backupPath, rawParent, 'utf8');
        console.log(`  💾 Đã tạo backup cho file cha tại: ${backupPath}`);
      } catch (e) {
        console.warn(`  ⚠️ Cảnh báo: Không thể đọc hoặc backup file cha gốc ${lang}.json. Tạo mới file.`);
      }
    }

    // Merge đè nội dung file con đã xử lý vào file cha
    const mergedContent = deepMerge(parentContent, translationsByLang[lang]);

    // Ghi lại file cha
    try {
      fs.writeFileSync(parentFilePath, JSON.stringify(mergedContent, null, 2), 'utf8');
      console.log(`  ✅ Đã đồng bộ thành công vào file cha: ${parentFilePath}`);
    } catch (e) {
      console.error(`  ❌ Lỗi ghi file cha ${lang}.json: ${e.message}`);
    }
  });

  console.log('=== BIÊN DỊCH I18N HOÀN TẤT THÀNH CÔNG ===');
} catch (error) {
  console.error(`❌ Đã xảy ra lỗi trong quá trình xử lý: ${error.message}`);
  process.exit(1);
}
