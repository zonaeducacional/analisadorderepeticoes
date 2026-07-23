import os
import json
import zipfile
import xml.etree.ElementTree as ET
import re
import math
from collections import defaultdict, Counter
import tempfile
import threading
import webbrowser
import time
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist'))

app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path='/')
CORS(app)

# [Same helper functions as before...]
def extract_text_from_docx(docx_path):
    text_content = []
    try:
        with zipfile.ZipFile(docx_path) as z:
            xml_content = z.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            for p in tree.iterfind('.//w:p', namespaces):
                para_text = []
                for node in p.iterfind('.//w:t', namespaces):
                    if node.text:
                        para_text.append(node.text)
                if para_text:
                    text_content.append(''.join(para_text))
    except Exception as e:
        pass
    return '\n'.join(text_content)

def extract_text_from_txt(txt_path):
    try:
        with open(txt_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return ""

def split_into_sentences(text):
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if len(s.strip().split()) > 4]

def tokenize(text):
    text = text.lower()
    return re.findall(r'\b[a-zà-ÿ]+\b', text)

def get_cosine_similarity(vec1, vec2):
    intersection = set(vec1.keys()) & set(vec2.keys())
    numerator = sum([vec1[x] * vec2[x] for x in intersection])
    sum1 = sum([vec1[x]**2 for x in vec1.keys()])
    sum2 = sum([vec2[x]**2 for x in vec2.keys()])
    denominator = math.sqrt(sum1) * math.sqrt(sum2)
    if not denominator:
        return 0.0
    return float(numerator) / denominator

def analyze_texts(files_info):
    all_sentences = []
    for file_info in files_info:
        filename = file_info['name']
        path = file_info['path']
        if filename.endswith('.docx'):
            text = extract_text_from_docx(path)
        else:
            text = extract_text_from_txt(path)
            
        sentences = split_into_sentences(text)
        for s in sentences:
            tokens = tokenize(s)
            if len(tokens) >= 5:
                all_sentences.append({'file': filename, 'text': s, 'tokens': tokens, 'vec': Counter(tokens)})
                
    word_index = defaultdict(list)
    for i, item in enumerate(all_sentences):
        for word in set(item['tokens']):
            word_index[word].append(i)
            
    similar_groups = []
    grouped_indices = set()
    
    for i in range(len(all_sentences)):
        if i in grouped_indices: continue
        item1 = all_sentences[i]
        candidate_counts = Counter()
        for word in set(item1['tokens']):
            for candidate_idx in word_index[word]:
                if candidate_idx > i: candidate_counts[candidate_idx] += 1
                    
        min_shared = max(3, len(item1['tokens']) * 0.3)
        candidates = [idx for idx, count in candidate_counts.items() if count >= min_shared]
        
        current_group = [{"file": item1['file'], "text": item1['text'], "deleted": False}]
        for j in candidates:
            if j in grouped_indices: continue
            item2 = all_sentences[j]
            len1, len2 = len(item1['tokens']), len(item2['tokens'])
            if max(len1, len2) > 0 and min(len1, len2) / max(len1, len2) < 0.5: continue
                
            sim = get_cosine_similarity(item1['vec'], item2['vec'])
            if sim > 0.85:
                current_group.append({"file": item2['file'], "text": item2['text'], "deleted": False})
                grouped_indices.add(j)
                
        if len(current_group) > 1:
            similar_groups.append({"id": len(similar_groups) + 1, "items": current_group})
            grouped_indices.add(i)
            
    return similar_groups

@app.route('/api/analyze', methods=['POST'])
def handle_analyze():
    if 'files' not in request.files: return jsonify({"error": "Nenhum arquivo enviado"}), 400
    files = request.files.getlist('files')
    if not files or files[0].filename == '': return jsonify({"error": "Nenhum arquivo selecionado"}), 400
        
    temp_dir = tempfile.mkdtemp()
    files_info = []
    
    try:
        for f in files:
            filename = secure_filename(f.filename)
            if not filename: filename = f.filename.replace(" ", "_")
            file_path = os.path.join(temp_dir, filename)
            f.save(file_path)
            files_info.append({'name': f.filename, 'path': file_path})
            
        groups = analyze_texts(files_info)
        return jsonify(groups)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        for info in files_info:
            try: os.remove(info['path'])
            except: pass
        try: os.rmdir(temp_dir)
        except: pass

@app.route('/api/delete', methods=['POST'])
def delete_item():
    return jsonify({"success": True, "message": "Ação simulada com sucesso."})

@app.route('/api/shutdown', methods=['POST'])
def shutdown():
    os._exit(0) # Força o encerramento do servidor
    return jsonify({"success": True})

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

def open_browser():
    time.sleep(1.5) # Aguarda o Flask iniciar
    webbrowser.open('http://127.0.0.1:5000')

if __name__ == '__main__':
    t = threading.Thread(target=open_browser)
    t.daemon = True
    t.start()
    
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
