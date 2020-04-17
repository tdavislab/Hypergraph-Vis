import hypernetx as hnx
import networkx as nx


class CompGraph:
    def __init__(self):
        self.name = 'CompGraph'
        self.graph = []

    def get_name(self):
        return self.name

    def __len__(self):
        return len(self.graph)

    def __getitem__(self, item):
        return self.graph[item]

    def __setitem__(self, key, value):
        self.graph[key] = value

    def __delitem__(self, key):
        del self.graph[key]

    def append(self, node_op):
        self.graph.append(node_op)


class Node:
    """
    Wrapper class for nodes. A Node holds the data for a graph or hypergraph and also keeps track of operations that
    are being run on the node as a list of its children
    """

    def __init__(self, data, **kwargs):
        self.data = self.preprocess(data)
        self.children = []

    def preprocess(self, data):
        """
        Apply preprocessing to incoming data
        """
        return data


class Operation:
    """
    Wrapper class for operations. An operation takes a single input - either a graph or hypergraph, and returns a graph
    or hypergraph along with some metadata of type Node
    """

    def __init__(self, input_node):
        self.input_node = input_node
        input_node.children.append(self)

    def compute(self):
        """
        Compute the output of this operation, implemented by subclasses
        """
        raise NotImplementedError


class Hypergraph(Node):
    def __init__(self, data):
        super().__init__(data)

    def preprocess(self, data):
        hypergraph = {}
        rows = data.split('\n')

        for row in rows:
            row = row.rstrip().rsplit(',')
            hyperedge, vertices = row[0], row[1:]

            if hyperedge not in hypergraph.keys():
                hypergraph[hyperedge] = vertices
            else:
                hypergraph[hyperedge] += vertices

        return hnx.Hypergraph(hypergraph)

    def to_json(self):
        bipartite_hgraph = self.data.bipartite()
        return nx.readwrite.json_graph.node_link_data(bipartite_hgraph)


class Linegraph(Operation):
    def __init__(self, input_node):
        super().__init__(input_node)
        self.line_graph = None

    def compute(self, s=1):
        # Line-graph is a NetworkX graph
        line_graph = nx.Graph()

        hgraph = self.input_node.data

        # Nodes of the line-graph are nodes of the dual graph
        # OR equivalently edges of the original hypergraph
        [line_graph.add_node(edge, vertices=list(vertices)) for edge, vertices in hgraph.incidence_dict.items()]

        node_list = list(hgraph.edges)

        # For all pairs of edges (e1, e2), add edges such that
        # intersection(e1, e2) is not empty
        for node_idx_1, node1 in enumerate(node_list):
            for node_idx_2, node2 in enumerate(node_list[node_idx_1 + 1:]):
                vertices1 = hgraph.edges[node1].elements
                vertices2 = hgraph.edges[node2].elements
                # Compute the intersection size
                intersection_size = len(set(vertices1) & set(vertices2))
                if intersection_size >= s:
                    # print(intersection_size)
                    line_graph.add_edge(node1, node2, intersection_size=str(intersection_size))
        self.line_graph = nx.readwrite.json_graph.node_link_data(line_graph)
        return self.line_graph
