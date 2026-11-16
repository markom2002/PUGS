"""Validate authored questions; optionally list shared-answer pairs for editorial review."""
import argparse
import json
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path


def normalize(value):
    return ''.join(c for c in unicodedata.normalize('NFD', value.lower().replace('đ', 'dj'))
                   if c.isalnum())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--review-shared-answers', action='store_true')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    questions = json.loads((root / 'BE/Arena/Data/questions.json').read_text(encoding='utf-8'))
    categories = {'Geografija', 'Sport', 'Film i serije', 'Nauka', 'Istorija',
                  'Tehnologija', 'Umjetnost', 'Priroda', 'Igrice'}
    assert {q['category'] for q in questions} == categories, 'Unexpected categories'
    seen = set()
    shared = defaultdict(list)
    for q in questions:
        key = normalize(q['text'])
        assert key and key not in seen, f'Duplicate question: {q["text"]}'
        seen.add(key)
        assert q['text'].endswith('?') and '?' not in q['text'][:-1], q
        assert q.get('topic', '').strip(), f'Missing topic: {q["text"]}'
        assert type(q['difficulty']) is int and 1 <= q['difficulty'] <= 5, q
        assert isinstance(q['answers'], list) and q['answers'], q
        assert all(isinstance(a, str) and a.strip() and '?' not in a for a in q['answers']), q
        assert normalize(q['answers'][0]), f'First answer cannot link in Kaladont: {q["text"]}'
        for answer in {normalize(a) for a in q['answers']}:
            if len(answer) > 3 and not answer.isdigit():
                shared[q['category'], answer].append(q['text'])
    for category in sorted(categories):
        bank = [q for q in questions if q['category'] == category]
        levels = Counter(q['difficulty'] for q in bank)
        assert len(bank) >= 245, f'{category}: insufficient questions'
        assert set(levels) == {1, 2, 3, 4, 5} and min(levels.values()) >= 49, (category, levels)
        assert len({q['topic'] for q in bank}) >= 12, f'{category}: insufficient topic coverage'
        for level in range(1, 6):
            assert len({q['topic'] for q in bank if q['difficulty'] == level}) >= 8, (category, level)
        print(f'{category}: {len(bank)} questions; levels {dict(sorted(levels.items()))}')
    assert len(questions) >= 2210, 'Authored bank must support at least 2250 questions including the 40 seeds'
    print(f'PASS: {len(questions)} unique authored questions, {len(categories)} categories, five difficulty levels')
    if args.review_shared_answers:
        # Shared answers flag possible reworded facts; they do not establish duplication.
        # For example, the same country can independently host a race and win a cup.
        printed = set()
        for (category, answer), texts in shared.items():
            if len(texts) < 2:
                continue
            group = tuple(sorted(texts))
            if group not in printed:
                print(json.dumps(dict(category=category, answer=answer, questions=texts), ensure_ascii=True))
                printed.add(group)


if __name__ == '__main__':
    main()
