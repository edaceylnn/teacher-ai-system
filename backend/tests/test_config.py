from app.core.config import Settings


def test_cors_origin_list_splits_comma_separated_string() -> None:
    settings = Settings(cors_origins="https://app.example.com, https://admin.example.com")

    assert settings.cors_origin_list == ["https://app.example.com", "https://admin.example.com"]


def test_cors_origin_list_defaults_cover_local_dev() -> None:
    settings = Settings()

    assert "http://localhost:5173" in settings.cors_origin_list
    assert "http://127.0.0.1:5173" in settings.cors_origin_list
