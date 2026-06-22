const fs = require('fs');

const files = [
  'Dockerfile',
  '.env.example',
  'RUN_LOCAL.md',
  'mock-data/sensor-reading-invalid-missing-device.json',
  'mock-data/sensor-reading-valid.json',
  'Makefile',
  'README.md',
  'checklists/submission_checklist.md',
  'docs/TEAM_TASKS.md',
  'scripts/run-newman.sh',
  'scripts/start-prism-mock.sh',
  '.gitignore'
];

const keepHeadFiles = [
  'Dockerfile',
  '.env.example',
  'RUN_LOCAL.md',
  'mock-data/sensor-reading-invalid-missing-device.json',
  'mock-data/sensor-reading-valid.json',
  'Makefile',
  '.gitignore'
];

function fixFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    const keepHead = keepHeadFiles.some(f => filePath.endsWith(f));
    
    const regex = /<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> .*\r?\n?/g;
    
    let replaced = false;
    content = content.replace(regex, (match, headContent, incomingContent) => {
        replaced = true;
        return keepHead ? headContent : incomingContent;
    });
    
    if (replaced) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed ${filePath} (kept ${keepHead ? 'HEAD' : 'Incoming'})`);
    } else {
        console.log(`No conflict markers found in ${filePath}`);
    }
}

files.forEach(f => fixFile('d:/notification-service/' + f));
