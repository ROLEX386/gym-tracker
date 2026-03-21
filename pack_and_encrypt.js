const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver'); // Used to zip the folder

const SOURCE_DIR = path.join(__dirname, 'GymTracker_Executable', 'Gym Tracker-win32-x64');
const TEMP_ZIP = path.join(__dirname, 'temp_payload.zip');
const ENCRYPTED_OUTPUT = path.join(__dirname, 'gym_tracker_payload.enc');
const KEYS_FILE = path.join(__dirname, 'auth-bridge-server', '.env');

// Generate AES Key and Initialization Vector (IV)
const AES_KEY = crypto.randomBytes(32); // 256-bit key
const AES_IV = crypto.randomBytes(16); // 128-bit IV

console.log('1. Generated AES Keys.');

// Step 1: Zip the executable folder
const output = fs.createWriteStream(TEMP_ZIP);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
    console.log(`2. Zip created: ${archive.pointer()} total bytes.`);
    
    // Step 2: Encrypt the Zip
    const cipher = crypto.createCipheriv('aes-256-cbc', AES_KEY, AES_IV);
    const inputStr = fs.createReadStream(TEMP_ZIP);
    const outputStr = fs.createWriteStream(ENCRYPTED_OUTPUT);

    inputStr.pipe(cipher).pipe(outputStr);

    outputStr.on('finish', () => {
        console.log(`3. Successfully encrypted payload to: ${ENCRYPTED_OUTPUT}`);
        
        // Write the keys to a file so the auth server can serve them
        const keyData = `AES_KEY=${AES_KEY.toString('hex')}\nAES_IV=${AES_IV.toString('hex')}\n`;
        fs.writeFileSync(KEYS_FILE, keyData);
        console.log(`4. Saved AES Keys to auth bridge .env file.`);
        
        // Cleanup temp zip
        fs.unlinkSync(TEMP_ZIP);
        console.log('5. Pack & Encrypt complete.');
    });
});

archive.on('error', (err) => { throw err; });
archive.pipe(output);
archive.directory(SOURCE_DIR, false);
archive.finalize();
