import hypernetx as hnx
import json
import re
import matplotlib.pyplot as plt


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
        hgraphs.append((graph_name, graph_dict))

    return hgraphs


if __name__ == '__main__':
    PROGRESS_BAR = True
    if PROGRESS_BAR:
        from tqdm import tqdm
    else:
        tqdm = lambda x: x

    # graph_file = '../data/bad_hypergraphs/bad_hallmark_hypergraphs.txt'
    graph_file = '../data/somemorehypergraphs/DNS_hypergraph_samples.txt'
    hgraphs = read_hypergraph(graph_file)
    hgraph = hnx.Hypergraph(hgraphs[3][1])

    hnx.draw(hgraph, with_node_labels=False, with_edge_labels=False)
    plt.show()