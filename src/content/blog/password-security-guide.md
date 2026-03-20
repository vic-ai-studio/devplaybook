---
title: "How to Generate Secure Passwords: Entropy, Strength, and Best Practices"
description: "Learn how to generate truly secure passwords, understand password entropy, evaluate password strength, and implement password policies. Includes code examples and security guidelines."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["security", "passwords", "cryptography", "web-development", "authentication", "best-practices"]
readingTime: "10 min read"
---

Most "password strength meters" are wrong. They reward capitalization and special characters while accepting `Password1!` as strong. Meanwhile, a randomly generated 16-character lowercase string like `xvkjmqtplbnfwzhy` is orders of magnitude more secure and immune to dictionary attacks.

This guide explains the real science behind password security — entropy — and shows you how to generate and evaluate passwords correctly. You can generate cryptographically secure passwords right now with our [Password Generator](/tools/password-generator).

## What Makes a Password Secure?

Security comes from one thing: **entropy** — the amount of randomness (unpredictability) in a password. Entropy is measured in bits.

A password with N bits of entropy means an attacker needs to try up to 2^N combinations to crack it by brute force.

| Entropy | Brute Force Combinations | Security Level |
|---------|--------------------------|----------------|
| 28 bits | 268 million | Weak (seconds to crack) |
| 40 bits | 1 trillion | Marginal (hours) |
| 56 bits | 72 quadrillion | Moderate (years for 1 GPU) |
| 72 bits | 4.7 sextillion | Strong (centuries) |
| 128 bits | 340 undecillion | Effectively uncrackable |

## Calculating Password Entropy

The formula is:

```
Entropy (bits) = log2(charset_size ^ length) = length × log2(charset_size)
```

For a password of `length` characters drawn from a character set of size `charset_size`:

| Character Set | Size | Entropy per Character |
|--------------|------|-----------------------|
| Digits only (0-9) | 10 | 3.32 bits |
| Lowercase letters | 26 | 4.70 bits |
| Lower + upper | 52 | 5.70 bits |
| Alphanumeric | 62 | 5.95 bits |
| Full ASCII printable | 94 | 6.55 bits |

**Examples:**

```
"password" (lowercase, 8 chars): 8 × 4.70 = 37.6 bits → WEAK
"P@ssw0rd" (mixed, 8 chars): 8 × 6.55 = 52.4 bits → MODERATE
Random 16-char lowercase: 16 × 4.70 = 75.2 bits → STRONG
Random 20-char alphanumeric: 20 × 5.95 = 119 bits → VERY STRONG
```

A longer random password beats a short complex one every time.

## Generating Secure Passwords

The key requirement: use a **cryptographically secure random number generator (CSPRNG)**, not `Math.random()` or Python's `random` module.

### JavaScript (Browser + Node.js)

```javascript
function generatePassword(length = 20, options = {}) {
  const {
    uppercase = true,
    lowercase = true,
    digits = true,
    symbols = true
  } = options;

  let charset = '';
  if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (digits) charset += '0123456789';
  if (symbols) charset += '!@#$%^&*()-_=+[]{}|;:,.<>?';

  if (!charset) throw new Error('At least one character type required');

  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, v => charset[v % charset.length]).join('');
}

// Examples
console.log(generatePassword(20));
// "Kj#9mP2qL$vN8wXr!tYe"

console.log(generatePassword(16, { symbols: false }));
// "Kj9mP2qL8wXrtYeB"

// Verify entropy
function calculateEntropy(password) {
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  let charsetSize = 0;
  if (hasLower) charsetSize += 26;
  if (hasUpper) charsetSize += 26;
  if (hasDigit) charsetSize += 10;
  if (hasSymbol) charsetSize += 32;

  return (password.length * Math.log2(charsetSize)).toFixed(1);
}

console.log(`Entropy: ${calculateEntropy('Kj#9mP2qL$vN8wXr!tYe')} bits`);
// "Entropy: 131.0 bits"
```

### Python

