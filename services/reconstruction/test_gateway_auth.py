import unittest

from gateway_auth import bearer_token_matches


class GatewayAuthTest(unittest.TestCase):
    def test_valid_and_invalid_tokens(self):
        self.assertTrue(bearer_token_matches("Bearer secret", "secret"))
        self.assertFalse(bearer_token_matches("Bearer wrong", "secret"))

    def test_non_ascii_header_fails_closed_without_raising(self):
        self.assertFalse(bearer_token_matches("Bearer секрет", "secret"))


if __name__ == "__main__":
    unittest.main()
