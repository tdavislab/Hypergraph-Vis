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
    with open(path, 'w') as f:
        f.write(json.dumps(node_link_json, indent=4))


if __name__ == '__main__':
    PROGRESS_BAR = True
    if PROGRESS_BAR:
        from tqdm import tqdm
    else:
        tqdm = lambda x: x

    # graph_file = '../data/bad_hypergraphs/bad_hallmark_hypergraphs.txt'
    graph_file = '../data/somemorehypergraphs/DNS_hypergraph_samples.txt'
    hgraphs = read_hypergraph(graph_file)
    hgraph = hgraphs[0]
    lgraph = convert_to_line_graph(hgraph)

    plt.figure()
    hnx.draw(hgraph, with_node_labels=False, with_edge_labels=False)
    plt.figure()
    nx.draw(lgraph)

    write_d3_graph(hgraph.bipartite(), '../web_components/data/hypergraph.json')
    write_d3_graph(convert_to_line_graph(hgraph), '../web_components/data/linegraph.json')
    plt.show()