```python
import secrets
import string
import math

def generate_password(
    length: int = 20,
    use_uppercase: bool = True,
    use_lowercase: bool = True,
    use_digits: bool = True,
    use_symbols: bool = True
) -> str:
    """Generate a cryptographically secure password."""
    charset = ''
    if use_lowercase:
        charset += string.ascii_lowercase
    if use_uppercase:
        charset += string.ascii_uppercase
    if use_digits:
        charset += string.digits
    if use_symbols:
        charset += '!@#$%^&*()-_=+[]{}|;:,.<>?'

    if not charset:
        raise ValueError("At least one character type required")

    # secrets.choice uses os.urandom() — CSPRNG
    return ''.join(secrets.choice(charset) for _ in range(length))

def calculate_entropy(password: str) -> float:
    """Calculate password entropy in bits."""
    charset_size = 0
    if any(c.islower() for c in password):
        charset_size += 26
    if any(c.isupper() for c in password):
        charset_size += 26
    if any(c.isdigit() for c in password):
        charset_size += 10
    if any(c in '!@#$%^&*()-_=+[]{}|;:,.<>?' for c in password):
        charset_size += 32

    return len(password) * math.log2(charset_size)

# Generate and evaluate
password = generate_password(20)
entropy = calculate_entropy(password)
print(f"Password: {password}")
print(f"Entropy:  {entropy:.1f} bits")

# Generate PIN
pin = ''.join(secrets.choice(string.digits) for _ in range(6))
print(f"6-digit PIN: {pin}")
```

## Passphrases: Strong and Memorable

Diceware-style passphrases are highly secure and easier to remember than random character strings.

The EFF wordlist has 7,776 words. A 5-word passphrase:

```
Entropy = 5 × log2(7776) = 5 × 12.92 = 64.6 bits
```

That's equivalent to a random 10-character alphanumeric password, but far more memorable.

```python
import secrets

# Simplified example (use the full EFF list in production)
WORD_SAMPLE = [
    "correct", "horse", "battery", "staple", "marble",
    "table", "river", "cloud", "forest", "pencil",
    # ... full EFF list has 7776 words
]

def generate_passphrase(word_count: int = 5) -> str:
    return ' '.join(secrets.choice(WORD_SAMPLE) for _ in range(word_count))

print(generate_passphrase())
# "correct horse battery staple marble"
```

## Password Hashing (Server-Side)

Never store plain passwords. Always hash with a memory-hard algorithm:

```python
# Python: use bcrypt or argon2-cffi
from argon2 import PasswordHasher

ph = PasswordHasher(
    time_cost=3,      # iterations
    memory_cost=65536, # 64 MB
    parallelism=1
)

# Hash
hashed = ph.hash("user's password")
print(hashed)
# '$argon2id$v=19$m=65536,t=3,p=1$...'

# Verify
try:
    ph.verify(hashed, "user's password")
    print("Password correct")
except Exception:
    print("Password incorrect")
```

```javascript
// Node.js: use bcrypt
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12; // Higher = slower = more secure

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

const hash = await hashPassword("user's password");
const valid = await verifyPassword("user's password", hash);
```

**Never use:** MD5, SHA1, SHA256, or SHA512 for password hashing. These are fast hashes, not password hashes. A modern GPU can crack billions per second.

**Use instead:** bcrypt, scrypt, Argon2 (recommended — winner of the Password Hashing Competition).

## Password Policy Recommendations

Based on NIST SP 800-63B (the current authoritative standard):

### What NIST Recommends (2024)

```
Minimum length: 8 characters (NIST says 15+ for users, 64+ for machines)
Maximum length: At least 64 characters (don't truncate passwords)
Allow all printable ASCII + spaces
Do NOT require: periodic changes (unless breach detected)
Do NOT require: specific complexity (upper/lower/digit/symbol mix)
DO check against: known breach databases (HaveIBeenPwned)
DO use: MFA alongside passwords
```

### Checking Against Breached Passwords

```javascript
const crypto = require('crypto');

async function isPasswordBreached(password) {
  // k-anonymity: only send first 5 chars of SHA1 hash
  const hash = crypto.createHash('sha1')
    .update(password)
    .digest('hex')
    .toUpperCase();

  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const text = await response.text();

  return text.split('\n').some(line => line.startsWith(suffix));
}

const breached = await isPasswordBreached('password123');
console.log(breached); // true — don't use this password!
```

## Entropy Quick Reference

| Password Type | Example | Entropy | Verdict |
|--------------|---------|---------|---------|
| Dictionary word | `sunshine` | ~17 bits | Terrible |
| L33tspeak | `p@ssw0rd` | ~28 bits | Weak |
| Random 8-char lower | `kztvmrxq` | 37.6 bits | Marginal |
| Random 12-char alpha | `Kz9mP2qLwXrt` | 71.5 bits | Good |
| Random 20-char full | `Kj#9mP2qL$vN8wXr!tYe` | 131 bits | Excellent |
| 5-word passphrase | `correct horse battery staple` | 64.6 bits | Good |

Use the [Password Generator](/tools/password-generator) to generate passwords at any security level — enter your required entropy, and the tool calculates the minimum length needed for your chosen character set.
