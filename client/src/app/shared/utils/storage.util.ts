/**
 * Simple encryption utility for localStorage data
 * This prevents casual inspection of user data in browser dev tools
 */

const SECRET_KEY = 'commission-app-2026-secret-key-v1';

/**
 * Encrypt data using simple XOR cipher with base64 encoding
 */
export function encrypt(data: string): string {
  try {
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(
        data.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length),
      );
    }
    return btoa(result);
  } catch (error) {
    console.error('Encryption error:', error);
    return data;
  }
}

/**
 * Decrypt data that was encrypted with encrypt()
 */
export function decrypt(encryptedData: string): string | null {
  try {
    const data = atob(encryptedData);
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(
        data.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length),
      );
    }
    return result;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return null instead of corrupted data to indicate failure
    return null;
  }
}

/**
 * Encrypt and store data in localStorage
 */
export function secureSetItem(key: string, value: string): void {
  const encrypted = encrypt(value);
  localStorage.setItem(key, encrypted);
}

/**
 * Retrieve and decrypt data from localStorage
 */
export function secureGetItem(key: string): string | null {
  const encrypted = localStorage.getItem(key);
  if (!encrypted) return null;
  
  const decrypted = decrypt(encrypted);
  
  // If decryption failed, clear the corrupted data and return null
  if (decrypted === null) {
    console.warn(`Corrupted data found for key "${key}", clearing it`);
    localStorage.removeItem(key);
    return null;
  }
  
  return decrypted;
}

/**
 * Remove item from localStorage
 */
export function secureRemoveItem(key: string): void {
  localStorage.removeItem(key);
}
