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


@views.route('/add_edge_modality', methods=['POST'])
def add_edge_modality():
    input_graph = app.comp_graph[-1]

    line_graph = Linegraph(input_graph)
    line_graph_data = line_graph.compute()
    barcode = Barcode(line_graph)
    barcode_data = barcode.compute()

    return jsonify(response='success', barcode=barcode_data, line_graph=line_graph_data, hypergraph=app.comp_graph[0].to_json())


@views.route('/add_vertex_modality', methods=['POST'])
def add_vertex_modality():
    input_graph = app.comp_graph[-1]

    line_graph = Linegraph(input_graph, dual=True)
    line_graph_data = line_graph.compute()
    barcode = Barcode(line_graph)
    barcode_data = barcode.compute()

    return jsonify(response='success', barcode=barcode_data, line_graph=line_graph_data, hypergraph=app.comp_graph[0].to_json())


@views.route('/get_graph_data', methods=['GET'])
def get_graph_data():
    return jsonify(response='responswa')
