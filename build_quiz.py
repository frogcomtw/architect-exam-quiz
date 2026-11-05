"""Build an offline quiz from official architect examination PDFs."""
import json
import re
from pathlib import Path
import pdfplumber
import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / '114年' / '專技高考_建築師'
OUT = ROOT
(OUT / 'pages').mkdir(exist_ok=True)
SUBJECTS = ['營建法規與實務', '建築結構', '建築構造與施工', '建築環境控制']
CORRECTIONS = {
    0: {27: ['B', 'D', 'BD']},
    1: {5: ['A', 'C', 'AC']},
    2: {5: ['B', 'D', 'BD'], 15: ['C', 'D', 'CD'], 17: ['*'], 20: ['*'],
        41: ['B', 'C', 'D', 'BC', 'BD', 'CD', 'BCD'], 46: ['A', 'D', 'AD'],
        49: ['A', 'B'], 73: ['B', 'C', 'BC']},
    3: {},
}
data = []
for sid, name in enumerate(SUBJECTS):
    answer_name = name + ('_標準答案.pdf' if sid == 3 else '_更正答案.pdf')
    with pdfplumber.open(SOURCE / answer_name) as pdf:
        answers = {}
        for table in pdf.pages[0].extract_tables():
            if len(table) < 2 or table[0][0] != '題號':
                continue
            for heading, answer in zip(table[0][1:], table[1][1:]):
                if answer and answer.strip():
                    number = int(re.search(r'第(\d+)題', heading)[1])
                    answers[number] = CORRECTIONS[sid].get(number, [answer.strip()])
        assert len(answers) == (80 if sid in (0, 2) else 40), (name, len(answers))
        assert all(all(a == '*' or re.fullmatch('[ABCD]+', a) for a in v) for v in answers.values())
    questions = {}
    path = SOURCE / (name + '_試題.pdf')
    renderer = pdfium.PdfDocument(path)
    with pdfplumber.open(path) as pdf:
        for pi, page in enumerate(pdf.pages):
            pagefile = f'pages/{sid}-{pi+1}.jpg'
            bitmap = renderer[pi].render(scale=1.8)
            bitmap.to_pil().convert('RGB').save(OUT / pagefile, quality=88)
            bitmap.close()
            words = page.extract_words()
            # Questions are numbered at the left margin. Mathematical labels
            # and diagram values appear farther to the right.
            starts = [w for w in words if re.fullmatch(r'\d{1,2}', w['text'])
                      and w['x0'] < 65 and w['top'] > 65]
            text = page.extract_text() or ''
            for w in starts:
                n = int(w['text'])
                if n not in answers or n in questions:
                    continue
                match = re.search(rf'(?m)^\s*{n}\s+([^\n]+)', text)
                if not match:
                    continue
                questions[n] = {'id': f'{sid}-{n}', 'number': n,
                    'title': match[1].strip(), 'page': pi + 1,
                    'image': pagefile, 'top': round(w['top'] / page.height * 100, 3),
                    'answers': answers[n], 'corrected': n in CORRECTIONS[sid]}
    assert set(questions) == set(answers), (name, sorted(set(answers) - set(questions)))
    data.append({'name': name, 'id': sid, 'count': len(answers),
                 'paper': '../114年/專技高考_建築師/' + name + '_試題.pdf',
                 'key': '../114年/專技高考_建築師/' + answer_name,
                 'questions': [questions[n] for n in sorted(questions)]})
    renderer.close()
    print(name, len(questions))
(OUT / 'questions.js').write_text('window.QUIZ_DATA = ' + json.dumps(data, ensure_ascii=False) + ';\n', encoding='utf-8')
print('Validated', sum(s['count'] for s in data), 'questions with official answers.')
