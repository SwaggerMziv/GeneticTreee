"""Integration тесты для AI endpoints."""
import pytest


@pytest.mark.integration
class TestChatHistory:
    async def test_get_empty_history(self, client, auth_headers):
        r = await client.get("/api/v1/ai/chat-history", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["messages"] == []

    async def test_save_history(self, client, auth_headers):
        messages = [
            {"role": "user", "content": "Привет"},
            {"role": "assistant", "content": "Здравствуйте!"}
        ]
        r = await client.put("/api/v1/ai/chat-history", headers=auth_headers, json={"messages": messages})
        assert r.status_code == 200
        assert r.json()["ok"] is True
        assert r.json()["count"] == 2

    async def test_get_saved_history(self, client, auth_headers):
        messages = [{"role": "user", "content": "Test"}]
        await client.put("/api/v1/ai/chat-history", headers=auth_headers, json={"messages": messages})
        r = await client.get("/api/v1/ai/chat-history", headers=auth_headers)
        assert r.status_code == 200
        assert len(r.json()["messages"]) == 1

    async def test_clear_history(self, client, auth_headers):
        await client.put("/api/v1/ai/chat-history", headers=auth_headers, json={"messages": [{"role": "user", "content": "X"}]})
        r = await client.delete("/api/v1/ai/chat-history", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["ok"] is True

    async def test_rolling_limit(self, client, auth_headers):
        messages = [{"role": "user", "content": f"msg_{i}"} for i in range(150)]
        r = await client.put("/api/v1/ai/chat-history", headers=auth_headers, json={"messages": messages})
        assert r.status_code == 200
        assert r.json()["count"] == 100  # MAX_CHAT_MESSAGES


@pytest.mark.integration
class TestAIAuth:
    async def test_generate_stream_no_auth(self, client):
        r = await client.post("/api/v1/ai/generate/stream", json={"text": "test"})
        assert r.status_code in (401, 422)

    async def test_unified_stream_no_auth(self, client):
        r = await client.post("/api/v1/ai/unified/stream", json={"text": "test"})
        assert r.status_code in (401, 422)

    async def test_apply_generation_no_auth(self, client):
        r = await client.post("/api/v1/ai/apply-generation", json={})
        assert r.status_code == 401

    async def test_history_no_auth(self, client):
        r = await client.get("/api/v1/ai/chat-history")
        assert r.status_code == 401
