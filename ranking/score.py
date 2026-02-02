import sys
import json

query_terms = sys.argv[1:]
index = json.load(sys.stdin)

scores = {}

for term in query_terms:
    if term not in index:
        continue
    for doc_id, freq in index[term].items():
        scores[doc_id] = scores.get(doc_id, 0) + freq

for doc, score in sorted(scores.items(), key=lambda x: -x[1]):
    print(doc, score)
