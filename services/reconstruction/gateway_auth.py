import secrets


def bearer_token_matches(authorization: str | None, token: str) -> bool:
    if not token:
        return True
    supplied = (authorization or "").encode("utf-8")
    expected = f"Bearer {token}".encode("utf-8")
    return secrets.compare_digest(supplied, expected)
