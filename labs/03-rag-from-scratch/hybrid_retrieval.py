from collections import defaultdict


def lexical(query: str, documents: dict[str, str]) -> list[str]:
    terms = set(query.lower().split())
    return [doc_id for doc_id, text in sorted(documents.items(), key=lambda item: -len(terms & set(item[1].lower().split()))) if terms & set(text.lower().split())]


def rrf(*rankings: list[str], k: int = 60) -> list[str]:
    scores = defaultdict(float)
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking, 1): scores[doc_id] += 1 / (k + rank)
    return [doc_id for doc_id, _ in sorted(scores.items(), key=lambda item: (-item[1], item[0]))]


def retrieve(query: str, documents: dict[str, str], semantic_ranking: list[str]) -> list[str]:
    return rrf(lexical(query, documents), semantic_ranking)
