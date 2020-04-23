from flask import Blueprint, current_app as app, jsonify, render_template, request
from utils.CompGraph import Linegraph, Barcode

views = Blueprint('views', __name__)


@views.route('/')
def pipeline_render():
    return render_template('pipeline.html')


@views.route('/linegraph', methods=['POST'])
def draw_linegraph():
    comp_graph = app.comp_graph
    input_node = comp_graph[0]
    line_graph = Linegraph(input_node)
    comp_graph.append(line_graph)
    return jsonify(response='success', data=line_graph.compute())


@views.route('/dualgraph', methods=['POST'])
def draw_dual_linegraph():
    comp_graph = app.comp_graph
    input_node = comp_graph[0]
    dual_line_graph = Linegraph(input_node, dual=True)
    comp_graph.append(dual_line_graph)
    return jsonify(response='success', data=dual_line_graph.compute())


@views.route('/barcode', methods=['POST'])
def draw_barcode():
    comp_graph = app.comp_graph
    input_node = comp_graph[-1]
    barcode = Barcode(input_node)
    barcode_data = barcode.compute()
    return jsonify(response='success', data=barcode_data)