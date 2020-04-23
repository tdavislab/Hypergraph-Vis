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
    def __init__(self, input_node, dual=False):
        super().__init__(input_node)
        self.dual = dual
        self.data = None
        self.children = []

    def compute(self, s=1):
        # Line-graph is a NetworkX graph
        line_graph = nx.Graph()

        if self.dual:
            hgraph = self.input_node.data.dual()
        else:
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
        self.data = nx.readwrite.json_graph.node_link_data(line_graph)
        return self.data


class Barcode(Operation):
    def __init__(self, input_node):
        super().__init__(input_node)
        self.data = None

    def compute(self):
        def find_cc_index(components, vertex_id):
            for i in range(len(components)):
                if vertex_id in components[i]:
                    return i

        graph_data = self.input_node.data
        nodes = graph_data['nodes']
        links = graph_data['links']
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
                link['nodes_subsets'] = {"source_cc": source_cc, "target_cc": target_cc}
                link['cc_list'] = components.copy()
                barcode.append({'birth': 0, 'death': weight, 'edge': link})
        for cc in components:
            barcode.append({'birth': 0, 'death': -1, 'edge': 'undefined'})
        self.data = barcode
        return barcode

