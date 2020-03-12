async function loadData() {
    let hyper_data = await d3.json('data/hypergraph.json');
    let line_data = await d3.json('data/linegraph.json');
    let barcode_data = await d3.json('data/barcode.json');

    return {
        'hyper_data': hyper_data,
        'line_data': line_data,
        'barcode_data': barcode_data
    };
}

loadData().then(data=>{
    let line_nodes_new = [];
    let line_links_new = [];
    data.line_data.nodes.forEach(n=>{
        let node_new = {};
        node_new.vertices = n.vertices.slice(0);
        node_new.id = n.id;
        node_new.index = n.index;
        line_nodes_new.push(node_new);
    })
    data.line_data.links.forEach(l=>{
        let link_new = {};
        link_new.intersection_size = l.intersection_size;
        link_new.source = l.source;
        link_new.target = l.target;
        link_new.index = l.index;
        line_links_new.push(link_new);
    })
    let hypergraph = new Hypergraph(data.hyper_data); 
    let simplified_hypergraph = new Simplified_Hypergraph();
    let linegraph = new Linegraph(data.line_data, hypergraph, "linegraph");
    let simplified_linegraph = new Linegraph({"nodes": line_nodes_new, "links": line_links_new}, simplified_hypergraph, "simplified-linegraph");
    let barcode = new Barcode(data.barcode_data, simplified_linegraph);

    d3.select("#visual-encoding-form")
        .on("change", ()=>{
            let encoding_type = d3.select('input[name="visual-type"]:checked').node().value;
            if(encoding_type === "bipartite"){
                d3.select("#hull-group").style("visibility","hidden");
                d3.select("#simplified-hull-group").style("visibility","hidden");
            } else if(encoding_type === "convex"){
                d3.select("#hull-group").style("visibility","visible");
                d3.select("#simplified-hull-group").style("visibility","visible");
            }
        })
})