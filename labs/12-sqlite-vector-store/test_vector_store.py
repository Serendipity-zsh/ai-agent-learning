import tempfile
import unittest

from vector_store import VectorStore


class VectorStoreTests(unittest.TestCase):
    def test_persists_and_filters_tenant(self):
        with tempfile.NamedTemporaryFile() as file:
            store = VectorStore(file.name)
            store.add("a", "team-a", "release date", [1, 0])
            store.add("b", "team-b", "secret", [1, 0])
            reopened = VectorStore(file.name)
            self.assertEqual([row[1] for row in reopened.search("team-a", [1, 0])], ["a"])

    def test_delete_propagates(self):
        store = VectorStore()
        store.add("a", "t", "x", [1, 0])
        store.delete("a")
        self.assertEqual(store.search("t", [1, 0]), [])

    def test_dimension_contract(self):
        store = VectorStore()
        store.add("a", "t", "x", [1, 0])
        with self.assertRaises(ValueError):
            store.search("t", [1, 0, 0])


if __name__ == "__main__":
    unittest.main()
