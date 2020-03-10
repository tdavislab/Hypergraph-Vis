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
    let hypergraph = new Hypergraph(data.hyper_data); 
    let simplified_hypergraph = new Simplified_Hypergraph();
    let linegraph = new Linegraph(data.line_data, simplified_hypergraph);
    let barcode = new Barcode(data.barcode_data, linegraph);
})