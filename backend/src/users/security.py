import base64
import hashlib
import hmac
import os


async def _pbkdf2_hash(password: str, salt: bytes, iterations: int = 310000) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)


async def hash_password(password: str, *, iterations: int = 310000) -> str:
    if not isinstance(password, str) or password == "":
        raise ValueError("Password must be non-empty string")
    salt = os.urandom(16)
    dk = await _pbkdf2_hash(password, salt, iterations)
    return "pbkdf2$sha256$%d$%s$%s" % (
        iterations,
        base64.b64encode(salt).decode("ascii"),
        base64.b64encode(dk).decode("ascii"),
    )


async def verify_password(password: str, hashed_password: str) -> bool:
    try:
        algo, alg_hash, iters_str, salt_b64, hash_b64 = hashed_password.split("$")
        if algo != "pbkdf2" or alg_hash != "sha256":
            return False
        iterations = int(iters_str)
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
        dk = await _pbkdf2_hash(password, salt, iterations)
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False


# Совместимые async-обёртки для текущих вызовов в коде
async def get_hash_password(password: str) -> str:
    return await hash_password(password)


async def verify_hash_password(password: str, hashed_password: str) -> bool:
    return await verify_password(password, hashed_password)