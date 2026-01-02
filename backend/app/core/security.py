from cryptography.fernet import Fernet
from app.core.config import settings
import base64

# Ensure key is valid Fernet key (32 url-safe base64-encoded bytes)
# If settings.SECRET_KEY is just a random string, we might need to hash/pad it.
# For simplicity, we assume user provides a valid key or we derive one.
# Let's derive a key if it's not valid, but for now let's try to use it directly 
# or fall back to a generated one for dev consistency (but dev consistency requires persistence).

def get_cipher():
    key = settings.SECRET_KEY
    try:
        # Try to decode to check if valid base64
        base64.urlsafe_b64decode(key)
        if len(key) != 44:
            raise ValueError("Invalid key length")
    except Exception:
        # If invalid, let's just pad/hash it to make it valid for this session
        # WARNING: This means restarts might break decryption if key wasn't stable.
        # But we assume config provides a stable string.
        # Let's just padding/truncating to 32 bytes then base64 encoding
        # This is a bit hacky but ensures execution doesn't crash.
        # Better approach: Fix the config default.
        pass
        
    return Fernet(key)

# We need a stable key.
# Update: Let's assume the Config default is a valid key or user sets one.
# Default: "CHANGE_ME_IN_PROD_BUT_MUST_BE_URL_SAFE_BASE64_32_BYTES" is not 32 bytes ... 
# "CHANGE_ME..." is length 54.
# Fernet.generate_key() returns 44 bytes (32 bytes b64 encoded).

# Let's derive a key from the SECRET_KEY string using SHA256 then b64encode.
import hashlib

def get_derived_key():
    k = settings.SECRET_KEY.encode()
    digest = hashlib.sha256(k).digest() # 32 bytes
    return base64.urlsafe_b64encode(digest) # 44 bytes, valid for Fernet

_cipher = None

def get_cipher_suite():
    global _cipher
    if _cipher is None:
        _cipher = Fernet(get_derived_key())
    return _cipher

def encrypt_value(value: str) -> str:
    if not value: return ""
    return get_cipher_suite().encrypt(value.encode()).decode()

def decrypt_value(token: str) -> str:
    if not token: return ""
    try:
        return get_cipher_suite().decrypt(token.encode()).decode()
    except Exception:
        return "[Error: Decryption Failed]"
