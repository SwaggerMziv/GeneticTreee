"""Handler utilities."""


def extract_topics_from_messages(messages: list[dict]) -> list[str]:
    """Extract covered topics from conversation to avoid repetition."""
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

    text = " ".join(m["content"].lower() for m in messages if m["role"] == "user")

    for keywords, topic in keywords_to_topics.items():
        if any(kw in text for kw in keywords):
            topics.append(topic)

    return list(set(topics))
