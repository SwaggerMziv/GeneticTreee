"""Handler utilities."""


def extract_topics_from_messages(messages: list[dict]) -> list[str]:
    """Extract covered topics from conversation to avoid repetition.

    Requires at least 2 keyword matches from different user messages
    before marking a topic as covered — prevents premature topic switching.
    """
    topics = []
    keywords_to_topics = {
        ("детств", "ребенк", "маленьк", "школ"): "детство",
        ("родител", "мама", "папа", "отец", "мать"): "родители",
        ("бабушк", "дедушк"): "бабушки и дедушки",
        ("друг", "друзья", "приятел"): "друзья",
        ("работ", "профессия", "карьер", "должност"): "работа",
        ("жен", "муж", "свадьб", "брак"): "семья и брак",
        ("путешеств", "поездк", "поехал"): "путешествия",
        ("велик", "велосипед"): "велосипедные прогулки",
        ("пляж", "купа", "плава"): "отдых на воде",
    }

    user_messages = [m["content"].lower() for m in messages if m["role"] == "user"]

    for keywords, topic in keywords_to_topics.items():
        # Count how many different user messages contain at least one keyword
        messages_with_keyword = sum(
            1 for msg in user_messages if any(kw in msg for kw in keywords)
        )
        # Only mark topic as covered if mentioned in 2+ separate user messages
        if messages_with_keyword >= 2:
            topics.append(topic)

    return list(set(topics))
