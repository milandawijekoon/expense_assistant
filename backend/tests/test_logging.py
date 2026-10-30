from app.logging_config import redact


def test_api_keys_and_tokens_are_redacted():
    line = "failed with key sk-ant-api03-ABCDEFGH12345678 and Authorization: Bearer abc.def.ghi"
    out = redact(line)
    assert "ABCDEFGH12345678" not in out
    assert "abc.def.ghi" not in out


def test_configured_secrets_are_redacted():
    assert "hunter2hunter2" not in redact("secret=hunter2hunter2", ["hunter2hunter2"])
