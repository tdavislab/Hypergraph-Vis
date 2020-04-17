from flask import Blueprint, current_app as app, jsonify, render_template, request
from utils.CompGraph import Linegraph

views = Blueprint('views', __name__)


@views.route('/')
def pipeline_render():
    return render_template('pipeline.html')


@views.route('/linegraph', methods=['POST'])
def draw_linegraph():
    comp_graph = app.comp_graph
    input_node = comp_graph.graph[0]
    line_graph = Linegraph(input_node)
    return jsonify(response='success', data=line_graph.compute())
