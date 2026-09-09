import math
import sqlite3
import struct


def pack(vector):
    return struct.pack(f"{len(vector)}f", *vector)


def unpack(blob):
    return struct.unpack(f"{len(blob) // 4}f", blob)


class VectorStore:
    def __init__(self, path=":memory:"):
        self.db = sqlite3.connect(path)
        self.db.execute("CREATE TABLE IF NOT EXISTS chunks (id TEXT PRIMARY KEY, tenant TEXT NOT NULL, text TEXT NOT NULL, vector BLOB NOT NULL, deleted INTEGER NOT NULL DEFAULT 0)")

    def add(self, chunk_id, tenant, text, vector):
        if not vector:
            raise ValueError("vector must not be empty")
        self.db.execute("INSERT OR REPLACE INTO chunks(id, tenant, text, vector, deleted) VALUES (?, ?, ?, ?, 0)", (chunk_id, tenant, text, pack(vector)))
        self.db.commit()

    def delete(self, chunk_id):
        self.db.execute("UPDATE chunks SET deleted=1 WHERE id=?", (chunk_id,))
        self.db.commit()

    def search(self, tenant, query, limit=3):
        if not query:
            return []
        rows = self.db.execute("SELECT id, text, vector FROM chunks WHERE tenant=? AND deleted=0", (tenant,)).fetchall()
        scored = []
        for chunk_id, text, blob in rows:
            vector = unpack(blob)
            if len(vector) != len(query):
                raise ValueError("query dimension does not match stored vector")
            score = sum(a * b for a, b in zip(vector, query)) / (math.sqrt(sum(a*a for a in vector)) * math.sqrt(sum(b*b for b in query)))
            scored.append((score, chunk_id, text))
        return sorted(scored, reverse=True)[:limit]
