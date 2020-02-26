async function draw_barcode() {
    try {
        // Read precomputed barcodes in CSV format
        let data = await d3.csv("data/barcode.csv");

        // Convert strings to numeric data type
        for (let d of data) {
            d.birth = parseFloat(d.birth);
            d.death = parseFloat(d.death);
            // d.dim = parseInt(d.dim);
            d.dim = 0;
        }

        // Create the SVG element that contains the persistence barcode. The barcode is created using rect elements
        let barcode_svg = d3.select("#barcode-svg");
        let barcode_rects = barcode_svg.selectAll("rect");

        let barcode_width = 5;
        barcode_svg.attr("viewBox", "0 0 100 100");

        // Create the scale for length, y-coordinate of barcodes
        let x_min = 5;
        let x_max = 95;
        let rect_xscale = d3.scaleLinear().domain([0, d3.max(data.map(d => d.death)) + 5]).range([x_min, x_max]).nice();

        let barcode_yoffset = 15;
        let barcode_xoffset = 0;

        // Bind data to create the barcodes
        barcode_rects.data(data)
            .enter()
            .append("rect")
            .attr("width", d => barcode_xoffset + rect_xscale(d.death - d.birth))
            .attr("height", barcode_width * 0.95)
            .attr("x", d => rect_xscale(d.birth))
            .attr("y", (d, i) => barcode_yoffset + barcode_width * i)
            .attr("class", d => "barcode-rect-dim" + d.dim.toString())
            .classed("hover-darken", true);

        barcode_rects.exit().remove();

        let x_axis = d3.axisBottom()
            .scale(rect_xscale);

        //Append group and insert axis
        // barcode_svg.append("g")
        //     .classed("barcode-axis", true)
        // .call(x_axis);

        let slider = barcode_svg.selectAll("rect.slider")
            .data([1])
            .enter()
            .append("rect")
            .attr("width", 2)
            .attr("height", 80)
            .attr("x", 20)
            .attr("y", 5)
            .attr("class", "slider hover-darken");

        let drag = d3.drag()
            .on("drag", dragged);
        // .on("start", dragstarted)
        // .on("end", dragended);

        slider.call(drag);

        function dragged(d) {
            d3.select(this).attr("x", d.x = clamp(d3.event.x, 5, 90));
            // let destination_position = d3.event.x - d3.select(this).attr("width") / 2;
            // d3.select(this).attr("x", clamp(destination_position, 5, 90));
        }

        function dragstarted(d) {
            d3.select(this).raise();
        }

        function dragended(d) {
            d3.select(this).attr("stroke", null);
        }

    } catch (e) {
        console.log(e);
    }
}

function clamp(d, min, max) {
    return Math.min(Math.max(d, min), max);
};