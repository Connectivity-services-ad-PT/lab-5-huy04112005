const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const mode = process.argv[2] || 'all';

// Ensure reports directory exists
const reportsDir = path.join(__dirname, '../reports');
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

// Copy environment files for team-specific names compatibility
try {
    const mockEnvSrc = path.join(__dirname, '../postman/environments/FIT4110_lab03_mock.postman_environment.json');
    const mockEnvDst = path.join(__dirname, '../postman/environments/notification_mock.postman_environment.json');
    const localEnvSrc = path.join(__dirname, '../postman/environments/FIT4110_lab03_local.postman_environment.json');
    const localEnvDst = path.join(__dirname, '../postman/environments/notification_local.postman_environment.json');
    if (fs.existsSync(mockEnvSrc)) {
        fs.copyFileSync(mockEnvSrc, mockEnvDst);
    }
    if (fs.existsSync(localEnvSrc)) {
        fs.copyFileSync(localEnvSrc, localEnvDst);
    }
} catch (e) {
    console.error('Failed to create team-specific environment copies:', e.message);
}

function runNewman(envFile, reportPrefix, callback) {
    console.log(`=== Running Newman tests for ${reportPrefix} ===`);
    const newmanCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const newman = spawn(newmanCmd, [
        'newman', 'run', 
        'postman/collections/FIT4110_lab03_notification.postman_collection.json',
        '-e', `postman/environments/${envFile}`,
        '-r', 'cli,html,junit',
        '--reporter-html-export', `reports/newman-${reportPrefix}-report.html`,
        '--reporter-junit-export', `reports/newman-${reportPrefix}-report.xml`
    ], { stdio: 'inherit', shell: true });

    newman.on('close', (code) => {
        callback(code);
    });
}

const net = require('net');

function waitOnPort(port, timeoutMs, callback) {
    const start = Date.now();
    const interval = setInterval(() => {
        const socket = new net.Socket();
        socket.setTimeout(200);
        socket.on('connect', () => {
            socket.destroy();
            clearInterval(interval);
            callback(null);
        });
        socket.on('error', () => {
            socket.destroy();
            if (Date.now() - start > timeoutMs) {
                clearInterval(interval);
                callback(new Error(`Timeout waiting for port ${port}`));
            }
        });
        socket.on('timeout', () => {
            socket.destroy();
            if (Date.now() - start > timeoutMs) {
                clearInterval(interval);
                callback(new Error(`Timeout waiting for port ${port}`));
            }
        });
        socket.connect(port, '127.0.0.1');
    }, 200);
}

function runMockTests() {
    console.log('=== Starting Prism Mock Server (4010) & Core Business Mock (4011) ===');
    const prismCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    
    const prism = spawn(prismCmd, [
        'prism', 'mock', 'contracts/notification.openapi.yaml', '--port', '4010'
    ], { shell: true });

    const prismVision = spawn(prismCmd, [
        'prism', 'mock', 'contracts/core-business.openapi.yaml', '--port', '4011'
    ], { shell: true });

    prism.stdout.on('data', (data) => {
        const str = data.toString();
        if (str.includes('HTTP SERVER')) {
            console.log('[Prism Notification] Mock Server is ready on 4010.');
        }
    });

    prismVision.stdout.on('data', (data) => {
        const str = data.toString();
        if (str.includes('HTTP SERVER')) {
            console.log('[Prism Core Business] Mock Server is ready on 4011.');
        }
    });

    let readyCount = 0;
    const checkReady = () => {
        readyCount++;
        if (readyCount === 2) {
            console.log('=== Mock servers are ready. Starting Newman tests ===');
            runNewman('FIT4110_lab03_mock.postman_environment.json', 'mock', (code) => {
                console.log('Stopping Prism mock servers...');
                if (process.platform === 'win32') {
                    execSync(`taskkill /pid ${prism.pid} /t /f`, { stdio: 'ignore' });
                    execSync(`taskkill /pid ${prismVision.pid} /t /f`, { stdio: 'ignore' });
                } else {
                    prism.kill('SIGINT');
                    prismVision.kill('SIGINT');
                }
                if (code !== 0) {
                    console.error('Mock tests failed!');
                    process.exit(1);
                }
                console.log('Mock tests passed successfully!');
                if (mode === 'all') {
                    runLocalTests();
                } else {
                    process.exit(0);
                }
            });
        }
    };

    waitOnPort(4010, 20000, (err) => {
        if (err) {
            console.error(err.message);
            process.exit(1);
        }
        checkReady();
    });

    waitOnPort(4011, 20000, (err) => {
        if (err) {
            console.error(err.message);
            process.exit(1);
        }
        checkReady();
    });
}

