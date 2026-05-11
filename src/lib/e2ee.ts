// Client-side End-to-End Encryption Helpers utilizing Web Crypto API

/**
 * Generates a CryptoKeyPair for RSA-OAEP encryption.
 * Exports keys as base64 for easy storage or transport.
 */
export async function generateKeypair() {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true, // extractable
        ["encrypt", "decrypt"]
    );

    const pubKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const privKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    return {
        publicKey: arrayBufferToBase64(pubKeyBuffer),
        privateKey: arrayBufferToBase64(privKeyBuffer)
    };
}

/**
 * Encrypts a plaintext string using the recipient's public key (base64 string).
 */
export async function encryptContent(content: string, publicKeyBase64: string): Promise<string> {
    const pubKeyBuffer = base64ToArrayBuffer(publicKeyBase64);
    const pubKey = await window.crypto.subtle.importKey(
        "spki",
        pubKeyBuffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["encrypt"]
    );

    const encoded = new TextEncoder().encode(content);
    const encrypted = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        pubKey,
        encoded
    );

    return arrayBufferToBase64(encrypted);
}

/**
 * Decrypts a ciphertext string using the user's private key (base64 string).
 */
export async function decryptContent(encryptedBase64: string, privateKeyBase64: string): Promise<string> {
    const privKeyBuffer = base64ToArrayBuffer(privateKeyBase64);
    const privKey = await window.crypto.subtle.importKey(
        "pkcs8",
        privKeyBuffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["decrypt"]
    );

    const encryptedBuffer = base64ToArrayBuffer(encryptedBase64);
    const decrypted = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privKey,
        encryptedBuffer
    );

    return new TextDecoder().decode(decrypted);
}

// Helpers
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}
