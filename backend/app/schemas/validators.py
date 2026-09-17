import re


def validate_password_strength(password: str) -> str:
    if not re.search(r"[^\W\d_]", password):
        raise ValueError("Parola en az bir harf içermeli.")
    if not re.search(r"\d", password):
        raise ValueError("Parola en az bir rakam içermeli.")
    return password
