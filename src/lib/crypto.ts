import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.createHash('sha256').update(process.env.NEXTAUTH_SECRET || 'secret_fallback_key').digest('hex').substring(0, 32);
const IV_LENGTH = 16;

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([
        encrypted,
        cipher.final()
    ]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
    try {
        const textParts = text.split(':');
        if (textParts.length < 2) return text; // Not encrypted or fallback
        const iv = Buffer.from(textParts.shift()!, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([
            decrypted,
            decipher.final()
        ]);
        return decrypted.toString();
    } catch (e) {
        console.error("Decryption failed:", e);
        return text;
    }
}
