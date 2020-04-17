from flask import request, Blueprint, current_app as app, jsonify
from werkzeug.utils import secure_filename
from utils.CompGraph import Hypergraph, CompGraph
import os

upload = Blueprint('upload', __name__)


@upload.route('/dataset', methods=['POST', 'GET'])
def upload_dataset():
    if request.method == 'POST':
        if request.files:
            upload_candidate = request.files['file']
            # upload_candidate.save(os.path.join(app.config['UPLOAD'], 'hgraph_uploaded.txt'))
            # session['graph_data'] = upload_candidate.read().decode('utf-8')
            hgraph_data = upload_candidate.read().decode('utf-8')
            hgraph = Hypergraph(hgraph_data)
            app.comp_graph = CompGraph()
            app.comp_graph.append(hgraph)
            return jsonify(response='File added to computational graph sucessfully', responseType='success', data=hgraph.to_json())
    return jsonify(response='Could not upload file')
