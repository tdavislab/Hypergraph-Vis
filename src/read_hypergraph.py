import hypernetx as hnx
import json
import re
import matplotlib.pyplot as plt
import networkx as nx
import json
from tqdm import tqdm


def process_graph_edges(edge_str: str):
    """
    Convert a string representation of the hypergraph into a python dictionary

    :param edge_str: string representation of the hypergraph
    :type edge_str: str
    :return: dictionary representing the hypergraph
    :rtype: dict
    """

    edge_str = edge_str.strip().replace('\'', '\"')
    converted_edge_str = edge_str[1:-1].replace('{', '[').replace('}', ']')
    return json.loads('{' + converted_edge_str + '}')


def process_hypergraph_from_csv(graph_file: str):
    hgraph = {}

    with open(graph_file, 'r') as gfile:
        for line in gfile:
            line = line.rstrip().rsplit(',')
            hyperedge, vertices = line[0], line[1:]

            if hyperedge not in hgraph.keys():
                hgraph[hyperedge] = vertices
            else:
                hgraph[hyperedge] += vertices

    return hnx.Hypergraph(hgraph)


def read_hypergraph(filepath: str):
    """
    Read one or more hypergraphs from a txt file with a part-json like format

    :param filepath: path of the hypergraph file
    :type filepath: str
    :return: list of tuples of (name, hypergraph)
    :rtype: list
    """

    hgraphs = []

    with open(filepath, 'r') as graph_file:
        file_contents = graph_file.read()

    # Separate the hypergraphs based on this regex:
    # newline followed by one or more whitespace followed by newline
    file_contents = re.split(r'\n\s+\n', file_contents)

    num_hgraphs = len(file_contents)

    for i in tqdm(range(0, num_hgraphs)):
        # The name and graph are separated by '='
        graph_name, graph_dict = file_contents[i].split('=')
        graph_dict = process_graph_edges(graph_dict)
        hgraphs.append(hnx.Hypergraph(graph_dict, name=graph_name))

    return hgraphs


def convert_to_line_graph(hypergraph):
    # Line-graph is a NetworkX graph
    line_graph = nx.Graph()

    # Nodes of the line-graph are nodes of the dual graph
    # OR equivalently edges of the original hypergraph
    [line_graph.add_node(edge, vertices=list(vertices)) for edge, vertices in hypergraph.incidence_dict.items()]

    node_list = list(hypergraph.edges)

    # For all pairs of edges (e1, e2), add edges such that
    # intersection(e1, e2) is not empty
    for node_idx_1, node1 in enumerate(node_list):
        for node_idx_2, node2 in enumerate(node_list[node_idx_1 + 1:]):
            vertices1 = hypergraph.edges[node1].elements
            vertices2 = hypergraph.edges[node2].elements
            # Compute the intersection size
            intersection_size = len(set(vertices1) & set(vertices2))
            if intersection_size > 0:
                line_graph.add_edge(node1, node2, intersection_size=str(intersection_size))

    return line_graph


def write_d3_graph(graph, path):
    # Write to d3 like graph format
    node_link_json = nx.readwrite.json_graph.node_link_data(graph)
    print(node_link_json)
    with open(path, 'w') as f:
        f.write(json.dumps(node_link_json, indent=4))


def compute_barcode(graph_path):
    with open(graph_path) as json_file:
        data = json.load(json_file)
    nodes = data['nodes']
    links = data['links']
    components = []
    barcode = []
    for node in nodes:
        components.append([node['id']])
    for link in links:
        link['intersection_size'] = int(link['intersection_size'])
    links = sorted(links, key=lambda item: 1 / item['intersection_size'])
    for link in links:
        source_id = link['source']
        target_id = link['target']
        weight = 1 / link['intersection_size']
        source_cc_idx = find_cc_index(components, source_id)
        target_cc_idx = find_cc_index(components, target_id)
        if source_cc_idx != target_cc_idx:
            source_cc = components[source_cc_idx]
            target_cc = components[target_cc_idx]
            components = [components[i] for i in range(len(components)) if i not in [source_cc_idx, target_cc_idx]]
            components.append(source_cc + target_cc)
            barcode.append({'birth': 0, 'death': weight, 'edge': link})
    for cc in components:
        barcode.append({'birth': 0, 'death': -1, 'edge': 'undefined'})
    return barcode


def find_cc_index(components, vertex_id):
    for i in range(len(components)):
        if vertex_id in components[i]:
            return i


if __name__ == '__main__':
    PROGRESS_BAR = True
    if PROGRESS_BAR:
        from tqdm import tqdm
    else:
        tqdm = lambda x: x

    # graph_file = '../data/bad_hypergraphs/bad_hallmark_hypergraphs.txt'
    # graph_file = '../data/somemorehypergraphs/DNS_hypergraph_samples.txt'
    # graph_file = '../data/lesmis/lesmis.txt'
    # graph_file = '../data/csv_data/dummy.csv'
    graph_file = '../app/static/uploads/hypergraph_samples.txt'
    # hgraphs = read_hypergraph(graph_file)
    hgraphs = process_hypergraph_from_csv(graph_file)
    hgraph = hgraphs
    lgraph = convert_to_line_graph(hgraph)
    print(hgraph)

    plt.figure()
    hnx.draw(hgraph, with_node_labels=False, with_edge_labels=False)
    plt.figure()
    nx.draw(lgraph)
    plt.show()
    # write_d3_graph(hgraph.bipartite(), '../web_components/data/hypergraph_lesmis.json')
    # write_d3_graph(convert_to_line_graph(hgraph), '../web_components/data/linegraph_lesmis.json')
    # plt.show()
    #
    # barcode = compute_barcode('../web_components/data/linegraph_lesmis.json')
    # with open('../web_components/data/barcode_lesmis.json', 'w') as f:
    #     f.write(json.dumps({'barcode': barcode}, indent=4))