function runLocalTests() {
    console.log('=== Starting Local Express Server (8000) & Core Business Mock (4011) ===');
    const prismCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

    const prismVision = spawn(prismCmd, [
        'prism', 'mock', 'contracts/core-business.openapi.yaml', '--port', '4011'
    ], { shell: true });

    const server = spawn('node', ['server.js'], {
        env: { ...process.env, PORT: '8000' },
        shell: true
    });

    server.stdout.on('data', (data) => {
        console.log(`[Express] ${data.toString().trim()}`);
    });

    prismVision.stdout.on('data', (data) => {
        const str = data.toString();
        if (str.includes('HTTP SERVER')) {
            console.log('[Prism Core Business] Mock Server is ready on 4011.');
        }
    });

    let readyCount = 0;
    const checkReady = () => {
        readyCount++;
        if (readyCount === 2) {
            console.log('=== Local and mock servers are ready. Starting Newman tests ===');
            runNewman('FIT4110_lab03_local.postman_environment.json', 'local', (code) => {
                console.log('Stopping local server and mock dependencies...');
                if (process.platform === 'win32') {
                    execSync(`taskkill /pid ${server.pid} /t /f`, { stdio: 'ignore' });
                    execSync(`taskkill /pid ${prismVision.pid} /t /f`, { stdio: 'ignore' });
                } else {
                    server.kill('SIGINT');
                    prismVision.kill('SIGINT');
                }

                // Copy reports to generic names for submission
                try {
                    const localHtml = path.join(__dirname, '../reports/newman-local-report.html');
                    const genericHtml = path.join(__dirname, '../reports/newman-report.html');
                    const localXml = path.join(__dirname, '../reports/newman-local-report.xml');
                    const genericXml = path.join(__dirname, '../reports/newman-report.xml');
                    if (fs.existsSync(localHtml)) {
                        fs.copyFileSync(localHtml, genericHtml);
                    }
                    if (fs.existsSync(localXml)) {
                        fs.copyFileSync(localXml, genericXml);
                    }
                } catch (e) {
                    console.error('Failed to copy generic Newman reports:', e.message);
                }

                if (code !== 0) {
                    console.error('Local tests failed!');
                    process.exit(1);
                }
                console.log('Local tests passed successfully!');
                process.exit(0);
            });
        }
    };

    waitOnPort(8000, 20000, (err) => {
        if (err) {
            console.error(err.message);
            process.exit(1);
        }
        checkReady();
    });

    waitOnPort(4011, 20000, (err) => {
        if (err) {
            console.error(err.message);
            process.exit(1);
        }
        checkReady();
    });
}

// Linting step
function runLint() {
    console.log('=== Linting OpenAPI Contract ===');
    const spectralCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const reportPath = path.join(__dirname, '../reports/contract-lint-report.txt');
    try {
        const output = execSync(`${spectralCmd} spectral lint contracts/notification.openapi.yaml --ruleset campus-spectral.yaml --format text`);
        fs.writeFileSync(reportPath, output);
        console.log(output.toString());
        console.log('Spectral lint check passed.');
    } catch (error) {
        console.error('Spectral lint check failed!');
        if (error.stdout) {
            fs.writeFileSync(reportPath, error.stdout);
            console.log(error.stdout.toString());
        }
        process.exit(1);
    }
}

if (mode === 'all' || mode === 'mock' || mode === 'local') {
    runLint();
    if (mode === 'mock') {
        runMockTests();
    } else if (mode === 'local') {
        runLocalTests();
    } else {
        runMockTests(); // will run local tests inside the callback
    }
} else {
    console.error(`Unknown execution mode: ${mode}`);
    process.exit(1);
}
